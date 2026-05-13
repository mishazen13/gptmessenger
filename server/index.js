import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const ensureDb = () => {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify({ users: [], chats: [], friendRequests: [], sessions: [] }, null, 2),
      'utf-8',
    );
  }
};

const readDb = () => {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
};

const writeDb = (db) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
};

const ensureUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};

ensureUploadsDir();

let multerLib = null;
try {
  const loaded = await import('multer');
  multerLib = loaded.default;
} catch {
  multerLib = null;
}

const upload = multerLib
  ? multerLib({
      storage: multerLib.diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname || '');
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
      },
    })
  : null;

const uploadSessions = new Map();

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.images?.avatarUrl || null,
  bannerUrl: user.images?.bannerUrl || null,
  bio: user.bio || null,
  lastSeen: user.lastSeen || null,
});

const getAuthUser = (req, db) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const session = db.sessions.find((item) => item.token === token);
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId) ?? null;
};

const requireAuth = (req, res, next) => {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  req.authUser = user;
  return next();
};

const ensureDirectChat = (db, userA, userB) => {
  const exists = db.chats.find(
    (chat) => !chat.isGroup && chat.memberIds.length === 2 && chat.memberIds.includes(userA) && chat.memberIds.includes(userB),
  );
  if (!exists) {
    db.chats.push({
      id: uuidv4(),
      name: 'Direct chat',
      isGroup: false,
      memberIds: [userA, userB],
      messages: [],
      createdAt: Date.now(),
    });
  }
};

// ==================== СОЗДАНИЕ APP ====================
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// ==================== SOCKET.IO ====================
const onlineUsers = new Map();
const userPresence = new Map();

const emitPresence = () => {
  io.emit('presence:update', Object.fromEntries(userPresence.entries()));
};

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  const db = readDb();
  const session = db.sessions.find(s => s.token === token);
  if (!session) return next(new Error('Authentication error'));
  
  const user = db.users.find(u => u.id === session.userId);
  if (!user) return next(new Error('Authentication error'));
  
  socket.data.user = user;
  next();
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`User connected: ${user.name} (${user.id})`);
  
  // Обновляем lastSeen при подключении
  const db = readDb();
  const userIndex = db.users.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    db.users[userIndex].lastSeen = Date.now();
    writeDb(db);
  }
  
  onlineUsers.set(user.id, { socketId: socket.id, user });
  const previousPresence = userPresence.get(user.id);
  userPresence.set(user.id, {
    status: previousPresence?.manual ? previousPresence.status : 'online',
    manual: previousPresence?.manual ?? false,
  });
  
  io.emit('users:online', Array.from(onlineUsers.values()).map(u => u.user.id));
  emitPresence();

  socket.on('presence:set', ({ status, manual }) => {
    if (!['online', 'offline', 'dnd'].includes(status)) return;
    userPresence.set(user.id, { status, manual: Boolean(manual) });
    emitPresence();
  });
  
  socket.on('call:start', ({ to, type, chatId }) => {
    console.log('📞 call:start received from', user.name, 'to', to, 'type', type);
    const target = onlineUsers.get(to);
    if (target) {
      console.log('📞 Target found:', target.user.name);
      io.to(target.socketId).emit('call:incoming', {
        from: user.id,
        fromName: user.name,
        fromAvatar: user.images?.avatarUrl || null,
        type,
        chatId
      });
    } else {
      console.log('❌ Target not online:', to);
    }
  });
  
  socket.on('call:accept', ({ from }) => {
    const target = onlineUsers.get(from);
    if (target) {
      console.log(`📞 Call accepted by ${user.name} from ${target.user.name}`);
      io.to(target.socketId).emit('call:accepted', { to: user.id });
    }
  });
  
  socket.on('call:reject', ({ from }) => {
    const target = onlineUsers.get(from);
    if (target) {
      console.log(`📞 Call rejected by ${user.name}`);
      io.to(target.socketId).emit('call:rejected', { to: user.id });
    }
  });
  
  socket.on('call:end', ({ to }) => {
    const target = onlineUsers.get(to);
    if (target) {
      console.log(`📞 Call ended between ${user.name} and ${target.user.name}`);
      io.to(target.socketId).emit('call:ended', { from: user.id });
    }
  });
  
  socket.on('signal', ({ to, signal }) => {
    const target = onlineUsers.get(to);
    if (target) {
      console.log(`📡 Signal from ${user.name} to ${target.user.name} type:`, signal.type);
      io.to(target.socketId).emit('signal', { from: user.id, signal });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${user.name}`);
    onlineUsers.delete(user.id);
    
    // Обновляем lastSeen при отключении
    const db = readDb();
    const userIndex = db.users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      db.users[userIndex].lastSeen = Date.now();
      writeDb(db);
    }
    
    const existingPresence = userPresence.get(user.id);
    userPresence.set(user.id, {
      status: existingPresence?.manual ? existingPresence.status : 'offline',
      manual: existingPresence?.manual ?? false,
    });
    io.emit('users:online', Array.from(onlineUsers.values()).map(u => u.user.id));
    emitPresence();
  });
});

// ==================== AUTH ENDPOINTS ====================
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  const db = readDb();
  const emailNormalized = email.trim().toLowerCase();
  if (db.users.some((user) => user.email === emailNormalized)) {
    return res.status(409).json({ error: 'user already exists' });
  }

  const user = { 
    id: uuidv4(), 
    name: name.trim(), 
    email: emailNormalized, 
    password,
    images: {},
    bio: '',
    lastSeen: null,
    privacy: {
      showLastSeen: true,
      showReadReceipts: true,
      allowNonFriendsMessage: true,
      showProfilePhoto: true,
    }
  };
  db.users.push(user);
  const token = uuidv4();
  db.sessions.push({ token, userId: user.id });
  writeDb(db);

  return res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find((item) => item.email === String(email).trim().toLowerCase() && item.password === password);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  // Обновляем lastSeen при входе
  const userIndex = db.users.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    db.users[userIndex].lastSeen = Date.now();
    writeDb(db);
  }

  const token = uuidv4();
  db.sessions.push({ token, userId: user.id });
  writeDb(db);
  return res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(204).send();
  const db = readDb();
  db.sessions = db.sessions.filter((item) => item.token !== token);
  writeDb(db);
  return res.status(204).send();
});

app.get('/api/me', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const friendRequests = db.friendRequests
    .filter((item) => item.toUserId === user.id && item.status === 'pending')
    .map((item) => item.fromUserId);
  const friends = db.friendRequests
    .filter((item) => item.status === 'accepted' && (item.toUserId === user.id || item.fromUserId === user.id))
    .map((item) => (item.toUserId === user.id ? item.fromUserId : item.toUserId));

  return res.json({
    user: sanitizeUser(user),
    incomingRequestIds: friendRequests,
    friendIds: Array.from(new Set(friends)),
    users: db.users.map(sanitizeUser),
  });
});

// ==================== USER BIO AND PRIVACY ENDPOINTS ====================
app.get('/api/users/:userId/bio', (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ 
    bio: user.bio || '', 
    lastSeen: user.lastSeen || null,
    privacy: user.privacy || {
      showLastSeen: true,
      showReadReceipts: true,
      allowNonFriendsMessage: true,
      showProfilePhoto: true,
    } 
  });
});

app.put('/api/users/:userId/bio', requireAuth, (req, res) => {
  const user = req.authUser;
  if (user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const db = readDb();
  const userIndex = db.users.findIndex(u => u.id === user.id);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  
  db.users[userIndex].bio = req.body.bio || '';
  writeDb(db);
  return res.json({ ok: true });
});

app.put('/api/users/:userId/privacy', requireAuth, (req, res) => {
  const user = req.authUser;
  if (user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const db = readDb();
  const userIndex = db.users.findIndex(u => u.id === user.id);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  
  db.users[userIndex].privacy = {
    ...db.users[userIndex].privacy,
    ...req.body,
  };
  writeDb(db);
  return res.json({ ok: true });
});

// ==================== USER IMAGES ENDPOINTS ====================
app.post('/api/users/upload-image', requireAuth, upload.single('file'), (req, res) => {
  const user = req.authUser;
  const { field } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  if (!field || !['avatarUrl', 'bannerUrl'].includes(field)) {
    return res.status(400).json({ error: 'Invalid field name. Use "avatarUrl" or "bannerUrl"' });
  }
  
  const db = readDb();
  const userIndex = db.users.findIndex(u => u.id === user.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const imageUrl = `/uploads/${req.file.filename}`;
  
  if (!db.users[userIndex].images) {
    db.users[userIndex].images = {};
  }
  
  db.users[userIndex].images[field] = imageUrl;
  writeDb(db);
  
  return res.json({ url: imageUrl });
});

app.post('/api/users/upload-wallpaper', requireAuth, upload.single('file'), (req, res) => {
  const user = req.authUser;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const db = readDb();
  const userIndex = db.users.findIndex(u => u.id === user.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const wallpaperUrl = `/uploads/${req.file.filename}`;
  
  if (!db.users[userIndex].images) {
    db.users[userIndex].images = {};
  }
  
  db.users[userIndex].images.wallpaperUrl = wallpaperUrl;
  writeDb(db);
  
  return res.json({ url: wallpaperUrl });
});

app.get('/api/users/:userId/images', (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.params.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  return res.json({
    avatarUrl: user.images?.avatarUrl || null,
    bannerUrl: user.images?.bannerUrl || null,
    wallpaperUrl: user.images?.wallpaperUrl || null,
  });
});

// ==================== FRIENDS ENDPOINTS ====================
app.post('/api/friends/request', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const target = db.users.find((item) => item.email === String(req.body.email).trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'user not found' });
  if (target.id === user.id) return res.status(400).json({ error: 'cannot add yourself' });

  const exists = db.friendRequests.find(
    (item) =>
      (item.fromUserId === user.id && item.toUserId === target.id) ||
      (item.fromUserId === target.id && item.toUserId === user.id),
  );

  if (exists?.status === 'accepted') return res.status(409).json({ error: 'already friends' });
  if (exists && exists.status === 'pending') return res.status(409).json({ error: 'request already exists' });

  db.friendRequests.push({ id: uuidv4(), fromUserId: user.id, toUserId: target.id, status: 'pending' });
  writeDb(db);
  return res.status(201).json({ ok: true });
});

app.post('/api/friends/accept', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const { fromUserId } = req.body;
  const request = db.friendRequests.find(
    (item) => item.fromUserId === fromUserId && item.toUserId === user.id && item.status === 'pending',
  );
  if (!request) return res.status(404).json({ error: 'request not found' });

  request.status = 'accepted';
  ensureDirectChat(db, user.id, fromUserId);
  writeDb(db);
  return res.json({ ok: true });
});

app.delete('/api/friends/:friendId', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const { friendId } = req.params;
  db.friendRequests = db.friendRequests.filter((item) => {
    const pair =
      (item.fromUserId === user.id && item.toUserId === friendId) ||
      (item.fromUserId === friendId && item.toUserId === user.id);
    return !pair;
  });

  writeDb(db);
  return res.json({ ok: true });
});

// ==================== CHATS ENDPOINTS ====================
app.get('/api/chats', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const chats = db.chats.filter((chat) => chat.memberIds.includes(user.id));
  return res.json({ chats });
});

app.post('/api/chats/group', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const memberIds = Array.from(new Set([user.id, ...(req.body.memberIds ?? [])]));
  if (!req.body.name?.trim() || memberIds.length < 2) {
    return res.status(400).json({ error: 'invalid payload' });
  }

  const chat = {
    id: uuidv4(),
    name: req.body.name.trim(),
    isGroup: true,
    memberIds,
    messages: [],
    avatarUrl: req.body.avatarUrl || null,
    creatorId: user.id,
    createdAt: Date.now(),
  };
  
  db.chats.push(chat);
  writeDb(db);
  return res.status(201).json({ chat });
});

app.patch('/api/chats/:chatId', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const chat = db.chats.find((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (!chat) return res.status(404).json({ error: 'chat not found' });
  
  if (!chat.isGroup) return res.status(400).json({ error: 'not a group chat' });
  
  if (chat.creatorId !== user.id) return res.status(403).json({ error: 'only creator can rename group' });

  if (req.body.name) {
    chat.name = req.body.name.trim();
  }
  
  writeDb(db);
  return res.json({ chat });
});

app.post('/api/chats/:chatId/leave', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const chatIndex = db.chats.findIndex((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (chatIndex === -1) return res.status(404).json({ error: 'chat not found' });
  
  const chat = db.chats[chatIndex];
  
  if (!chat.isGroup) return res.status(400).json({ error: 'not a group chat' });
  
  chat.memberIds = chat.memberIds.filter(id => id !== user.id);
  
  if (chat.memberIds.length === 0) {
    db.chats.splice(chatIndex, 1);
  }
  
  writeDb(db);
  return res.json({ ok: true });
});

app.delete('/api/chats/:chatId', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const chatIndex = db.chats.findIndex((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (chatIndex === -1) return res.status(404).json({ error: 'chat not found' });
  
  const chat = db.chats[chatIndex];
  
  if (!chat.isGroup) return res.status(400).json({ error: 'not a group chat' });
  
  if (chat.creatorId !== user.id) return res.status(403).json({ error: 'only creator can delete group' });
  
  db.chats.splice(chatIndex, 1);
  writeDb(db);
  return res.json({ ok: true });
});

// ==================== MESSAGES ENDPOINTS ====================
app.post('/api/chats/:chatId/messages', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const chat = db.chats.find((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (!chat) return res.status(404).json({ error: 'chat not found' });

  const text = String(req.body.text ?? '').trim();
  const attachmentsRaw = Array.isArray(req.body.attachments) ? req.body.attachments : [];
  const attachments = attachmentsRaw
    .filter((item) => item && typeof item.url === 'string')
    .slice(0, 5)
    .map((item) => ({
      id: uuidv4(),
      name: String(item.name ?? 'file'),
      type: String(item.type ?? 'application/octet-stream'),
      url: String(item.url),
      size: Number(item.size ?? 0),
    }));

  if (!text && attachments.length === 0) return res.status(400).json({ error: 'text or attachments are required' });

  const message = {
    id: uuidv4(),
    senderId: user.id,
    text,
    createdAt: Date.now(),
    replyToMessageId: req.body.replyToMessageId || undefined,
    deletedForEveryone: false,
    attachments,
  };
  chat.messages.push(message);
  writeDb(db);
  return res.status(201).json({ message });
});

app.delete('/api/chats/:chatId/messages', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const chat = db.chats.find((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (!chat) return res.status(404).json({ error: 'chat not found' });

  chat.messages = [];
  writeDb(db);
  return res.json({ ok: true });
});

app.delete('/api/chats/:chatId/messages/:messageId', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const chat = db.chats.find((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (!chat) return res.status(404).json({ error: 'chat not found' });

  const message = chat.messages.find((item) => item.id === req.params.messageId);
  if (!message || message.senderId !== user.id) return res.status(403).json({ error: 'forbidden' });

  message.deletedForEveryone = true;
  message.text = 'Сообщение удалено';
  writeDb(db);
  return res.json({ ok: true });
});

// ==================== GROUP MEMBERS ENDPOINTS ====================
app.post('/api/chats/:chatId/members', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const chat = db.chats.find((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (!chat) return res.status(404).json({ error: 'chat not found' });
  
  if (!chat.isGroup) return res.status(400).json({ error: 'not a group chat' });
  
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  
  const userToAdd = db.users.find(u => u.id === userId);
  if (!userToAdd) return res.status(404).json({ error: 'user not found' });
  
  if (chat.memberIds.includes(userId)) {
    return res.status(400).json({ error: 'user already in group' });
  }
  
  chat.memberIds.push(userId);
  writeDb(db);
  return res.json({ ok: true });
});

app.delete('/api/chats/:chatId/members/:userId', requireAuth, (req, res) => {
  const db = readDb();
  const user = req.authUser;

  const chat = db.chats.find((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (!chat) return res.status(404).json({ error: 'chat not found' });
  
  if (!chat.isGroup) return res.status(400).json({ error: 'not a group chat' });
  
  const { userId } = req.params;
  
  if (userId === chat.creatorId) {
    return res.status(400).json({ error: 'cannot remove creator' });
  }
  
  chat.memberIds = chat.memberIds.filter(id => id !== userId);
  writeDb(db);
  return res.json({ ok: true });
});

// ==================== UPLOADS ENDPOINTS ====================
app.post('/api/uploads/chunk/start', requireAuth, (req, res) => {
  const { name, type, size } = req.body ?? {};
  if (!name || !size) return res.status(400).json({ error: 'name and size are required' });
  const uploadId = uuidv4();
  const tempName = `${uploadId}.part`;
  const tempPath = path.join(UPLOADS_DIR, tempName);
  fs.writeFileSync(tempPath, '');
  uploadSessions.set(uploadId, {
    tempPath,
    name: String(name),
    type: String(type ?? 'application/octet-stream'),
    size: Number(size),
    received: 0,
  });
  return res.json({ uploadId });
});

app.post('/api/uploads/chunk/:uploadId', requireAuth, express.raw({ type: 'application/octet-stream', limit: '25mb' }), (req, res) => {
  const session = uploadSessions.get(req.params.uploadId);
  if (!session) return res.status(404).json({ error: 'upload session not found' });
  const chunk = req.body;
  if (!Buffer.isBuffer(chunk)) return res.status(400).json({ error: 'invalid chunk' });
  fs.appendFileSync(session.tempPath, chunk);
  session.received += chunk.length;
  return res.json({ received: session.received });
});

app.post('/api/uploads/chunk/:uploadId/finish', requireAuth, (req, res) => {
  const session = uploadSessions.get(req.params.uploadId);
  if (!session) return res.status(404).json({ error: 'upload session not found' });
  if (session.received !== session.size) {
    return res.status(400).json({ error: `incomplete upload: received ${session.received} of ${session.size}` });
  }

  const ext = path.extname(session.name || '');
  const finalName = `${uuidv4()}${ext}`;
  const finalPath = path.join(UPLOADS_DIR, finalName);
  fs.renameSync(session.tempPath, finalPath);
  uploadSessions.delete(req.params.uploadId);

  return res.json({
    file: {
      id: uuidv4(),
      name: session.name,
      type: session.type,
      size: session.size,
      url: `/uploads/${finalName}`,
    },
  });
});

// ==================== ERROR HANDLING ====================
app.use((error, _req, res, next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'file too large (max 10MB)' });
  }
  if (error?.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'too many files (max 1)' });
  }
  return next(error);
});

// ==================== START SERVER ====================
const PORT = 4000;
const HOST = '192.168.1.104';

server.listen(PORT, HOST, () => {
  console.log(`API server running on http://192.168.1.104:${PORT}`);
  console.log(`Uploads directory: ${UPLOADS_DIR}`);
});

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';

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
        fileSize: 5 * 1024 * 1024 * 1024,
        files: 5,
      },
    })
  : null;

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
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
    });
  }
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

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

  const user = { id: uuidv4(), name: name.trim(), email: emailNormalized, password };
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

app.get('/api/me', (req, res) => {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

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

app.post('/api/friends/request', (req, res) => {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

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

app.post('/api/friends/accept', (req, res) => {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

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

app.delete('/api/friends/:friendId', (req, res) => {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

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

app.get('/api/chats', (req, res) => {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const chats = db.chats.filter((chat) => chat.memberIds.includes(user.id));
  return res.json({ chats });
});

app.post('/api/chats/group', (req, res) => {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

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
  };
  db.chats.push(chat);
  writeDb(db);
  return res.status(201).json({ chat });
});


if (!upload) {
  app.post('/api/uploads', requireAuth, (_req, res) => {
    return res.status(503).json({ error: 'uploads unavailable: run npm install to install multer' });
  });
} else {
  app.post('/api/uploads', requireAuth, upload.array('files', 5), (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const host = `${req.protocol}://${req.get('host')}`;

    return res.json({
      files: files.map((file) => ({
        id: uuidv4(),
        name: file.originalname,
        type: file.mimetype || 'application/octet-stream',
        size: file.size,
        url: `${host}/uploads/${file.filename}`,
      })),
    });
  });
}

app.post('/api/chats/:chatId/messages', (req, res) => {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const chat = db.chats.find((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (!chat) return res.status(404).json({ error: 'chat not found' });

  const text = String(req.body.text ?? '').trim();
  const attachmentsRaw = Array.isArray(req.body.attachments) ? req.body.attachments : [];
  const attachments = attachmentsRaw
    .filter((item) => item && typeof item.url === 'string' && (item.url.startsWith('data:') || item.url.includes('/uploads/')))
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


app.delete('/api/chats/:chatId/messages', (req, res) => {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const chat = db.chats.find((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (!chat) return res.status(404).json({ error: 'chat not found' });

  chat.messages = [];
  writeDb(db);
  return res.json({ ok: true });
});

app.delete('/api/chats/:chatId/messages/:messageId', (req, res) => {
  const db = readDb();
  const user = getAuthUser(req, db);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const chat = db.chats.find((item) => item.id === req.params.chatId && item.memberIds.includes(user.id));
  if (!chat) return res.status(404).json({ error: 'chat not found' });

  const message = chat.messages.find((item) => item.id === req.params.messageId);
  if (!message || message.senderId !== user.id) return res.status(403).json({ error: 'forbidden' });

  message.deletedForEveryone = true;
  message.text = 'Сообщение удалено';
  writeDb(db);
  return res.json({ ok: true });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

app.use((error, _req, res, next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'file too large (max 5GB)' });
  }
  if (error?.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'too many files (max 5)' });
  }
  return next(error);
});

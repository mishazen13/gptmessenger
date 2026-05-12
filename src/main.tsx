// main.tsx
import './polyfills';

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { api } from './lib/api';
import { 
  AppPage, 
  AuthPage, 
  Chat, 
  MeResponse, 
  Message, 
  MessageAttachment, 
  MessageContextMenu, 
  PublicUser, 
  SettingsSection, 
  ThemeSettings,
  PresenceStatus,
  CallParticipant,
  CallType 
} from './types';
import { WelcomePage } from './pages/WelcomePage';
import { AuthLoginPage } from './pages/AuthLoginPage';
import { AuthRegisterPage } from './pages/AuthRegisterPage';
import { Sidebar } from './components/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { AddFriendPage } from './pages/AddFriendPage';
import { PlusPage } from './pages/PlusPage';
import { SettingsPage } from './pages/SettingsPage';
import { FriendProfilePage } from './pages/FriendProfilePage';
import { CreateGroupPage } from './pages/CreateGroupPage';
import { GroupProfilePage } from './pages/GroupProfilePage';
import { IncomingCallModal } from './components/IncomingCallModal';
import socketService from './services/socket';
import webrtcService from './services/webrtc';

const TOKEN_KEY = 'liquid-messenger-token';
const UI_VERSION = 'UI v5.0';
const PREFS_KEY = 'ui-prefs-v1';

const DEFAULT_THEME: ThemeSettings = {
  accentColor: '#06b6d4',
  wallpaperBlur: 0,
  panelOpacity: 0.15,
  sidebarOpacity: 0.15,
  bubbleRadius: 16,
  contentBlur: 14,
  fontScale: 100,
  saturation: 80,
};

// Цветовые темы
const COLOR_THEMES = [
  { name: 'Ocean Breeze', accentColor: '#06b6d4', gradientFrom: '#0f172a', gradientTo: '#1e293b', description: 'Свежий океанский бриз' },
  { name: 'Sunset', accentColor: '#f43f5e', gradientFrom: '#1e1b4b', gradientTo: '#2e1065', description: 'Тёплый закат' },
  { name: 'Forest', accentColor: '#10b981', gradientFrom: '#022c22', gradientTo: '#064e3b', description: 'Лесная глушь' },
  { name: 'Midnight', accentColor: '#8b5cf6', gradientFrom: '#0f172a', gradientTo: '#1e1b4b', description: 'Тёмная ночь' },
  { name: 'Cherry', accentColor: '#ec4899', gradientFrom: '#2e0f1f', gradientTo: '#4c0d30', description: 'Вишнёвый сад' },
  { name: 'Gold', accentColor: '#fbbf24', gradientFrom: '#2a1a04', gradientTo: '#3b2507', description: 'Золотая эпоха' },
  { name: 'Emerald', accentColor: '#2dd4bf', gradientFrom: '#022c2a', gradientTo: '#064e46', description: 'Изумрудный блеск' },
  { name: 'Lavender', accentColor: '#a78bfa', gradientFrom: '#1a0b2e', gradientTo: '#2e1065', description: 'Лавандовые поля' },
];

type UserPrefs = { 
  avatarUrl?: string; 
  bannerUrl?: string; 
  wallpaperUrl?: string; 
  theme?: ThemeSettings 
};

type PrefMap = Record<string, UserPrefs>;

const readPrefs = (): PrefMap => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as PrefMap) : {};
  } catch {
    return {};
  }
};

const savePrefs = (prefs: PrefMap): void => {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
};

const API_BASE = 'http://192.168.1.104:4000';

const App = (): JSX.Element => {
  const [groupAvatar, setGroupAvatar] = React.useState('');
  const [isFirstVisit, setIsFirstVisit] = React.useState(() => localStorage.getItem('liquid-visited') !== 'true');
  const [token, setToken] = React.useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = React.useState('');
  const [appPage, setAppPage] = React.useState<AppPage>('chat');
  const [authPage, setAuthPage] = React.useState<AuthPage>('login');
  const [notice, setNotice] = React.useState('');
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<MessageContextMenu | null>(null);
  const [settingsSection, setSettingsSection] = React.useState<SettingsSection>('profile');
  const [friendProfileId, setFriendProfileId] = React.useState('');
  const [groupProfileId, setGroupProfileId] = React.useState('');
  const [isEditingGroupName, setIsEditingGroupName] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');

  const [authName, setAuthName] = React.useState('');
  const [authEmail, setAuthEmail] = React.useState('');
  const [authPassword, setAuthPassword] = React.useState('');

  const [friendEmail, setFriendEmail] = React.useState('');
  const [groupName, setGroupName] = React.useState('');
  const [groupSelectedFriends, setGroupSelectedFriends] = React.useState<string[]>([]);
  const [messageText, setMessageText] = React.useState('');
  const [attachedFiles, setAttachedFiles] = React.useState<MessageAttachment[]>([]);
  const [replyToMessageId, setReplyToMessageId] = React.useState('');
  const [aliasInput, setAliasInput] = React.useState('');
  const [isEditingAlias, setIsEditingAlias] = React.useState(false);

  const [userBio, setUserBio] = React.useState('');
  const [privacySettings, setPrivacySettings] = React.useState({
    showLastSeen: true,
    showReadReceipts: true,
    allowNonFriendsMessage: true,
    showProfilePhoto: true,
  });

  const [prefs, setPrefs] = React.useState<PrefMap>(() => readPrefs());
  const [uploadingImage, setUploadingImage] = React.useState(false);

  const aliasKey = React.useMemo(() => (me ? `aliases:${me.user.id}` : ''), [me]);
  const aliases = React.useMemo<Record<string, string>>(() => {
    if (!aliasKey) return {};
    try {
      const raw = localStorage.getItem(aliasKey);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  }, [aliasKey]);

  const saveAlias = (friendId: string, alias: string): void => {
    if (!aliasKey) return;
    const next = { ...aliases, [friendId]: alias.trim() };
    localStorage.setItem(aliasKey, JSON.stringify(next));
  };

  const getDisplayName = (user: PublicUser): string => aliases[user.id] || user.name;
  const getAvatarUrl = (userId: string): string | undefined => prefs[userId]?.avatarUrl;
  const getBannerUrl = (userId: string): string | undefined => prefs[userId]?.bannerUrl;
  const getWallpaperUrl = (userId: string): string | undefined => prefs[userId]?.wallpaperUrl;

  const theme = { ...DEFAULT_THEME, ...(prefs[me?.user.id || '']?.theme ?? {}) };
  const selectedColorTheme = COLOR_THEMES.find(t => t.accentColor === theme.accentColor) || COLOR_THEMES[0];

  const readFileAsDataUrl = async (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });

  const loadUserImages = React.useCallback(async (userId: string, authToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}/images`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const images = await response.json();
        setPrefs(prev => ({
          ...prev,
          [userId]: { ...prev[userId], avatarUrl: images.avatarUrl, bannerUrl: images.bannerUrl, wallpaperUrl: images.wallpaperUrl },
        }));
      }
    } catch (error) {
      console.error('Failed to load user images:', error);
    }
  }, []);

  const refreshData = React.useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setIsSyncing(true);
    try {
      const [meData, chatData] = await Promise.all([
        api<MeResponse>('/api/me', {}, token),
        api<{ chats: Chat[] }>('/api/chats', {}, token),
      ]);
      setMe(meData);
      setChats(chatData.chats);
      await loadUserImages(meData.user.id, token);
    } catch (error) {
      console.error('Refresh data error:', error);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [token, loadUserImages]);

  React.useEffect(() => {
    if (!token || !me) return;
    const loadFriendsImages = async () => {
      for (const friendId of me.friendIds) await loadUserImages(friendId, token);
    };
    loadFriendsImages();
  }, [token, me, loadUserImages]);

  React.useEffect(() => {
    if (!token) {
      setMe(null);
      setChats([]);
      return;
    }
    refreshData().catch((error: Error) => {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setNotice(error.message);
    });
  }, [token, refreshData]);

  React.useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      refreshData(true).catch(() => null);
    }, 3000);
    return () => clearInterval(interval);
  }, [token, refreshData]);

  React.useEffect(() => {
    if (!chats.length) {
      setActiveChatId('');
      return;
    }
    if (!chats.some((chat) => chat.id === activeChatId)) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  React.useEffect(() => {
    const closeMenu = (): void => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const activeGroup = chats.find((chat) => chat.id === groupProfileId);
  const groupMembers = activeGroup?.memberIds
    .map((id) => me?.users.find((u) => u.id === id))
    .filter(Boolean) as PublicUser[] || [];

  const submitAuth = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      const endpoint = authPage === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authPage === 'register' 
        ? { name: authName, email: authEmail, password: authPassword } 
        : { email: authEmail, password: authPassword };
      const response = await api<{ token: string; user: PublicUser }>(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      sessionStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
      setNotice('Успешная авторизация.');
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const [presenceMap, setPresenceMap] = React.useState<Record<string, PresenceStatus>>({});
  const [manualPresence, setManualPresence] = React.useState<PresenceStatus>('online');
  const [incomingCall, setIncomingCall] = React.useState<{ from: string; fromName: string; fromAvatar?: string; type: CallType; chatId?: string } | null>(null);
  const callPeerIdRef = React.useRef('');
  const pendingOfferRef = React.useRef<Map<string, unknown>>(new Map());
  const [callType, setCallType] = React.useState<CallType>('audio');
  const [isCallActive, setIsCallActive] = React.useState(false);
  const [callExpanded, setCallExpanded] = React.useState(true);
  const [participants, setParticipants] = React.useState<CallParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = React.useState<Map<string, MediaStream>>(new Map());
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const meId = me?.user.id;

  // Разблокировка аудио контекста при первом взаимодействии
  React.useEffect(() => {
    const unlockAudio = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  React.useEffect(() => {
    if (!token || !me) return;
    socketService.connect(token);

    const onIncoming = ({ from, fromName, fromAvatar, type, chatId }: any) =>
      setIncomingCall({ from, fromName, fromAvatar, type, chatId });
    const onAccepted = () => setIsCallActive(true);
    const onRejected = ({ from }: any) => {
      setNotice('Звонок отклонен');
      setIsCallActive(false);
      setParticipants([]);
      setRemoteStreams(new Map());
      callPeerIdRef.current = '';
      setIsScreenSharing(false);
      webrtcService.endAllCalls();
    };
    const onEnded = () => {
      webrtcService.endAllCalls();
      setIsCallActive(false);
      setParticipants([]);
      setRemoteStreams(new Map());
      callPeerIdRef.current = '';
      setIsScreenSharing(false);
    };
    const onSignal = ({ from, signal }: any) => {
      const signalType = (signal as { type?: string })?.type;
      if (!signalType) return;
      
      if (signalType === 'offer') {
        const applied = webrtcService.signalPeer(from, signal);
        if (!applied) pendingOfferRef.current.set(from, signal);
        return;
      }
      
      webrtcService.signalPeer(from, signal);
    };
    
    socketService.on('call:incoming', onIncoming);
    socketService.on('call:accepted', onAccepted);
    socketService.on('call:rejected', onRejected);
    socketService.on('call:ended', onEnded);
    socketService.on('signal', onSignal);
    socketService.on('presence:update', (payload: Record<string, { status: PresenceStatus }>) => {
      console.log('📡 presence:update received:', payload);
      const flat: Record<string, PresenceStatus> = {};
      Object.entries(payload).forEach(([id, val]) => { flat[id] = val.status; });
      setPresenceMap(flat);
    });
    webrtcService.onRemoteStream((userId, stream) => {
      setRemoteStreams((prev) => new Map(prev).set(userId, stream));
    });

    return () => {
      socketService.off('call:incoming', onIncoming);
      socketService.off('call:accepted', onAccepted);
      socketService.off('call:rejected', onRejected);
      socketService.off('call:ended', onEnded);
      socketService.off('signal', onSignal);
    };
  }, [token, meId]);

  React.useEffect(() => {
    if (!token || !me || !socketService.isConnected()) return;
    console.log('📡 Sending presence update:', manualPresence);
    socketService.emit('presence:set', { status: manualPresence, manual: true });
  }, [token, meId, manualPresence]);

  const logout = async (): Promise<void> => {
    if (token) await api('/api/auth/logout', { method: 'POST' }, token).catch(() => null);
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMe(null);
    setChats([]);
    setPrefs({});
    setNotice('Вы вышли из аккаунта.');
    setIsFirstVisit(true);
    setAuthPage('login');
  };

  const saveAppearanceFile = async (field: 'avatarUrl' | 'bannerUrl' | 'wallpaperUrl', file: File | null): Promise<void> => {
    if (!me || !file || !token) return;
    if (uploadingImage) {
      setNotice('Подождите, предыдущее изображение загружается...');
      return;
    }
    setUploadingImage(true);
    try {
      const endpoint = field === 'wallpaperUrl' ? '/api/users/upload-wallpaper' : '/api/users/upload-image';
      const formData = new FormData();
      formData.append('file', file);
      if (field !== 'wallpaperUrl') formData.append('field', field);
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Upload failed');
      const data = await response.json();
      const serverUrl = data.url;
      setPrefs(prev => {
        const next = { ...prev, [me.user.id]: { ...prev[me.user.id], [field]: serverUrl } };
        savePrefs(next);
        return next;
      });
      setNotice(field === 'avatarUrl' ? '✓ Аватар сохранён' : field === 'bannerUrl' ? '✓ Баннер сохранён' : '✓ Обои сохранены');
    } catch (error) {
      setNotice(`Ошибка: ${(error as Error).message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const updateTheme = React.useCallback(<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]): void => {
    if (!me) return;
    setPrefs(prev => {
      const next = {
        ...prev,
        [me.user.id]: {
          ...prev[me.user.id],
          theme: { ...DEFAULT_THEME, ...(prev[me.user.id]?.theme ?? {}), [key]: value },
        },
      };
      savePrefs(next);
      return next;
    });
  }, [me]);

  const resetTheme = React.useCallback((): void => {
    if (!me) return;
    setPrefs(prev => {
      const next = { ...prev, [me.user.id]: { ...prev[me.user.id], theme: DEFAULT_THEME } };
      savePrefs(next);
      return next;
    });
    setNotice('Тема сброшена.');
  }, [me]);

  const handleUpdateBio = async (bio: string) => {
    setUserBio(bio);
    if (!token || !me) return;
    try {
      await fetch(`${API_BASE}/api/users/${me.user.id}/bio`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bio }),
      });
      setNotice('Описание сохранено');
    } catch (error) {
      console.error('Failed to save bio:', error);
    }
  };

  const handleUpdatePrivacy = async (key: string, value: boolean) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
    if (!token || !me) return;
    try {
      await fetch(`${API_BASE}/api/users/${me.user.id}/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  };

  const addFriend = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!token) return;
    try {
      await api('/api/friends/request', { method: 'POST', body: JSON.stringify({ email: friendEmail }) }, token);
      setFriendEmail('');
      setNotice('Заявка отправлена.');
      await refreshData();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const acceptFriendRequest = async (fromUserId: string): Promise<void> => {
    if (!token) return;
    try {
      await api('/api/friends/accept', { method: 'POST', body: JSON.stringify({ fromUserId }) }, token);
      setNotice('Заявка принята.');
      await refreshData();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const removeFriend = async (friendId: string): Promise<void> => {
    if (!token) return;
    try {
      await api(`/api/friends/${friendId}`, { method: 'DELETE' }, token);
      setNotice('Друг удалён.');
      setAppPage('chat');
      await refreshData();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const clearChat = async (chatId: string): Promise<void> => {
    if (!token) return;
    setChats(prev => prev.map(chat => chat.id === chatId ? { ...chat, messages: [] } : chat));
    try {
      await api(`/api/chats/${chatId}/messages`, { method: 'DELETE' }, token);
      setNotice('Чат очищен.');
      await refreshData(true);
    } catch (error) {
      setNotice((error as Error).message);
      await refreshData(true);
    }
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!token || !activeChat || (!messageText.trim() && attachedFiles.length === 0)) return;
    try {
      const localFiles = attachedFiles.filter(f => f.localFile);
      let uploaded: MessageAttachment[] = [];
      if (localFiles.length) {
        uploaded = await Promise.all(localFiles.map(async (file) => {
          const currentFile = file.localFile as File;
          const started = await api<{ uploadId: string }>(`${API_BASE}/api/uploads/chunk/start`, {
            method: 'POST',
            body: JSON.stringify({ name: currentFile.name, type: currentFile.type, size: currentFile.size }),
          }, token);
          const CHUNK_SIZE = 10 * 1024 * 1024;
          let offset = 0;
          while (offset < currentFile.size) {
            const chunk = currentFile.slice(offset, offset + CHUNK_SIZE);
            await fetch(`${API_BASE}/api/uploads/chunk/${started.uploadId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/octet-stream', 'Authorization': `Bearer ${token}` },
              body: await chunk.arrayBuffer(),
            });
            offset += chunk.size;
          }
          const finished = await api<{ file: MessageAttachment }>(`${API_BASE}/api/uploads/chunk/${started.uploadId}/finish`, { method: 'POST' }, token);
          return finished.file;
        }));
      }
      const readyAttachments = [
        ...attachedFiles.filter(f => !f.localFile).map(f => ({ id: f.id, name: f.name, type: f.type, size: f.size, url: f.url })),
        ...uploaded,
      ];
      await api(`/api/chats/${activeChat.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: messageText, replyToMessageId: replyToMessageId || undefined, attachments: readyAttachments }),
      }, token);
      attachedFiles.forEach(f => { if (f.localFile && f.url.startsWith('blob:')) URL.revokeObjectURL(f.url); });
      setMessageText('');
      setAttachedFiles([]);
      setReplyToMessageId('');
      await refreshData(true);
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const deleteMessage = async (chatId: string, messageId: string): Promise<void> => {
    if (!token) return;
    try {
      await api(`/api/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' }, token);
      setNotice('Сообщение удалено для всех.');
      await refreshData(true);
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const onMessageContextMenu = (event: React.MouseEvent<HTMLElement>, chatId: string, message: Message, mine: boolean): void => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, chatId, messageId: message.id, mine, deletedForEveryone: Boolean(message.deletedForEveryone) });
  };

  const handleMenuReply = (): void => {
    if (!contextMenu) return;
    setReplyToMessageId(contextMenu.messageId);
    setContextMenu(null);
  };

  const handleMenuDelete = (): void => {
    if (!contextMenu) return;
    void deleteMessage(contextMenu.chatId, contextMenu.messageId);
    setContextMenu(null);
  };

  const handlePickFiles = async (files: FileList | null): Promise<void> => {
    if (!files?.length) return;
    try {
      const MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024;
      const allowed = Array.from(files).slice(0, 5);
      const tooBig = allowed.find(f => f.size > MAX_FILE_BYTES);
      if (tooBig) {
        setNotice(`Файл ${tooBig.name} слишком большой. Лимит 5 ГБ на файл.`);
        return;
      }
      if (attachedFiles.length + allowed.length > 5) {
        setNotice('Можно прикрепить не более 5 файлов к сообщению.');
        return;
      }
      const nextFiles = allowed.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        url: URL.createObjectURL(file),
        localFile: file,
      }));
      setAttachedFiles(prev => [...prev, ...nextFiles].slice(0, 5));
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const createGroup = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!token) return;
    try {
      const created = await api<{ chat: Chat }>('/api/chats/group', {
        method: 'POST',
        body: JSON.stringify({ name: groupName, memberIds: groupSelectedFriends, avatarUrl: groupAvatar || undefined }),
      }, token);
      setGroupName('');
      setGroupSelectedFriends([]);
      setGroupAvatar('');
      setAppPage('chat');
      setActiveChatId(created.chat.id);
      await refreshData();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const updateGroupName = async (newName: string): Promise<void> => {
    if (!token || !groupProfileId) return;
    try {
      await api(`/api/chats/${groupProfileId}`, { method: 'PATCH', body: JSON.stringify({ name: newName }) }, token);
      setIsEditingGroupName(false);
      await refreshData();
      setNotice('Название группы обновлено');
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const leaveGroup = async (): Promise<void> => {
    if (!token || !groupProfileId) return;
    const groupId = groupProfileId;
    setChats(prev => prev.filter(chat => chat.id !== groupId));
    setAppPage('chat');
    setGroupProfileId('');
    try {
      await api(`/api/chats/${groupId}/leave`, { method: 'POST' }, token);
      setNotice('Вы покинули группу');
      await refreshData(true);
    } catch (error) {
      setNotice((error as Error).message);
      await refreshData();
    }
  };

  const deleteGroup = async (): Promise<void> => {
    if (!token || !groupProfileId) return;
    const groupId = groupProfileId;
    setChats(prev => prev.filter(chat => chat.id !== groupId));
    setAppPage('chat');
    setGroupProfileId('');
    try {
      await api(`/api/chats/${groupId}`, { method: 'DELETE' }, token);
      setNotice('Группа удалена');
      await refreshData(true);
    } catch (error) {
      setNotice((error as Error).message);
      await refreshData();
    }
  };

  const removeMemberFromGroup = async (userId: string): Promise<void> => {
    if (!token || !groupProfileId) return;
    setChats(prev => prev.map(chat => chat.id === groupProfileId ? { ...chat, memberIds: chat.memberIds.filter(id => id !== userId) } : chat));
    try {
      await api(`/api/chats/${groupProfileId}/members/${userId}`, { method: 'DELETE' }, token);
      setNotice('Участник удален из группы');
      await refreshData(true);
    } catch (error) {
      setNotice((error as Error).message);
      await refreshData();
    }
  };

  const viewMemberProfile = (userId: string): void => {
    setFriendProfileId(userId);
    setAliasInput(aliases[userId] || '');
    setIsEditingAlias(false);
    setAppPage('friend-profile');
  };

  const addMembersToGroup = async (userIds: string[]): Promise<void> => {
    if (!token || !groupProfileId) return;
    try {
      for (const userId of userIds) {
        await api(`/api/chats/${groupProfileId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }, token);
      }
      await refreshData();
      setNotice(`Добавлено ${userIds.length} участников`);
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const startCall = async (type: CallType, peerId: string): Promise<void> => {
    try {
      if (!me) throw new Error('User not authenticated');
      
      const targetUser = me.users.find(u => u.id === peerId);
      if (!targetUser) {
        console.error('❌ Target user not found:', peerId);
        setNotice('Пользователь не найден');
        return;
      }
      
      console.log('📞 Starting call to user:', targetUser.name, 'ID:', peerId);
      
      const stream = await webrtcService.initLocalStream(type === 'video');
      setCallType(type);
      callPeerIdRef.current = peerId;
      
      setParticipants([
        { userId: me.user.id, name: getDisplayName(me.user), avatarUrl: getAvatarUrl(me.user.id), isMuted: false, isVideoEnabled: type === 'video', isSpeaking: false },
        { userId: peerId, name: getDisplayName(targetUser), avatarUrl: getAvatarUrl(peerId), isMuted: false, isVideoEnabled: type === 'video', isSpeaking: false },
      ]);
      setIsCallActive(true);
      setCallExpanded(true);
      
      webrtcService.createPeer(peerId, true, stream, (signal) => {
        console.log('📡 Sending signal to', peerId, 'type:', signal.type);
        socketService.emit('signal', { to: peerId, signal });
      });
      
      socketService.emit('call:start', { to: peerId, type, chatId: activeChatId });
      console.log('📢 Emitted call:start to', peerId);
      
    } catch (error: any) {
      console.error('❌ Failed to start call:', error);
      setNotice(`Ошибка звонка: ${error.message}`);
    }
  };

  const acceptIncomingCall = async (): Promise<void> => {
    if (!incomingCall) return;
    try {
      const callData = { ...incomingCall };
      setIncomingCall(null);
      const stream = await webrtcService.initLocalStream(callData.type === 'video');
      
      webrtcService.createPeer(callData.from, false, stream, (signal) => {
        console.log('📡 Sending answer signal to', callData.from, 'type:', signal.type);
        socketService.emit('signal', { to: callData.from, signal });
      });
      
      const pendingOffer = pendingOfferRef.current.get(callData.from);
      if (pendingOffer) {
        webrtcService.signalPeer(callData.from, pendingOffer);
        pendingOfferRef.current.delete(callData.from);
      }
      
      setCallType(callData.type);
      callPeerIdRef.current = callData.from;
      setIsCallActive(true);
      setCallExpanded(true);
      
      setParticipants([
        { userId: me!.user.id, name: getDisplayName(me!.user), avatarUrl: getAvatarUrl(me!.user.id), isMuted: false, isVideoEnabled: callData.type === 'video', isSpeaking: false },
        { userId: callData.from, name: callData.fromName, avatarUrl: callData.fromAvatar, isMuted: false, isVideoEnabled: callData.type === 'video', isSpeaking: false },
      ]);
      
      socketService.emit('call:accept', { from: callData.from });
      console.log('📢 Emitted call:accept to', callData.from);
      
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      setNotice((error as Error).message);
      setIsCallActive(false);
    }
  };

  const endCall = (): void => {
    if (callPeerIdRef.current) socketService.emit('call:end', { to: callPeerIdRef.current });
    webrtcService.endAllCalls();
    setIsCallActive(false);
    setParticipants([]);
    setRemoteStreams(new Map());
    callPeerIdRef.current = '';
    setIsScreenSharing(false);
  };

  const toggleMuteCall = (): void => {
    if (!me) return;
    setParticipants(prev => prev.map(p => p.userId === me.user.id ? { ...p, isMuted: !p.isMuted } : p));
    const meP = participants.find(p => p.userId === me.user.id);
    webrtcService.toggleAudio(Boolean(meP?.isMuted));
  };

  const toggleVideoCall = (): void => {
    if (!me) return;
    setParticipants(prev => prev.map(p => p.userId === me.user.id ? { ...p, isVideoEnabled: !p.isVideoEnabled } : p));
    const meP = participants.find(p => p.userId === me.user.id);
    webrtcService.toggleVideo(!meP?.isVideoEnabled);
  };

  const toggleScreenShare = async (): Promise<void> => {
    if (!me || !callPeerIdRef.current || !activeChat) {
      setNotice('Нет активного звонка');
      return;
    }
    
    try {
      if (!isScreenSharing) {
        const screenStream = await webrtcService.startScreenShare();
        if (screenStream) {
          await webrtcService.replaceLocalStream(screenStream, true);
          setIsScreenSharing(true);
          setNotice('Демонстрация экрана начата');
        } else {
          setNotice('Не удалось начать демонстрацию экрана');
        }
      } else {
        await webrtcService.stopScreenShare();
        setIsScreenSharing(false);
        setNotice('Демонстрация экрана остановлена');
      }
    } catch (error) {
      console.error('❌ Screen share error:', error);
      setNotice('Ошибка при демонстрации экрана');
    }
  };

  // Если нет авторизации
  if (!token || !me) {
    if (isFirstVisit) {
      return (
        <WelcomePage
          onRegister={() => { setAuthPage('register'); setIsFirstVisit(false); localStorage.setItem('liquid-visited', 'true'); }}
          onLogin={() => { setAuthPage('login'); setIsFirstVisit(false); localStorage.setItem('liquid-visited', 'true'); }}
        />
      );
    }
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 p-4 text-white">
        <div className="max-w-md w-full rounded-3xl border border-white/20 bg-white/10 p-6 shadow-glass backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h1 className="text-3xl font-bold">{authPage === 'login' ? 'Вход' : 'Регистрация'}</h1>
            <span className="rounded-full bg-cyan-300/20 px-3 py-1 text-xs text-cyan-100">{UI_VERSION}</span>
          </div>
          {authPage === 'login' ? (
            <AuthLoginPage
              email={authEmail} password={authPassword} onEmail={setAuthEmail} onPassword={setAuthPassword}
              onSubmit={submitAuth} onBack={() => { setIsFirstVisit(true); setAuthPage('login'); }}
            />
          ) : (
            <AuthRegisterPage
              name={authName} email={authEmail} password={authPassword}
              onName={setAuthName} onEmail={setAuthEmail} onPassword={setAuthPassword}
              onSubmit={submitAuth} onBack={() => { setIsFirstVisit(true); setAuthPage('login'); }}
            />
          )}
          <div className="mt-4 text-center text-sm">
            {authPage === 'login' ? (
              <p>Нет аккаунта? <button onClick={() => setAuthPage('register')} className="text-cyan-400 hover:text-cyan-300">Зарегистрироваться</button></p>
            ) : (
              <p>Уже есть аккаунт? <button onClick={() => setAuthPage('login')} className="text-cyan-400 hover:text-cyan-300">Войти</button></p>
            )}
          </div>
          {notice && <p className="mt-4 text-sm text-cyan-200 text-center">{notice}</p>}
        </div>
      </main>
    );
  }

  const wallpaper = getWallpaperUrl(me.user.id);
  const peerId = activeChat && !activeChat.isGroup 
    ? activeChat.memberIds.find(id => id !== me.user.id) 
    : null;
  const peerLastSeen = peerId 
    ? me.users.find(u => u.id === peerId)?.lastSeen 
    : undefined;
  const peerPresenceValue = peerId ? (presenceMap[peerId] || 'offline') : 'offline';

  console.log('👤 Peer ID:', peerId, 'Peer Presence:', peerPresenceValue, 'Peer LastSeen:', peerLastSeen);

  return (
    <main
      className="relative min-h-screen overflow-hidden p-4 text-white transition-all duration-500"
      style={{
        backgroundImage: wallpaper
          ? `linear-gradient(135deg, ${selectedColorTheme.gradientFrom}, ${selectedColorTheme.gradientTo}), url(${API_BASE}${wallpaper})`
          : `linear-gradient(135deg, ${selectedColorTheme.gradientFrom}, ${selectedColorTheme.gradientTo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: `saturate(${theme.saturation}%)`,
        fontSize: `${theme.fontScale}%`,
      }}
    >
      <div className="absolute inset-0 transition-all duration-500" style={{ backdropFilter: `blur(${theme.wallpaperBlur}px)` }} />
      <div className="relative mx-auto grid gap-4 lg:grid-cols-[320px_1fr]">
        <Sidebar
          me={me.user}
          chats={chats}
          users={me.users}
          activeChatId={activeChatId}
          getBannerUrl={getBannerUrl}
          isSyncing={isSyncing}
          appPage={appPage}
          settingsSection={settingsSection}
          onSettingsSection={setSettingsSection}
          onSelectChat={(id) => { setActiveChatId(id); setAppPage('chat'); }}
          onOpenPlus={() => setAppPage('plus')}
          onOpenSettings={() => setAppPage('settings')}
          displayName={getDisplayName}
          getAvatarUrl={getAvatarUrl}
          uiVersion={UI_VERSION}
          avatarUrl={getAvatarUrl(me.user.id)}
          bannerUrl={getBannerUrl(me.user.id)}
          accentColor={theme.accentColor}
          contentBlur={theme.contentBlur}
          myPresence={presenceMap[me.user.id] ?? manualPresence}
          onPresenceChange={(status) => { setManualPresence(status); socketService.emit('presence:set', { status, manual: true }); }}
          presenceMap={presenceMap}
        />
        <section className="h-[calc(100vh-2rem)]">
          <div key={appPage} className="h-full animate-pageIn">
            {appPage === 'chat' && (
              <ChatPage
                token={token}
                me={me.user}
                users={me.users}
                activeChat={activeChat}
                getDisplayName={getDisplayName}
                getAvatarUrl={getAvatarUrl}
                onOpenFriendProfile={(id) => { setFriendProfileId(id); setAliasInput(aliases[id] || ''); setIsEditingAlias(false); setAppPage('friend-profile'); }}
                onOpenGroupProfile={(id) => { setGroupProfileId(id); setNewGroupName(chats.find(c => c.id === id)?.name || ''); setIsEditingGroupName(false); setAppPage('group-profile'); }}
                onContextMenu={onMessageContextMenu}
                replyToMessageId={replyToMessageId}
                onClearReply={() => setReplyToMessageId('')}
                messageText={messageText}
                onMessageText={setMessageText}
                onSend={sendMessage}
                onPickFiles={(files) => {
                  console.log('📎 onPickFiles called with:', files);
                  if (files) {
                    const newFiles = Array.from(files).map(file => ({
                      id: crypto.randomUUID(),
                      name: file.name,
                      type: file.type || 'application/octet-stream',
                      size: file.size,
                      url: URL.createObjectURL(file),
                      localFile: file,
                    }));
                    console.log('📎 New files created:', newFiles);
                    setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 5));
                  }
                }}
                attachedFiles={attachedFiles}
                onRemoveAttachedFile={(id) => setAttachedFiles(prev => {
                  const removing = prev.find(item => item.id === id);
                  if (removing?.localFile && removing.url.startsWith('blob:')) URL.revokeObjectURL(removing.url);
                  return prev.filter(item => item.id !== id);
                })}
                theme={theme}
                peerPresence={peerPresenceValue}
                peerLastSeen={peerLastSeen}
                onStartCall={startCall}
                isCallActive={isCallActive}
                callType={callType}
                participants={participants}
                onEndCall={endCall}
                onToggleMute={toggleMuteCall}
                onToggleVideo={toggleVideoCall}
                callExpanded={callExpanded}
                onToggleCallExpand={() => setCallExpanded(v => !v)}
                localStream={webrtcService.getLocalStream()}
                remoteStreams={remoteStreams}
                onToggleScreenShare={toggleScreenShare}
                isScreenSharing={isScreenSharing}
              />
            )}
            {appPage === 'plus' && <PlusPage onOpenAddFriend={() => setAppPage('add-friend')} onOpenCreateGroup={() => setAppPage('create-group')} />}
            {appPage === 'add-friend' && (
              <AddFriendPage 
                friendEmail={friendEmail} 
                onFriendEmail={setFriendEmail} 
                onAddFriend={addFriend} 
                requests={me.incomingRequestIds.map(id => me.users.find(u => u.id === id)).filter(Boolean) as PublicUser[]} 
                onAccept={(id) => acceptFriendRequest(id)} 
              />
            )}
            {appPage === 'create-group' && (
              <CreateGroupPage
                groupName={groupName}
                onGroupName={setGroupName}
                friends={me.friendIds.map(id => me.users.find(u => u.id === id)).filter(Boolean) as PublicUser[]}
                selected={groupSelectedFriends}
                onToggle={(id) => setGroupSelectedFriends(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])}
                onCreateGroup={createGroup}
              />
            )}
            {appPage === 'settings' && (
              <SettingsPage
                me={me.user}
                section={settingsSection}
                onBack={() => setAppPage('chat')}
                onLogout={logout}
                uiVersion={UI_VERSION}
                onAvatarFile={(file) => saveAppearanceFile('avatarUrl', file)}
                onWallpaperFile={(file) => saveAppearanceFile('wallpaperUrl', file)}
                onBannerFile={(file) => saveAppearanceFile('bannerUrl', file)}
                theme={theme}
                onTheme={updateTheme}
                onResetTheme={resetTheme}
                avatarUrl={getAvatarUrl(me.user.id)}
                bannerUrl={getBannerUrl(me.user.id)}
                bio={userBio}
                onUpdateBio={handleUpdateBio}
                privacySettings={privacySettings}
                onUpdatePrivacy={handleUpdatePrivacy}
              />
            )}
            {appPage === 'friend-profile' && (
              <FriendProfilePage
                friend={me.users.find(u => u.id === friendProfileId)}
                alias={aliasInput}
                isEditingAlias={isEditingAlias}
                onAlias={setAliasInput}
                onToggleEdit={() => setIsEditingAlias(v => !v)}
                onSaveAlias={() => { if (friendProfileId) saveAlias(friendProfileId, aliasInput); setIsEditingAlias(false); }}
                onDeleteFriend={() => removeFriend(friendProfileId)}
                onClearChat={() => {
                  const directChat = chats.find(c => !c.isGroup && c.memberIds.includes(me.user.id) && c.memberIds.includes(friendProfileId));
                  if (directChat) clearChat(directChat.id);
                }}
                chat={chats.find(c => !c.isGroup && c.memberIds.includes(me.user.id) && c.memberIds.includes(friendProfileId))}
                avatarUrl={getAvatarUrl(friendProfileId)}
                bannerUrl={getBannerUrl(friendProfileId)}
                presenceStatus={presenceMap[friendProfileId] || 'offline'}
                lastSeen={me.users.find(u => u.id === friendProfileId)?.lastSeen}
                bio={me.users.find(u => u.id === friendProfileId)?.bio}
              />
            )}
            {appPage === 'group-profile' && (
              <GroupProfilePage
                group={activeGroup}
                me={me.user}
                members={groupMembers}
                friends={me.friendIds.map(id => me.users.find(u => u.id === id)).filter(Boolean) as PublicUser[]}
                isEditingName={isEditingGroupName}
                onNameChange={setNewGroupName}
                onToggleEdit={() => setIsEditingGroupName(v => !v)}
                onSaveName={() => updateGroupName(newGroupName)}
                onLeaveGroup={leaveGroup}
                onDeleteGroup={deleteGroup}
                onClearChat={() => activeGroup && clearChat(activeGroup.id)}
                onAddMember={addMembersToGroup}
                onRemoveMember={removeMemberFromGroup}
                onViewMemberProfile={viewMemberProfile}
                isAdmin={activeGroup?.creatorId === me.user.id}
                creatorId={activeGroup?.creatorId}
                getAvatarUrl={getAvatarUrl}
              />
            )}
          </div>
        </section>
      </div>
      <IncomingCallModal
        isOpen={Boolean(incomingCall)}
        callerName={incomingCall?.fromName ?? ''}
        callerAvatar={incomingCall?.fromAvatar}
        callType={incomingCall?.type ?? 'audio'}
        onAccept={acceptIncomingCall}
        onReject={() => {
          if (incomingCall) {
            socketService.emit('call:reject', { from: incomingCall.from });
            setIncomingCall(null);
            setNotice('Звонок отклонен');
          }
        }}
      />
      {contextMenu && (
        <div className="animate-scaleIn fixed z-50 min-w-44 rounded-xl border border-white/20 bg-slate-950/95 p-1 text-sm shadow-glass backdrop-blur-xl" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10" onClick={handleMenuReply}>Ответить</button>
          {contextMenu.mine && !contextMenu.deletedForEveryone && (
            <button className="block w-full rounded-lg px-3 py-2 text-left text-rose-300 hover:bg-white/10" onClick={handleMenuDelete}>Удалить для всех</button>
          )}
        </div>
      )}
    </main>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
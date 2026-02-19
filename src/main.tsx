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
  accentColor: '#22d3ee',
  wallpaperBlur: 0,
  panelOpacity: 0.15,
  sidebarOpacity: 0.15,
  bubbleRadius: 16,
  contentBlur: 14,
  fontScale: 100,
  saturation: 100,
};

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

  const [prefs, setPrefs] = React.useState<PrefMap>(() => readPrefs());

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

  const readFileAsDataUrl = async (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });

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
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [token]);

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
      const response = await api<{ token: string }>(endpoint, { method: 'POST', body: JSON.stringify(payload) });
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
  const [callType, setCallType] = React.useState<CallType>('audio');
  const [isCallActive, setIsCallActive] = React.useState(false);
  const [callExpanded, setCallExpanded] = React.useState(true);
  const [participants, setParticipants] = React.useState<CallParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = React.useState<Map<string, MediaStream>>(new Map());

  const meId = me?.user.id;

  React.useEffect(() => {
    if (!token || !me) return;
    socketService.connect(token);

    const onIncoming = ({ from, fromName, fromAvatar, type, chatId }: { from: string; fromName: string; fromAvatar?: string; type: CallType; chatId?: string }): void => {
      setIncomingCall({ from, fromName, fromAvatar, type, chatId });
    };
    const onAccepted = (): void => setIsCallActive(true);
    const onEnded = (): void => {
      webrtcService.endAllCalls();
      setIsCallActive(false);
      setParticipants([]);
      setRemoteStreams(new Map());
      callPeerIdRef.current = '';
    };
    const onSignal = ({ from, signal }: { from: string; signal: unknown }): void => {
      const local = webrtcService.getLocalStream();
      if (!local) return;
      if (!callPeerIdRef.current) {
        callPeerIdRef.current = from;
        webrtcService.createPeer(from, false, local, (payload) => socketService.emit('signal', { to: from, signal: payload }));
      }
      webrtcService.signalPeer(from, signal);
    };

    socketService.on('call:incoming', onIncoming);
    socketService.on('call:accepted', onAccepted);
    socketService.on('call:ended', onEnded);
    socketService.on('signal', onSignal);
    socketService.on('presence:update', (payload: Record<string, { status: PresenceStatus }>) => {
      const flat: Record<string, PresenceStatus> = {};
      Object.entries(payload).forEach(([id, val]) => { flat[id] = val.status; });
      setPresenceMap(flat);
    });

    webrtcService.onRemoteStream((userId, stream) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(userId, stream);
        return next;
      });
    });

    socketService.emit('presence:set', { status: manualPresence, manual: true });

    return () => {
      socketService.disconnect();
      webrtcService.endAllCalls();
    };
  }, [token, meId, manualPresence]);

  const logout = async (): Promise<void> => {
    if (token) await api('/api/auth/logout', { method: 'POST' }, token).catch(() => null);
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setNotice('Вы вышли из аккаунта.');
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

  // В main.tsx, обновите функцию clearChat
  const clearChat = async (chatId: string): Promise<void> => {
    if (!token) return;
    
    // Сначала очищаем локально для мгновенного отображения
    setChats((prevChats) => 
      prevChats.map((chat) => 
        chat.id === chatId 
          ? { ...chat, messages: [] } 
          : chat
      )
    );
    
    try {
      await api(`/api/chats/${chatId}/messages`, { method: 'DELETE' }, token);
      setNotice('Чат очищен.');
      await refreshData(true); // Тихий рефреш для синхронизации
    } catch (error) {
      setNotice((error as Error).message);
      // Если ошибка, откатываем изменения
      await refreshData(true);
    }
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!token || !activeChat || (!messageText.trim() && attachedFiles.length === 0)) return;
    try {
      const localFiles = attachedFiles.filter((file) => file.localFile);
      let uploaded: MessageAttachment[] = [];

      if (localFiles.length) {
        const env = (import.meta as ImportMeta & { env?: Record<string, string | boolean> }).env;
        const uploadBase = env?.DEV ? String(env.VITE_API_URL ?? 'http://192.168.0.106:4000') : '';
        const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        uploaded = await Promise.all(localFiles.map(async (file) => {
          const currentFile = file.localFile as File;
          const started = await api<{ uploadId: string }>(`${uploadBase}/api/uploads/chunk/start`, {
            method: 'POST',
            body: JSON.stringify({ name: currentFile.name, type: currentFile.type, size: currentFile.size }),
          }, token);

          const CHUNK_SIZE = 10 * 1024 * 1024;
          let offset = 0;
          while (offset < currentFile.size) {
            const blob = currentFile.slice(offset, offset + CHUNK_SIZE);
            const chunkBuffer = await blob.arrayBuffer();
            const response = await fetch(`${uploadBase}/api/uploads/chunk/${started.uploadId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                ...authHeader,
              },
              body: chunkBuffer,
            });
            if (!response.ok) {
              const payload = (await response.json().catch(() => ({}))) as { error?: string };
              throw new Error(payload.error ?? 'chunk upload failed');
            }
            offset += blob.size;
          }

          const finished = await api<{ file: MessageAttachment }>(`${uploadBase}/api/uploads/chunk/${started.uploadId}/finish`, {
            method: 'POST',
          }, token);
          return finished.file;
        }));
      }

      const readyAttachments = [
        ...attachedFiles.filter((file) => !file.localFile).map((file) => ({ 
          id: file.id, 
          name: file.name, 
          type: file.type, 
          size: file.size, 
          url: file.url 
        })),
        ...uploaded,
      ];

      await api(`/api/chats/${activeChat.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          text: messageText,
          replyToMessageId: replyToMessageId || undefined,
          attachments: readyAttachments,
        }),
      }, token);
      
      attachedFiles.forEach((file) => {
        if (file.localFile && file.url.startsWith('blob:')) URL.revokeObjectURL(file.url);
      });
      
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
    setContextMenu({ 
      x: event.clientX, 
      y: event.clientY, 
      chatId, 
      messageId: message.id, 
      mine, 
      deletedForEveryone: Boolean(message.deletedForEveryone) 
    });
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

  const saveAppearanceFile = async (field: 'avatarUrl' | 'bannerUrl' | 'wallpaperUrl', file: File | null): Promise<void> => {
    if (!me || !file) return;
    try {
      const value = await readFileAsDataUrl(file);
      const next = {
        ...prefs,
        [me.user.id]: {
          ...prefs[me.user.id],
          [field]: value,
        },
      };
      setPrefs(next);
      savePrefs(next);
      setNotice(field === 'avatarUrl' ? 'Аватар сохранён.' : field === 'bannerUrl' ? 'Баннер сохранён.' : 'Обои сохранены.');
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const updateTheme = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]): void => {
    if (!me) return;
    const next = {
      ...prefs,
      [me.user.id]: {
        ...prefs[me.user.id],
        theme: {
          ...DEFAULT_THEME,
          ...(prefs[me.user.id]?.theme ?? {}),
          [key]: value,
        },
      },
    };
    setPrefs(next);
    savePrefs(next);
  };

  const resetTheme = (): void => {
    if (!me) return;
    const next = {
      ...prefs,
      [me.user.id]: {
        ...prefs[me.user.id],
        theme: DEFAULT_THEME,
      },
    };
    setPrefs(next);
    savePrefs(next);
    setNotice('Тема сброшена.');
  };

  const handlePickFiles = async (files: FileList | null): Promise<void> => {
    if (!files?.length) return;
    try {
      const MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024;
      const allowed = Array.from(files).slice(0, 5);
      const tooBig = allowed.find((file) => file.size > MAX_FILE_BYTES);
      if (tooBig) {
        setNotice(`Файл ${tooBig.name} слишком большой. Лимит 5 ГБ на файл.`);
        return;
      }

      if (attachedFiles.length + allowed.length > 5) {
        setNotice('Можно прикрепить не более 5 файлов к сообщению.');
        return;
      }

      const nextFiles = allowed.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        url: URL.createObjectURL(file),
        localFile: file,
      }));
      setAttachedFiles((prev) => [...prev, ...nextFiles].slice(0, 5));
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
        body: JSON.stringify({ 
          name: groupName, 
          memberIds: groupSelectedFriends,
          avatarUrl: groupAvatar || undefined
        }) 
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

  // Group management functions
  const updateGroupName = async (newName: string): Promise<void> => {
    if (!token || !groupProfileId) return;
    try {
      await api(`/api/chats/${groupProfileId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName })
      }, token);
      setIsEditingGroupName(false);
      await refreshData();
      setNotice('Название группы обновлено');
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  // В main.tsx, обновите функцию leaveGroup
  const leaveGroup = async (): Promise<void> => {
    if (!token || !groupProfileId) return;
    
    const groupId = groupProfileId;
    
    // Сначала удаляем локально для мгновенного отображения
    setChats((prevChats) => prevChats.filter((chat) => chat.id !== groupId));
    setAppPage('chat');
    setGroupProfileId('');
    
    try {
      await api(`/api/chats/${groupId}/leave`, { method: 'POST' }, token);
      setNotice('Вы покинули группу');
      await refreshData(true);
    } catch (error) {
      setNotice((error as Error).message);
      // Если ошибка, восстанавливаем данные
      await refreshData();
    }
  };

  // В main.tsx, обновите функцию deleteGroup
  const deleteGroup = async (): Promise<void> => {
    if (!token || !groupProfileId) return;
    
    const groupId = groupProfileId;
    
    // Сначала удаляем локально для мгновенного отображения
    setChats((prevChats) => prevChats.filter((chat) => chat.id !== groupId));
    setAppPage('chat');
    setGroupProfileId('');
    
    try {
      await api(`/api/chats/${groupId}`, { method: 'DELETE' }, token);
      setNotice('Группа удалена');
      await refreshData(true);
    } catch (error) {
      setNotice((error as Error).message);
      // Если ошибка, восстанавливаем данные
      await refreshData();
    }
  };


  // В main.tsx, обновите функцию removeMemberFromGroup
  const removeMemberFromGroup = async (userId: string): Promise<void> => {
    if (!token || !groupProfileId) return;
    
    // Сначала удаляем локально для мгновенного отображения
    setChats((prevChats) => 
      prevChats.map((chat) => 
        chat.id === groupProfileId 
          ? { ...chat, memberIds: chat.memberIds.filter(id => id !== userId) } 
          : chat
      )
    );
    
    try {
      await api(`/api/chats/${groupProfileId}/members/${userId}`, { method: 'DELETE' }, token);
      setNotice('Участник удален из группы');
      await refreshData(true);
    } catch (error) {
      setNotice((error as Error).message);
      // Если ошибка, восстанавливаем данные
      await refreshData();
    }
  };

  const viewMemberProfile = (userId: string): void => {
    setFriendProfileId(userId);
    setAliasInput(aliases[userId] || '');
    setIsEditingAlias(false);
    setAppPage('friend-profile');
  };

  if (!me) {
    if (isFirstVisit) {
      return (
        <WelcomePage
          onRegister={() => {
            setAuthPage('register');
            setIsFirstVisit(false);
            localStorage.setItem('liquid-visited', 'true');
          }}
          onLogin={() => {
            setAuthPage('login');
            setIsFirstVisit(false);
            localStorage.setItem('liquid-visited', 'true');
          }}
        />
      );
    }

    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 p-4 text-white">
        <div className="max-w-md w-full rounded-3xl border border-white/20 bg-white/10 p-6 shadow-glass backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h1 className="text-3xl font-bold">Авторизация</h1>
            <span className="rounded-full bg-cyan-300/20 px-3 py-1 text-xs text-cyan-100">
              {UI_VERSION}
            </span>
          </div>

          {authPage === 'login' ? (
            <AuthLoginPage
              email={authEmail}
              password={authPassword}
              onEmail={setAuthEmail}
              onPassword={setAuthPassword}
              onSubmit={submitAuth}
            />
          ) : (
            <AuthRegisterPage
              name={authName}
              email={authEmail}
              password={authPassword}
              onName={setAuthName}
              onEmail={setAuthEmail}
              onPassword={setAuthPassword}
              onSubmit={submitAuth}
            />
          )}

          {notice && (
            <p className="mt-4 text-sm text-cyan-200">{notice}</p>
          )}
        </div>
      </main>
    );
  }

  const usersMap = new Map(me.users.map((user) => [user.id, user]));
  const friends = me.friendIds.map((id) => usersMap.get(id)).filter(Boolean) as PublicUser[];
  const friendRequests = me.incomingRequestIds.map((id) => usersMap.get(id)).filter(Boolean) as PublicUser[];
  const friend = me.users.find((u) => u.id === friendProfileId);
  const friendDirectChat = chats.find((c) => !c.isGroup && friendProfileId && c.memberIds.includes(me.user.id) && c.memberIds.includes(friendProfileId));
  const wallpaper = prefs[me.user.id]?.wallpaperUrl;
  const theme = { ...DEFAULT_THEME, ...(prefs[me.user.id]?.theme ?? {}) };
  // В main.tsx, добавьте функцию addMemberToGroup
  // Найдите существующую функцию addMemberToGroup (возможно, она уже есть)
  // и замените её на эту:

  const addMembersToGroup = async (userIds: string[]): Promise<void> => {
    if (!token || !groupProfileId) return;
    
    try {
      // Добавляем каждого выбранного пользователя
      for (const userId of userIds) {
        await api(`/api/chats/${groupProfileId}/members`, {
          method: 'POST',
          body: JSON.stringify({ userId })
        }, token);
      }
      
      await refreshData();
      setNotice(`Добавлено ${userIds.length} участников`);
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const startCall = async (type: CallType, peerId: string): Promise<void> => {
    try {
      const stream = await webrtcService.initLocalStream(type === 'video');
      setCallType(type);
      callPeerIdRef.current = peerId;
      setParticipants([
        { userId: me.user.id, name: getDisplayName(me.user), avatarUrl: getAvatarUrl(me.user.id), isMuted: false, isVideoEnabled: type === 'video', isSpeaking: false },
        { userId: peerId, name: getDisplayName(me.users.find((u) => u.id === peerId) || { id: peerId, name: 'User', email: '' }), avatarUrl: getAvatarUrl(peerId), isMuted: false, isVideoEnabled: type === 'video', isSpeaking: false },
      ]);
      setIsCallActive(true);
      setCallExpanded(true);
      webrtcService.createPeer(peerId, true, stream, (signal) => socketService.emit('signal', { to: peerId, signal }));
      socketService.emit('call:start', { to: peerId, type, chatId: activeChatId });
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const acceptIncomingCall = async (): Promise<void> => {
    if (!incomingCall) return;
    try {
      const stream = await webrtcService.initLocalStream(incomingCall.type === 'video');
      setCallType(incomingCall.type);
      callPeerIdRef.current = incomingCall.from;
      setIsCallActive(true);
      setCallExpanded(true);
      setParticipants([
        { userId: me.user.id, name: getDisplayName(me.user), avatarUrl: getAvatarUrl(me.user.id), isMuted: false, isVideoEnabled: incomingCall.type === 'video', isSpeaking: false },
        { userId: incomingCall.from, name: incomingCall.fromName, avatarUrl: incomingCall.fromAvatar, isMuted: false, isVideoEnabled: incomingCall.type === 'video', isSpeaking: false },
      ]);
      webrtcService.createPeer(incomingCall.from, false, stream, (signal) => socketService.emit('signal', { to: incomingCall.from, signal }));
      socketService.emit('call:accept', { from: incomingCall.from });
      setIncomingCall(null);
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const endCall = (): void => {
    if (callPeerIdRef.current) socketService.emit('call:end', { to: callPeerIdRef.current });
    webrtcService.endAllCalls();
    setIsCallActive(false);
    setParticipants([]);
    setRemoteStreams(new Map());
  };

  const toggleMuteCall = (): void => {
    setParticipants((prev) => prev.map((p) => p.userId === me.user.id ? { ...p, isMuted: !p.isMuted } : p));
    const meP = participants.find((p) => p.userId === me.user.id);
    webrtcService.toggleAudio(Boolean(meP?.isMuted));
  };

  const toggleVideoCall = (): void => {
    setParticipants((prev) => prev.map((p) => p.userId === me.user.id ? { ...p, isVideoEnabled: !p.isVideoEnabled } : p));
    const meP = participants.find((p) => p.userId === me.user.id);
    webrtcService.toggleVideo(!meP?.isVideoEnabled);
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden p-4 text-white"
      style={{
        backgroundImage: wallpaper
          ? `linear-gradient(130deg, rgba(30,27,75,0.88), rgba(2,6,23,0.86), rgba(8,145,178,0.65)), url(${wallpaper})`
          : 'linear-gradient(130deg, rgb(30 27 75), rgb(2 6 23), rgb(8 47 73))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: `saturate(${theme.saturation}%)`,
        fontSize: `${theme.fontScale}%`,
      }}
    >
      <div className="absolute inset-0" style={{ backdropFilter: `blur(${theme.wallpaperBlur}px)` }} />
      <div className="relative mx-auto grid max-w-7xl gap-4 lg:grid-cols-[320px_1fr]">
        <Sidebar
          me={me.user}
          chats={chats}
          users={me.users}
          activeChatId={activeChatId}
          isSyncing={isSyncing}
          appPage={appPage}
          settingsSection={settingsSection}
          onSettingsSection={setSettingsSection}
          onSelectChat={(id: string) => { 
            setActiveChatId(id); 
            setAppPage('chat'); 
          }}
          onOpenPlus={() => setAppPage('plus')}
          onOpenSettings={() => setAppPage('settings')}
          displayName={getDisplayName}
          getAvatarUrl={getAvatarUrl}
          uiVersion={UI_VERSION}
          avatarUrl={getAvatarUrl(me.user.id)}
          bannerUrl={getBannerUrl(me.user.id)}
          accentColor={theme.accentColor}
          sidebarOpacity={theme.sidebarOpacity}
          contentBlur={theme.contentBlur}
          myPresence={presenceMap[me.user.id] ?? manualPresence}
          onPresenceChange={(status) => { setManualPresence(status); socketService.emit('presence:set', { status, manual: true }); }}
        />

        <section className="h-[calc(100vh-2rem)]">
          <div key={appPage} className="h-full animate-pageIn">
          {appPage === 'chat' && (
            <ChatPage
              me={me.user}
              users={me.users}
              activeChat={activeChat}
              getDisplayName={getDisplayName}
              getAvatarUrl={getAvatarUrl}
              onOpenFriendProfile={(id: string) => { 
                setFriendProfileId(id); 
                setAliasInput(aliases[id] || ''); 
                setIsEditingAlias(false); 
                setAppPage('friend-profile'); 
              }}
              onOpenGroupProfile={(id: string) => {
                setGroupProfileId(id);
                setNewGroupName(chats.find((c) => c.id === id)?.name || '');
                setIsEditingGroupName(false);
                setAppPage('group-profile');
              }}
              onContextMenu={onMessageContextMenu}
              replyToMessageId={replyToMessageId}
              onClearReply={() => setReplyToMessageId('')}
              messageText={messageText}
              onMessageText={setMessageText}
              onSend={sendMessage}
              onPickFiles={(files) => void handlePickFiles(files)}
              attachedFiles={attachedFiles}
              onRemoveAttachedFile={(id: string) => setAttachedFiles((prev) => { 
                const removing = prev.find((item) => item.id === id); 
                if (removing?.localFile && removing.url.startsWith('blob:')) URL.revokeObjectURL(removing.url); 
                return prev.filter((item) => item.id !== id); 
              })}
              theme={theme}
              peerPresence={activeChat && !activeChat.isGroup ? (presenceMap[activeChat.memberIds.find((id) => id !== me.user.id) || ''] ?? 'offline') : 'offline'}
              onStartCall={(type, peerId) => void startCall(type, peerId)}
              isCallActive={isCallActive}
              callType={callType}
              participants={participants}
              onEndCall={endCall}
              onToggleMute={toggleMuteCall}
              onToggleVideo={toggleVideoCall}
              callExpanded={callExpanded}
              onToggleCallExpand={() => setCallExpanded((v) => !v)}
              localStream={webrtcService.getLocalStream()}
              remoteStreams={remoteStreams}
            />
          )}

          {appPage === 'plus' && (
            <PlusPage 
              onOpenAddFriend={() => setAppPage('add-friend')} 
              onOpenCreateGroup={() => setAppPage('create-group')} 
            />
          )}

          {appPage === 'add-friend' && (
            <AddFriendPage
              friendEmail={friendEmail}
              onFriendEmail={setFriendEmail}
              onAddFriend={addFriend}
              requests={friendRequests}
              onAccept={(id: string) => void acceptFriendRequest(id)}
            />
          )}

          {appPage === 'create-group' && (
            <CreateGroupPage
              groupName={groupName}
              onGroupName={setGroupName}
              friends={friends}
              selected={groupSelectedFriends}
              onToggle={(id: string) => setGroupSelectedFriends((prev) => 
                prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
              )}
              onCreateGroup={createGroup}
            />
          )}

          {appPage === 'settings' && (
            <SettingsPage
              me={me.user}
              section={settingsSection}
              onBack={() => setAppPage('chat')}
              onLogout={() => void logout()}
              uiVersion={UI_VERSION}
              onAvatarFile={(file) => void saveAppearanceFile('avatarUrl', file)}
              onWallpaperFile={(file) => void saveAppearanceFile('wallpaperUrl', file)}
              onBannerFile={(file) => void saveAppearanceFile('bannerUrl', file)}
              theme={theme}
              onTheme={updateTheme}
              onResetTheme={resetTheme}
            />
          )}

          {appPage === 'friend-profile' && (
            <FriendProfilePage
              friend={friend}
              alias={aliasInput}
              isEditingAlias={isEditingAlias}
              onAlias={setAliasInput}
              onToggleEdit={() => setIsEditingAlias((prev) => !prev)}
              onSaveAlias={() => {
                if (!friend) return;
                saveAlias(friend.id, aliasInput);
                setIsEditingAlias(false);
              }}
              onDeleteFriend={() => friend && void removeFriend(friend.id)}
              onClearChat={() => friendDirectChat && void clearChat(friendDirectChat.id)}
              chat={friendDirectChat}
              avatarUrl={friend ? getAvatarUrl(friend.id) : undefined}
              bannerUrl={friend ? getBannerUrl(friend.id) : undefined}
            />
          )}

        {appPage === 'group-profile' && (
          <GroupProfilePage
            group={activeGroup}
            me={me.user}
            members={groupMembers}
            friends={friends}
            isEditingName={isEditingGroupName}
            onNameChange={setNewGroupName}
            onToggleEdit={() => setIsEditingGroupName(!isEditingGroupName)}
            onSaveName={() => void updateGroupName(newGroupName)}
            onLeaveGroup={() => void leaveGroup()}
            onDeleteGroup={() => void deleteGroup()}
            onClearChat={() => activeGroup && clearChat(activeGroup.id)}
            onAddMember={(userIds: string[]) => void addMembersToGroup(userIds)} // Используем новое имя или правильную функцию
            onRemoveMember={(id: string) => void removeMemberFromGroup(id)}
            onViewMemberProfile={(id: string) => viewMemberProfile(id)}
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
        onAccept={() => void acceptIncomingCall()}
      />

      {contextMenu && (
        <div 
          className="animate-scaleIn fixed z-50 min-w-44 rounded-xl border border-white/20 bg-slate-950/95 p-1 text-sm shadow-glass backdrop-blur-xl" 
          style={{ left: contextMenu.x, top: contextMenu.y }} 
          onClick={(event) => event.stopPropagation()}
        >
          <button 
            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10" 
            onClick={handleMenuReply} 
            type="button"
          >
            Ответить
          </button>
          {contextMenu.mine && !contextMenu.deletedForEveryone && (
            <button 
              className="block w-full rounded-lg px-3 py-2 text-left text-rose-300 hover:bg-white/10" 
              onClick={handleMenuDelete} 
              type="button"
            >
              Удалить для всех
            </button>
          )}
        </div>
      )}
    </main>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
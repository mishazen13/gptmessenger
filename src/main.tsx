import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { api } from './lib/api';
import { AppPage, AuthPage, Chat, MeResponse, Message, MessageContextMenu, PublicUser, SettingsSection } from './types';
import { AuthLoginPage } from './pages/AuthLoginPage';
import { AuthRegisterPage } from './pages/AuthRegisterPage';
import { Sidebar } from './components/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { AddFriendPage } from './pages/AddFriendPage';
import { PlusPage } from './pages/PlusPage';
import { SettingsPage } from './pages/SettingsPage';
import { FriendProfilePage } from './pages/FriendProfilePage';
import { CreateGroupPage } from './pages/CreateGroupPage';

const TOKEN_KEY = 'liquid-messenger-token';
const UI_VERSION = 'UI v4.1';
const PREFS_KEY = 'ui-prefs-v1';

type UserPrefs = { avatarUrl?: string; wallpaperUrl?: string };

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

  const [authName, setAuthName] = React.useState('');
  const [authEmail, setAuthEmail] = React.useState('');
  const [authPassword, setAuthPassword] = React.useState('');

  const [friendEmail, setFriendEmail] = React.useState('');
  const [groupName, setGroupName] = React.useState('');
  const [groupSelectedFriends, setGroupSelectedFriends] = React.useState<string[]>([]);
  const [messageText, setMessageText] = React.useState('');
  const [replyToMessageId, setReplyToMessageId] = React.useState('');
  const [aliasInput, setAliasInput] = React.useState('');
  const [isEditingAlias, setIsEditingAlias] = React.useState(false);

  const [prefs, setPrefs] = React.useState<PrefMap>(() => readPrefs());
  const [avatarUrlInput, setAvatarUrlInput] = React.useState('');
  const [wallpaperUrlInput, setWallpaperUrlInput] = React.useState('');

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

  React.useEffect(() => {
    if (!me) return;
    setAvatarUrlInput(prefs[me.user.id]?.avatarUrl || '');
    setWallpaperUrlInput(prefs[me.user.id]?.wallpaperUrl || '');
  }, [me, prefs]);

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

  const submitAuth = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      const endpoint = authPage === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authPage === 'register' ? { name: authName, email: authEmail, password: authPassword } : { email: authEmail, password: authPassword };
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

  const createGroup = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!token) return;
    try {
      const created = await api<{ chat: Chat }>('/api/chats/group', { method: 'POST', body: JSON.stringify({ name: groupName, memberIds: groupSelectedFriends }) }, token);
      setGroupName('');
      setGroupSelectedFriends([]);
      setAppPage('chat');
      setActiveChatId(created.chat.id);
      await refreshData();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const clearChat = async (chatId: string): Promise<void> => {
    if (!token) return;
    try {
      await api(`/api/chats/${chatId}/messages`, { method: 'DELETE' }, token);
      setNotice('Чат очищен.');
      await refreshData();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!token || !activeChat || !messageText.trim()) return;
    try {
      await api(`/api/chats/${activeChat.id}/messages`, { method: 'POST', body: JSON.stringify({ text: messageText, replyToMessageId: replyToMessageId || undefined }) }, token);
      setMessageText('');
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

  const saveAppearance = (): void => {
    if (!me) return;
    const next = {
      ...prefs,
      [me.user.id]: {
        avatarUrl: avatarUrlInput.trim(),
        wallpaperUrl: wallpaperUrlInput.trim(),
      },
    };
    setPrefs(next);
    savePrefs(next);
    setNotice('Внешний вид сохранён.');
  };

  if (!me) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 p-4 text-white">
        <div className="mx-auto mt-12 max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 shadow-glass backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-2"><h1 className="text-3xl font-bold">Liquid Messenger</h1><span className="rounded-full bg-cyan-300/20 px-3 py-1 text-xs text-cyan-100">{UI_VERSION}</span></div>
          <div className="mb-4 flex gap-2">
            <button className={`flex-1 rounded-xl px-3 py-2 ${authPage === 'login' ? 'bg-cyan-400 text-black' : 'bg-white/10'}`} onClick={() => setAuthPage('login')} type="button">Логин</button>
            <button className={`flex-1 rounded-xl px-3 py-2 ${authPage === 'register' ? 'bg-cyan-400 text-black' : 'bg-white/10'}`} onClick={() => setAuthPage('register')} type="button">Регистрация</button>
          </div>
          {authPage === 'login' ? (
            <AuthLoginPage email={authEmail} password={authPassword} onEmail={setAuthEmail} onPassword={setAuthPassword} onSubmit={submitAuth} />
          ) : (
            <AuthRegisterPage name={authName} email={authEmail} password={authPassword} onName={setAuthName} onEmail={setAuthEmail} onPassword={setAuthPassword} onSubmit={submitAuth} />
          )}
          {notice && <p className="mt-4 text-sm text-cyan-200">{notice}</p>}
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

  return (
    <main
      className="relative min-h-screen overflow-hidden p-4 text-white"
      style={{
        backgroundImage: wallpaper
          ? `linear-gradient(130deg, rgba(30,27,75,0.88), rgba(2,6,23,0.86), rgba(8,145,178,0.65)), url(${wallpaper})`
          : 'linear-gradient(130deg, rgb(30 27 75), rgb(2 6 23), rgb(8 47 73))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
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
          onSelectChat={(id) => { setActiveChatId(id); setAppPage('chat'); }}
          onOpenPlus={() => setAppPage('plus')}
          onOpenSettings={() => setAppPage('settings')}
          displayName={getDisplayName}
          uiVersion={UI_VERSION}
          avatarUrl={getAvatarUrl(me.user.id)}
        />

        <section className="h-[calc(100vh-2rem)]">
          {appPage === 'chat' && (
            <ChatPage
              me={me.user}
              users={me.users}
              activeChat={activeChat}
              getDisplayName={getDisplayName}
              getAvatarUrl={getAvatarUrl}
              onOpenFriendProfile={(id) => { setFriendProfileId(id); setAliasInput(aliases[id] || ''); setIsEditingAlias(false); setAppPage('friend-profile'); }}
              onContextMenu={onMessageContextMenu}
              replyToMessageId={replyToMessageId}
              onClearReply={() => setReplyToMessageId('')}
              messageText={messageText}
              onMessageText={setMessageText}
              onSend={sendMessage}
            />
          )}

          {appPage === 'plus' && <PlusPage onOpenAddFriend={() => setAppPage('add-friend')} onOpenCreateGroup={() => setAppPage('create-group')} />}

          {appPage === 'add-friend' && (
            <AddFriendPage
              friendEmail={friendEmail}
              onFriendEmail={setFriendEmail}
              onAddFriend={addFriend}
              requests={friendRequests}
              onAccept={(id) => void acceptFriendRequest(id)}
            />
          )}

          {appPage === 'create-group' && (
            <CreateGroupPage
              groupName={groupName}
              onGroupName={setGroupName}
              friends={friends}
              selected={groupSelectedFriends}
              onToggle={(id) => setGroupSelectedFriends((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))}
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
              avatarUrl={avatarUrlInput}
              wallpaperUrl={wallpaperUrlInput}
              onAvatarUrl={setAvatarUrlInput}
              onWallpaperUrl={setWallpaperUrlInput}
              onSaveAppearance={saveAppearance}
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
            />
          )}

          {notice && <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm text-cyan-200">{notice}</p>}
        </section>
      </div>

      {contextMenu && (
        <div className="fixed z-50 min-w-44 rounded-xl border border-white/20 bg-slate-950/95 p-1 text-sm shadow-glass backdrop-blur-xl" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10" onClick={handleMenuReply} type="button">Ответить</button>
          {contextMenu.mine && !contextMenu.deletedForEveryone && (
            <button className="block w-full rounded-lg px-3 py-2 text-left text-rose-300 hover:bg-white/10" onClick={handleMenuDelete} type="button">Удалить для всех</button>
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

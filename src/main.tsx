import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

type PublicUser = {
  id: string;
  name: string;
  email: string;
};

type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
  replyToMessageId?: string;
  deletedForEveryone?: boolean;
};

type Chat = {
  id: string;
  name: string;
  isGroup: boolean;
  memberIds: string[];
  messages: Message[];
};

type MeResponse = {
  user: PublicUser;
  incomingRequestIds: string[];
  friendIds: string[];
  users: PublicUser[];
};

type View = 'chats' | 'friends' | 'requests' | 'groups';

type MessageContextMenu = {
  x: number;
  y: number;
  messageId: string;
  chatId: string;
  mine: boolean;
  deletedForEveryone: boolean;
};

const TOKEN_KEY = 'liquid-messenger-token';

const api = async <T,>(url: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? 'Server error');
  }

  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
};

const cardClass = 'rounded-2xl border border-white/20 bg-white/10 p-4 shadow-glass backdrop-blur-xl';

const App = (): JSX.Element => {
  const [token, setToken] = React.useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = React.useState('');
  const [activeView, setActiveView] = React.useState<View>('chats');
  const [notice, setNotice] = React.useState('');
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<MessageContextMenu | null>(null);

  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');
  const [authName, setAuthName] = React.useState('');
  const [authEmail, setAuthEmail] = React.useState('');
  const [authPassword, setAuthPassword] = React.useState('');

  const [friendEmail, setFriendEmail] = React.useState('');
  const [groupName, setGroupName] = React.useState('');
  const [groupSelectedFriends, setGroupSelectedFriends] = React.useState<string[]>([]);
  const [messageText, setMessageText] = React.useState('');
  const [replyToMessageId, setReplyToMessageId] = React.useState('');

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
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authMode === 'register'
        ? { name: authName, email: authEmail, password: authPassword }
        : { email: authEmail, password: authPassword };

      const response = await api<{ token: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

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
      await refreshData();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const createGroup = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!token) return;
    try {
      const created = await api<{ chat: Chat }>(
        '/api/chats/group',
        { method: 'POST', body: JSON.stringify({ name: groupName, memberIds: groupSelectedFriends }) },
        token,
      );
      setGroupName('');
      setGroupSelectedFriends([]);
      setActiveView('chats');
      setActiveChatId(created.chat.id);
      setNotice('Группа создана.');
      await refreshData();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!token || !activeChat || !messageText.trim()) return;
    try {
      await api(
        `/api/chats/${activeChat.id}/messages`,
        { method: 'POST', body: JSON.stringify({ text: messageText, replyToMessageId: replyToMessageId || undefined }) },
        token,
      );
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

  const onMessageContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    chatId: string,
    message: Message,
    mine: boolean,
  ): void => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      chatId,
      messageId: message.id,
      mine,
      deletedForEveryone: Boolean(message.deletedForEveryone),
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

  if (!me) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 p-4 text-white">
        <div className="mx-auto mt-12 max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 shadow-glass backdrop-blur-xl">
          <h1 className="mb-1 text-3xl font-bold">Liquid Messenger</h1>
          <p className="mb-6 text-sm text-white/75">Страницы действий + отдельный сервер API</p>
          <div className="mb-4 flex gap-2">
            <button className={`flex-1 rounded-xl px-3 py-2 ${authMode === 'login' ? 'bg-cyan-400 text-black' : 'bg-white/10'}`} onClick={() => setAuthMode('login')} type="button">Логин</button>
            <button className={`flex-1 rounded-xl px-3 py-2 ${authMode === 'register' ? 'bg-cyan-400 text-black' : 'bg-white/10'}`} onClick={() => setAuthMode('register')} type="button">Регистрация</button>
          </div>
          <form className="space-y-3" onSubmit={submitAuth}>
            {authMode === 'register' && <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Имя" />}
            <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="Email" type="email" />
            <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Пароль" type="password" />
            <button className="w-full rounded-xl bg-cyan-400 px-3 py-2 font-semibold text-black" type="submit">{authMode === 'register' ? 'Создать аккаунт' : 'Войти'}</button>
          </form>
          {notice && <p className="mt-4 text-sm text-cyan-200">{notice}</p>}
        </div>
      </main>
    );
  }

  const usersMap = new Map(me.users.map((user) => [user.id, user]));
  const friends = me.friendIds.map((id) => usersMap.get(id)).filter(Boolean) as PublicUser[];
  const friendRequests = me.incomingRequestIds.map((id) => usersMap.get(id)).filter(Boolean) as PublicUser[];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 p-4 text-white">
      <div className="pointer-events-none absolute left-10 top-10 h-60 w-60 animate-float-slow rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 right-10 h-60 w-60 animate-float-slow rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-4 lg:grid-cols-[260px_1fr]">
        <aside className={cardClass}>
          <p className="text-xs text-white/70">Вы вошли как</p>
          <p className="mb-3 font-semibold">{me.user.name}</p>
          <button className="mb-4 w-full rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20" onClick={() => void logout()} type="button">Выйти</button>

          <nav className="space-y-2">
            {([
              ['chats', 'Чаты'],
              ['friends', 'Друзья'],
              ['requests', 'Заявки'],
              ['groups', 'Группы'],
            ] as [View, string][]).map(([key, label]) => (
              <button
                key={key}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${activeView === key ? 'bg-cyan-400 text-black' : 'bg-white/10'}`}
                onClick={() => setActiveView(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-4 rounded-xl bg-black/20 px-3 py-2 text-xs text-white/80">
            Синхронизация: {isSyncing ? 'обновление...' : 'актуально'}
          </div>
        </aside>

        <section className="space-y-4">
          {activeView === 'friends' && (
            <>
              <div className={cardClass}>
                <h2 className="mb-3 text-lg font-semibold">Отправка заявки</h2>
                <form className="flex gap-2" onSubmit={addFriend}>
                  <input className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={friendEmail} onChange={(event) => setFriendEmail(event.target.value)} placeholder="Email пользователя" />
                  <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black" type="submit">Отправить</button>
                </form>
              </div>
              <div className={cardClass}>
                <h2 className="mb-3 text-lg font-semibold">Список друзей</h2>
                <div className="space-y-2">
                  {friends.length === 0 && <p className="text-sm text-white/70">Друзей пока нет.</p>}
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{friend.name}</p>
                        <p className="text-xs text-white/70">{friend.email}</p>
                      </div>
                      <button className="rounded-lg bg-rose-400 px-3 py-1 text-xs font-semibold text-black" onClick={() => void removeFriend(friend.id)} type="button">Удалить</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeView === 'requests' && (
            <div className={cardClass}>
              <h2 className="mb-3 text-lg font-semibold">Входящие заявки</h2>
              <div className="space-y-2">
                {friendRequests.length === 0 && <p className="text-sm text-white/70">Новых заявок нет.</p>}
                {friendRequests.map((user) => (
                  <div key={user.id} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-white/70">{user.email}</p>
                    </div>
                    <button className="rounded-lg bg-emerald-400 px-3 py-1 text-xs font-semibold text-black" onClick={() => void acceptFriendRequest(user.id)} type="button">Принять</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'groups' && (
            <div className={cardClass}>
              <h2 className="mb-3 text-lg font-semibold">Создание группы</h2>
              <form className="space-y-3" onSubmit={createGroup}>
                <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Название группы" />
                <div className="max-h-52 space-y-2 overflow-auto rounded-xl border border-white/20 p-3">
                  {friends.length === 0 && <p className="text-sm text-white/70">Сначала добавьте друзей.</p>}
                  {friends.map((friend) => {
                    const checked = groupSelectedFriends.includes(friend.id);
                    return (
                      <label key={friend.id} className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setGroupSelectedFriends((prev) => (checked ? prev.filter((id) => id !== friend.id) : [...prev, friend.id]))}
                        />
                        {friend.name}
                      </label>
                    );
                  })}
                </div>
                <button className="rounded-xl bg-indigo-400 px-4 py-2 font-semibold text-black" type="submit">Создать группу</button>
              </form>
            </div>
          )}

          {activeView === 'chats' && (
            <div className={cardClass}>
              <h2 className="mb-3 text-lg font-semibold">Чаты и сообщения</h2>
              <div className="mb-3 flex flex-wrap gap-2 border-b border-white/20 pb-3">
                {chats.length === 0 && <p className="text-sm text-white/70">Чатов пока нет.</p>}
                {chats.map((chat) => {
                  const directPeer = !chat.isGroup ? me.users.find((user) => user.id !== me.user.id && chat.memberIds.includes(user.id)) : undefined;
                  const title = chat.isGroup ? chat.name : directPeer?.name ?? 'Личный чат';
                  return (
                    <button
                      className={`rounded-xl px-3 py-2 text-sm ${chat.id === activeChatId ? 'bg-cyan-400 text-black' : 'bg-white/10'}`}
                      key={chat.id}
                      onClick={() => setActiveChatId(chat.id)}
                      type="button"
                    >
                      {title}
                    </button>
                  );
                })}
              </div>

              <p className="mb-2 text-xs text-white/65">ПКМ по сообщению: открыть меню действий</p>
              <div className="mb-3 h-[50vh] space-y-2 overflow-auto rounded-2xl border border-white/20 bg-black/20 p-3">
                {!activeChat && <p className="text-sm text-white/70">Выберите чат.</p>}
                {activeChat?.messages.map((message) => {
                  const sender = me.users.find((user) => user.id === message.senderId);
                  const replyTo = activeChat.messages.find((candidate) => candidate.id === message.replyToMessageId);
                  const mine = message.senderId === me.user.id;
                  return (
                    <article
                      className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${mine ? 'ml-auto bg-cyan-400 text-black' : 'bg-white/15'}`}
                      key={message.id}
                      onContextMenu={(event) => onMessageContextMenu(event, activeChat.id, message, mine)}
                    >
                      <p className="mb-1 text-xs opacity-80">{sender?.name ?? 'Unknown'}</p>
                      {replyTo && <div className="mb-1 rounded-lg border border-black/20 bg-black/10 px-2 py-1 text-xs">↪ {replyTo.text}</div>}
                      <p>{message.text}</p>
                    </article>
                  );
                })}
              </div>

              {replyToMessageId && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs">
                  <span>Ответ на: {activeChat?.messages.find((message) => message.id === replyToMessageId)?.text ?? 'сообщение'}</span>
                  <button className="underline" onClick={() => setReplyToMessageId('')} type="button">Отмена</button>
                </div>
              )}

              <form className="flex gap-2" onSubmit={sendMessage}>
                <input className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Введите сообщение..." />
                <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black" type="submit">Отправить</button>
              </form>
            </div>
          )}

          {notice && <p className="rounded-xl bg-white/10 px-3 py-2 text-sm text-cyan-200">{notice}</p>}
        </section>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-44 rounded-xl border border-white/20 bg-slate-950/95 p-1 text-sm shadow-glass backdrop-blur-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10" onClick={handleMenuReply} type="button">
            Ответить
          </button>
          {contextMenu.mine && !contextMenu.deletedForEveryone && (
            <button className="block w-full rounded-lg px-3 py-2 text-left text-rose-300 hover:bg-white/10" onClick={handleMenuDelete} type="button">
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

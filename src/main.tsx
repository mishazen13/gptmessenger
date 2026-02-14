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

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};

const App = (): JSX.Element => {
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');
  const [authName, setAuthName] = React.useState('');
  const [authEmail, setAuthEmail] = React.useState('');
  const [authPassword, setAuthPassword] = React.useState('');

  const [friendEmail, setFriendEmail] = React.useState('');
  const [groupName, setGroupName] = React.useState('');
  const [groupSelectedFriends, setGroupSelectedFriends] = React.useState<string[]>([]);
  const [messageText, setMessageText] = React.useState('');
  const [replyToMessageId, setReplyToMessageId] = React.useState('');

  const refreshData = React.useCallback(async () => {
    if (!token) return;
    const [meData, chatData] = await Promise.all([
      api<MeResponse>('/api/me', {}, token),
      api<{ chats: Chat[] }>('/api/chats', {}, token),
    ]);
    setMe(meData);
    setChats(chatData.chats);
  }, [token]);

  React.useEffect(() => {
    if (!token) {
      setMe(null);
      setChats([]);
      return;
    }

    refreshData().catch((error: Error) => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setNotice(error.message);
    });
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

  const activeChat = chats.find((chat) => chat.id === activeChatId);

  const submitAuth = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        authMode === 'register'
          ? { name: authName, email: authEmail, password: authPassword }
          : { email: authEmail, password: authPassword };

      const response = await api<{ token: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      localStorage.setItem(TOKEN_KEY, response.token);
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
    if (token) {
      await api('/api/auth/logout', { method: 'POST' }, token).catch(() => null);
    }
    localStorage.removeItem(TOKEN_KEY);
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
      setNotice('Друг добавлен.');
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
      setNotice('Группа создана.');
      await refreshData();
      setActiveChatId(created.chat.id);
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!token || !activeChat) return;
    try {
      await api(
        `/api/chats/${activeChat.id}/messages`,
        { method: 'POST', body: JSON.stringify({ text: messageText, replyToMessageId: replyToMessageId || undefined }) },
        token,
      );
      setMessageText('');
      setReplyToMessageId('');
      await refreshData();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  const deleteMessage = async (chatId: string, messageId: string): Promise<void> => {
    if (!token) return;
    try {
      await api(`/api/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' }, token);
      setNotice('Сообщение удалено для всех.');
      await refreshData();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };

  if (!me) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 p-4 text-white">
        <div className="mx-auto mt-10 max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 shadow-glass backdrop-blur-xl">
          <h1 className="mb-1 text-3xl font-bold">Liquid Messenger</h1>
          <p className="mb-6 text-sm text-white/75">Клиент + отдельный сервер API.</p>
          <div className="mb-4 flex gap-2">
            <button className={`flex-1 rounded-xl px-3 py-2 ${authMode === 'login' ? 'bg-cyan-400 text-black' : 'bg-white/10'}`} onClick={() => setAuthMode('login')} type="button">Логин</button>
            <button className={`flex-1 rounded-xl px-3 py-2 ${authMode === 'register' ? 'bg-cyan-400 text-black' : 'bg-white/10'}`} onClick={() => setAuthMode('register')} type="button">Регистрация</button>
          </div>

          <form className="space-y-3" onSubmit={submitAuth}>
            {authMode === 'register' && <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" onChange={(event) => setAuthName(event.target.value)} placeholder="Имя" value={authName} />}
            <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" onChange={(event) => setAuthEmail(event.target.value)} placeholder="Email" type="email" value={authEmail} />
            <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" onChange={(event) => setAuthPassword(event.target.value)} placeholder="Пароль" type="password" value={authPassword} />
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
      <div className="relative mx-auto grid max-w-7xl gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-xs text-white/70">Вы вошли как</p><p className="font-semibold">{me.user.name}</p></div>
            <button className="rounded-lg bg-white/10 px-3 py-1 text-sm" onClick={() => void logout()} type="button">Выйти</button>
          </div>

          <form className="mb-5 space-y-2" onSubmit={addFriend}>
            <h2 className="text-sm font-semibold text-cyan-200">Добавить друга</h2>
            <input className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm" onChange={(event) => setFriendEmail(event.target.value)} placeholder="Email друга" value={friendEmail} />
            <button className="w-full rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-black" type="submit">Отправить заявку</button>
          </form>

          <section className="mb-5">
            <h2 className="mb-2 text-sm font-semibold text-cyan-200">Входящие заявки</h2>
            <div className="space-y-2">
              {friendRequests.map((user) => (
                <div className="flex items-center justify-between rounded-lg bg-white/10 px-2 py-2" key={user.id}>
                  <span className="text-sm">{user.name}</span>
                  <button className="rounded bg-emerald-400 px-2 py-1 text-xs font-semibold text-black" onClick={() => void acceptFriendRequest(user.id)} type="button">Принять</button>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-5">
            <h2 className="mb-2 text-sm font-semibold text-cyan-200">Друзья</h2>
            <div className="space-y-2">
              {friends.map((friend) => (
                <div className="flex items-center justify-between rounded-lg bg-white/10 px-2 py-2" key={friend.id}>
                  <span className="text-sm">{friend.name}</span>
                  <button className="rounded bg-rose-400 px-2 py-1 text-xs font-semibold text-black" onClick={() => void removeFriend(friend.id)} type="button">Удалить</button>
                </div>
              ))}
            </div>
          </section>

          <form className="space-y-2" onSubmit={createGroup}>
            <h2 className="text-sm font-semibold text-cyan-200">Создать группу</h2>
            <input className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm" onChange={(event) => setGroupName(event.target.value)} placeholder="Название группы" value={groupName} />
            <div className="max-h-24 space-y-1 overflow-auto rounded-lg border border-white/15 p-2">
              {friends.map((friend) => {
                const checked = groupSelectedFriends.includes(friend.id);
                return (
                  <label className="flex items-center gap-2 text-xs" key={friend.id}>
                    <input checked={checked} onChange={() => setGroupSelectedFriends((prev) => (checked ? prev.filter((id) => id !== friend.id) : [...prev, friend.id]))} type="checkbox" />
                    {friend.name}
                  </label>
                );
              })}
            </div>
            <button className="w-full rounded-lg bg-indigo-400 px-3 py-2 text-sm font-semibold text-black" type="submit">Создать</button>
          </form>
        </aside>

        <section className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
          <div className="mb-3 flex flex-wrap gap-2 border-b border-white/20 pb-3">
            {chats.map((chat) => {
              const directPeer = !chat.isGroup ? me.users.find((user) => user.id !== me.user.id && chat.memberIds.includes(user.id)) : undefined;
              const title = chat.isGroup ? chat.name : directPeer?.name ?? 'Личный чат';
              return (
                <button className={`rounded-xl px-3 py-2 text-sm ${chat.id === activeChatId ? 'bg-cyan-400 text-black' : 'bg-white/10'}`} key={chat.id} onClick={() => setActiveChatId(chat.id)} type="button">{title}</button>
              );
            })}
          </div>

          <div className="mb-3 h-[58vh] space-y-2 overflow-auto rounded-2xl border border-white/20 bg-black/20 p-3">
            {activeChat?.messages.map((message) => {
              const sender = me.users.find((user) => user.id === message.senderId);
              const replyTo = activeChat.messages.find((candidate) => candidate.id === message.replyToMessageId);
              const mine = message.senderId === me.user.id;
              return (
                <article className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${mine ? 'ml-auto bg-cyan-400 text-black' : 'bg-white/15'}`} key={message.id}>
                  <p className="mb-1 text-xs opacity-80">{sender?.name ?? 'Unknown'}</p>
                  {replyTo && <div className="mb-1 rounded-lg border border-black/20 bg-black/10 px-2 py-1 text-xs">↪ {replyTo.text}</div>}
                  <p>{message.text}</p>
                  <div className="mt-2 flex gap-2 text-xs">
                    <button className="underline" onClick={() => setReplyToMessageId(message.id)} type="button">Ответить</button>
                    {mine && !message.deletedForEveryone && <button className="underline" onClick={() => void deleteMessage(activeChat.id, message.id)} type="button">Удалить для всех</button>}
                  </div>
                </article>
              );
            })}
          </div>

          <form className="flex gap-2" onSubmit={sendMessage}>
            <input className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2" onChange={(event) => setMessageText(event.target.value)} placeholder="Введите сообщение..." value={messageText} />
            <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black" type="submit">Отправить</button>
          </form>

          {notice && <p className="mt-3 text-sm text-cyan-200">{notice}</p>}
        </section>
      </div>
    </main>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

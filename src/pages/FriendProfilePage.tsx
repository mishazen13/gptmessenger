import { Avatar } from '../components/Avatar';
import { Chat, PublicUser, PresenceStatus } from '../types';
import { MdDescription, MdEmail, MdChat } from 'react-icons/md';

type Props = {
  friend?: PublicUser;
  alias: string;
  isEditingAlias: boolean;
  onAlias: (v: string) => void;
  onToggleEdit: () => void;
  onSaveAlias: () => void;
  onDeleteFriend: () => void;
  onClearChat: () => void;
  chat?: Chat;
  avatarUrl?: string;
  bannerUrl?: string;
  presenceStatus?: PresenceStatus;
  lastSeen?: number;
  bio?: string;
};

const formatLastSeen = (timestamp?: number): string => {
  if (!timestamp) return 'недавно';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'только что';
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  const date = new Date(timestamp);
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'} назад`;
  if (hours < 24) return `сегодня в ${timeStr}`;
  if (days === 1) return `вчера в ${timeStr}`;
  return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в ${timeStr}`;
};

export const FriendProfilePage = ({
  friend,
  alias,
  isEditingAlias,
  onAlias,
  onToggleEdit,
  onSaveAlias,
  onDeleteFriend,
  onClearChat,
  chat,
  avatarUrl,
  bannerUrl,
  presenceStatus,
  lastSeen,
  bio,
}: Props): JSX.Element => {
  if (!friend) {
    return <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white/70">Пользователь не выбран.</div>;
  }

  const isOnline = presenceStatus === 'online';
  const statusText = isOnline ? 'в сети' : `был(а) ${formatLastSeen(lastSeen)}`;

  return (
    <div className="relative h-full rounded-2xl border border-white/20 bg-white/10 p-4">
      <div className="mb-6 overflow-hidden rounded-xl border border-white/20">
        {bannerUrl ? <img src={bannerUrl} alt="friend banner" className="h-28 w-full object-cover" /> : <div className="h-28 w-full bg-gradient-to-r from-indigo-500/30 to-cyan-500/30" />}
      </div>

      <div className="mb-5 -mt-16 flex flex-col items-center gap-3 text-center">
        <Avatar imageUrl={avatarUrl} name={alias || friend.name} size={96} />
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold">{alias || friend.name}</p>
          <button className="rounded bg-white/10 px-2 py-1 text-xs" onClick={onToggleEdit} type="button">✏️</button>
        </div>
        <p className="text-xs text-white/70">{friend.email}</p>
        
        {/* Статус */}
        <div className="mt-1 flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
          <p className="text-xs text-white/50">{statusText}</p>
        </div>

        {/* О себе */}
        {bio && (
          <div className="mt-3 max-w-xs rounded-lg bg-white/5 px-3 py-2">
            <p className="text-xs text-white/60">✏️ О себе</p>
            <p className="text-sm text-white/80 break-words">{bio}</p>
          </div>
        )}
      </div>

      {isEditingAlias && (
        <div className="absolute right-4 top-24 z-10 w-72 rounded-xl border border-white/20 bg-slate-950/95 p-3 shadow-glass backdrop-blur-xl">
          <p className="mb-2 text-sm">Новое имя для себя</p>
          <div className="flex gap-2">
            <input className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={alias} onChange={(e) => onAlias(e.target.value)} placeholder="Локальное имя" />
            <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black" onClick={onSaveAlias} type="button">OK</button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <button className="w-full rounded-xl bg-transparent px-4 py-3 text-left text-sm transition hover:bg-white/10" disabled={!chat} onClick={onClearChat} type="button">Очистить чат</button>
        <button className="w-full rounded-xl bg-transparent px-4 py-3 text-left text-sm text-rose-300 transition hover:bg-rose-500/20" onClick={onDeleteFriend} type="button">Удалить из друзей</button>
      </div>
    </div>
  );
};
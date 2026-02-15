import { Avatar } from '../components/Avatar';
import { Chat, PublicUser } from '../types';

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
}: Props): JSX.Element => {
  if (!friend) {
    return <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white/70">Пользователь не выбран.</div>;
  }

  return (
    <div className="relative h-full rounded-2xl border border-white/20 bg-white/10 p-4">
      <div className="mb-5 flex flex-col items-center gap-3 text-center">
        <Avatar imageUrl={avatarUrl} name={alias || friend.name} size={72} />
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold">{alias || friend.name}</p>
          <button className="rounded bg-white/10 px-2 py-1 text-xs" onClick={onToggleEdit} type="button">✏️</button>
        </div>
        <p className="text-xs text-white/70">{friend.email}</p>
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

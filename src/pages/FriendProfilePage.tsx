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
    <div className="h-full rounded-2xl border border-white/20 bg-white/10 p-4">
      <div className="mb-5 flex flex-col items-center gap-3 text-center">
        <Avatar imageUrl={avatarUrl} name={alias || friend.name} size={72} />
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold">{alias || friend.name}</p>
          <button className="rounded bg-white/10 px-2 py-1 text-xs" onClick={onToggleEdit} type="button">✏️</button>
        </div>
        <p className="text-xs text-white/70">{friend.email}</p>
      </div>

      {isEditingAlias && (
        <div className="mb-4 rounded-xl bg-white/5 p-3">
          <p className="mb-2 text-sm">Новое имя для себя</p>
          <div className="flex gap-2">
            <input className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={alias} onChange={(e) => onAlias(e.target.value)} placeholder="Локальное имя" />
            <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black" onClick={onSaveAlias} type="button">Сохранить</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="rounded-xl bg-rose-400 px-4 py-2 text-sm font-semibold text-black" onClick={onDeleteFriend} type="button">Удалить из друзей</button>
        <button className="rounded-xl bg-white/10 px-4 py-2 text-sm" disabled={!chat} onClick={onClearChat} type="button">Очистить чат</button>
      </div>
    </div>
  );
};

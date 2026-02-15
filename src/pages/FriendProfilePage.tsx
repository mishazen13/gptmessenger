import { Avatar } from '../components/Avatar';
import { Chat, PublicUser } from '../types';

type Props = {
  friend?: PublicUser;
  alias: string;
  onAlias: (v: string) => void;
  onSaveAlias: () => void;
  onDeleteFriend: () => void;
  onClearChat: () => void;
  chat?: Chat;
};

export const FriendProfilePage = ({ friend, alias, onAlias, onSaveAlias, onDeleteFriend, onClearChat, chat }: Props): JSX.Element => {
  if (!friend) {
    return <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white/70">Пользователь не выбран.</div>;
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={alias || friend.name} size={52} />
        <div>
          <p className="text-lg font-semibold">{alias || friend.name}</p>
          <p className="text-xs text-white/70">{friend.email}</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-white/5 p-3">
        <p className="mb-2 text-sm">Переименовать для себя</p>
        <div className="flex gap-2">
          <input className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={alias} onChange={(e) => onAlias(e.target.value)} placeholder="Локальное имя" />
          <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black" onClick={onSaveAlias} type="button">Сохранить</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="rounded-xl bg-rose-400 px-4 py-2 text-sm font-semibold text-black" onClick={onDeleteFriend} type="button">Удалить из друзей</button>
        <button className="rounded-xl bg-white/10 px-4 py-2 text-sm" disabled={!chat} onClick={onClearChat} type="button">Очистить чат</button>
      </div>
    </div>
  );
};

import React from 'react';
import { PublicUser } from '../types';

type Props = {
  friendEmail: string;
  onFriendEmail: (v: string) => void;
  onAddFriend: (e: React.FormEvent<HTMLFormElement>) => void;
  groupName: string;
  onGroupName: (v: string) => void;
  friends: PublicUser[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreateGroup: (e: React.FormEvent<HTMLFormElement>) => void;
  requests: PublicUser[];
  onAccept: (id: string) => void;
};

export const AddFriendPage = (props: Props): JSX.Element => {
  const {
    friendEmail,
    onFriendEmail,
    onAddFriend,
    groupName,
    onGroupName,
    friends,
    selected,
    onToggle,
    onCreateGroup,
    requests,
    onAccept,
  } = props;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
        <h2 className="mb-3 text-lg font-semibold">Добавление в друзья</h2>
        <form className="flex gap-2" onSubmit={onAddFriend}>
          <input className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={friendEmail} onChange={(e) => onFriendEmail(e.target.value)} placeholder="Email пользователя" />
          <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black" type="submit">Отправить</button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
        <h2 className="mb-3 text-lg font-semibold">Создать группу</h2>
        <form className="space-y-3" onSubmit={onCreateGroup}>
          <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={groupName} onChange={(e) => onGroupName(e.target.value)} placeholder="Название группы" />
          <div className="max-h-44 space-y-2 overflow-auto rounded-xl border border-white/20 p-3">
            {friends.length === 0 && <p className="text-sm text-white/70">Сначала добавьте друзей.</p>}
            {friends.map((friend) => (
              <label key={friend.id} className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-2 text-sm">
                <input type="checkbox" checked={selected.includes(friend.id)} onChange={() => onToggle(friend.id)} />
                {friend.name}
              </label>
            ))}
          </div>
          <button className="rounded-xl bg-indigo-400 px-4 py-2 font-semibold text-black" type="submit">Создать</button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
        <h3 className="mb-2 text-sm font-semibold text-cyan-100">Входящие заявки</h3>
        <div className="space-y-2">
          {requests.length === 0 && <p className="text-sm text-white/70">Заявок нет</p>}
          {requests.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-white/70">{user.email}</p>
              </div>
              <button className="rounded-lg bg-emerald-400 px-3 py-1 text-xs font-semibold text-black" onClick={() => onAccept(user.id)} type="button">Принять</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

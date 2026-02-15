import React from 'react';
import { PublicUser } from '../types';

type Props = {
  groupName: string;
  onGroupName: (v: string) => void;
  friends: PublicUser[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreateGroup: (e: React.FormEvent<HTMLFormElement>) => void;
};

export const CreateGroupPage = ({ groupName, onGroupName, friends, selected, onToggle, onCreateGroup }: Props): JSX.Element => (
  <div className="h-full rounded-2xl border border-white/20 bg-white/10 p-4">
    <h2 className="mb-3 text-lg font-semibold">Создание группы</h2>
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
);

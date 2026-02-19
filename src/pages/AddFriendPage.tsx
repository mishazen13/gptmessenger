import React from 'react';
import { PublicUser } from '../types';

type Props = {
  friendEmail: string;
  onFriendEmail: (v: string) => void;
  onAddFriend: (e: React.FormEvent<HTMLFormElement>) => void;
  requests: PublicUser[];
  onAccept: (id: string) => void;
};

export const AddFriendPage = ({ friendEmail, onFriendEmail, onAddFriend, requests, onAccept }: Props): JSX.Element => {
  return (
    <div className="flex h-full flex-col space-y-4">
      <div 
      className="flex flex-col rounded-2xl border border-white/20 p-4" 
      style={{ backgroundColor: `rgba(71,85,105,0.15)` }}
    > 
        <h2 className="mb-3 text-lg font-semibold">Добавление в друзья</h2>
        <div 
      className="flex flex-col mt-5 rounded-2xl border border-white/20 p-1" 
      style={{ backgroundColor: `rgba(71,85,105,0.15)` }}
    >
        <form className="flex gap-2" onSubmit={onAddFriend}>
          <input className="flex-1 rounded-xl px-3 py-2 focus:outline-none" style={{ backgroundColor: `rgba(71,85,105,0.15)` }} value={friendEmail} onChange={(e) => onFriendEmail(e.target.value)} placeholder="Email пользователя" />
          <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black" type="submit">Отправить</button>
        </form>
        </div>
      

      <div 
      className="flex flex-col mt-5 rounded-2xl border border-white/20 p-4" 
      style={{ backgroundColor: `rgba(71,85,105,0.15)` }}
    >
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
    </div>
  );
};

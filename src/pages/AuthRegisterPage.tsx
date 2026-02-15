import React from 'react';

type Props = {
  name: string;
  email: string;
  password: string;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export const AuthRegisterPage = ({ name, email, password, onName, onEmail, onPassword, onSubmit }: Props): JSX.Element => (
  <form className="space-y-3" onSubmit={onSubmit}>
    <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={name} onChange={(e) => onName(e.target.value)} placeholder="Имя" />
    <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={email} onChange={(e) => onEmail(e.target.value)} placeholder="Email" type="email" />
    <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={password} onChange={(e) => onPassword(e.target.value)} placeholder="Пароль" type="password" />
    <button className="w-full rounded-xl bg-cyan-400 px-3 py-2 font-semibold text-black" type="submit">Создать аккаунт</button>
  </form>
);

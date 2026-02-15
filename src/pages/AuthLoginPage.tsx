import React from 'react';

type Props = {
  email: string;
  password: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export const AuthLoginPage = ({ email, password, onEmail, onPassword, onSubmit }: Props): JSX.Element => (
  <form className="space-y-3" onSubmit={onSubmit}>
    <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={email} onChange={(e) => onEmail(e.target.value)} placeholder="Email" type="email" />
    <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={password} onChange={(e) => onPassword(e.target.value)} placeholder="Пароль" type="password" />
    <button className="w-full rounded-xl bg-cyan-400 px-3 py-2 font-semibold text-black" type="submit">Войти</button>
  </form>
);

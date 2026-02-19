import React from 'react';

type Props = {
  email: string;
  password: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export const AuthLoginPage = ({ email, password, onEmail, onPassword, onSubmit }: Props): JSX.Element => (
  <form className="space-y-3 " onSubmit={onSubmit}>
    <p className="font-bold">Почта</p>
    <input className="w-full rounded-xl border border-white/20 bg-transparent/10 px-3 py-2 focus:outline-none" style={{ backgroundColor: `rgba(71,85,105,0.15)` }} value={email} onChange={(e) => onEmail(e.target.value)} placeholder="Email" type="email" />
    <p className="font-bold">Пароль</p>
    <input className="w-full rounded-xl border border-white/20 bg-transparent/10 px-3 py-2 focus:outline-none" style={{ backgroundColor: `rgba(71,85,105,0.15)` }} value={password} onChange={(e) => onPassword(e.target.value)} placeholder="Пароль" type="password" />
    <div className='flex'>
      <button className=" block rounded-xl bg-cyan-400 px-3 py-2 font-semibold text-black" type="button">Назад</button>
      <button className="ml-auto block rounded-xl bg-cyan-400 px-3 py-2 font-semibold text-black" type="submit">Войти</button>
    </div>
  </form>
);

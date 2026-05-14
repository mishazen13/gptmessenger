import React from 'react';

type Props = {
  email: string;
  password: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void; // Добавляем пропс для навигации назад
};

export const AuthLoginPage = ({ email, password, onEmail, onPassword, onSubmit, onBack }: Props): JSX.Element => (
  <form className="space-y-3" onSubmit={onSubmit}>
    <h2 className="text-2xl font-bold text-center mb-6">Вход в аккаунт</h2>
    
    <p className="font-bold">Почта</p>
    <input 
      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 focus:outline-none focus:border-cyan-400 transition" 
      style={{ backgroundColor: `rgba(71,85,105,0.15)` }} 
      value={email} 
      onChange={(e) => onEmail(e.target.value)} 
      placeholder="Email" 
      type="email" 
    />
    
    <p className="font-bold">Пароль</p>
    <input 
      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 focus:outline-none focus:border-cyan-400 transition" 
      style={{ backgroundColor: `rgba(71,85,105,0.15)` }} 
      value={password} 
      onChange={(e) => onPassword(e.target.value)} 
      placeholder="Пароль" 
      type="password" 
    />
    
    <div className='flex gap-3 pt-4'>
      <button 
        className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 font-semibold text-white transition" 
        type="button" 
        onClick={onBack}
      >
        Назад
      </button>
      <button 
        className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 px-3 py-2 font-semibold text-black transition" 
        type="submit"
      >
        Войти
      </button>
    </div>
  </form>
);
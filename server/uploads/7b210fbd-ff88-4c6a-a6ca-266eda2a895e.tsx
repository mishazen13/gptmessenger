import React from 'react';

type Props = {
  name: string;
  email: string;
  password: string;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void; // Добавляем пропс для навигации назад
};

export const AuthRegisterPage = ({ name, email, password, onName, onEmail, onPassword, onSubmit, onBack }: Props): JSX.Element => (
  <form className="space-y-4" onSubmit={onSubmit}>
    <h2 className="text-2xl font-bold text-center mb-6">Создать аккаунт</h2>
    
    <input 
      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 focus:outline-none focus:border-cyan-400 transition" 
      value={name} 
      onChange={(e) => onName(e.target.value)} 
      placeholder="Имя" 
    />
    
    <input 
      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 focus:outline-none focus:border-cyan-400 transition" 
      value={email} 
      onChange={(e) => onEmail(e.target.value)} 
      placeholder="Email" 
      type="email" 
    />
    
    <input 
      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 focus:outline-none focus:border-cyan-400 transition" 
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
        Создать аккаунт
      </button>
    </div>
  </form>
);
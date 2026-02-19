import React from "react";

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = "Liquid Messenger" }) => {
  return (
    <header className="fixed top-1 left-1 right-1 z-30 rounded-3xl border border-white/20 bg-white/8 backdrop-blur-xl shadow-2xl p-10 mx-4 py-4 px-6 flex justify-between items-center">
      <h1 className="text-xl font-bold text-white select-none">{title}</h1>
      <nav className="space-x-4">
        <a href="#features" className="text-white/80 hover:text-white">Особенности</a>
        <a href="#login" className="text-white/80 hover:text-white">Вход</a>
        <a href="#register" className="text-white/80 hover:text-white">Регистрация</a>
      </nav>
    </header>
  );
};

export default Header;

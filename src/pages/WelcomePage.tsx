// src/pages/WelcomePage.tsx
import React from "react";
import { motion,} from "framer-motion";
import Header from "../components/Header";


type Props = {
  onLogin: () => void;
  onRegister: () => void;
};

export const WelcomePage = ({ onLogin, onRegister }: Props): JSX.Element => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const cardRef = React.useRef<HTMLDivElement | null>(null);



  // ---------------- render ----------------
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 text-white">
      {/* canvas layer */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <Header />

      {/* Главная карточка по центру экрана */}
      <div className="min-h-screen flex flex-col items-center justify-center relative z-10 px-4">
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-30 w-full max-w-xl rounded-3xl border border-white/20 bg-white/8 backdrop-blur-xl shadow-2xl p-10"
          style={{ willChange: "transform" }}
        >
          <h1 className="text-4xl font-extrabold text-center mb-4 select-none">💧 Liquid Messenger</h1>
          <p className="text-center text-cyan-200 mb-6 select-none">
            Погрузиcь в новый уровень общения — плавный интерфейс и кастомизация.
          </p>
          <div className="flex gap-4">
            <button
              onClick={onLogin}
              className="flex-1 rounded-xl bg-white/12 hover:bg-white/20 py-3 font-semibold transition"
            >
              Войти
            </button>
            <button
              onClick={onRegister}
              className="flex-1 rounded-xl bg-cyan-400 hover:bg-cyan-300 py-3 font-semibold text-black transition"
            >
              Зарегистрироваться
            </button>
          </div>
            <div className="mt-6 flex justify-center  gap-3 text-xs text-white/100 select-none">
            <div className="px-3 py-2 rounded-lg bg-white/5">⚡ Мгновенные сообщения</div>
            <div className="px-3 py-2 rounded-lg bg-white/5">🔒 Безопасность</div>
            <div className="px-3 py-2 rounded-lg bg-white/5">🎨 Тема и эмодзи</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
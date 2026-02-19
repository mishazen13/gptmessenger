import React from 'react';
import { PublicUser, SettingsSection, ThemeSettings } from '../types';
import { MdLogout } from 'react-icons/md';

type Props = {
  me: PublicUser;
  section: SettingsSection;
  onBack: () => void;
  onLogout: () => void;
  uiVersion: string;
  onAvatarFile: (file: File | null) => void;
  onWallpaperFile: (file: File | null) => void;
  onBannerFile: (file: File | null) => void;
  theme: ThemeSettings;
  onTheme: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  onResetTheme: () => void;
};

const Slider = ({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }): JSX.Element => (
  <label className="block">
    <span className="mb-1 block text-sm text-slate-300">{label}: {value}</span>
    <input className="w-full" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>
);

export const SettingsPage = ({ me, section, onBack, onLogout, uiVersion, onAvatarFile, onWallpaperFile, onBannerFile, theme, onTheme, onResetTheme }: Props): JSX.Element => {
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const updateThemeWithPreview = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]): void => {
    onTheme(key, value);
    setPreviewOpen(true);
  };

  React.useEffect(() => {
    if (!previewOpen) return;
    const timer = setTimeout(() => setPreviewOpen(false), 1800);
    return () => clearTimeout(timer);
  }, [previewOpen, theme]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/20 p-4" style={{ backgroundColor: `rgba(71,85,105,${theme.panelOpacity})`, backdropFilter: `blur(${theme.contentBlur}px)` }}>
      <button className="mb-3 w-fit rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20" onClick={onBack} type="button">
        ← Назад
      </button>

      <div className="flex-1 overflow-y-auto rounded-xl bg-slate-800/40 p-4 pr-4">
        {section === 'profile' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Профиль</h2>
            <p className="text-sm text-slate-300">Ник: {me.name}</p>
            <p className="text-sm text-slate-300">Email: {me.email}</p>

            <label className="block text-sm text-slate-300">Аватар из проводника</label>
            <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" type="file" accept="image/*" onChange={(e) => onAvatarFile(e.target.files?.[0] ?? null)} />
            <label className="block text-sm text-slate-300">Баннер профиля</label>
            <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" type="file" accept="image/*" onChange={(e) => onBannerFile(e.target.files?.[0] ?? null)} />
          </div>
        )}

        {section === 'personalization' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Персонализация</h2>
            <div 
      className="flex flex-col mt-5 rounded-2xl p-4 border border-white/20 p-1" 
      style={{ backgroundColor: `rgba(71,85,105,0.15)` }}
    >
            <label className="block ml-2 text-sm text-slate-300">Обои</label>
            <div className="relative">
            
              <div 
                className="relative border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-cyan-400/50 transition group"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('image/')) {
                    onWallpaperFile(file);
                  }
                }}
              >
                <input 
                  type="file" 
                  id="wallpaper-upload"
                  accept="image/*" 
                  onChange={(e) => onWallpaperFile(e.target.files?.[0] ?? null)} 
                  className="hidden" 
                />
                <label htmlFor="wallpaper-upload" className="cursor-pointer">
                  <div className="text-4xl mb-3 opacity-50 group-hover:opacity-100 transition">
                    🖼️
                  </div>
                  <p className="text-sm text-white/70 mb-1">
                    <span className="text-cyan-400 font-medium">Нажмите для загрузки</span> или перетащите
                  </p>
                  <p className="text-xs text-white/40">
                    Поддерживаются PNG, JPG, GIF (макс. 10MB)
                  </p>
                </label>
              </div>
              <div 
      className="mt-5"
    >
              <Slider label="Размытие обоев" min={0} max={30} step={1} value={theme.wallpaperBlur} onChange={(v) => updateThemeWithPreview('wallpaperBlur', v)} />
            </div>
            </div>
          </div>
            <button className="w-full rounded-xl bg-transparent px-4 py-3 text-left text-sm transition hover:bg-rose-500/20 text-rose-300" type="button" onClick={onResetTheme}>Сбросить тему</button>
          </div>
        )}

        {section === 'session' && (
          <div>
            <h2 className="mb-2 text-lg font-semibold">Сессия</h2>
            <button className="tall-button flex w-full items-center gap-3 rounded-xl bg-transparent px-4 py-3 text-left text-sm text-rose-300 transition hover:bg-rose-500/20" onClick={onLogout} type="button">
            <MdLogout className="text-rose-300" />
          Выйти из аккаунта
            </button>
          </div>
        )}

        {section === 'about' && (
          <div>
            <h2 className="mb-2 text-lg font-semibold">О приложении</h2>
            <p className="text-sm text-slate-300">Версия интерфейса: {uiVersion}</p>
            <p className="text-sm text-slate-300">Теперь доступна расширенная кастомизация и отправка файлов с превью.</p>
          </div>
        )}
      </div>

      {previewOpen && section === 'personalization' && (
        <div className="pointer-events-none absolute bottom-6 right-6 w-56 rounded-xl border border-white/20 bg-slate-900/90 p-3 shadow-glass backdrop-blur-xl">
          <p className="mb-2 text-xs text-slate-300">Превью изменений</p>
          <div className="rounded-lg p-2 text-sm" style={{ backgroundColor: `${theme.accentColor}CC`, borderRadius: `${theme.bubbleRadius}px`, color: '#041314' }}>
            Так будет выглядеть ваше сообщение
          </div>
          <div className="mt-2 rounded-lg p-2 text-sm text-slate-300" style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: `${theme.bubbleRadius}px` }}>
            А так — сообщение собеседника
          </div>
        </div>
      )}
    </div>
  );
};

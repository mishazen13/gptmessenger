import React from 'react';
import { PublicUser, SettingsSection, ThemeSettings } from '../types';

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

      <div className="flex-1 overflow-y-auto rounded-xl bg-slate-800/40 p-4 pr-2">
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
            <h2 className="text-lg font-semibold">Персонализация PRO</h2>
            <label className="block text-sm text-slate-300">Обои из проводника</label>
            <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" type="file" accept="image/*" onChange={(e) => onWallpaperFile(e.target.files?.[0] ?? null)} />
            <label className="block text-sm text-slate-300">Основной цвет интерфейса</label>
            <input className="accent-color-picker h-11 w-full rounded-2xl border border-white/20" type="color" value={theme.accentColor} onChange={(e) => updateThemeWithPreview('accentColor', e.target.value)} />

            <Slider label="Размытие обоев" min={0} max={30} step={1} value={theme.wallpaperBlur} onChange={(v) => updateThemeWithPreview('wallpaperBlur', v)} />
            <Slider label="Прозрачность панелей" min={0.1} max={0.8} step={0.05} value={theme.panelOpacity} onChange={(v) => updateThemeWithPreview('panelOpacity', v)} />
            <Slider label="Прозрачность сайдбара" min={0.1} max={0.85} step={0.05} value={theme.sidebarOpacity} onChange={(v) => updateThemeWithPreview('sidebarOpacity', v)} />
            <Slider label="Скругление пузырей" min={8} max={32} step={1} value={theme.bubbleRadius} onChange={(v) => updateThemeWithPreview('bubbleRadius', v)} />
            <Slider label="Блюр панелей" min={0} max={24} step={1} value={theme.contentBlur} onChange={(v) => updateThemeWithPreview('contentBlur', v)} />
            <Slider label="Размер шрифта" min={85} max={125} step={1} value={theme.fontScale} onChange={(v) => updateThemeWithPreview('fontScale', v)} />
            <Slider label="Насыщенность темы" min={60} max={180} step={5} value={theme.saturation} onChange={(v) => updateThemeWithPreview('saturation', v)} />

            <button className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20" type="button" onClick={onResetTheme}>Сбросить тему</button>
          </div>
        )}

        {section === 'session' && (
          <div>
            <h2 className="mb-2 text-lg font-semibold">Сессия</h2>
            <button className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20" onClick={onLogout} type="button">Выйти</button>
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

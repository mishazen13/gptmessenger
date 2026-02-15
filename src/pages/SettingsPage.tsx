import { PublicUser, SettingsSection, ThemeSettings } from '../types';

type Props = {
  me: PublicUser;
  section: SettingsSection;
  onBack: () => void;
  onLogout: () => void;
  uiVersion: string;
  onAvatarFile: (file: File | null) => void;
  onWallpaperFile: (file: File | null) => void;
  theme: ThemeSettings;
  onTheme: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  onResetTheme: () => void;
};

const Slider = ({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }): JSX.Element => (
  <label className="block">
    <span className="mb-1 block text-sm text-white/85">{label}: {value}</span>
    <input className="w-full" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>
);

export const SettingsPage = ({ me, section, onBack, onLogout, uiVersion, onAvatarFile, onWallpaperFile, theme, onTheme, onResetTheme }: Props): JSX.Element => (
  <div className="h-full rounded-2xl border border-white/20 p-4" style={{ backgroundColor: `rgba(255,255,255,${theme.panelOpacity})`, backdropFilter: `blur(${theme.contentBlur}px)` }}>
    <button className="mb-3 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20" onClick={onBack} type="button">
      ← Назад
    </button>

    <div className="rounded-xl bg-white/5 p-4">
      {section === 'profile' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Профиль</h2>
          <p className="text-sm text-white/85">Ник: {me.name}</p>
          <p className="text-sm text-white/85">Email: {me.email}</p>

          <label className="block text-sm text-white/85">Аватар из проводника</label>
          <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" type="file" accept="image/*" onChange={(e) => onAvatarFile(e.target.files?.[0] ?? null)} />
        </div>
      )}

      {section === 'personalization' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Персонализация PRO</h2>
          <label className="block text-sm text-white/85">Обои из проводника</label>
          <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" type="file" accept="image/*" onChange={(e) => onWallpaperFile(e.target.files?.[0] ?? null)} />
          <label className="block text-sm text-white/85">Основной цвет интерфейса</label>
          <input className="h-11 w-full rounded-xl" type="color" value={theme.accentColor} onChange={(e) => onTheme('accentColor', e.target.value)} />

          <Slider label="Размытие обоев" min={0} max={30} step={1} value={theme.wallpaperBlur} onChange={(v) => onTheme('wallpaperBlur', v)} />
          <Slider label="Прозрачность панелей" min={0.1} max={0.8} step={0.05} value={theme.panelOpacity} onChange={(v) => onTheme('panelOpacity', v)} />
          <Slider label="Прозрачность сайдбара" min={0.1} max={0.85} step={0.05} value={theme.sidebarOpacity} onChange={(v) => onTheme('sidebarOpacity', v)} />
          <Slider label="Прозрачность сообщений" min={0.25} max={1} step={0.05} value={theme.messageOpacity} onChange={(v) => onTheme('messageOpacity', v)} />
          <Slider label="Скругление пузырей" min={8} max={32} step={1} value={theme.bubbleRadius} onChange={(v) => onTheme('bubbleRadius', v)} />
          <Slider label="Блюр панелей" min={0} max={24} step={1} value={theme.contentBlur} onChange={(v) => onTheme('contentBlur', v)} />
          <Slider label="Размер шрифта" min={85} max={125} step={1} value={theme.fontScale} onChange={(v) => onTheme('fontScale', v)} />
          <Slider label="Насыщенность темы" min={60} max={180} step={5} value={theme.saturation} onChange={(v) => onTheme('saturation', v)} />

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
          <p className="text-sm text-white/85">Версия интерфейса: {uiVersion}</p>
          <p className="text-sm text-white/85">Теперь доступна расширенная кастомизация и отправка файлов с превью.</p>
        </div>
      )}
    </div>
  </div>
);

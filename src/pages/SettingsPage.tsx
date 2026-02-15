import { PublicUser, SettingsSection } from '../types';

type Props = {
  me: PublicUser;
  section: SettingsSection;
  onBack: () => void;
  onLogout: () => void;
  uiVersion: string;
  onAvatarFile: (file: File | null) => void;
  onWallpaperFile: (file: File | null) => void;
};

export const SettingsPage = ({ me, section, onBack, onLogout, uiVersion, onAvatarFile, onWallpaperFile }: Props): JSX.Element => (
  <div className="h-full rounded-2xl border border-white/20 bg-white/10 p-4">
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
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Персонализация</h2>
          <label className="block text-sm text-white/85">Обои из проводника</label>
          <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2" type="file" accept="image/*" onChange={(e) => onWallpaperFile(e.target.files?.[0] ?? null)} />
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
        </div>
      )}
    </div>
  </div>
);

import { PublicUser, SettingsSection } from '../types';

type Props = {
  me: PublicUser;
  section: SettingsSection;
  onSection: (s: SettingsSection) => void;
  onLogout: () => void;
  uiVersion: string;
};

export const SettingsPage = ({ me, section, onSection, onLogout, uiVersion }: Props): JSX.Element => (
  <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
    <div className="rounded-xl bg-white/5 p-4">
      {section === 'profile' && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Профиль</h2>
          <p className="text-sm text-white/85">Ник: {me.name}</p>
          <p className="text-sm text-white/85">Email: {me.email}</p>
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

    <div className="mt-4 flex gap-2">
      {([
        ['profile', 'Профиль'],
        ['session', 'Сессия'],
        ['about', 'О приложении'],
      ] as [SettingsSection, string][]).map(([key, label]) => (
        <button key={key} className={`rounded-xl px-3 py-2 text-sm ${section === key ? 'bg-cyan-400 text-black' : 'bg-white/10'}`} onClick={() => onSection(key)} type="button">{label}</button>
      ))}
    </div>
  </div>
);

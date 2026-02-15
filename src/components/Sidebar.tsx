import { Avatar } from './Avatar';
import { AppPage, Chat, PublicUser, SettingsSection } from '../types';

type Props = {
  me: PublicUser;
  chats: Chat[];
  users: PublicUser[];
  activeChatId: string;
  isSyncing: boolean;
  appPage: AppPage;
  settingsSection: SettingsSection;
  onSettingsSection: (s: SettingsSection) => void;
  onSelectChat: (id: string) => void;
  onOpenPlus: () => void;
  onOpenSettings: () => void;
  displayName: (u: PublicUser) => string;
  uiVersion: string;
  avatarUrl?: string;
};

export const Sidebar = ({
  me,
  chats,
  users,
  activeChatId,
  isSyncing,
  appPage,
  settingsSection,
  onSettingsSection,
  onSelectChat,
  onOpenPlus,
  onOpenSettings,
  displayName,
  uiVersion,
  avatarUrl,
}: Props): JSX.Element => (
  <aside className="flex h-[calc(100vh-2rem)] flex-col rounded-2xl border border-white/20 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
    <div className="mb-3 flex items-center justify-between text-xs text-white/75">
      <span>{appPage === 'settings' ? 'Разделы настроек' : 'Контакты и чаты'}</span>
      <span>{isSyncing ? 'sync...' : 'online'}</span>
    </div>

    <div className="mb-3 flex-1 space-y-2 overflow-auto pr-1">
      {appPage === 'settings' ? (
        ([['profile', 'Профиль'], ['session', 'Сессия'], ['about', 'О приложении']] as [SettingsSection, string][]).map(([key, label]) => (
          <button key={key} className={`w-full rounded-xl px-3 py-2 text-left text-sm ${settingsSection === key ? 'bg-cyan-400 text-black' : 'bg-white/10'}`} onClick={() => onSettingsSection(key)} type="button">{label}</button>
        ))
      ) : (
        <>
          {chats.length === 0 && <p className="text-sm text-white/70">Пока нет чатов</p>}
          {chats.map((chat) => {
            const directPeer = !chat.isGroup ? users.find((u) => u.id !== me.id && chat.memberIds.includes(u.id)) : undefined;
            const title = chat.isGroup ? `👥 ${chat.name}` : `💬 ${directPeer ? displayName(directPeer) : 'Личный чат'}`;
            return (
              <button key={chat.id} className={`w-full rounded-xl px-3 py-2 text-left text-sm ${activeChatId === chat.id ? 'bg-cyan-400 text-black' : 'bg-white/10'}`} onClick={() => onSelectChat(chat.id)} type="button">{title}</button>
            );
          })}
        </>
      )}
    </div>

    <button className="mb-3 ml-auto h-12 w-12 rounded-xl bg-cyan-400 text-2xl font-bold text-black" onClick={onOpenPlus} type="button">+</button>

    <div className="h-28 rounded-xl bg-white/5 px-3 py-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar imageUrl={avatarUrl} name={me.name} size={28} />
          <p className="truncate text-sm font-semibold">{me.name}</p>
        </div>
        <button className="rounded-lg bg-white/10 p-2 text-sm hover:bg-white/20" onClick={onOpenSettings} title="Настройки" type="button">⚙️</button>
      </div>
      <p className="truncate text-xs text-white/70">{me.email}</p>
      <p className="mt-2 text-[10px] text-cyan-100/90">{uiVersion}</p>
    </div>
  </aside>
);

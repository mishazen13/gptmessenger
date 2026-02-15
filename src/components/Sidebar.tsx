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
  bannerUrl?: string;
  accentColor: string;
  sidebarOpacity: number;
  contentBlur: number;
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
  bannerUrl,
  accentColor,
  sidebarOpacity,
  contentBlur,
}: Props): JSX.Element => (
  <aside className="flex h-[calc(100vh-2rem)] flex-col rounded-2xl border border-white/20 p-4 shadow-glass" style={{ backgroundColor: `rgba(71,85,105,${sidebarOpacity})`, backdropFilter: `blur(${contentBlur}px)` }}>
    <div className="mb-3 flex items-center justify-between text-xs text-white/75">
      <span>{appPage === 'settings' ? 'Разделы настроек' : 'Контакты и чаты'}</span>
      <span>{isSyncing ? 'sync...' : 'online'}</span>
    </div>

    <div className="mb-3 flex-1 space-y-2 overflow-auto pr-1">
      {appPage === 'settings' ? (
        ([['profile', 'Профиль'], ['personalization', 'Персонализация'], ['session', 'Сессия'], ['about', 'О приложении']] as [SettingsSection, string][]).map(([key, label]) => (
          <button key={key} className={`w-full rounded-xl px-3 py-2 text-left text-sm ${settingsSection === key ? 'text-black' : 'bg-slate-700/40'}`} style={settingsSection === key ? { backgroundColor: accentColor } : undefined} onClick={() => onSettingsSection(key)} type="button">{label}</button>
        ))
      ) : (
        <>
          {chats.length === 0 && <p className="text-sm text-white/70">Пока нет чатов</p>}
          {chats.map((chat) => {
            const directPeer = !chat.isGroup ? users.find((u) => u.id !== me.id && chat.memberIds.includes(u.id)) : undefined;
            const title = chat.isGroup ? `👥 ${chat.name}` : `💬 ${directPeer ? displayName(directPeer) : 'Личный чат'}`;
            return (
              <button key={chat.id} className={`w-full rounded-xl px-3 py-2 text-left text-sm ${activeChatId === chat.id ? 'text-black' : 'bg-slate-700/40'}`} style={activeChatId === chat.id ? { backgroundColor: accentColor } : undefined} onClick={() => onSelectChat(chat.id)} type="button">{title}</button>
            );
          })}
        </>
      )}
    </div>

    <button className="mb-3 ml-auto h-12 w-12 rounded-xl text-2xl font-bold text-black" style={{ backgroundColor: accentColor }} onClick={onOpenPlus} type="button">+</button>

    <div className="relative mt-10 overflow-hidden rounded-xl border border-white/20 bg-slate-800/40 px-3 pb-3 pt-12">
      <div className="absolute inset-x-0 top-0 h-16 overflow-hidden rounded-t-xl border-b border-white/10 bg-slate-900/60">
        {bannerUrl ? <img src={bannerUrl} alt="banner" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-r from-indigo-500/30 to-cyan-500/30" />}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-12 h-10 bg-gradient-to-b from-transparent via-slate-900/35 to-slate-800/50" />
      <div className="absolute left-3 top-0 -translate-y-1/2">
        <Avatar imageUrl={avatarUrl} name={me.name} size={56} />
      </div>
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="-mt-1 truncate pl-16 text-base font-bold leading-5">{me.name}</p>
        <button className="rounded-lg bg-white/10 p-2 text-sm hover:bg-white/20" onClick={onOpenSettings} title="Настройки" type="button">⚙️</button>
      </div>
      <p className="truncate text-xs text-white/70">{me.email}</p>
      <p className="mt-2 text-[10px] text-cyan-100/90">{uiVersion}</p>
    </div>
  </aside>
);

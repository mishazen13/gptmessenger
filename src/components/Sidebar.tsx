import React from 'react';
import { Avatar } from './Avatar';
import { AppPage, Chat, PresenceStatus, PublicUser, SettingsSection } from '../types';
import { FaCog, FaPlus } from 'react-icons/fa';

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
  getAvatarUrl: (userId: string) => string | undefined;
  uiVersion: string;
  avatarUrl?: string;
  bannerUrl?: string;
  accentColor: string;
  contentBlur: number;
  sidebarOpacity?: number;
  myPresence: PresenceStatus;
  onPresenceChange: (status: PresenceStatus) => void;
};

const colorMap: Record<PresenceStatus, string> = {
  online: '#22c55e',
  offline: '#94a3b8',
  dnd: '#ef4444',
};

export const Sidebar = ({ me, chats, users, activeChatId, isSyncing, appPage, settingsSection, onSettingsSection, onSelectChat, onOpenPlus, onOpenSettings, displayName, getAvatarUrl, uiVersion, avatarUrl, bannerUrl, accentColor, contentBlur, myPresence, onPresenceChange }: Props): JSX.Element => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <aside className="flex h-[calc(100vh-2rem)] flex-col rounded-2xl border border-white/20 p-4 shadow-glass" style={{ backgroundColor: 'rgba(71,85,105,0.15)', backdropFilter: `blur(${contentBlur}px)` }}>
      <div className="mb-3 flex items-center justify-between text-xs text-white/75"><span>{appPage === 'settings' ? 'Разделы настроек' : 'Контакты и чаты'}</span><span>{isSyncing ? 'sync...' : 'online'}</span></div>
      <div className="mb-3 flex-1 space-y-2 overflow-auto pr-1">
        {appPage === 'settings' ? (
          ([['profile', 'Профиль'], ['personalization', 'Персонализация'], ['session', 'Сессия'], ['about', 'О приложении']] as [SettingsSection, string][]).map(([key, label]) => (
            <button key={key} className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-all ${settingsSection === key ? 'text-black' : 'bg-slate-700/40 hover:bg-slate-700/60'}`} style={settingsSection === key ? { backgroundColor: accentColor } : undefined} onClick={() => onSettingsSection(key)} type="button">{label}</button>
          ))
        ) : chats.map((chat) => {
          const directPeer = !chat.isGroup ? users.find((u) => u.id !== me.id && chat.memberIds.includes(u.id)) : undefined;
          return (
            <button key={chat.id} className={`w-full rounded-xl px-2 py-2 text-left text-sm flex items-center gap-2 transition-all ${activeChatId === chat.id ? 'text-black' : 'hover:bg-slate-600/40'}`} style={activeChatId === chat.id ? { backgroundColor: accentColor } : undefined} onClick={() => onSelectChat(chat.id)} type="button">
              <Avatar imageUrl={directPeer ? getAvatarUrl(directPeer.id) : undefined} name={directPeer ? displayName(directPeer) : chat.name} size={32} />
              <span className="truncate">{chat.isGroup ? chat.name : (directPeer ? displayName(directPeer) : 'Личный чат')}</span>
            </button>
          );
        })}
      </div>
      <button className="mb-4 ml-auto block h-12 w-12 rounded-full px-3 py-2" style={{ backgroundColor: 'rgba(40, 99, 226)' }} onClick={onOpenPlus} type="button"><FaPlus size={20} /></button>

      <div className="relative mt-auto rounded-xl border border-white/20 bg-slate-800/40 px-3 pb-3 pt-12">
        <div className="absolute inset-x-0 top-0 h-16 overflow-hidden rounded-t-xl border-b border-white/10">{bannerUrl ? <img src={bannerUrl} alt="banner" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-r from-indigo-500/30 to-cyan-500/30" />}</div>
        <div className="absolute left-3 top-0 z-20 -translate-y-1/2">
          <div className="rounded-full p-1" style={{ boxShadow: `0 0 0 2px ${colorMap[myPresence]}` }}><Avatar imageUrl={avatarUrl} name={me.name} size={56} /></div>
          <button type="button" onClick={() => setMenuOpen((v) => !v)} className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-slate-900" style={{ background: colorMap[myPresence] }} />
          {menuOpen && (
            <div className="animate-scaleIn absolute -right-2 top-14 z-30 w-40 rounded-lg border border-white/20 bg-slate-900/95 p-1 text-xs">
              {(['online', 'offline', 'dnd'] as PresenceStatus[]).map((s) => (
                <button key={s} type="button" className="block w-full rounded px-2 py-1 text-left hover:bg-white/10" onClick={() => { onPresenceChange(s); setMenuOpen(false); }}>{s === 'online' ? 'В сети' : s === 'offline' ? 'Не в сети' : 'Не беспокоить'}</button>
              ))}
            </div>
          )}
        </div>
        <div className="relative mb-1 h-8"><p className="absolute left-16 -top-12 z-20 truncate text-lg font-bold text-white drop-shadow-md">{me.name}</p></div>
        <div className="mt-2 flex items-start justify-between"><div><p className="truncate text-xs text-white/70">{me.email}</p><p className="mt-1 text-[10px] text-cyan-100/90">{uiVersion}</p></div><button className="rounded-lg p-2 text-sm hover:bg-white/20" onClick={onOpenSettings} type="button"><FaCog size={20} /></button></div>
      </div>
    </aside>
  );
};

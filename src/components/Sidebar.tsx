import { Avatar } from './Avatar';
import { AppPage, Chat, PublicUser, SettingsSection, } from '../types';
import {  } from "react-icons/md";
import { FaCog, FaPlus } from "react-icons/fa";
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
  getAvatarUrl,
  uiVersion,
  avatarUrl,
  bannerUrl,
  accentColor,
  contentBlur,
}: Props): JSX.Element => {

  return (
    <aside 
      className="flex h-[calc(100vh-2rem)] flex-col rounded-2xl border border-white/20 p-4 shadow-glass" 
      style={{ 
        backgroundColor: `rgba(71,85,105,0.15)`, 
        backdropFilter: `blur(${contentBlur}px)` 
      }}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-white/75">
        <span>{appPage === 'settings' ? 'Разделы настроек' : 'Контакты и чаты'}</span>
        <span>{isSyncing ? 'sync...' : 'online'}</span>
      </div>

      <div className="mb-3 flex-1 space-y-2 overflow-auto pr-1">
        {appPage === 'settings' ? (
          ([['profile', 'Профиль'], ['personalization', 'Персонализация'], ['session', 'Сессия'], ['about', 'О приложении']] as [SettingsSection, string][]).map(([key, label]) => (
            <button 
              key={key} 
              className={`w-full rounded-xl px-3 py-2 text-left text-sm ${settingsSection === key ? 'text-black' : 'bg-slate-700/40'}`} 
              style={settingsSection === key ? { backgroundColor: accentColor } : undefined} 
              onClick={() => onSettingsSection(key)} 
              type="button"
            >
              {label}
            </button>
          ))
        ) : (
          <>
            {chats.length === 0 && <p className="text-sm text-white/70">Пока нет чатов</p>}
            {chats.map((chat) => {
              const directPeer = !chat.isGroup 
                ? users.find((u) => u.id !== me.id && chat.memberIds.includes(u.id)) 
                : undefined;
              
              return (
                <button 
                  key={chat.id} 
                  className={`w-full rounded-xl px-2 py-2 text-left text-sm flex items-center gap-2 ${activeChatId === chat.id ? 'text-black' : ' hover:bg-slate-600/40'}`} 
                  style={activeChatId === chat.id ? { backgroundColor: accentColor } : undefined} 
                  onClick={() => onSelectChat(chat.id)} 
                  type="button"
                >
                  {/* Аватарка или иконка группы */}
                  {chat.isGroup ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-sm shrink-0">
                      👥
                    </div>
                  ) : (
                    <Avatar 
                      imageUrl={directPeer ? getAvatarUrl(directPeer.id) : undefined}
                      name={directPeer ? displayName(directPeer) : 'Чат'}
                      size={32}
                    />
                  )}
                  
                  {/* Название чата */}
                  <span className="truncate">
                    {chat.isGroup ? chat.name : (directPeer ? displayName(directPeer) : 'Личный чат')}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      <button
        className="px-3 py-2 mb-4 ml-auto block rounded-full w-12 h-12 flex items-center justify-center transition hover:brightness-90"
        style={{ 
        backgroundColor: 'rgba(40, 99, 226)' 
      }}
        onClick={onOpenPlus}
        title="Добавить"
        type="button"
      >
        <FaPlus size={20} />
      </button>

      

      
      <div className="relative mt-auto rounded-xl border border-white/20 bg-slate-800/40 px-3 pb-3 pt-12">
        {/* Баннер */}
        <div className="absolute inset-x-0 top-0 h-16 overflow-hidden rounded-t-xl border-b border-white/10">
          {bannerUrl ? (
            <img src={bannerUrl} alt="banner" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-indigo-500/30 to-cyan-500/30" />
          )}
        </div>

        {/* Аватар */} 
        <div className="absolute left-3 top-0 -translate-y-1/2 z-20">
          <Avatar imageUrl={avatarUrl} name={me.name} size={56} />
        </div>

        <div className="relative mb-1 h-8">
          <p className="absolute left-16 -top-12 z-20 truncate text-lg font-bold text-white drop-shadow-md">
            {me.name}
          </p>
        </div>
        
        <div className="mt-2 flex items-start justify-between">
          <div>
            <p className="truncate text-xs text-white/70">{me.email}</p>
            <p className="mt-1 text-[10px] text-cyan-100/90">{uiVersion}</p>
          </div>

          <button
            className="rounded-lg  p-2 text-sm hover:bg-white/20"
            onClick={onOpenSettings}
            title="Настройки"
            type="button"
          >
            <FaCog size={20} />
          </button>
        </div>
      </div>
    </aside>
  )
};
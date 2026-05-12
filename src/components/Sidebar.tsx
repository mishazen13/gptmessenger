import React from 'react';
import { Avatar } from './Avatar';
import { AppPage, Chat, PresenceStatus, PublicUser, SettingsSection } from '../types';
import { FaCog, FaPlus } from 'react-icons/fa';
import { MdCheck } from 'react-icons/md';

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
  getBannerUrl: (userId: string) => string | undefined; // Добавляем пропс для получения баннера друга
  uiVersion: string;
  avatarUrl?: string;
  bannerUrl?: string;
  accentColor: string;
  contentBlur: number;
  sidebarOpacity?: number;
  myPresence: PresenceStatus;
  onPresenceChange: (status: PresenceStatus) => void;
  presenceMap?: Record<string, PresenceStatus>;
};

const colorMap: Record<PresenceStatus, { bg: string; label: string }> = {
  online: { bg: '#22c55e', label: 'В сети' },
  offline: { bg: '#64748b', label: 'Не в сети' },
  dnd: { bg: '#ef4444', label: 'Не беспокоить' },
};

export const Sidebar = ({ 
  me, chats, users, activeChatId, isSyncing, appPage, settingsSection, onSettingsSection,
  onSelectChat, onOpenPlus, onOpenSettings, displayName, getAvatarUrl, getBannerUrl, uiVersion,
  avatarUrl, bannerUrl, accentColor, contentBlur, myPresence, onPresenceChange, presenceMap = {}
}: Props): JSX.Element => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuClosing, setMenuClosing] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0 });
  const menuRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  };

  const handleCloseMenu = () => {
    setMenuClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
    }, 200);
  };

  const handleOpenMenu = () => {
    updateMenuPosition();
    setMenuOpen(true);
    setMenuClosing(false);
  };

  const handleToggleMenu = () => {
    if (menuOpen) {
      handleCloseMenu();
    } else {
      handleOpenMenu();
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        handleCloseMenu();
      }
    };
    const handleScroll = () => {
      if (menuOpen && !menuClosing) {
        updateMenuPosition();
      }
    };
    const handleResize = () => {
      if (menuOpen && !menuClosing) {
        updateMenuPosition();
      }
    };
    
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [menuOpen, menuClosing]);

  const settingsSections: { key: SettingsSection; label: string }[] = [
    { key: 'profile', label: 'Профиль' },
    { key: 'personalization', label: 'Оформление' },
    { key: 'privacy', label: 'Конфиденциальность' },
    { key: 'session', label: 'Сессия' },
    { key: 'about', label: 'О приложении' }
  ];

  return (
    <aside className="flex h-[calc(100vh-2rem)] flex-col rounded-2xl border border-white/20 p-4 shadow-glass" style={{ backgroundColor: 'rgba(71,85,105,0.15)', backdropFilter: `blur(${contentBlur}px)` }}>
      <div className="mb-3 flex items-center justify-between text-xs text-white/75">
        <span>{appPage === 'settings' ? 'Разделы настроек' : 'Контакты и чаты'}</span>
        <span>{isSyncing ? 'sync...' : 'online'}</span>
      </div>

      <div className="mb-3 flex-1 space-y-2 overflow-auto pr-1">
        {appPage === 'settings' ? (
          settingsSections.map(({ key, label }) => (
            <button 
              key={key} 
              className={`w-full rounded-full px-4 py-2.5 text-left text-sm transition-all duration-300 ${
                settingsSection === key 
                  ? 'text-white shadow-lg' 
                  : 'bg-slate-700/40 hover:bg-slate-700/60'
              }`} 
              style={settingsSection === key ? { backgroundColor: accentColor } : undefined} 
              onClick={() => onSettingsSection(key)} 
              type="button"
            >
              {label}
            </button>
          ))
        ) : (
          chats.map((chat) => {
            const directPeer = !chat.isGroup ? users.find((u) => u.id !== me.id && chat.memberIds.includes(u.id)) : undefined;
            const peerStatus = directPeer ? (presenceMap[directPeer.id] || 'offline') : 'offline';
            const peerBannerUrl = directPeer ? getBannerUrl(directPeer.id) : undefined;
            
            return (
              <button 
                key={chat.id} 
                className={`w-full rounded-2xl overflow-hidden transition-all duration-300 ease-out ${
                  activeChatId === chat.id 
                    ? 'scale-[1.01]' 
                    : 'hover:scale-[1.005]'
                }`}
                onClick={() => onSelectChat(chat.id)} 
                type="button"
              >
                <div className="relative h-14 w-full">
                  {/* Баннер друга */}
                  {directPeer && peerBannerUrl ? (
                    <>
                      <img 
                        src={peerBannerUrl} 
                        alt="" 
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      {/* Плавное затемнение активного чата */}
                      <div 
                        className={`absolute inset-0 transition-all duration-500 ease-out ${
                          activeChatId === chat.id 
                            ? 'bg-black/70' 
                            : 'bg-black/40 hover:bg-black/55'
                        }`} 
                      />
                    </>
                  ) : (
                    <div 
                      className={`absolute inset-0 transition-all duration-500 ease-out ${
                        activeChatId === chat.id 
                          ? 'bg-gradient-to-r from-slate-800/80 to-slate-700/70' 
                          : 'bg-gradient-to-r from-slate-700/60 to-slate-600/50 hover:from-slate-700/75 hover:to-slate-600/65'
                      }`} 
                    />
                  )}
                  
                  {/* Контент кнопки */}
                  <div className="relative z-10 flex items-center gap-3 px-3 py-2 h-full">
                    <div className="relative flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-105">
                      <Avatar 
                        imageUrl={directPeer ? getAvatarUrl(directPeer.id) : undefined} 
                        name={directPeer ? displayName(directPeer) : chat.name} 
                        size={36} 
                      />
                      {directPeer && (
                        <div 
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-800 transition-all duration-300" 
                          style={{ backgroundColor: colorMap[peerStatus]?.bg }} 
                        />
                      )}
                    </div>
                    <span className="truncate font-medium text-white drop-shadow-md transition-all duration-300 group-hover:translate-x-0.5">
                      {chat.isGroup ? chat.name : (directPeer ? displayName(directPeer) : 'Личный чат')}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <button 
        className="mb-4 ml-auto block h-12 w-12 rounded-full shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl" 
        style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }} 
        onClick={onOpenPlus} 
        type="button"
      >
        <FaPlus size={20} className="text-white mx-auto" />
      </button>

      {/* Блок профиля */}
      <div className="relative mt-auto rounded-xl border border-white/20 bg-slate-800/40 px-3 pb-3 pt-12 ">
        <div className="absolute inset-x-0 top-0 h-16 overflow-hidden rounded-t-xl">
          {bannerUrl ? (
            <img src={bannerUrl} alt="banner" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-indigo-500/30 to-cyan-500/30" />
          )}
        </div>
        <div className="absolute left-3 top-0 z-50 -translate-y-1/2">
          <div className="rounded-full p-1 bg-slate-800/60 backdrop-blur-sm">
            <Avatar imageUrl={avatarUrl} name={me.name} size={56} />
          </div>
          <button
            ref={buttonRef}
            type="button"
            onClick={handleToggleMenu}
            className="absolute bottom-0.5 right-1 h-5 w-5 rounded-full border-2 border-slate-900 hover:scale-110 transition-transform"
            style={{ background: colorMap[myPresence]?.bg }}
          />
        </div>
        <div className="relative mb-1 h-8">
          <p className="absolute left-16 -top-12 z-20 truncate text-lg font-bold text-white drop-shadow-md">{me.name}</p>
        </div>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <p className="truncate text-xs text-white/70">{me.email}</p>
            <p className="mt-1 text-[10px] text-cyan-100/90">{uiVersion}</p>
          </div>
          <button 
            className="rounded-lg p-2 text-sm text-white/70 transition-all duration-200 hover:bg-white/20 hover:text-white" 
            onClick={onOpenSettings} 
            type="button"
          >
            <FaCog size={20} />
          </button>
        </div>

        {/* Меню статуса */}
        {(menuOpen || menuClosing) && (
          <div
            ref={menuRef}
            className={`fixed z-50 transition-all duration-200 ease-out ${
              menuClosing ? 'menu-slide-out' : 'menu-slide-in'
            }`}
            style={{
              top: `${menuPosition.top - 80}px`,
              left: `${menuPosition.left - 20}px`,
              transform: 'translateY(-50%)',
              transformOrigin: 'left center',
            }}
          >
            <div className="w-44 rounded-xl border border-white/20 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
              {(['online', 'offline', 'dnd'] as PresenceStatus[]).map((s) => (
                <button 
                  key={s} 
                  className="group flex w-full items-center justify-between rounded-lg px-3 py-2 transition-all duration-150 hover:bg-white/10" 
                  onClick={() => { 
                    onPresenceChange(s); 
                    handleCloseMenu();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorMap[s]?.bg }} />
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{colorMap[s]?.label}</span>
                  </div>
                  {myPresence === s && <MdCheck size={14} className="text-cyan-400" />}
                </button>
              ))}
            </div>
            
          </div>
        )}
      </div>
    </aside>
  );
};
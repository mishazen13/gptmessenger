import React from 'react';
import { PublicUser, SettingsSection, ThemeSettings } from '../types';
import { MdArrowBack, MdLogout, MdInfo, MdVpnKey, MdCheck, MdClose, MdEdit, MdEmail, MdPhotoCamera, MdPalette, MdLock, MdVisibility, MdVisibilityOff, MdDescription } from 'react-icons/md';

type Props = {
  me: PublicUser;
  section: SettingsSection;
  onBack: () => void;
  onLogout: () => void;
  uiVersion: string;
  onAvatarFile: (file: File | null) => Promise<void>;
  onWallpaperFile: (file: File | null) => Promise<void>;
  onBannerFile: (file: File | null) => Promise<void>;
  theme: ThemeSettings;
  onTheme: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  onResetTheme: () => void;
  avatarUrl?: string;
  bannerUrl?: string;
  onUpdateBio?: (bio: string) => void;
  onUpdatePrivacy?: (key: string, value: boolean) => void;
  bio?: string;
  privacySettings?: {
    showLastSeen: boolean;
    showReadReceipts: boolean;
    allowNonFriendsMessage: boolean;
    showProfilePhoto: boolean;
  };
};

// Предустановленные цветовые темы
const COLOR_THEMES = [
  { 
    name: 'Ocean Breeze', 
    accentColor: '#06b6d4', 
    gradientFrom: '#1e1b4b', 
    gradientTo: '#0f766e',
    description: 'Свежий океанский бриз'
  },
  { 
    name: 'Sunset', 
    accentColor: '#f43f5e', 
    gradientFrom: '#4c1d95', 
    gradientTo: '#be123c',
    description: 'Тёплый закат'
  },
  { 
    name: 'Forest', 
    accentColor: '#10b981', 
    gradientFrom: '#064e3b', 
    gradientTo: '#047857',
    description: 'Лесная глушь'
  },
  { 
    name: 'Midnight', 
    accentColor: '#8b5cf6', 
    gradientFrom: '#0f172a', 
    gradientTo: '#4c1d95',
    description: 'Тёмная ночь'
  },
  { 
    name: 'Cherry', 
    accentColor: '#ec4899', 
    gradientFrom: '#831843', 
    gradientTo: '#be185d',
    description: 'Вишнёвый сад'
  },
  { 
    name: 'Gold', 
    accentColor: '#fbbf24', 
    gradientFrom: '#451a03', 
    gradientTo: '#b45309',
    description: 'Золотая эпоха'
  },
  { 
    name: 'Emerald', 
    accentColor: '#2dd4bf', 
    gradientFrom: '#042f2e', 
    gradientTo: '#0f766e',
    description: 'Изумрудный блеск'
  },
  { 
    name: 'Lavender', 
    accentColor: '#a78bfa', 
    gradientFrom: '#2e1065', 
    gradientTo: '#6d28d9',
    description: 'Лавандовые поля'
  },
];

export const SettingsPage = ({ 
  me, 
  section, 
  onBack, 
  onLogout, 
  uiVersion, 
  onAvatarFile, 
  onWallpaperFile, 
  onBannerFile, 
  theme, 
  onTheme, 
  onResetTheme, 
  avatarUrl, 
  bannerUrl,
  onUpdateBio,
  onUpdatePrivacy,
  bio = '',
  privacySettings = {
    showLastSeen: true,
    showReadReceipts: true,
    allowNonFriendsMessage: true,
    showProfilePhoto: true,
  }
}: Props): JSX.Element => {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState(me.name);
  const [wallpaperPreview, setWallpaperPreview] = React.useState<string | null>(null);
  const [isEditingBio, setIsEditingBio] = React.useState(false);
  const [tempBio, setTempBio] = React.useState(bio);
  const [localPrivacy, setLocalPrivacy] = React.useState(privacySettings);
  
  // Состояния загрузки
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = React.useState(false);
  const [isUploadingWallpaper, setIsUploadingWallpaper] = React.useState(false);
  
  // Временные превью для загрузки
  const [tempAvatarPreview, setTempAvatarPreview] = React.useState<string | null>(null);
  const [tempBannerPreview, setTempBannerPreview] = React.useState<string | null>(null);
  
  // Очищаем временные превью при изменении пропсов
  React.useEffect(() => {
    if (avatarUrl && tempAvatarPreview) {
      setTempAvatarPreview(null);
    }
  }, [avatarUrl]);
  
  React.useEffect(() => {
    if (bannerUrl && tempBannerPreview) {
      setTempBannerPreview(null);
    }
  }, [bannerUrl]);

  const handleAvatarFile = async (file: File | null) => {
    if (!file || isUploadingAvatar) return;
    
    setIsUploadingAvatar(true);
    const tempUrl = URL.createObjectURL(file);
    setTempAvatarPreview(tempUrl);
    
    try {
      await onAvatarFile(file);
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setTempAvatarPreview(null);
    } finally {
      setTimeout(() => {
        URL.revokeObjectURL(tempUrl);
      }, 3000);
      setIsUploadingAvatar(false);
    }
  };

  const handleBannerFile = async (file: File | null) => {
    if (!file || isUploadingBanner) return;
    
    setIsUploadingBanner(true);
    const tempUrl = URL.createObjectURL(file);
    setTempBannerPreview(tempUrl);
    
    try {
      await onBannerFile(file);
    } catch (error) {
      console.error('Banner upload failed:', error);
      setTempBannerPreview(null);
    } finally {
      setTimeout(() => {
        URL.revokeObjectURL(tempUrl);
      }, 3000);
      setIsUploadingBanner(false);
    }
  };

  const handleWallpaperFile = async (file: File | null) => {
    if (!file || isUploadingWallpaper) return;
    
    setIsUploadingWallpaper(true);
    const tempUrl = URL.createObjectURL(file);
    setWallpaperPreview(tempUrl);
    
    try {
      await onWallpaperFile(file);
    } catch (error) {
      console.error('Wallpaper upload failed:', error);
      setWallpaperPreview(null);
    } finally {
      setTimeout(() => {
        URL.revokeObjectURL(tempUrl);
      }, 3000);
      setIsUploadingWallpaper(false);
    }
  };

  const handleRemoveWallpaper = () => {
    if (wallpaperPreview) {
      URL.revokeObjectURL(wallpaperPreview);
    }
    setWallpaperPreview(null);
    onWallpaperFile(null);
  };

  const handleSaveName = () => {
    console.log('Save name:', tempName);
    setIsEditingName(false);
  };

  const handleSaveBio = () => {
    if (onUpdateBio) {
      onUpdateBio(tempBio);
    }
    setIsEditingBio(false);
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    const newPrivacy = { ...localPrivacy, [key]: value };
    setLocalPrivacy(newPrivacy);
    if (onUpdatePrivacy) {
      onUpdatePrivacy(key, value);
    }
  };

  const applyColorTheme = (colorTheme: typeof COLOR_THEMES[0]) => {
    onTheme('accentColor', colorTheme.accentColor);
    setPreviewOpen(true);
    setTimeout(() => setPreviewOpen(false), 2000);
  };

  React.useEffect(() => {
    return () => {
      if (wallpaperPreview) URL.revokeObjectURL(wallpaperPreview);
      if (tempAvatarPreview) URL.revokeObjectURL(tempAvatarPreview);
      if (tempBannerPreview) URL.revokeObjectURL(tempBannerPreview);
    };
  }, []);

  const displayAvatar = tempAvatarPreview || avatarUrl;
  const displayBanner = tempBannerPreview || bannerUrl;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 from-slate-900/95 to-slate-800/95 backdrop-blur-xl">
      {/* Header with Back Button */}
      <div className="border-b rounded-full m-3 border-white/10 bg-slate-800/40 px-4 py-3">
        <button 
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          onClick={onBack} 
          type="button"
        >
          <MdArrowBack/> Назад
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {section === 'profile' && (
          <div className="max-w-2xl mx-auto p-6">
            {/* Profile Container - Centered */}
            <div className="rounded-2xl border border-white/20 bg-slate-800/40 overflow-hidden">
              {/* Clickable Banner */}
              <label className="relative block h-40 cursor-pointer overflow-hidden transition hover:brightness-110">
                {displayBanner ? (
                  <>
                    <img 
                      src={displayBanner} 
                      alt="Banner" 
                      className="h-full w-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                  </>
                ) : (
                  <div className="h-full w-full bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition hover:opacity-100">
                  <div className="rounded-full bg-cyan-500 p-3 shadow-lg">
                    {isUploadingBanner ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <MdPhotoCamera size={24} className="text-white" />
                    )}
                  </div>
                </div>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleBannerFile(e.target.files?.[0] ?? null)} 
                  className="hidden" 
                  disabled={isUploadingBanner}
                />
              </label>

              {/* Clickable Avatar - Centered */}
              <div className="flex justify-center">
                <div className="relative -mt-12">
                  <label className="relative block cursor-pointer">
                    <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-slate-800 bg-gradient-to-br from-cyan-400 to-purple-500 shadow-xl">
                      {displayAvatar ? (
                        <img 
                          src={displayAvatar} 
                          alt="Avatar" 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                          {me.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        </div>
                      )}
                    </div>
                    
                    {!isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition hover:opacity-100">
                        <div className="rounded-full bg-cyan-500 p-2 shadow-lg">
                          <MdPhotoCamera size={18} className="text-white" />
                        </div>
                      </div>
                    )}
                    
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleAvatarFile(e.target.files?.[0] ?? null)} 
                      className="hidden" 
                      disabled={isUploadingAvatar}
                    />
                  </label>
                </div>
              </div>

              {/* User Info - Centered */}
              <div className="mt-4 pb-6 text-center">
                <div className="flex items-center justify-center gap-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        className="rounded-lg bg-slate-700 px-3 py-1 text-xl font-bold text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                      />
                      <button
                        onClick={handleSaveName}
                        className="rounded-lg bg-cyan-500 p-1.5 text-white transition hover:bg-cyan-600"
                      >
                        <MdCheck size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false);
                          setTempName(me.name);
                        }}
                        className="rounded-lg bg-red-500/20 p-1.5 text-red-400 transition hover:bg-red-500/30"
                      >
                        <MdClose size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-white">{me.name}</h2>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="rounded-full bg-white/10 p-1.5 text-slate-400 transition hover:bg-white/20 hover:text-white"
                      >
                        <MdEdit size={16} />
                      </button>
                    </>
                  )}
                </div>
                
                <div className="mt-1 flex items-center justify-center gap-2">
                  <MdEmail size={14} className="text-slate-500" />
                  <p className="text-sm text-slate-400">{me.email}</p>
                </div>

                {/* Bio Section */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-center gap-2">
                    <MdDescription size={16} className="text-slate-500" />
                    <span className="text-sm text-slate-400">О себе</span>
                    <button
                      onClick={() => setIsEditingBio(true)}
                      className="rounded-full bg-white/10 p-1 text-slate-400 transition hover:bg-white/20 hover:text-white"
                    >
                      <MdEdit size={12} />
                    </button>
                  </div>
                  {isEditingBio ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <textarea
                        autoFocus
                        className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 resize-none"
                        value={tempBio}
                        onChange={(e) => setTempBio(e.target.value)}
                        placeholder="Расскажите о себе..."
                        rows={3}
                      />
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={handleSaveBio}
                          className="rounded-lg bg-cyan-500 px-3 py-1 text-sm text-white transition hover:bg-cyan-600"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingBio(false);
                            setTempBio(bio);
                          }}
                          className="rounded-lg bg-red-500/20 px-3 py-1 text-sm text-red-400 transition hover:bg-red-500/30"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-300 italic">
                      {bio || "Пользователь пока ничего не рассказал о себе"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'personalization' && (
          <div className="max-w-2xl mx-auto p-6 ">
            {/* Wallpaper Upload */}
            <div className="rounded-xl border border-white/10 bg-slate-800/30 p-4 mb-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-300 flex items-center gap-2">
                🖼️ Фоновое изображение
              </h3>
              <div 
                className="relative overflow-hidden rounded-xl border-2 border-dashed border-white/20 bg-slate-900/50 transition hover:border-cyan-400/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('image/')) {
                    await handleWallpaperFile(file);
                  }
                }}
              >
                {wallpaperPreview ? (
                  <div className="relative h-32">
                    <img src={wallpaperPreview} className="h-full w-full object-cover" alt="Wallpaper" />
                    <button 
                      onClick={handleRemoveWallpaper}
                      className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white transition hover:bg-red-500"
                      disabled={isUploadingWallpaper}
                    >
                      <MdClose size={16} />
                    </button>
                    {isUploadingWallpaper && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center p-6">
                    <div className="mb-2 text-3xl">🖼️</div>
                    <p className="text-center text-sm text-slate-300">
                      <span className="text-cyan-400">Нажмите для загрузки</span> или перетащите изображение
                    </p>
                    <p className="mt-1 text-xs text-slate-500">PNG, JPG, GIF до 10MB</p>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleWallpaperFile(e.target.files?.[0] ?? null)} 
                      className="hidden" 
                      disabled={isUploadingWallpaper}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Color Themes */}
            <div className="rounded-xl border border-white/10 bg-slate-800/30 p-4">
              <h3 className="mb-4 text-sm font-semibold text-slate-300 flex items-center gap-2">
                <MdPalette size={18} />
                Цветовые темы
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {COLOR_THEMES.map((colorTheme) => (
                  <button
                    key={colorTheme.name}
                    onClick={() => applyColorTheme(colorTheme)}
                    className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:scale-105 ${
                      theme.accentColor === colorTheme.accentColor 
                        ? 'ring-2 ring-white shadow-lg' 
                        : 'hover:shadow-md'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${colorTheme.gradientFrom}, ${colorTheme.gradientTo})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                    <div className="relative z-10">
                      <div 
                        className="w-8 h-8 rounded-full mb-2 shadow-lg"
                        style={{ backgroundColor: colorTheme.accentColor }}
                      />
                      <p className="text-white text-sm font-medium">{colorTheme.name}</p>
                      <p className="text-white/60 text-xs mt-0.5">{colorTheme.description}</p>
                    </div>
                    {theme.accentColor === colorTheme.accentColor && (
                      <div className="absolute top-2 right-2">
                        <MdCheck size={16} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <button 
              className="w-full mt-4 rounded-lg bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300 transition hover:bg-rose-500/20"
              onClick={onResetTheme}
            >
              Сбросить тему по умолчанию
            </button>
          </div>
        )}

        {section === 'privacy' && (
          <div className="max-w-2xl mx-auto p-6">
            <div className="rounded-xl border border-white/10 bg-slate-800/30 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
                <MdLock size={20} />
                Конфиденциальность
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <div>
                    <p className="text-white font-medium">Показывать время последнего посещения</p>
                    <p className="text-xs text-slate-400">Другие пользователи смогут видеть, когда вы были в сети</p>
                  </div>
                  <button
                    onClick={() => handlePrivacyChange('showLastSeen', !localPrivacy.showLastSeen)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
                    style={{ backgroundColor: localPrivacy.showLastSeen ? theme.accentColor : '#475569' }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localPrivacy.showLastSeen ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <div>
                    <p className="text-white font-medium">Показывать прочтение сообщений</p>
                    <p className="text-xs text-slate-400">Отображать галочки о прочтении сообщений</p>
                  </div>
                  <button
                    onClick={() => handlePrivacyChange('showReadReceipts', !localPrivacy.showReadReceipts)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
                    style={{ backgroundColor: localPrivacy.showReadReceipts ? theme.accentColor : '#475569' }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localPrivacy.showReadReceipts ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <div>
                    <p className="text-white font-medium">Разрешить сообщения от не друзей</p>
                    <p className="text-xs text-slate-400">Пользователи не из списка друзей смогут писать вам</p>
                  </div>
                  <button
                    onClick={() => handlePrivacyChange('allowNonFriendsMessage', !localPrivacy.allowNonFriendsMessage)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
                    style={{ backgroundColor: localPrivacy.allowNonFriendsMessage ? theme.accentColor : '#475569' }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localPrivacy.allowNonFriendsMessage ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <div>
                    <p className="text-white font-medium">Показывать фото профиля</p>
                    <p className="text-xs text-slate-400">Ваше фото профиля будет видно другим пользователям</p>
                  </div>
                  <button
                    onClick={() => handlePrivacyChange('showProfilePhoto', !localPrivacy.showProfilePhoto)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
                    style={{ backgroundColor: localPrivacy.showProfilePhoto ? theme.accentColor : '#475569' }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localPrivacy.showProfilePhoto ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'session' && (
          <div className="max-w-2xl mx-auto p-6">
            <div className="rounded-xl border border-white/10 bg-slate-800/30 p-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="rounded-full bg-red-500/20 p-4">
                  <MdLogout className="h-8 w-8 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Выход из аккаунта</h3>
                  <p className="mt-1 text-sm text-slate-400">Вы будете перенаправлены на страницу входа</p>
                </div>
                <button 
                  className="mt-2 w-full rounded-lg bg-red-500/20 px-4 py-3 text-red-400 transition hover:bg-red-500/30 hover:text-red-300"
                  onClick={onLogout}
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}

        {section === 'about' && (
          <div className="max-w-2xl mx-auto p-6">
            <div className="rounded-xl bg-slate-800/30 p-6 space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500">
                  <span className="text-2xl">✨</span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">Messenger App</h2>
                <p className="mt-1 text-sm text-slate-400">Версия {uiVersion}</p>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4">
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Интерфейс</span>
                  <span className="text-white font-mono">v{uiVersion}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Особенности</span>
                  <span className="text-cyan-400">Кастомизация ✨</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Цветовые темы</span>
                  <span className="text-cyan-400">{COLOR_THEMES.length} шт.</span>
                </div>
              </div>

              <div className="rounded-lg bg-cyan-500/10 p-3 text-center text-sm text-cyan-300">
                🎉 Расширенная кастомизация — выбери свой стиль!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Toast for Personalization */}
      {previewOpen && section === 'personalization' && (
        <div className="animate-in slide-in-from-bottom-4 fade-in pointer-events-none absolute bottom-4 right-4 duration-300">
          <div className="rounded-xl border border-white/20 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2">
              <MdCheck className="h-4 w-4 text-green-400" />
              <span className="text-xs font-medium text-slate-300">Тема применена</span>
            </div>
            <div 
              className="mb-2 rounded-lg p-2 text-sm font-medium"
              style={{ backgroundColor: `${theme.accentColor}CC`, borderRadius: `${16}px`, color: '#ffffff' }}
            >
              Ваше сообщение
            </div>
            <div 
              className="rounded-lg p-2 text-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: `${16}px`, color: '#94a3b8' }}
            >
              Сообщение собеседника
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
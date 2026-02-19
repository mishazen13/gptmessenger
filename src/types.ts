import React from 'react';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type MessageAttachment = {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  localFile?: File;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
  replyToMessageId?: string;
  deletedForEveryone?: boolean;
  attachments?: MessageAttachment[];
};

// types.ts - убедитесь, что поле creatorId есть в типе
export type Chat = {
  id: string;
  name: string;
  isGroup: boolean;
  memberIds: string[];
  messages: Message[];
  avatarUrl?: string;
  creatorId?: string; // ← ЭТО ПОЛЕ ДОЛЖНО БЫТЬ
  createdAt?: number; // Опционально
};

// Добавьте в тип CreateGroupPage props
export type CreateGroupProps = {
  groupName: string;
  onGroupName: (v: string) => void;
  friends: PublicUser[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreateGroup: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedAvatar: string; // Добавить
  onSelectAvatar: (url: string) => void; // Добавить
  groupAvatars: GroupAvatar[]; // Добавить
};

export type MeResponse = {
  user: PublicUser;
  incomingRequestIds: string[];
  friendIds: string[];
  users: PublicUser[];
};

export type ThemeSettings = {
  accentColor: string;
  wallpaperBlur: number;
  panelOpacity: number;
  sidebarOpacity: number;
  bubbleRadius: number;
  contentBlur: number;
  fontScale: number;
  saturation: number;
};

// types.ts
export type AppPage =
  | 'welcome'
  | 'chat'
  | 'plus'
  | 'settings'
  | 'add-friend'
  | 'create-group'
  | 'friend-profile'
  | 'group-profile'; // Добавьте эту строку
export type AuthPage = 'login' | 'register';
export type SettingsSection = 'profile' | 'personalization' | 'session' | 'about';

export type MessageContextMenu = {
  x: number;
  y: number;
  messageId: string;
  chatId: string;
  mine: boolean;
  deletedForEveryone: boolean;
};

export type SettingsPageProps = {
  me: PublicUser;
  section: SettingsSection;
  onBack: () => void;
  onLogout: () => void;
  uiVersion: string;
  onAvatarFile: (url: string) => void; // Изменено с File на string
  onWallpaperFile: (url: string) => void; // Изменено с File на string
  onBannerFile: (url: string) => void; // Изменено с File на string
  theme: ThemeSettings;
  onTheme: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  onResetTheme: () => void;
};

// types.ts (добавьте в конец файла)
export type GroupAvatar = {
  id: string;
  url: string;
  name: string;
};

// Добавьте в конец файла types.ts

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected';

export type CallType = 'audio' | 'video';

export type CallParticipant = {
  userId: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
  audioLevel?: number;
  stream?: MediaStream;
};

export type CallState = {
  status: CallStatus;
  type: CallType;
  participants: CallParticipant[];
  startTime?: number;
  chatId: string;
};

export type SignalData = {
  type: 'offer' | 'answer' | 'candidate';
  data: any;
  from: string;
  to: string;
  callId: string;
};


export type PresenceStatus = 'online' | 'offline' | 'dnd';

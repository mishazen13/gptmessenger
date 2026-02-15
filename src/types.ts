export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
  replyToMessageId?: string;
  deletedForEveryone?: boolean;
};

export type Chat = {
  id: string;
  name: string;
  isGroup: boolean;
  memberIds: string[];
  messages: Message[];
};

export type MeResponse = {
  user: PublicUser;
  incomingRequestIds: string[];
  friendIds: string[];
  users: PublicUser[];
};

export type AppPage = 'chat' | 'plus' | 'add-friend' | 'create-group' | 'settings' | 'friend-profile';
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

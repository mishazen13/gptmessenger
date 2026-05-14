import React from 'react';
import { Avatar } from '../components/Avatar';
import { Chat, Message, MessageAttachment, PublicUser, ThemeSettings, CallParticipant, CallType, PresenceStatus } from '../types';
import { 
  FiPaperclip, FiX, FiDownload, FiPlay, FiPause, FiMaximize2, 
  FiFile, FiImage, FiVideo, FiMusic, FiArchive, FiFileText 
} from 'react-icons/fi';
import { MdSend, MdCall, MdVideocam, MdExpandMore, MdClose } from 'react-icons/md';
import { AutoSizeTextarea } from '../components/AutoSizeTextarea';
import { CallOverlay } from '../components/CallOverlay';
import { uploadFileChunked, api } from '../lib/api';

type Props = {
  me: PublicUser;
  users: PublicUser[];
  activeChat?: Chat;
  getDisplayName: (user: PublicUser) => string;
  getAvatarUrl: (userId: string) => string | undefined;
  getBannerUrl: (userId: string) => string | undefined;
  onContextMenu: (event: React.MouseEvent<HTMLElement>, chatId: string, message: Message, mine: boolean) => void;
  replyToMessageId: string;
  onClearReply: () => void;
  messageText: string;
  onMessageText: (v: string) => void;
  onSend: (e: React.FormEvent<HTMLFormElement>) => void;
  onPickFiles: (files: FileList | null) => void;
  attachedFiles: MessageAttachment[];
  onRemoveAttachedFile: (id: string) => void;
  theme: ThemeSettings;
  peerPresence?: PresenceStatus;
  peerLastSeen?: number;
  onStartCall: (type: CallType, peerId: string) => void;
  isCallActive: boolean;
  callType: CallType;
  participants: CallParticipant[];
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  callExpanded: boolean;
  onToggleCallExpand: () => void;
  localStream?: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  onOpenFriendProfile: (id: string) => void;
  onOpenGroupProfile?: (id: string) => void;
  token: string;
  onToggleScreenShare?: () => void;
  isScreenSharing?: boolean;
  refreshData?: (silent?: boolean) => Promise<void>;
};

const formatTime = (value: number): string => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const statusLabel: Record<PresenceStatus, string> = { online: 'в сети', offline: 'не в сети', dnd: 'не беспокоить' };
const FILE_BASE_URL = `${window.location.protocol}//${window.location.hostname}:4000`;

const downloadFile = (url: string, filename: string) => {
  const fullUrl = url.startsWith('http') ? url : `${FILE_BASE_URL}${url}`;
  const link = document.createElement('a');
  link.href = fullUrl;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const FullscreenViewer = ({ attachment, onClose, accentColor }: { attachment: MessageAttachment; onClose: () => void; accentColor: string }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const fileUrl = attachment.url.startsWith('http') ? attachment.url : `${FILE_BASE_URL}${attachment.url}`;
  const isImage = attachment.type?.startsWith('image/') || false;
  const isVideo = attachment.type?.startsWith('video/') || false;
  const isAudio = attachment.type?.startsWith('audio/') || false;

  const handleDownload = () => downloadFile(attachment.url, attachment.name);
  
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  React.useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    if (audio) {
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="relative max-h-[90vh] max-w-[90vw] rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2" style={{ backgroundColor: `${accentColor}20` }}>
              {isImage && <FiImage size={20} style={{ color: accentColor }} />}
              {isVideo && <FiVideo size={20} style={{ color: accentColor }} />}
              {isAudio && <FiMusic size={20} style={{ color: accentColor }} />}
            </div>
            <span className="text-white font-medium truncate max-w-md">{attachment.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload} 
              className="rounded-lg px-4 py-2 text-sm text-white transition flex items-center gap-2 hover:opacity-90" 
              style={{ backgroundColor: accentColor }}
            >
              <FiDownload size={16} className="text-white" /> Скачать
            </button>
            <button onClick={onClose} className="rounded-lg bg-red-500/20 p-2 text-white transition hover:bg-red-500/30">
              <MdClose size={20} />
            </button>
          </div>
        </div>
        <div className="p-6">
          {isImage && <img src={fileUrl} alt={attachment.name} className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-lg" />}
          {isVideo && <video src={fileUrl} controls className="max-h-[70vh] max-w-full rounded-lg shadow-lg" autoPlay />}
          {isAudio && (
            <div className="flex flex-col items-center gap-6 p-12 min-w-[400px]">
              <div className="rounded-full p-8 shadow-xl" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}>
                <FiMusic size={64} className="text-white" />
              </div>
              <audio ref={audioRef} src={fileUrl} className="w-full" />
              <div className="flex items-center gap-4">
                <button 
                  onClick={togglePlayPause} 
                  className="rounded-full p-4 text-white transition hover:scale-105 shadow-lg" 
                  style={{ backgroundColor: accentColor }}
                >
                  {isPlaying ? <FiPause size={28} /> : <FiPlay size={28} />}
                </button>
                <p className="text-white/70 text-sm">{attachment.name}</p>
              </div>
            </div>
          )}
          {!isImage && !isVideo && !isAudio && (
            <div className="flex flex-col items-center gap-6 p-12 min-w-[400px]">
              <div className="rounded-full bg-gradient-to-br from-slate-600 to-slate-700 p-8 shadow-xl">
                <FiFile size={64} className="text-white/70" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium mb-2">{attachment.name}</p>
                <p className="text-white/50 text-sm">Размер: {(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={handleDownload} 
                className="rounded-lg px-8 py-3 text-white transition flex items-center gap-2 shadow-lg hover:opacity-90" 
                style={{ backgroundColor: accentColor }}
              >
                <FiDownload size={20} /> Скачать файл
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageAttachmentPreview = ({ attachment, theme }: { attachment: MessageAttachment; theme: ThemeSettings }) => {
  const [showFullscreen, setShowFullscreen] = React.useState(false);
  const fileUrl = attachment.url.startsWith('http') ? attachment.url : `${FILE_BASE_URL}${attachment.url}`;
  const isImage = attachment.type?.startsWith('image/') || false;
  const isVideo = attachment.type?.startsWith('video/') || false;
  const isAudio = attachment.type?.startsWith('audio/') || false;

  const handleDownload = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    downloadFile(attachment.url, attachment.name); 
  };
  
  const getFileIcon = () => {
    const ext = attachment.name.split('.').pop()?.toLowerCase();
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return <FiArchive size={24} />;
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) return <FiFileText size={24} />;
    return <FiFile size={24} />;
  };

  if (isImage) {
    return (
      <>
        <div className="relative cursor-pointer group overflow-hidden" onClick={() => setShowFullscreen(true)}>
          <img
            src={fileUrl}
            alt={attachment.name}
            className="w-full max-h-[300px] object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 transition group-hover:opacity-100 bg-gradient-to-t from-black/70 via-black/30 to-transparent rounded-xl">
            <button 
              onClick={handleDownload} 
              className="rounded-full p-2.5 transition hover:scale-110 shadow-xl backdrop-blur-md"
              style={{ backgroundColor: `${theme.accentColor}dd` }}
            >
              <FiDownload size={18} className="text-white drop-shadow-md" />
            </button>
            <button 
              onClick={() => setShowFullscreen(true)} 
              className="rounded-full p-2.5 transition hover:scale-110 shadow-xl backdrop-blur-md bg-black/20 border border-white/30"
            >
              <FiMaximize2 size={18} className="text-white drop-shadow-md" />
            </button>
          </div>
        </div>
        {showFullscreen && <FullscreenViewer attachment={attachment} onClose={() => setShowFullscreen(false)} accentColor={theme.accentColor} />}
      </>
    );
  }
  
  if (isVideo) {
    return (
      <>
        <div className="relative cursor-pointer group overflow-hidden" onClick={() => setShowFullscreen(true)}>
          <video src={fileUrl} className="w-full max-h-[300px] object-cover" preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 transition group-hover:bg-black/60">
            <div className="rounded-full bg-white/20 p-3 transition hover:bg-white/30 hover:scale-110 shadow-lg backdrop-blur">
              <FiPlay size={28} className="text-white ml-0.5" />
            </div>
          </div>
          <div className="absolute top-2 right-2 opacity-0 transition group-hover:opacity-100">
            <button 
              onClick={handleDownload} 
              className="rounded-full p-2 text-white transition hover:opacity-90 shadow-lg border border-white/30" 
              style={{ backgroundColor: theme.accentColor }}
            >
              <FiDownload size={14} />
            </button>
          </div>
        </div>
        {showFullscreen && <FullscreenViewer attachment={attachment} onClose={() => setShowFullscreen(false)} accentColor={theme.accentColor} />}
      </>
    );
  }
  
  if (isAudio) {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-xl bg-gradient-to-r from-white/10 to-white/5 p-3 max-w-sm hover:from-white/15 transition">
        <div className="rounded-full p-2.5 shadow-lg" style={{ background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd)` }}>
          <FiMusic size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-white">{attachment.name}</p>
          <p className="text-[11px] text-white/40">Аудио файл</p>
        </div>
        <button onClick={handleDownload} className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30 hover:scale-105">
          <FiDownload size={16} />
        </button>
      </div>
    );
  }
  
  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl bg-gradient-to-r from-white/10 to-white/5 p-3 max-w-sm hover:from-white/15 transition group">
      <div className="rounded-lg bg-slate-700 p-2.5">{getFileIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-white">{attachment.name}</p>
        <p className="text-[11px] text-white/40">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
      </div>
      <button 
        onClick={handleDownload} 
        className="rounded-full p-2 transition-all hover:scale-110 opacity-0 group-hover:opacity-100 shadow-lg" 
        style={{ backgroundColor: `${theme.accentColor}dd` }}
      >
        <FiDownload size={16} className="text-white" />
      </button>
    </div>
  );
};

// Компонент сообщения с умным расположением времени
const MessageBubble = ({ message, mine, sender, repliedMessage, repliedSender, theme, formatTime, getDisplayName, me }: any) => {
  const textRef = React.useRef<HTMLParagraphElement>(null);
  const [timePosition, setTimePosition] = React.useState<'inline' | 'block'>('inline');
  
  React.useEffect(() => {
    if (textRef.current && message.text) {
      const textWidth = textRef.current.scrollWidth;
      const containerWidth = textRef.current.parentElement?.parentElement?.clientWidth || 0;
      // Если текст занимает больше 80% ширины контейнера - время снизу
      // Или если текст длиннее 60 символов
      if (textWidth > containerWidth * 0.8 || message.text.length > 50) {
        setTimePosition('block');
      } else {
        setTimePosition('inline');
      }
    }
  }, [message.text]);
  
  const hasOnlyMedia = !message.text && !repliedMessage && message.attachments?.some((att: MessageAttachment) => 
    att.type?.startsWith('image/') || att.type?.startsWith('video/')
  );
  
  if (hasOnlyMedia) {
    return (
      <div className="relative">
        {message.attachments?.map((att: MessageAttachment) => (
          <MessageAttachmentPreview key={att.id} attachment={att} theme={theme} />
        ))}
        <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">
          {formatTime(message.createdAt)}
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="px-3 md:px-4 py-2">
        {/* Ответ */}
        {repliedMessage && (
          <div className="mb-1 rounded-lg border-l-2 border-white/50 bg-black/20 px-2 py-1 text-xs text-white/85">
            <div className="font-semibold text-white/90">
              {repliedMessage.senderId === me.id ? 'Вы' : (repliedSender ? getDisplayName(repliedSender) : 'Unknown')}
            </div>
            <div className="truncate text-white/70">
              {repliedMessage.text?.trim() || (repliedMessage.attachments?.length ? '📎 Вложение' : 'Сообщение')}
            </div>
          </div>
        )}
        
        {/* Ник отправителя (только если нет ответа) */}
        {!repliedMessage && (
          <div className="flex items-center gap-2 mb-1 text-sm opacity-80">
            {mine && <span className="font-semibold text-white/90">Вы</span>}
            {!mine && <span className="font-semibold text-white/90">{sender ? getDisplayName(sender) : 'Unknown'}</span>}
          </div>
        )}
        
        {/* Текст с временем */}
        {message.text && (
          <div className={`flex ${timePosition === 'inline' ? 'flex-row flex-wrap items-baseline gap-1' : 'flex-col'}`}>
            <p 
              ref={textRef}
              className="text-white text-sm leading-relaxed whitespace-pre-wrap break-words"
            >
              {message.text}
            </p>
            {timePosition === 'inline' && (
              <span className="text-[10px] text-white/40 flex-shrink-0 ml-1 mt-0.5">
                {formatTime(message.createdAt)}
              </span>
            )}
            {timePosition === 'block' && (
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-white/40">
                  {formatTime(message.createdAt)}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Если нет текста, но есть медиа (кроме фото/видео) */}
        {!message.text && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-col gap-1">
            {message.attachments.map((att: MessageAttachment) => {
              const isMedia = att.type?.startsWith('image/') || att.type?.startsWith('video/');
              if (!isMedia) {
                return <MessageAttachmentPreview key={att.id} attachment={att} theme={theme} />;
              }
              return null;
            })}
            <div className="flex justify-end mt-1">
              <span className="text-[10px] text-white/40">{formatTime(message.createdAt)}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Другие вложения (если есть текст) */}
      {message.text && message.attachments && message.attachments.length > 0 && (
        <div className="px-3 md:px-4 pb-2 flex flex-col gap-1">
          {message.attachments.map((att: MessageAttachment) => {
            const isMedia = att.type?.startsWith('image/') || att.type?.startsWith('video/');
            if (!isMedia) {
              return <MessageAttachmentPreview key={att.id} attachment={att} theme={theme} />;
            }
            return null;
          })}
        </div>
      )}
    </>
  );
};

export const ChatPage = (props: Props): JSX.Element => {
  const {
    me, users, activeChat, getDisplayName, getAvatarUrl, getBannerUrl,
    onOpenFriendProfile, onOpenGroupProfile, onContextMenu,
    replyToMessageId, onClearReply, messageText, onMessageText, onSend, onPickFiles, attachedFiles, onRemoveAttachedFile,
    theme, peerPresence = 'offline', peerLastSeen, onStartCall, isCallActive, callType, participants, onEndCall, onToggleMute, onToggleVideo,
    callExpanded, onToggleCallExpand, localStream, remoteStreams, token,
    refreshData,
    onToggleScreenShare,
    isScreenSharing = false,
  } = props;

  const peer = activeChat && !activeChat.isGroup ? users.find((u) => u.id !== me.id && activeChat.memberIds.includes(u.id)) : undefined;
  const [flyingText, setFlyingText] = React.useState('');
  const [sendPulse, setSendPulse] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isNarrow, setIsNarrow] = React.useState(() => window.innerWidth < 768);

  const formatMinutesDeclension = (minutes: number): string => {
    const lastDigit = minutes % 10;
    const lastTwoDigits = minutes % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'минут';
    if (lastDigit === 1) return 'минуту';
    if (lastDigit >= 2 && lastDigit <= 4) return 'минуты';
    return 'минут';
  };

  const formatLastSeen = (timestamp?: number): string => {
    if (!timestamp) return 'давно';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'только что';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    if (minutes < 60) return `${minutes} ${formatMinutesDeclension(minutes)} назад`;
    if (hours < 24) return `сегодня в ${timeStr}`;
    if (days === 1) return `вчера в ${timeStr}`;
    return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в ${timeStr}`;
  };

  const getStatusText = () => {
    if (activeChat?.isGroup) {
      return `${activeChat.memberIds.length} участников`;
    }
    if (peerPresence === 'online') {
      return 'в сети';
    }
    if (peerPresence === 'offline' && peerLastSeen) {
      return `был(а) ${formatLastSeen(peerLastSeen)}`;
    }
    return 'не в сети';
  };

  React.useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeChat?.messages.length, activeChat?.id]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!messageText.trim() && attachedFiles.length === 0) || isUploading) return;
    setIsUploading(true);
    try {
      const uploadedFiles: MessageAttachment[] = [];
      
      for (const file of attachedFiles) {
        if (file.localFile) {
          const uploaded = await uploadFileChunked(file.localFile, token);
          uploadedFiles.push(uploaded);
        } else {
          uploadedFiles.push(file);
        }
      }
      
      await api(`/api/chats/${activeChat?.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ 
          text: messageText, 
          replyToMessageId: replyToMessageId || undefined, 
          attachments: uploadedFiles 
        }),
      }, token);
      
      onMessageText('');
      attachedFiles.forEach(f => { 
        if (f.localFile && f.url?.startsWith('blob:')) URL.revokeObjectURL(f.url); 
      });
      attachedFiles.forEach(f => onRemoveAttachedFile(f.id));
      onClearReply();
      
      if (refreshData) {
        await refreshData();
      }
      
    } catch (error) { 
      console.error('Send message error:', error); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const submitWithFx = (e: React.FormEvent<HTMLFormElement>) => {
    if (messageText.trim()) {
      setFlyingText(messageText.trim().slice(0, 42));
      setSendPulse(true);
      setTimeout(() => setFlyingText(''), 850);
      setTimeout(() => setSendPulse(false), 250);
    }
    handleSendMessage(e);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onPickFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="animate-panelIn flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm shadow-xl">
      {/* Header */}
      <div className={`relative rounded-[35px] m-3 border border-white/10 transition-all duration-300 overflow-hidden ${
        isCallActive && callExpanded ? 'bg-slate-800/60' : 'bg-white/5'
      }`}>
        {isCallActive && callExpanded && (
          <CallOverlay 
            isOpen 
            callType={callType} 
            participants={participants} 
            localParticipantId={me.id} 
            onClose={onToggleCallExpand} 
            onToggleMute={onToggleMute} 
            onToggleVideo={onToggleVideo} 
            onEndCall={onEndCall} 
            isExpanded={callExpanded} 
            onToggleExpand={onToggleCallExpand} 
            localStream={localStream} 
            remoteStreams={remoteStreams}
            onToggleScreenShare={onToggleScreenShare}
            isScreenSharing={isScreenSharing}
          />
        )}
        
        {(!isCallActive || !callExpanded) && (
          <div className="relative">
            {!activeChat?.isGroup && peer && getBannerUrl && (() => {
              const peerBannerUrl = getBannerUrl(peer.id);
              if (!peerBannerUrl) return null;
              return (
                <div className="absolute inset-0 h-full w-full overflow-hidden rounded-[35px]">
                  <img 
                    src={peerBannerUrl} 
                    alt="" 
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                </div>
              );
            })()}
            
            <div className="relative z-10 flex items-center gap-4 p-3">
              <div className="relative">
                <Avatar 
                  imageUrl={peer ? getAvatarUrl(peer.id) : undefined} 
                  name={peer ? getDisplayName(peer) : activeChat?.name ?? 'Чат'} 
                  size={52} 
                />
                {peer && peerPresence === 'online' && (
                  <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-slate-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {activeChat?.isGroup ? (
                  <button 
                    className="text-left font-semibold text-white text-lg hover:text-cyan-400 transition" 
                    onClick={() => activeChat && onOpenGroupProfile?.(activeChat.id)}
                    type="button"
                  >
                    {activeChat.name}
                  </button>
                ) : peer ? (
                  <button 
                    className="text-left font-semibold text-white text-lg hover:text-cyan-400 transition" 
                    onClick={() => onOpenFriendProfile(peer.id)} 
                    type="button"
                  >
                    {getDisplayName(peer)}
                  </button>
                ) : (
                  <h2 className="font-semibold text-white text-lg">{activeChat?.name ?? 'Чат'}</h2>
                )}
                <p className="text-xs text-white/70">{getStatusText()}</p>
              </div>
              {!activeChat?.isGroup && peer && (
                <div className="flex gap-2">
                  {!isCallActive ? (
                    <>
                      <button 
                        onClick={() => onStartCall('audio', peer.id)} 
                        className="rounded-full bg-white/20 backdrop-blur-sm p-2.5 text-white transition hover:bg-white/30 hover:scale-105"
                        type="button"
                      >
                        <MdCall size={20} />
                      </button>
                      <button 
                        onClick={() => onStartCall('video', peer.id)} 
                        className="rounded-full bg-white/20 backdrop-blur-sm p-2.5 text-white transition hover:bg-white/30 hover:scale-105"
                        type="button"
                      >
                        <MdVideocam size={20} />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={onToggleCallExpand} 
                      className="rounded-full p-2.5 text-cyan-400 transition hover:scale-105" 
                      style={{ backgroundColor: `${theme.accentColor}20` }}
                      type="button"
                    >
                      <MdExpandMore size={20} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 scroll-smooth">
        {activeChat?.messages.map((message) => {
          const mine = message.senderId === me.id;
          const sender = users.find((u) => u.id === message.senderId);
          const repliedMessage = message.replyToMessageId
            ? activeChat.messages.find((m) => m.id === message.replyToMessageId)
            : undefined;
          const repliedSender = repliedMessage ? users.find((u) => u.id === repliedMessage.senderId) : undefined;
          
          return (
            <div key={message.id} className={`flex gap-3 ${mine ? 'justify-end' : 'justify-start'}`}>
              {!mine && (
                <div className="flex-shrink-0 mt-1">
                  <Avatar 
                    imageUrl={sender ? getAvatarUrl(sender.id) : undefined} 
                    name={sender ? getDisplayName(sender) : 'Unknown'} 
                    size={36} 
                  />
                </div>
              )}
              <div
                onContextMenu={(event) => onContextMenu(event, activeChat.id, message, mine)}
                className={`group relative max-w-[85%] md:max-w-[70%] shadow-lg transition-all hover:shadow-xl animate-msgIn overflow-hidden ${
                  mine ? 'rounded-br-md' : 'rounded-bl-md'
                }`}
                style={{ 
                  backgroundColor: mine ? `${theme.accentColor}CC` : 'rgba(255,255,255,0.1)', 
                  borderRadius: `${theme.bubbleRadius}px` 
                }}
              >
                <MessageBubble
                  message={message}
                  mine={mine}
                  sender={sender}
                  repliedMessage={repliedMessage}
                  repliedSender={repliedSender}
                  theme={theme}
                  formatTime={formatTime}
                  getDisplayName={getDisplayName}
                  me={me}
                />
              </div>
              {mine && (
                <div className="flex-shrink-0 mt-1">
                  <Avatar imageUrl={getAvatarUrl(me.id)} name={me.name} size={36} />
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Reply Indicator */}
      {replyToMessageId && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-xl bg-white/10 px-4 py-2 animate-fadeIn border-l-4 border-cyan-400">
          <span className="text-xs text-white/60">Ответ на сообщение</span>
          <button className="text-cyan-400 text-xs hover:text-cyan-300 transition" onClick={onClearReply} type="button">
            Отмена
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 md:p-4">
        <div className={`relative flex flex-col rounded-[35px] bg-white/5 border border-white/10 transition-all ${sendPulse ? 'scale-[1.01] border-cyan-400/50 shadow-lg shadow-cyan-400/20' : ''}`}>
          {flyingText && (
            <div 
              className="pointer-events-none absolute -top-8 left-4 rounded-full px-4 py-1.5 text-xs font-medium text-white shadow-lg animate-sendFlyBetter" 
              style={{ background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd)` }}
            >
              {flyingText}
            </div>
          )}
          
          <form className="flex items-end gap-1.5 md:gap-2 p-2" onSubmit={submitWithFx}>
            <AutoSizeTextarea 
              value={messageText} 
              onChange={(e) => onMessageText(e.target.value)} 
              placeholder="Введите сообщение..." 
              className="flex-1 max-h-32 rounded-xl bg-transparent px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-0 focus:border-transparent resize-none" 
              maxRows={5} 
            />
            
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded-full p-2 md:p-2.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiPaperclip size={18} />
              </button>
              <input ref={fileInputRef} className="hidden" type="file" multiple onChange={handleFileSelect} />
              
              <button 
                className="rounded-full p-2 md:p-2.5 text-white transition hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100" 
                style={{ background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd)` }} 
                type="submit" 
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <MdSend size={18} />
                )}
              </button>
            </div>
          </form>
          
          {attachedFiles && attachedFiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 pt-0 border-t border-white/10 mt-1 animate-fadeIn">
              {attachedFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg bg-white/5 p-2 text-xs group hover:bg-white/10 transition">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {f.type?.startsWith('image/') && <FiImage size={14} className="text-cyan-400" />}
                    {f.type?.startsWith('video/') && <FiVideo size={14} className="text-cyan-400" />}
                    {f.type?.startsWith('audio/') && <FiMusic size={14} className="text-cyan-400" />}
                    {!f.type?.startsWith('image/') && !f.type?.startsWith('video/') && !f.type?.startsWith('audio/') && <FiFile size={14} className="text-white/50" />}
                    <span className="truncate text-white/70">{f.name}</span>
                  </div>
                  <button 
                    type="button" 
                    className="ml-2 rounded-full p-1 text-white/40 transition hover:bg-red-500/20 hover:text-red-400"
                    onClick={() => onRemoveAttachedFile(f.id)}
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
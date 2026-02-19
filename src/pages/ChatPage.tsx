import React from 'react';
import { Avatar } from '../components/Avatar';
import { Chat, Message, MessageAttachment, PublicUser, ThemeSettings, CallParticipant, CallType } from '../types';
import { FiPaperclip } from "react-icons/fi";
import { MdSend, MdCall, MdVideocam } from "react-icons/md";
import { AutoSizeTextarea } from '../components/AutoSizeTextarea';
import { CallOverlay } from '../components/CallOverlay';

type Props = {
  me: PublicUser;
  users: PublicUser[];
  activeChat?: Chat;
  getDisplayName: (user: PublicUser) => string;
  getAvatarUrl: (userId: string) => string | undefined;
  onOpenFriendProfile: (id: string) => void;
  onOpenGroupProfile?: (id: string) => void;
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
};

const formatSize = (size: number): string => {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
};

const formatTime = (value: number): string => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getTextColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#041314';
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.45 ? '#f8fafc' : '#041314';
};

const CustomVideoPlayer = ({ file }: { file: MessageAttachment }): JSX.Element => {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const toggle = (): void => {
    if (!ref.current) return;
    if (ref.current.paused) {
      void ref.current.play();
      setPlaying(true);
    } else {
      ref.current.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <video
        ref={ref}
        src={file.url}
        className="max-h-72 w-full cursor-pointer rounded-xl object-cover"
        preload="metadata"
        onClick={toggle}
        onTimeUpdate={() => {
          if (!ref.current || !ref.current.duration) return;
          setProgress((ref.current.currentTime / ref.current.duration) * 100);
        }}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <button
          type="button"
          className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/50 bg-black/45 text-lg text-white"
          onClick={toggle}
        >
          ▶
        </button>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2">
        <input
          className="pointer-events-auto w-full accent-cyan-400"
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={(event) => {
            if (!ref.current || !ref.current.duration) return;
            const value = Number(event.target.value);
            ref.current.currentTime = (value / 100) * ref.current.duration;
            setProgress(value);
          }}
        />
      </div>
    </div>
  );
};

const AudioCard = ({ file }: { file: MessageAttachment }): JSX.Element => {
  const ref = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);

  return (
    <div className="rounded-xl border border-white/20 bg-slate-900/55 p-3 text-slate-100">
      <audio ref={ref} src={file.url} preload="metadata" onEnded={() => setPlaying(false)} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-xs hover:bg-white/25"
          onClick={() => {
            if (!ref.current) return;
            if (ref.current.paused) {
              void ref.current.play();
              setPlaying(true);
            } else {
              ref.current.pause();
              setPlaying(false);
            }
          }}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <p className="truncate text-sm font-medium">🎵 {file.name}</p>
      </div>
      <p className="mt-1 text-xs text-slate-400">{formatSize(file.size)}</p>
      <a href={file.url} download={file.name} className="mt-2 inline-block rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">Скачать</a>
    </div>
  );
};

export const ChatPage = ({
  me,
  users,
  activeChat,
  getDisplayName,
  getAvatarUrl,
  onOpenFriendProfile,
  onOpenGroupProfile,
  onContextMenu,
  replyToMessageId,
  onClearReply,
  messageText,
  onMessageText,
  onSend,
  onPickFiles,
  attachedFiles,
  onRemoveAttachedFile,
  theme,
}: Props): JSX.Element => {
  const peer = activeChat && !activeChat.isGroup
    ? users.find((u) => u.id !== me.id && activeChat.memberIds.includes(u.id))
    : undefined;
  const [isWide, setIsWide] = React.useState(() => window.innerWidth >= 1200);
  const [zoomImageUrl, setZoomImageUrl] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Состояния для звонков
  const [isCallActive, setIsCallActive] = React.useState(false);
  const [callType, setCallType] = React.useState<CallType>('audio');
  const [participants, setParticipants] = React.useState<CallParticipant[]>([]);
  const [isCallExpanded, setIsCallExpanded] = React.useState(false);

  const myTextColor = getTextColor(theme.accentColor);

  React.useEffect(() => {
    const onResize = (): void => setIsWide(window.innerWidth >= 1200);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages]);

  // Функции для звонков
  const startCall = (type: CallType) => {
    setCallType(type);
    setIsCallExpanded(true);
    
    const newParticipants: CallParticipant[] = [];
    
    newParticipants.push({
      userId: me.id,
      name: getDisplayName(me),
      avatarUrl: getAvatarUrl(me.id),
      isMuted: false,
      isVideoEnabled: type === 'video',
      isSpeaking: false
    });
    
    if (peer) {
      newParticipants.push({
        userId: peer.id,
        name: getDisplayName(peer),
        avatarUrl: getAvatarUrl(peer.id),
        isMuted: false,
        isVideoEnabled: type === 'video',
        isSpeaking: false
      });
    }
    
    setParticipants(newParticipants);
    setIsCallActive(true);
  };

  const endCall = () => {
    setIsCallActive(false);
    setIsCallExpanded(false);
    setParticipants([]);
  };

  const toggleMute = () => {
    setParticipants(prev => prev.map(p => 
      p.userId === me.id 
        ? { ...p, isMuted: !p.isMuted }
        : p
    ));
  };

  const toggleVideo = () => {
    setParticipants(prev => prev.map(p => 
      p.userId === me.id 
        ? { ...p, isVideoEnabled: !p.isVideoEnabled }
        : p
    ));
  };

  const toggleExpand = () => {
    setIsCallExpanded(!isCallExpanded);
  };

  // Симуляция разговора
  React.useEffect(() => {
    if (!isCallActive) return;
    
    const interval = setInterval(() => {
      setParticipants(prev => prev.map(p => ({
        ...p,
        isSpeaking: Math.random() > 0.7
      })));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isCallActive]);

  const renderAttachment = (file: MessageAttachment): JSX.Element => {
    if (file.type.startsWith('image/')) {
      return (
        <img 
          src={file.url} 
          alt={file.name} 
          className="max-h-72 w-full cursor-zoom-in rounded-xl object-cover hover:opacity-90 transition" 
          onClick={() => setZoomImageUrl(file.url)} 
        />
      );
    }
    if (file.type.startsWith('video/')) {
      return <CustomVideoPlayer file={file} />;
    }
    if (file.type.startsWith('audio/')) {
      return <AudioCard file={file} />;
    }

    return (
      <div className="rounded-xl border border-white/20 bg-slate-900/55 p-3 text-slate-200">
        <p className="truncate text-sm font-medium">📄 {file.name}</p>
        <p className="mt-1 text-xs text-slate-400">{file.type || 'unknown'} · {formatSize(file.size)}</p>
        <a href={file.url} download={file.name} className="mt-2 inline-block rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">Скачать</a>
      </div>
    );
  };

  const renderGroupAvatar = (): JSX.Element => {
    if (activeChat?.avatarUrl) {
      return (
        <img 
          src={activeChat.avatarUrl} 
          alt={activeChat.name}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-lg">
        👥
      </div>
    );
  };

  return (
    <div 
      className="flex h-full flex-col rounded-2xl border border-white/20 p-4" 
      style={{ backgroundColor: `rgba(71,85,105,0.15)` }}
    >
      {/* Header - трансформируется при звонке */}
      <div 
        className={`
          relative rounded-xl border border-white/20 
          ${isCallActive && isCallExpanded 
            ? 'bg-slate-800/60 p-0 overflow-hidden' 
            : 'bg-slate-800/40 px-3 py-2'
          }
          transition-all duration-300
        `}
      >
        {isCallActive && isCallExpanded ? (
          // Режим звонка - CallOverlay занимает весь хедер
          <CallOverlay
            isOpen={isCallActive}
            callType={callType}
            participants={participants}
            localParticipantId={me.id}
            onClose={() => setIsCallExpanded(false)}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onEndCall={endCall}
            isExpanded={isCallExpanded}
            onToggleExpand={toggleExpand}
          />
        ) : (
          // Обычный режим - показываем хедер
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              {activeChat?.isGroup ? (
                renderGroupAvatar()
              ) : (
                <Avatar 
                  imageUrl={peer ? getAvatarUrl(peer.id) : undefined} 
                  name={peer ? getDisplayName(peer) : activeChat?.name ?? 'Чат'} 
                  size={48} 
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {activeChat?.isGroup ? (
                <button 
                  className="text-left text-lg font-semibold hover:underline truncate w-full" 
                  onClick={() => onOpenGroupProfile?.(activeChat.id)} 
                  type="button"
                >
                  {activeChat.name}
                </button>
              ) : peer ? (
                <button 
                  className="text-left text-lg font-semibold hover:underline truncate w-full" 
                  onClick={() => onOpenFriendProfile(peer.id)} 
                  type="button"
                >
                  {getDisplayName(peer)}
                </button>
              ) : (
                <h2 className="text-lg font-semibold truncate">{activeChat?.name ?? 'Чат'}</h2>
              )}
              
              <p className="text-xs text-white/50">
                {activeChat?.isGroup 
                  ? `${activeChat.memberIds.length} участников` 
                  : 'в сети'}
              </p>
            </div>

            {!activeChat?.isGroup && peer && (
              <div className="flex gap-2 shrink-0">
                {isCallActive ? (
                  // Если звонок активен, показываем кнопку разворачивания
                  <button
                    onClick={() => setIsCallExpanded(true)}
                    className="p-2 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                    title="Развернуть звонок"
                    type="button"
                  >
                    <MdCall size={20} />
                  </button>
                ) : (
                  // Обычные кнопки звонка
                  <>
                    <button
                      onClick={() => startCall('audio')}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white/80 hover:text-white"
                      title="Аудиозвонок"
                      type="button"
                    >
                      <MdCall size={20} />
                    </button>
                    <button
                      onClick={() => startCall('video')}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white/80 hover:text-white"
                      title="Видеозвонок"
                      type="button"
                    >
                      <MdVideocam size={20} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 w-full space-y-2 overflow-y-auto rounded-2xl bg-transparent p-2 scroll-smooth mt-2">
        {!activeChat && (
          <p className="text-sm text-slate-300 text-center mt-10">
            Выберите чат слева
          </p>
        )}
        
        {activeChat?.messages.length === 0 && (
          <p className="text-sm text-slate-300 text-center mt-10">
            Нет сообщений. Напишите что-нибудь!
          </p>
        )}
        
        {activeChat?.messages.map((message) => {
          const sender = users.find((u) => u.id === message.senderId);
          const replyTo = activeChat.messages.find((m) => m.id === message.replyToMessageId);
          const mine = message.senderId === me.id;
          const hasMedia = Boolean(message.attachments?.some(
            (file) => file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')
          ));
          
          return (
            <article
              className="w-fit max-w-[85%] break-words px-3 py-2 text-sm whitespace-pre-wrap"
              style={{
                marginLeft: mine ? 'auto' : undefined,
                marginRight: !mine ? 'auto' : undefined,
                maxWidth: hasMedia ? 'min(92%, 620px)' : 'min(85%, 760px)',
                backgroundColor: mine ? `${theme.accentColor}CC` : 'rgba(255,255,255,0.15)',
                color: mine ? myTextColor : '#d1d5db',
                borderRadius: `${theme.bubbleRadius}px`,
              }}
              key={message.id}
              onContextMenu={(event) => onContextMenu(event, activeChat.id, message, mine)}
            >
              <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                <Avatar 
                  imageUrl={sender ? getAvatarUrl(sender.id) : undefined} 
                  name={sender ? getDisplayName(sender) : 'Unknown'} 
                  size={20} 
                />
                <span>{sender ? getDisplayName(sender) : 'Unknown'}</span>
                <span className="ml-auto text-[11px] opacity-80">{formatTime(message.createdAt)}</span>
              </div>
              
              {replyTo && (
                <div className="mb-1 rounded-lg border border-black/20 bg-black/10 px-2 py-1 text-xs">
                  ↪ {replyTo.text || 'медиа'}
                </div>
              )}
              
              {message.text && (
                <p className="mb-2 break-words whitespace-pre-wrap">{message.text}</p>
              )}
              
              {!!message.attachments?.length && (
                <div className="space-y-2">
                  {message.attachments.map((file) => (
                    <div key={file.id}>{renderAttachment(file)}</div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyToMessageId && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs">
          <span>
            Ответ на: {activeChat?.messages.find((m) => m.id === replyToMessageId)?.text ?? 'сообщение'}
          </span>
          <button 
            className="text-cyan-400 hover:underline" 
            onClick={onClearReply} 
            type="button"
          >
            Отмена
          </button>
        </div>
      )}

      {/* Attached files preview */}
      {!!attachedFiles.length && (
        <div className="mb-2 grid grid-cols-2 gap-2 rounded-xl bg-black/20 p-2 max-h-40 overflow-auto">
          {attachedFiles.map((file) => (
            <div key={file.id} className="relative rounded-xl bg-white/10 p-2 group">
              <div className="max-h-20 overflow-hidden">
                {renderAttachment(file)}
              </div>
              <button 
                type="button" 
                className="absolute -top-1 -right-1 rounded-full bg-rose-500 text-white w-5 h-5 text-xs hover:bg-rose-600"
                onClick={() => onRemoveAttachedFile(file.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message input */}
      <div 
        className="flex flex-col mt-5 rounded-2xl border border-white/20 p-2" 
        style={{ backgroundColor: `rgba(71,85,105,0.15)` }}
      >
        <form className="flex gap-2 items-end" onSubmit={onSend}>
          <AutoSizeTextarea 
            value={messageText} 
            onChange={(e) => onMessageText(e.target.value)} 
            placeholder="Введите сообщение..." 
            className="flex-1 rounded-xl bg-transparent px-3 py-2 text-white placeholder-white/50 focus:outline-none"
            maxRows={5}
          />
          
          <div className="flex gap-2 shrink-0 self-end">
            <label 
              className="cursor-pointer rounded-full px-3 py-2 font-semibold hover:opacity-90 transition flex items-center justify-center h-10"
              style={{ backgroundColor: theme.accentColor, color: myTextColor }}
            >
              <FiPaperclip />
              <input 
                className="hidden" 
                type="file" 
                multiple 
                accept="image/*,video/*,audio/*,.pdf,.txt,.zip,.doc,.docx,.xlsx" 
                onChange={(e) => onPickFiles(e.target.files)} 
              />
            </label>
            
            <button 
              className="rounded-full px-4 py-2 font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed h-10"
              style={{ backgroundColor: theme.accentColor, color: myTextColor }}
              type="submit"
              disabled={!messageText.trim() && attachedFiles.length === 0}
            >
              <MdSend />
            </button>
          </div>
        </form>
      </div>

      {/* Image zoom modal */}
      {zoomImageUrl && (
        <button 
          type="button" 
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6 backdrop-blur-sm"
          onClick={() => setZoomImageUrl(null)}
        >
          <img 
            src={zoomImageUrl} 
            alt="zoom" 
            className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain"
          />
          <span className="absolute top-4 right-4 text-white text-2xl hover:text-cyan-400">✕</span>
        </button>
      )}
    </div>
  );
};
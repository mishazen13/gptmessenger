import React from 'react';
import { Avatar } from '../components/Avatar';
import { Chat, Message, MessageAttachment, PublicUser, ThemeSettings } from '../types';

type Props = {
  me: PublicUser;
  users: PublicUser[];
  activeChat?: Chat;
  getDisplayName: (user: PublicUser) => string;
  getAvatarUrl: (userId: string) => string | undefined;
  onOpenFriendProfile: (id: string) => void;
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
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
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
          className="pointer-events-auto w-full"
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

  React.useEffect(() => {
    const onResize = (): void => setIsWide(window.innerWidth >= 1200);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const myTextColor = getTextColor(theme.accentColor);

  const renderAttachment = (file: MessageAttachment): JSX.Element => {
    if (file.type.startsWith('image/')) {
      return <img src={file.url} alt={file.name} className="max-h-72 w-full cursor-zoom-in rounded-xl object-cover" onClick={() => setZoomImageUrl(file.url)} />;
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

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/20 p-4" style={{ backgroundColor: `rgba(71,85,105,${theme.panelOpacity})`, backdropFilter: `blur(${theme.contentBlur}px) saturate(${theme.saturation}%)` }}>
      <div className="mb-3 flex items-center gap-3">
        <Avatar imageUrl={peer ? getAvatarUrl(peer.id) : undefined} name={peer ? getDisplayName(peer) : activeChat?.name ?? 'Чат'} size={40} />
        {peer ? <button className="text-left text-lg font-semibold hover:underline" onClick={() => onOpenFriendProfile(peer.id)} type="button">{getDisplayName(peer)}</button> : <h2 className="text-lg font-semibold">{activeChat?.name ?? 'Чат'}</h2>}
      </div>

      <div className="mb-3 flex-1 w-full space-y-2 overflow-auto rounded-2xl bg-transparent p-1">
        {!activeChat && <p className="text-sm text-slate-300">Выберите чат слева.</p>}
        {activeChat?.messages.map((message) => {
          const sender = users.find((u) => u.id === message.senderId);
          const replyTo = activeChat.messages.find((m) => m.id === message.replyToMessageId);
          const mine = message.senderId === me.id;
          const hasMedia = Boolean(message.attachments?.some((file) => file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')));
          return (
            <article
              className="w-fit break-words px-3 py-2 text-sm whitespace-pre-wrap"
              style={{
                marginLeft: !isWide && mine ? 'auto' : undefined,
                maxWidth: hasMedia ? 'min(92%, 620px)' : 'min(85%, 760px)',
                backgroundColor: mine ? `${theme.accentColor}CC` : 'rgba(255,255,255,0.15)',
                color: mine ? myTextColor : '#d1d5db',
                borderRadius: `${theme.bubbleRadius}px`,
              }}
              key={message.id}
              onContextMenu={(event) => onContextMenu(event, activeChat.id, message, mine)}
            >
              <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                <Avatar imageUrl={sender ? getAvatarUrl(sender.id) : undefined} name={sender ? getDisplayName(sender) : 'Unknown'} size={20} />
                <span>{sender ? getDisplayName(sender) : 'Unknown'}</span>
                <span className="ml-auto text-[11px] opacity-80">{formatTime(message.createdAt)}</span>
              </div>
              {replyTo && <div className="mb-1 rounded-lg border border-black/20 bg-black/10 px-2 py-1 text-xs">↪ {replyTo.text || 'медиа'}</div>}
              {message.text && <p className="mb-2 break-words whitespace-pre-wrap">{message.text}</p>}
              {!!message.attachments?.length && <div className="space-y-2">{message.attachments.map((file) => <div key={file.id}>{renderAttachment(file)}</div>)}</div>}
            </article>
          );
        })}
      </div>

      {replyToMessageId && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs">
          <span>Ответ на: {activeChat?.messages.find((m) => m.id === replyToMessageId)?.text ?? 'сообщение'}</span>
          <button className="underline" onClick={onClearReply} type="button">Отмена</button>
        </div>
      )}

      {!!attachedFiles.length && (
        <div className="mb-2 grid grid-cols-2 gap-2 rounded-xl bg-black/20 p-2">
          {attachedFiles.map((file) => (
            <div key={file.id} className="rounded-xl bg-white/10 p-2">
              {renderAttachment(file)}
              <button type="button" className="mt-2 w-full rounded-lg bg-white/15 px-2 py-1 text-xs" onClick={() => onRemoveAttachedFile(file.id)}>Убрать</button>
            </div>
          ))}
        </div>
      )}

      <form className="mt-auto flex gap-2" onSubmit={onSend}>
        <input className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={messageText} onChange={(e) => onMessageText(e.target.value)} placeholder="Введите сообщение..." />
        <label className="cursor-pointer rounded-xl px-3 py-2 font-semibold" style={{ backgroundColor: theme.accentColor, color: myTextColor }}>
          📎
          <input className="hidden" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.txt,.zip,.doc,.docx,.xlsx" onChange={(e) => onPickFiles(e.target.files)} />
        </label>
        <button className="rounded-xl px-4 py-2 font-semibold" style={{ backgroundColor: theme.accentColor, color: myTextColor }} type="submit">Отправить</button>
      </form>

      {zoomImageUrl && (
        <button type="button" className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6" onClick={() => setZoomImageUrl(null)}>
          <img src={zoomImageUrl} alt="zoom" className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain" />
        </button>
      )}
    </div>
  );
};

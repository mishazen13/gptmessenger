import React from 'react';
import { Avatar } from '../components/Avatar';
import { Chat, Message, MessageAttachment, PublicUser, ThemeSettings, CallParticipant, CallType, PresenceStatus } from '../types';
import { FiPaperclip } from 'react-icons/fi';
import { MdSend, MdCall, MdVideocam, MdExpand, MdExpandMore } from 'react-icons/md';
import { AutoSizeTextarea } from '../components/AutoSizeTextarea';
import { CallOverlay } from '../components/CallOverlay';

type Props = {
  me: PublicUser;
  users: PublicUser[];
  activeChat?: Chat;
  getDisplayName: (user: PublicUser) => string;
  getAvatarUrl: (userId: string) => string | undefined;
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
};

const formatTime = (value: number): string => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const statusLabel: Record<PresenceStatus, string> = { online: 'в сети', offline: 'не в сети', dnd: 'не беспокоить' };

export const ChatPage = (props: Props): JSX.Element => {
  const {
    me, users, activeChat, getDisplayName, getAvatarUrl, onOpenFriendProfile, onOpenGroupProfile, onContextMenu,
    replyToMessageId, onClearReply, messageText, onMessageText, onSend, onPickFiles, attachedFiles, onRemoveAttachedFile,
    theme, peerPresence = 'offline', onStartCall, isCallActive, callType, participants, onEndCall, onToggleMute, onToggleVideo,
    callExpanded, onToggleCallExpand, localStream, remoteStreams,
  } = props;

  const peer = activeChat && !activeChat.isGroup ? users.find((u) => u.id !== me.id && activeChat.memberIds.includes(u.id)) : undefined;
  const [flyingText, setFlyingText] = React.useState('');
  const [sendPulse, setSendPulse] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeChat?.messages.length, activeChat?.id]);

  const submitWithFx = (e: React.FormEvent<HTMLFormElement>): void => {
    if (messageText.trim()) {
      setFlyingText(messageText.trim().slice(0, 42));
      setSendPulse(true);
      setTimeout(() => setFlyingText(''), 850);
      setTimeout(() => setSendPulse(false), 250);
    }
    onSend(e);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
  };

  return (
    <div className="animate-panelIn flex h-full flex-col rounded-2xl border border-white/20 p-4" style={{ backgroundColor: 'rgba(71,85,105,0.15)' }}>
      <div className={`relative rounded-xl border border-white/20 transition-all duration-300 ${isCallActive && callExpanded ? 'overflow-hidden bg-slate-800/60 p-0' : 'bg-slate-800/40 px-3 py-2'}`}>
        {isCallActive && callExpanded ? (
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
          />
        ) : (
          <div className="flex items-center gap-3">
            <Avatar imageUrl={peer ? getAvatarUrl(peer.id) : undefined} name={peer ? getDisplayName(peer) : activeChat?.name ?? 'Чат'} size={48} />
            <div className="min-w-0 flex-1">
              {activeChat?.isGroup ? (
                <button className="w-full truncate text-left text-lg font-semibold hover:underline" onClick={() => activeChat && onOpenGroupProfile?.(activeChat.id)} type="button">
                  {activeChat.name}
                </button>
              ) : peer ? (
                <button className="w-full truncate text-left text-lg font-semibold hover:underline" onClick={() => onOpenFriendProfile(peer.id)} type="button">{getDisplayName(peer)}</button>
              ) : <h2 className="truncate text-lg font-semibold">{activeChat?.name ?? 'Чат'}</h2>}
              <p className="text-xs text-white/50">{activeChat?.isGroup ? `${activeChat.memberIds.length} участников` : statusLabel[peerPresence]}</p>
            </div>
            {!activeChat?.isGroup && peer && (
              <div className="flex shrink-0 gap-2">
                {!isCallActive ? (
                  <>
                    <button onClick={() => onStartCall('audio', peer.id)} className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20" type="button"><MdCall size={20} /></button>
                    <button onClick={() => onStartCall('video', peer.id)} className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20" type="button"><MdVideocam size={20} /></button>
                  </>
                ) : <button onClick={onToggleCallExpand} className="rounded-full hover:bg-white/20 transition p-2 " type="button"><MdExpandMore size={20} /></button>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-transparent p-2 scroll-smooth">
        {activeChat?.messages.map((message) => {
          const mine = message.senderId === me.id;
          const sender = users.find((u) => u.id === message.senderId);
          return (
            <article
              key={message.id}
              onContextMenu={(event) => onContextMenu(event, activeChat.id, message, mine)}
              className={`animate-msgIn w-fit max-w-[85%] break-words whitespace-pre-wrap px-3 py-2 text-sm transition-all duration-200 ${mine ? '' : 'hover:bg-white/20'}`}
              style={{ marginLeft: mine ? 'auto' : undefined, backgroundColor: mine ? `${theme.accentColor}CC` : 'rgba(255,255,255,0.15)', borderRadius: `${theme.bubbleRadius}px` }}
            >
              <div className="mb-1 flex items-center gap-2 text-xs opacity-80"><Avatar imageUrl={sender ? getAvatarUrl(sender.id) : undefined} name={sender ? getDisplayName(sender) : 'Unknown'} size={20} /><span>{sender ? getDisplayName(sender) : 'Unknown'}</span><span className="ml-auto">{formatTime(message.createdAt)}</span></div>
              {message.text && <p>{message.text}</p>}
            </article>
          );
        })}
        <div ref={endRef} />
      </div>

      {replyToMessageId && <div className="mb-2 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs animate-fadeIn"><span>Ответ</span><button className="text-cyan-400" onClick={onClearReply} type="button">Отмена</button></div>}

      <div className={`relative mt-5 flex flex-col rounded-2xl border border-white/20 p-2 transition-transform ${sendPulse ? 'scale-[1.01]' : ''}`} style={{ backgroundColor: 'rgba(71,85,105,0.15)' }}>
        {flyingText && <div className="pointer-events-none absolute bottom-11 left-4 rounded-xl bg-cyan-400/90 px-3 py-1 text-xs font-medium text-slate-950 animate-sendFlyBetter">{flyingText}</div>}
        <form className="flex items-end gap-2" onSubmit={submitWithFx}>
          <AutoSizeTextarea value={messageText} onChange={(e) => onMessageText(e.target.value)} placeholder="Введите сообщение..." className="flex-1 rounded-xl bg-transparent px-3 py-2 text-white placeholder-white/50 focus:outline-none" maxRows={5} />
          <label className="flex h-10 cursor-pointer items-center justify-center rounded-full px-3 py-2 font-semibold transition hover:opacity-90" style={{ backgroundColor: theme.accentColor }}>
            <FiPaperclip />
            <input className="hidden" type="file" multiple onChange={(e) => onPickFiles(e.target.files)} />
          </label>
          <button className="h-10 rounded-full px-4 py-2 font-semibold transition hover:opacity-90" style={{ backgroundColor: theme.accentColor }} type="submit"><MdSend /></button>
        </form>
        {!!attachedFiles.length && <div className="mt-2 grid grid-cols-2 gap-2 animate-fadeIn">{attachedFiles.map((f) => <button key={f.id} type="button" className="rounded bg-white/10 p-2 text-left text-xs transition hover:bg-white/20" onClick={() => onRemoveAttachedFile(f.id)}>{f.name}</button>)}</div>}
      </div>
    </div>
  );
};
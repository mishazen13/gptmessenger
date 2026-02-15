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

const renderAttachment = (file: MessageAttachment): JSX.Element => {
  if (file.type.startsWith('image/')) {
    return <img src={file.url} alt={file.name} className="max-h-56 w-full rounded-xl object-cover" />;
  }
  if (file.type.startsWith('video/')) {
    return <video src={file.url} className="max-h-56 w-full rounded-xl" controls preload="metadata" />;
  }
  return <a href={file.url} download={file.name} className="text-sm underline">📎 {file.name}</a>;
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

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/20 p-4" style={{ backgroundColor: `rgba(255,255,255,${theme.panelOpacity})`, backdropFilter: `blur(${theme.contentBlur}px) saturate(${theme.saturation}%)` }}>
      <div className="mb-3 flex items-center gap-3">
        <Avatar imageUrl={peer ? getAvatarUrl(peer.id) : undefined} name={peer ? getDisplayName(peer) : activeChat?.name ?? 'Чат'} size={40} />
        {peer ? (
          <button className="text-left text-lg font-semibold hover:underline" onClick={() => onOpenFriendProfile(peer.id)} type="button">
            {getDisplayName(peer)}
          </button>
        ) : (
          <h2 className="text-lg font-semibold">{activeChat?.name ?? 'Чат'}</h2>
        )}
      </div>

      <div className="mb-3 flex-1 w-full space-y-2 overflow-auto rounded-2xl bg-transparent p-1">
        {!activeChat && <p className="text-sm text-white/70">Выберите чат слева.</p>}
        {activeChat?.messages.map((message) => {
          const sender = users.find((u) => u.id === message.senderId);
          const replyTo = activeChat.messages.find((m) => m.id === message.replyToMessageId);
          const mine = message.senderId === me.id;
          return (
            <article
              className="max-w-[78%] px-3 py-2 text-sm"
              style={{
                marginLeft: mine ? 'auto' : undefined,
                backgroundColor: mine ? `${theme.accentColor}${Math.round(theme.messageOpacity * 255).toString(16).padStart(2, '0')}` : `rgba(255,255,255,${theme.messageOpacity * 0.75})`,
                color: mine ? '#041314' : 'white',
                borderRadius: `${theme.bubbleRadius}px`,
              }}
              key={message.id}
              onContextMenu={(event) => onContextMenu(event, activeChat.id, message, mine)}
            >
              <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                <Avatar imageUrl={sender ? getAvatarUrl(sender.id) : undefined} name={sender ? getDisplayName(sender) : 'Unknown'} size={20} />
                <span>{sender ? getDisplayName(sender) : 'Unknown'}</span>
              </div>
              {replyTo && <div className="mb-1 rounded-lg border border-black/20 bg-black/10 px-2 py-1 text-xs">↪ {replyTo.text || 'медиа'}</div>}
              {message.text && <p className="mb-2">{message.text}</p>}
              {!!message.attachments?.length && (
                <div className="space-y-2">
                  {message.attachments.map((file) => <div key={file.id}>{renderAttachment(file)}</div>)}
                </div>
              )}
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
        <label className="cursor-pointer rounded-xl px-3 py-2 font-semibold text-black" style={{ backgroundColor: theme.accentColor }}>
          📎
          <input className="hidden" type="file" multiple accept="image/*,video/*,.pdf,.txt,.zip" onChange={(e) => onPickFiles(e.target.files)} />
        </label>
        <button className="rounded-xl px-4 py-2 font-semibold text-black" style={{ backgroundColor: theme.accentColor }} type="submit">Отправить</button>
      </form>
    </div>
  );
};

import React from 'react';
import { Avatar } from '../components/Avatar';
import { Chat, Message, PublicUser } from '../types';

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
}: Props): JSX.Element => {
  const peer = activeChat && !activeChat.isGroup
    ? users.find((u) => u.id !== me.id && activeChat.memberIds.includes(u.id))
    : undefined;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/20 bg-white/10 p-4">
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
              className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? 'ml-auto bg-emerald-300/80 text-slate-900' : 'bg-white/15'}`}
              key={message.id}
              onContextMenu={(event) => onContextMenu(event, activeChat.id, message, mine)}
            >
              <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                <Avatar imageUrl={sender ? getAvatarUrl(sender.id) : undefined} name={sender ? getDisplayName(sender) : 'Unknown'} size={20} />
                <span>{sender ? getDisplayName(sender) : 'Unknown'}</span>
              </div>
              {replyTo && <div className="mb-1 rounded-lg border border-black/20 bg-black/10 px-2 py-1 text-xs">↪ {replyTo.text}</div>}
              <p>{message.text}</p>
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

      <form className="mt-auto flex gap-2" onSubmit={onSend}>
        <input className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2" value={messageText} onChange={(e) => onMessageText(e.target.value)} placeholder="Введите сообщение..." />
        <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black" type="submit">Отправить</button>
      </form>
    </div>
  );
};

// components/AddMemberModal.tsx
import React from 'react';
import { PublicUser } from '../types';
import { Avatar } from './Avatar';
import { MdClose } from 'react-icons/md';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  friends: PublicUser[];
  onAddMembers: (userIds: string[]) => void;
  getAvatarUrl: (userId: string) => string | undefined;
  existingMemberIds: string[];
};

export const AddMemberModal = ({
  isOpen,
  onClose,
  friends,
  onAddMembers,
  getAvatarUrl,
  existingMemberIds,
}: Props): JSX.Element | null => {
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  if (!isOpen) return null;

  // Фильтруем друзей, которые еще не в группе
  const availableFriends = friends.filter(
    (friend) => !existingMemberIds.includes(friend.id)
  );

  // Фильтруем по поиску
  const filteredFriends = availableFriends.filter((friend) =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAdd = () => {
    if (selectedUsers.length > 0) {
      onAddMembers(selectedUsers);
      setSelectedUsers([]);
      setSearchTerm('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-6 shadow-xl">
        {/* Заголовок */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Добавить участников</h3>
          <button
            onClick={handleClose}
            className="rounded-full p-1 hover:bg-white/10"
            type="button"
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Поиск */}
        <input
          type="text"
          placeholder="Поиск друзей..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          autoFocus
        />

        {/* Список друзей */}
        <div className="max-h-80 space-y-2 overflow-auto rounded-xl border border-white/10 p-2">
          {filteredFriends.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/50">
              {availableFriends.length === 0
                ? 'Нет друзей для добавления'
                : 'Ничего не найдено'}
            </p>
          ) : (
            filteredFriends.map((friend) => (
              <label
                key={friend.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg bg-white/5 p-3 hover:bg-white/10"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(friend.id)}
                  onChange={() => handleToggleUser(friend.id)}
                  className="h-4 w-4 accent-cyan-400"
                />
                <Avatar
                  imageUrl={getAvatarUrl(friend.id)}
                  name={friend.name}
                  size={32}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{friend.name}</p>
                  <p className="text-xs text-white/50">{friend.email}</p>
                </div>
              </label>
            ))
          )}
        </div>

        {/* Кнопки */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            type="button"
          >
            Отмена
          </button>
          <button
            onClick={handleAdd}
            disabled={selectedUsers.length === 0}
            className="flex-1 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-300 disabled:opacity-50"
            type="button"
          >
            Добавить ({selectedUsers.length})
          </button>
        </div>
      </div>
    </div>
  );
};
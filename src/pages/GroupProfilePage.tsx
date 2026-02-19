// pages/GroupProfilePage.tsx
import React from 'react';
import { Avatar } from '../components/Avatar';
import { Chat, PublicUser } from '../types';
import { MdEdit, MdGroup, MdExitToApp, MdDelete, MdClear, MdPersonAdd } from 'react-icons/md';
import { AddMemberModal } from '../components/AddMemberModal'; // Импортируйте модалку

type Props = {
  group?: Chat;
  me: PublicUser;
  members: PublicUser[];
  isEditingName: boolean;
  onNameChange: (v: string) => void;
  onToggleEdit: () => void;
  onSaveName: () => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
  onClearChat: () => void;
  onAddMember: (userIds: string[]) => void; // Измените тип
  onRemoveMember: (userId: string) => void;
  onViewMemberProfile: (userId: string) => void;
  isAdmin: boolean;
  creatorId?: string;
  getAvatarUrl: (userId: string) => string | undefined;
  friends: PublicUser[]; // Добавьте список друзей
};

export const GroupProfilePage = ({
  group,
  me,
  members,
  isEditingName,
  onNameChange,
  onToggleEdit,
  onSaveName,
  onLeaveGroup,
  onDeleteGroup,
  onClearChat,
  onAddMember,
  onRemoveMember,
  onViewMemberProfile,
  isAdmin,
  creatorId,
  getAvatarUrl,
  friends, // Добавьте в пропсы
}: Props): JSX.Element => {
  const [showMembers, setShowMembers] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState(group?.name || '');
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = React.useState(false); // Состояние для модалки

  if (!group) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white/70">
        Группа не выбрана.
      </div>
    );
  }

  const isCreator = creatorId === me.id;
  const existingMemberIds = members.map(m => m.id);

  const handleAddMembers = (userIds: string[]) => {
    onAddMember(userIds);
  };

  return (
    <div className="relative h-full overflow-auto rounded-2xl border border-white/20 bg-white/10 p-4">
      {/* Модалка добавления участников */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        friends={friends}
        onAddMembers={handleAddMembers}
        getAvatarUrl={getAvatarUrl}
        existingMemberIds={existingMemberIds}
      />

      {/* Шапка с обложкой */}
      <div className="mb-6 overflow-hidden rounded-xl border border-white/20">
        {group.avatarUrl ? (
          <img 
            src={group.avatarUrl} 
            alt={group.name} 
            className="h-32 w-full object-cover"
          />
        ) : (
          <div className="h-32 w-full bg-gradient-to-r from-indigo-500/30 to-cyan-500/30 flex items-center justify-center">
            <MdGroup className="text-5xl text-white/50" />
          </div>
        )}
      </div>

      {/* Аватар и название группы */}
      <div className="mb-5 -mt-16 flex flex-col items-center gap-3 text-center">
        <div className="relative">
          {group.avatarUrl ? (
            <img 
              src={group.avatarUrl} 
              alt={group.name}
              className="h-24 w-24 rounded-full border-4 border-white/20 object-cover"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-4xl border-4 border-white/20">
              👥
            </div>
          )}
          {/* Только админы могут менять аватар */}
          {isAdmin && (
            <button 
              className="absolute bottom-0 right-0 rounded-full bg-cyan-400 p-2 text-black hover:bg-cyan-300"
              onClick={() => {/* Функция смены аватара */}}
              type="button"
              title="Сменить аватар"
            >
              <MdEdit size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex gap-2">
              <input 
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-lg"
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value);
                  onNameChange(e.target.value);
                }}
                placeholder="Название группы"
                autoFocus
              />
              <button 
                className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black"
                onClick={onSaveName}
                type="button"
              >
                OK
              </button>
            </div>
          ) : (
            <>
              <p className="text-lg font-semibold">{group.name}</p>
              {/* Только админы могут редактировать название */}
              {isAdmin && (
                <button 
                  className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                  onClick={onToggleEdit}
                  type="button"
                  title="Редактировать название"
                >
                  ✏️
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-white/70">
          <span>👥 {members.length} участников</span>
          {/* Показываем корону только создателю */}
          {isCreator && <span className="text-cyan-400">Вы Создатель</span>}
        </div>
      </div>

      {/* Статистика */}
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-3">
        <div className="text-center">
          <p className="text-xl font-bold">{members.length}</p>
          <p className="text-xs text-white/70">участников</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{group.messages?.length || 0}</p>
          <p className="text-xs text-white/70">сообщений</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">
            {new Date().toLocaleDateString()}
          </p>
          <p className="text-xs text-white/70">создана</p>
        </div>
      </div>

      {/* Участники */}
      <div className="mb-4">
        <button
          className="mb-2 flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-left hover:bg-white/10"
          onClick={() => setShowMembers(!showMembers)}
          type="button"
        >
          <span className="font-medium">Участники ({members.length})</span>
          <span className="text-xl">{showMembers ? '▼' : '▶'}</span>
        </button>

        {showMembers && (
          <div className="space-y-2 rounded-xl bg-white/5 p-3">
            {members.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2"
              >
                <button
                  className="flex items-center gap-3 flex-1"
                  onClick={() => onViewMemberProfile(member.id)}
                  type="button"
                >
                  <Avatar 
                    imageUrl={getAvatarUrl(member.id)}
                    name={member.name}
                    size={32}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-white/70">{member.email}</p>
                  </div>
                </button>

                {/* Показываем корону только создателю */}
                {member.id === creatorId && (
                  <span className="mr-2 text-xs text-cyan-400">Создатель</span>
                )}

                {/* Только админы могут удалять других участников (но не создателя) */}
                {isAdmin && member.id !== me.id && member.id !== creatorId && (
                  <button
                    className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/30"
                    onClick={() => onRemoveMember(member.id)}
                    type="button"
                  >
                    Удалить
                  </button>
                )}
              </div>
            ))}

            {/* Только админы могут добавлять участников */}
            {isAdmin && (
              <button
                className="mt-2 w-full rounded-lg bg-cyan-400/20 px-4 py-2 text-sm text-cyan-400 hover:bg-cyan-400/30 flex items-center justify-center gap-2"
                onClick={() => setIsAddMemberModalOpen(true)} // Открываем модалку
                type="button"
              >
                <MdPersonAdd />
                Добавить участника
              </button>
            )}
          </div>
        )}
      </div>

      {/* Действия */}
      <div className="mt-6 flex flex-col gap-2">
        <button 
          className="flex w-full items-center gap-3 rounded-xl bg-transparent px-4 py-3 text-left text-sm transition hover:bg-white/10"
          onClick={onClearChat}
          type="button"
        >
          <MdClear className="text-white/70" />
          Очистить чат
        </button>

        {/* Создатель видит кнопку удаления группы, остальные - кнопку выхода */}
        {isCreator ? (
          <button 
            className="flex w-full items-center gap-3 rounded-xl bg-transparent px-4 py-3 text-left text-sm text-rose-300 transition hover:bg-rose-500/20"
            onClick={onDeleteGroup}
            type="button"
          >
            <MdDelete className="text-rose-300" />
            Удалить группу
          </button>
        ) : (
          <button 
            className="flex w-full items-center gap-3 rounded-xl bg-transparent px-4 py-3 text-left text-sm text-amber-300 transition hover:bg-amber-500/20"
            onClick={onLeaveGroup}
            type="button"
          >
            <MdExitToApp className="text-amber-300" />
            Покинуть группу
          </button>
        )}
      </div>
    </div>
  );
};
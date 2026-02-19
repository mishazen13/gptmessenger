// components/GroupAvatarSelector.tsx
import React from 'react';
import { GroupAvatar } from '../types';

type Props = {
  avatars: GroupAvatar[];
  selectedAvatar: string;
  onSelect: (url: string) => void;
};

export const GroupAvatarSelector = ({ avatars, selectedAvatar, onSelect }: Props): JSX.Element => {
  const [showAll, setShowAll] = React.useState(false);
  const displayedAvatars = showAll ? avatars : avatars.slice(0, 8);

  return (
    <div className="space-y-2">
      <label className="text-sm text-white/70">Аватар группы</label>
      <div className="grid grid-cols-4 gap-2">
        {displayedAvatars.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
              selectedAvatar === avatar.url 
                ? 'border-cyan-400 scale-105' 
                : 'border-transparent hover:border-white/30'
            }`}
            onClick={() => onSelect(avatar.url)}
          >
            <img 
              src={avatar.url} 
              alt={avatar.name}
              className="w-full h-full object-cover"
            />
            {selectedAvatar === avatar.url && (
              <div className="absolute inset-0 bg-cyan-400/20 flex items-center justify-center">
                <span className="text-white text-lg">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
      
      {avatars.length > 8 && !showAll && (
        <button
          type="button"
          className="text-sm text-cyan-400 hover:underline"
          onClick={() => setShowAll(true)}
        >
          Показать все ({avatars.length})
        </button>
      )}
      
      {showAll && (
        <button
          type="button"
          className="text-sm text-cyan-400 hover:underline"
          onClick={() => setShowAll(false)}
        >
          Скрыть
        </button>
      )}
    </div>
  );
};
// components/IncomingCallModal.tsx
import React from 'react';
import { Avatar } from './Avatar';
import { MdCall, MdCallEnd } from 'react-icons/md';

type Props = {
  isOpen: boolean;
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
};

export const IncomingCallModal = ({
  isOpen,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject,
}: Props): JSX.Element | null => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-80 rounded-2xl border border-white/20 bg-slate-900/95 p-6 shadow-2xl animate-slideDown">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <Avatar 
                name={callerName}
                imageUrl={callerAvatar}
                size={80}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-1">{callerName}</h3>
          <p className="text-sm text-white/60 mb-6">
            {callType === 'video' ? '📹 Видеозвонок' : '🎧 Аудиозвонок'}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onAccept}
              className="flex-1 py-3 rounded-xl bg-green-500 text-white hover:bg-green-600 transition flex items-center justify-center gap-2"
              type="button"
            >
              <MdCall size={20} />
              Принять
            </button>
            <button
              onClick={onReject}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition flex items-center justify-center gap-2"
              type="button"
            >
              <MdCallEnd size={20} />
              Отклонить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
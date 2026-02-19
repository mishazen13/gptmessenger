// components/CallOverlay.tsx
import React, { useEffect, useRef, useState } from 'react';
import { CallParticipant, CallType } from '../types';
import { Avatar } from './Avatar';
import { 
  MdCallEnd, 
  MdMic, 
  MdMicOff, 
  MdVideocam, 
  MdVideocamOff,
  MdVolumeUp,
  MdClose,
  MdExpandLess,
  MdExpandMore
} from 'react-icons/md';
import { FiCameraOff } from 'react-icons/fi';

type Props = {
  isOpen: boolean;
  callType: CallType;
  participants: CallParticipant[];
  localParticipantId: string;
  onClose: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  localVideoRef?: React.RefObject<HTMLVideoElement>;
  remoteStreams?: Map<string, MediaStream>;
};

export const CallOverlay = ({
  isOpen,
  callType,
  participants,
  localParticipantId,
  onClose,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  isExpanded = true,
  onToggleExpand,
  localVideoRef,
  remoteStreams = new Map(),
}: Props): JSX.Element | null => {
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!isOpen) return;

    // Симуляция уровня звука для демо
    const interval = setInterval(() => {
      const newLevels = new Map();
      participants.forEach(p => {
        // Случайный уровень звука для демонстрации
        newLevels.set(p.userId, Math.random());
      });
      setAudioLevels(newLevels);
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, participants]);

  if (!isOpen) return null;

  const localParticipant = participants.find(p => p.userId === localParticipantId);
  const remoteParticipants = participants.filter(p => p.userId !== localParticipantId);
  const isVideoCall = callType === 'video';

  const renderParticipant = (participant: CallParticipant, isLocal: boolean = false) => {
    const hasVideo = isVideoCall && participant.isVideoEnabled;
    const isExpandedParticipant = expandedParticipant === participant.userId;
    const audioLevel = audioLevels.get(participant.userId) || 0;
    const isSpeaking = audioLevel > 0.1;

    return (
      <div 
        key={participant.userId}
        className={`
          relative rounded-xl overflow-hidden bg-slate-900/60 backdrop-blur-sm
          transition-all duration-300 border-2 cursor-pointer
          ${isExpandedParticipant ? 'col-span-2 row-span-2' : ''}
          ${isSpeaking ? 'border-green-400' : 'border-transparent'}
          aspect-video
        `}
        onClick={() => setExpandedParticipant(isExpandedParticipant ? null : participant.userId)}
      >
        {hasVideo ? (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-cyan-900 flex items-center justify-center">
            <span className="text-white/50">
              {isLocal ? 'Ваше видео' : `Видео ${participant.name}`}
            </span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/50 to-cyan-900/50">
            <Avatar 
              name={participant.name}
              imageUrl={participant.avatarUrl}
              size={isExpandedParticipant ? 96 : 48}
            />
          </div>
        )}

        {/* Индикатор уровня звука */}
        {isSpeaking && !participant.isMuted && (
          <div 
            className="absolute bottom-0 left-0 h-1 bg-green-400" 
            style={{ width: `${audioLevel * 100}%` }} 
          />
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white font-medium truncate">
              {participant.name} {isLocal && '(Вы)'}
            </span>
            <div className="flex gap-1">
              {!hasVideo && isVideoCall && (
                <span className="bg-slate-800/80 rounded-full p-0.5">
                  <FiCameraOff size={10} className="text-slate-400" />
                </span>
              )}
              {participant.isMuted ? (
                <span className="bg-slate-800/80 rounded-full p-0.5">
                  <MdMicOff size={10} className="text-red-400" />
                </span>
              ) : (
                isSpeaking && (
                  <span className="bg-green-500/80 rounded-full p-0.5">
                    <MdVolumeUp size={10} className="text-white" />
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="text-sm font-medium">
            {isVideoCall ? '📹 Видеозвонок' : '🎧 Звонок'} • {participants.length} участников
          </h3>
        </div>
        <div className="flex gap-1">
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 rounded-full hover:bg-white/10 transition"
              title={isExpanded ? "Свернуть" : "Развернуть"}
              type="button"
            >
              {isExpanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition"
            title="Свернуть в трей"
            type="button"
          >
            <MdClose size={18} />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className={`
          grid gap-2
          ${remoteParticipants.length === 1 
            ? 'grid-cols-1 md:grid-cols-2' 
            : 'grid-cols-2 md:grid-cols-3'
          }
        `}>
          {remoteParticipants.map(p => renderParticipant(p))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-3 pt-2 border-t border-white/10">
          <button
            onClick={onToggleMute}
            className={`
              p-2 rounded-full transition-all
              ${localParticipant?.isMuted 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                : 'bg-white/10 text-white hover:bg-white/20'
              }
            `}
            type="button"
            title={localParticipant?.isMuted ? "Включить микрофон" : "Отключить микрофон"}
          >
            {localParticipant?.isMuted ? <MdMicOff size={18} /> : <MdMic size={18} />}
          </button>

          {isVideoCall && (
            <button
              onClick={onToggleVideo}
              className={`
                p-2 rounded-full transition-all
                ${!localParticipant?.isVideoEnabled
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
                }
              `}
              type="button"
              title={localParticipant?.isVideoEnabled ? "Отключить камеру" : "Включить камеру"}
            >
              {localParticipant?.isVideoEnabled ? <MdVideocam size={18} /> : <MdVideocamOff size={18} />}
            </button>
          )}

          <button
            onClick={onEndCall}
            className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all hover:scale-110"
            type="button"
            title="Завершить звонок"
          >
            <MdCallEnd size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
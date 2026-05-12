import React from 'react';
import { CallParticipant, CallType } from '../types';
import { Avatar } from './Avatar';
import { MdCallEnd, MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdVolumeUp, MdExpandLess, MdExpandMore, MdCall, MdDesktopMac, MdStop } from 'react-icons/md';

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
  localStream?: MediaStream | null;
  remoteStreams?: Map<string, MediaStream>;
  onToggleScreenShare?: () => void;
  isScreenSharing?: boolean;
};

const ParticipantTile = ({ 
  participant, 
  isLocal, 
  stream, 
  isVideoCall, 
  isSpeaking = false,
  isScreenSharing = false
}: { 
  participant: CallParticipant; 
  isLocal: boolean; 
  stream?: MediaStream; 
  isVideoCall: boolean;
  isSpeaking?: boolean;
  isScreenSharing?: boolean;
}): JSX.Element => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = React.useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const enableAudio = React.useCallback(() => {
    if (audioRef.current && stream && !isLocal) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().then(() => {
        console.log(`✅ Audio enabled for ${participant.name}`);
        setIsAudioPlaying(true);
      }).catch(e => console.log('Audio play failed:', e));
    }
  }, [stream, isLocal, participant.name]);

  React.useEffect(() => {
    if (!stream) return;
    
    const videoTracks = stream.getVideoTracks();
    setHasVideo(videoTracks.length > 0);
    
    // Для удаленного потока – создаем аудио элемент для воспроизведения звука
    if (!isLocal && !audioRef.current) {
      const audio = new Audio();
      audio.autoplay = false;
      audioRef.current = audio;
      
      // Добавляем обработчик для первого клика пользователя
      const handleFirstInteraction = () => {
        enableAudio();
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      };
      document.addEventListener('click', handleFirstInteraction);
      document.addEventListener('touchstart', handleFirstInteraction);
    }
    
    // Настройка видео
    if (videoRef.current && videoTracks.length > 0) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = isLocal;
      videoRef.current.playsInline = true;
      videoRef.current.play().catch(e => console.log('Video play error:', e));
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    };
  }, [stream, isLocal, enableAudio, participant.name]);

  const shouldShowVideo = (isVideoCall || isScreenSharing) && participant.isVideoEnabled && hasVideo;
  
  return (
    <div className={`relative aspect-video overflow-hidden rounded-xl border-2 transition-all duration-200 ${isSpeaking && !participant.isMuted ? 'border-green-400 shadow-lg shadow-green-400/20' : 'border-transparent'} bg-slate-900/50`}>
      {/* Кнопка включения звука для удаленных участников */}
      {!isLocal && !isAudioPlaying && (
        <button
          onClick={enableAudio}
          className="absolute top-2 right-2 z-10 rounded-full bg-yellow-500/80 p-2 text-white text-xs animate-pulse"
          type="button"
        >
          🔊 Включить звук
        </button>
      )}
      
      {/* Видео или аватар */}
      {shouldShowVideo ? (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted={isLocal}
          className={`h-full w-full object-cover ${isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-900/60 to-cyan-900/60">
          <Avatar name={participant.name} imageUrl={participant.avatarUrl} size={64} />
        </div>
      )}
      
      {/* Индикатор речи */}
      {isSpeaking && !participant.isMuted && (
        <div className="absolute bottom-0 left-0 h-1 bg-green-400 animate-pulse" style={{ width: '100%' }} />
      )}

      {/* Информация о участнике */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 truncate max-w-[70%]">
            {participant.name}{isLocal ? ' (Вы)' : ''}
            {isScreenSharing && <MdDesktopMac size={14} className="text-cyan-400" />}
          </span>
          <div className="flex gap-1">
            {participant.isMuted && <MdMicOff className="text-red-400" size={14} />}
            {isVideoCall && !participant.isVideoEnabled && !isScreenSharing && <span className="text-white/50 text-[10px]">📹 off</span>}
            {isScreenSharing && <span className="text-cyan-400 text-[10px]">🎥 экран</span>}
          </div>
        </div>
      </div>
    </div>
  );
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
  localStream,
  remoteStreams = new Map(),
  onToggleScreenShare,
  isScreenSharing = false,
}: Props): JSX.Element | null => {
  if (!isOpen) return null;

  const localParticipant = participants.find((p) => p.userId === localParticipantId);
  const remoteParticipants = participants.filter((p) => p.userId !== localParticipantId);
  
  // Анализ уровня звука для локального участника
  const [localAudioLevel, setLocalAudioLevel] = React.useState(0);
  
  React.useEffect(() => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(localStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      let raf = 0;
      const loop = (): void => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((acc, v) => acc + v, 0) / data.length / 255;
        setLocalAudioLevel(avg);
        raf = requestAnimationFrame(loop);
      };
      loop();

      return () => {
        cancelAnimationFrame(raf);
        void audioContext.close();
      };
    } catch (error) {
      console.error('Audio analysis error:', error);
    }
  }, [localStream]);

  const isLocalSpeaking = localAudioLevel > 0.06 && !localParticipant?.isMuted;
  
  const updatedLocalParticipant = localParticipant ? {
    ...localParticipant,
    isSpeaking: isLocalSpeaking
  } : null;

  const totalParticipants = participants.length;
  let gridCols = 'grid-cols-1';
  
  if (totalParticipants === 2) {
    gridCols = 'grid-cols-2';
  } else if (totalParticipants === 3) {
    gridCols = 'grid-cols-2 md:grid-cols-3';
  } else if (totalParticipants >= 4) {
    gridCols = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  }

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden">
      <div className="flex flex-col h-full" style={{ backgroundColor: 'rgba(71,85,105,0.15)' }}>
        {/* Заголовок */}
        <div className="flex items-center justify-between rounded-full m-3 bg-white/5 px-4 py-2">
          <span className="flex items-center gap-1 text-white">
            {isScreenSharing ? <MdDesktopMac size={16} className="text-cyan-400" /> : callType === 'video' ? <MdVideocam size={16} /> : <MdCall size={16} />}
            <span className="text-sm">
              {isScreenSharing ? 'Демонстрация экрана' : callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
            </span>
          </span>
          <div className="flex gap-2">
            {onToggleScreenShare && (
              <button 
                onClick={onToggleScreenShare} 
                className={`rounded-full p-1.5 transition ${isScreenSharing ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10'}`}
                type="button"
                title={isScreenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана'}
              >
                {isScreenSharing ? <MdStop size={18} /> : <MdDesktopMac size={18} />}
              </button>
            )}
            {onToggleExpand && (
              <button onClick={onToggleExpand} className="rounded-full p-1.5 hover:bg-white/10 transition" type="button">
                {isExpanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* Сетка участников */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className={`grid ${gridCols} gap-4 w-full max-w-6xl mx-auto`}>
            {/* Локальный участник */}
            {updatedLocalParticipant && (
              <ParticipantTile
                participant={updatedLocalParticipant}
                isLocal
                stream={localStream ?? undefined}
                isVideoCall={callType === 'video' || isScreenSharing}
                isSpeaking={isLocalSpeaking}
                isScreenSharing={isScreenSharing}
              />
            )}
            
            {/* Удаленные участники */}
            {remoteParticipants.map((p) => (
              <ParticipantTile 
                key={p.userId} 
                participant={p} 
                isLocal={false} 
                stream={remoteStreams.get(p.userId)} 
                isVideoCall={callType === 'video'}
                isSpeaking={p.isSpeaking}
              />
            ))}
          </div>
        </div>

        {/* Элементы управления */}
        <div className="flex items-center justify-center gap-3 m-3 rounded-full border border-white/20 p-3 shadow-glass bg-black/20 backdrop-blur-sm">
          <button 
            onClick={onToggleMute} 
            className={`rounded-full p-3 transition-all hover:scale-110 ${localParticipant?.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'}`} 
            type="button"
            title={localParticipant?.isMuted ? 'Включить микрофон' : 'Отключить микрофон'}
          >
            {localParticipant?.isMuted ? <MdMicOff size={20} /> : <MdMic size={20} />}
          </button>
          
          {callType === 'video' && (
            <button 
              onClick={onToggleVideo} 
              className={`rounded-full p-3 transition-all hover:scale-110 ${!localParticipant?.isVideoEnabled && !isScreenSharing ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'}`} 
              type="button"
              title={localParticipant?.isVideoEnabled && !isScreenSharing ? 'Отключить камеру' : 'Включить камеру'}
            >
              {(localParticipant?.isVideoEnabled && !isScreenSharing) || isScreenSharing ? <MdVideocam size={20} /> : <MdVideocamOff size={20} />}
            </button>
          )}
          
          {/* Кнопка демонстрации экрана - доступна для аудио и видео звонков */}
          {onToggleScreenShare && (
            <button 
              onClick={onToggleScreenShare} 
              className={`rounded-full p-3 transition-all hover:scale-110 ${isScreenSharing ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'}`} 
              type="button"
              title={isScreenSharing ? 'Остановить демонстрацию экрана' : 'Демонстрация экрана'}
            >
              {isScreenSharing ? <MdStop size={20} /> : <MdDesktopMac size={20} />}
            </button>
          )}
          
          <button 
            onClick={onEndCall} 
            className="rounded-full bg-red-500 p-3 text-white transition-all hover:bg-red-600 hover:scale-110" 
            type="button"
            title="Завершить звонок"
          >
            <MdCallEnd size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
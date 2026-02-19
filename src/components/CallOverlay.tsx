import React from 'react';
import { CallParticipant, CallType } from '../types';
import { Avatar } from './Avatar';
import { MdCallEnd, MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdVolumeUp, MdClose, MdExpandLess, MdExpandMore } from 'react-icons/md';

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
};

const ParticipantTile = ({ participant, isLocal, stream, isVideoCall }: { participant: CallParticipant; isLocal: boolean; stream?: MediaStream; isVideoCall: boolean }): JSX.Element => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [audioLevel, setAudioLevel] = React.useState(0);
  const [hasAudio, setHasAudio] = React.useState(false);
  const [hasVideo, setHasVideo] = React.useState(false);
  const [playError, setPlayError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!stream) {
      console.log(`📹 No stream for ${participant.name}${isLocal ? ' (local)' : ''}`);
      return;
    }
    
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    
    console.log(`📹 Stream for ${participant.name}${isLocal ? ' (local)' : ''}:`, {
      audioTracks: audioTracks.length,
      videoTracks: videoTracks.length,
      active: stream.active,
      id: stream.id
    });
    
    setHasAudio(audioTracks.length > 0);
    setHasVideo(videoTracks.length > 0);
    
    // Для локального видео - показываем в зеркальном отображении
    if (isLocal && videoRef.current && videoTracks.length > 0) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true; // Локальное видео всегда muted
      videoRef.current.play().catch(e => {
        console.log('Local video play error:', e);
        setPlayError('local-video-error');
      });
    }
    
    // Для удаленного видео
    if (!isLocal && videoRef.current && videoTracks.length > 0) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = false;
      videoRef.current.play().catch(e => {
        console.log('Remote video play error:', e);
        setPlayError('remote-video-error');
      });
    }
    
    // Для удаленного аудио (если нет видео)
    if (!isLocal && !isVideoCall && audioRef.current && audioTracks.length > 0) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(e => {
        console.log('Remote audio play error:', e);
        setPlayError('remote-audio-error');
      });
    }
    
  }, [stream, participant.name, isLocal, isVideoCall]);

  // Анализ уровня звука
  React.useEffect(() => {
    if (!stream || isLocal) return;
    
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      let raf = 0;
      const loop = (): void => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((acc, v) => acc + v, 0) / data.length / 255;
        setAudioLevel(avg);
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
  }, [stream, isLocal]);

  const showVideo = isVideoCall && participant.isVideoEnabled && hasVideo;
  const isSpeaking = audioLevel > 0.06;

  return (
    <div className={`relative aspect-video overflow-hidden rounded-xl border-2 ${isSpeaking && !participant.isMuted ? 'border-green-400' : 'border-transparent'} bg-slate-900/50`}>
      {/* Видео элемент */}
      {showVideo ? (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted={isLocal}
          className={`h-full w-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`} // Зеркалим локальное видео
        />
      ) : (
        <div className="grid h-full place-items-center bg-gradient-to-br from-indigo-900/60 to-cyan-900/60">
          <Avatar name={participant.name} imageUrl={participant.avatarUrl} size={64} />
        </div>
      )}
      
      {/* Скрытый аудио элемент для аудиозвонков */}
      {!isLocal && !showVideo && hasAudio && (
        <audio 
          ref={audioRef} 
          autoPlay 
          playsInline
          style={{ display: 'none' }}
        />
      )}

      {/* Индикатор уровня звука */}
      {!participant.isMuted && isSpeaking && (
        <div className="absolute bottom-0 left-0 h-1 bg-green-400" style={{ width: `${Math.min(100, audioLevel * 160)}%` }} />
      )}

      {/* Информация о пользователе */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            {participant.name}{isLocal ? ' (Вы)' : ''}
            {playError && (
              <span className="text-red-400" title={playError}>⚠️</span>
            )}
          </span>
          <div className="flex gap-1">
            {participant.isMuted && <MdMicOff className="text-red-400" size={14} />}
            {isSpeaking && !participant.isMuted && <MdVolumeUp className="text-green-300" size={14} />}
            {isVideoCall && !participant.isVideoEnabled && <span className="text-xs text-white/50">📹 off</span>}
          </div>
        </div>
      </div>
      
      {/* Отладочная информация */}
      {/* <div className="absolute top-0 left-0 bg-black/50 text-[8px] text-white p-1">
        {hasAudio ? '🔊' : '🔇'} {hasVideo ? '📹' : '📷'} {audioLevel.toFixed(2)}
      </div> */}
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
}: Props): JSX.Element | null => {
  if (!isOpen) return null;

  const localParticipant = participants.find((p) => p.userId === localParticipantId);
  const remoteParticipants = participants.filter((p) => p.userId !== localParticipantId);

  console.log('🎧 CallOverlay participants:', participants);
  console.log('🎧 Local stream:', localStream?.active ? 'active' : 'inactive');
  console.log('🎧 Remote streams:', remoteStreams.size);

  return (
    <div className="h-full w-full">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
        <h3 className="text-sm">{callType === 'video' ? '📹 Видеозвонок' : '🎧 Аудиозвонок'}</h3>
        <div className="flex gap-1">
          {onToggleExpand && (
            <button onClick={onToggleExpand} className="rounded-full p-1 hover:bg-white/10" type="button">
              {isExpanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
            </button>
          )}
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10" type="button"><MdClose size={18} /></button>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {/* Локальный участник (маленький в углу) */}
        <div className="relative">
          <ParticipantTile 
            participant={localParticipant!} 
            isLocal 
            stream={localStream ?? undefined} 
            isVideoCall={callType === 'video'} 
          />
        </div>
        
        {/* Удаленные участники */}
        <div className="grid gap-2 md:grid-cols-2">
          {remoteParticipants.map((p) => (
            <ParticipantTile 
              key={p.userId} 
              participant={p} 
              isLocal={false} 
              stream={remoteStreams.get(p.userId)} 
              isVideoCall={callType === 'video'} 
            />
          ))}
        </div>

        {/* Элементы управления */}
        <div className="mt-2 flex items-center justify-center gap-3 border-t border-white/10 pt-2">
          <button 
            onClick={onToggleMute} 
            className={`rounded-full p-2 transition-all ${localParticipant?.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'}`} 
            type="button"
            title={localParticipant?.isMuted ? 'Включить микрофон' : 'Отключить микрофон'}
          >
            {localParticipant?.isMuted ? <MdMicOff size={18} /> : <MdMic size={18} />}
          </button>
          
          {callType === 'video' && (
            <button 
              onClick={onToggleVideo} 
              className={`rounded-full p-2 transition-all ${!localParticipant?.isVideoEnabled ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'}`} 
              type="button"
              title={localParticipant?.isVideoEnabled ? 'Отключить камеру' : 'Включить камеру'}
            >
              {localParticipant?.isVideoEnabled ? <MdVideocam size={18} /> : <MdVideocamOff size={18} />}
            </button>
          )}
          // Добавьте где-нибудь в интерфейсе
          <button 
            onClick={() => {
              remoteStreams.forEach((stream) => {
                const audio = new Audio();
                audio.srcObject = stream;
                audio.play().catch(e => console.log('Manual play error:', e)); 
              });
            }}
            className="text-xs bg-blue-500 px-2 py-1 rounded"
          >
            🔈 Force play
          </button>
          <button 
            onClick={onEndCall} 
            className="rounded-full bg-red-500 p-2 text-white transition-all hover:bg-red-600 hover:scale-110" 
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
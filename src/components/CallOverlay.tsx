import React from 'react';
import { CallParticipant, CallType } from '../types';
import { Avatar } from './Avatar';
import { MdCall, MdCallEnd, MdDesktopMac, MdExpandLess, MdExpandMore, MdMic, MdMicOff, MdStop, MdVideocam, MdVideocamOff } from 'react-icons/md';

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
  isConnected?: boolean;
  isJoinOnly?: boolean;
  onJoinCall?: () => void;
};

type TileKind = 'person' | 'screen';

type TileProps = {
  participant: CallParticipant;
  isLocal: boolean;
  stream?: MediaStream;
  kind?: TileKind;
  trackIndex?: number;
  isSpeaking?: boolean;
  placeholderText?: string;
};

const makeTileStream = (stream: MediaStream | undefined, kind: TileKind, trackIndex = 0): MediaStream | undefined => {
  if (!stream) return undefined;
  const next = new MediaStream();
  if (kind === 'person') stream.getAudioTracks().forEach((track) => next.addTrack(track));
  const video = stream.getVideoTracks().filter((track) => track.readyState === 'live')[trackIndex];
  if (video) next.addTrack(video);
  return next.getTracks().length ? next : undefined;
};

const ParticipantTile = ({ participant, isLocal, stream, kind = 'person', trackIndex = 0, isSpeaking = false, placeholderText }: TileProps): JSX.Element => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [hasVideo, setHasVideo] = React.useState(false);
  const [audioLevel, setAudioLevel] = React.useState(0);
  const tileStream = React.useMemo(() => makeTileStream(stream, kind, trackIndex), [stream, kind, trackIndex]);

  React.useEffect(() => {
    const videos = tileStream?.getVideoTracks() ?? [];
    setHasVideo(videos.length > 0 && videos.some((track) => track.enabled && track.readyState === 'live'));

    if (videoRef.current && videos.length > 0) {
      videoRef.current.srcObject = tileStream ?? null;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.play().catch(() => null);
    }

    if (!isLocal && kind === 'person' && tileStream && tileStream.getAudioTracks().length > 0) {
      const audio = audioRef.current ?? new Audio();
      audio.autoplay = true;
      audio.muted = false;
      audio.srcObject = tileStream;
      audio.play().catch(() => {
        const resume = () => {
          audio.play().catch(() => null);
          document.removeEventListener('click', resume);
          document.removeEventListener('touchstart', resume);
        };
        document.addEventListener('click', resume);
        document.addEventListener('touchstart', resume);
      });
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) audioRef.current.srcObject = null;
    };
  }, [tileStream, isLocal, kind]);

  React.useEffect(() => {
    if (!tileStream || participant.isMuted || kind !== 'person') {
      setAudioLevel(0);
      return;
    }

    let raf = 0;
    let audioContext: AudioContext | null = null;
    try {
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(tileStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(data);
        setAudioLevel(data.reduce((acc, v) => acc + v, 0) / data.length / 255);
        raf = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setAudioLevel(0);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (audioContext) void audioContext.close();
    };
  }, [tileStream, participant.isMuted, kind]);

  const speakingNow = kind === 'person' && !participant.isMuted && (isSpeaking || audioLevel > 0.06);
  const label = kind === 'screen' ? `${participant.name}: демонстрация` : `${participant.name}${isLocal ? ' (вы)' : ''}`;
  const fallback = placeholderText ?? (kind === 'screen' ? 'Демонстрация пока недоступна' : 'Камера выключена');

  return (
    <div className={`relative aspect-video overflow-hidden rounded-[28px] border-2 bg-slate-950/70 shadow-2xl transition-all duration-300 ${speakingNow ? 'border-green-400 shadow-green-400/25' : 'border-white/10'} ${participant.isRinging ? 'animate-pulse opacity-70' : ''}`}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${isLocal && kind === 'person' ? 'scale-x-[-1]' : ''}`} />
      ) : (
        <div className={`grid h-full w-full place-items-center ${kind === 'screen' ? 'bg-gradient-to-br from-cyan-950/80 to-slate-950' : 'bg-gradient-to-br from-indigo-950/80 to-cyan-950/60'}`}>
          <div className="flex flex-col items-center gap-3 text-center text-white/70">
            {kind === 'screen' ? <MdDesktopMac size={58} className="text-cyan-300" /> : <Avatar name={participant.name} imageUrl={participant.avatarUrl} size={76} />}
            <span className="text-sm">{participant.isRinging ? 'Вызывается...' : fallback}</span>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
        <div className="flex items-center justify-between gap-2 text-sm text-white">
          <span className="flex min-w-0 items-center gap-2 truncate">
            {kind === 'screen' && <MdDesktopMac className="text-cyan-300" size={18} />}
            {label}
          </span>
          <span className="flex items-center gap-2 text-white/70">
            {participant.isMuted && kind === 'person' && <MdMicOff className="text-red-400" size={18} />}
            {participant.isRinging && <span className="text-xs text-cyan-200">вызов</span>}
          </span>
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
  onToggleMute,
  onToggleVideo,
  onEndCall,
  isExpanded = true,
  onToggleExpand,
  localStream,
  remoteStreams = new Map(),
  onToggleScreenShare,
  isScreenSharing = false,
  isConnected = false,
  isJoinOnly = false,
  onJoinCall,
}: Props): JSX.Element | null => {
  const [localAudioLevel, setLocalAudioLevel] = React.useState(0);
  const localParticipant = participants.find((p) => p.userId === localParticipantId);
  const remoteParticipants = participants.filter((p) => p.userId !== localParticipantId);

  React.useEffect(() => {
    if (!localStream) return;
    let raf = 0;
    let audioContext: AudioContext | null = null;
    try {
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(localStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(data);
        setLocalAudioLevel(data.reduce((acc, v) => acc + v, 0) / data.length / 255);
        raf = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setLocalAudioLevel(0);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (audioContext) void audioContext.close();
    };
  }, [localStream]);

  if (!isOpen) return null;

  const isLocalSpeaking = localAudioLevel > 0.06 && !localParticipant?.isMuted;
  const tilesCount = (localParticipant ? 1 : 0)
    + (isScreenSharing && localParticipant ? 1 : 0)
    + remoteParticipants.reduce((count, participant) => count + 1 + (participant.isScreenSharing ? 1 : 0), 0);
  const gridCols = tilesCount > 2 ? 'grid-cols-1 md:grid-cols-2' : tilesCount === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden">
      <div className="flex h-full flex-col bg-slate-950/80">
        <div className="m-3 flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white backdrop-blur">
          <span className="flex items-center gap-2 text-sm">
            {isScreenSharing ? <MdDesktopMac className="text-cyan-300" size={18} /> : callType === 'video' ? <MdVideocam size={18} /> : <MdCall size={18} />}
            Звонок {isConnected ? '• подключен' : '• ожидание'}
          </span>
          {onToggleExpand && (
            <button onClick={onToggleExpand} className="rounded-full p-1.5 transition hover:bg-white/10" type="button">
              {isExpanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className={`mx-auto grid w-full max-w-6xl ${gridCols} gap-4`}>
            {localParticipant && (
              <ParticipantTile
                participant={{ ...localParticipant, isSpeaking: isLocalSpeaking }}
                isLocal
                stream={localStream ?? undefined}
                trackIndex={localParticipant.isVideoEnabled ? 0 : 99}
                isSpeaking={isLocalSpeaking}
                placeholderText="Вы в звонке"
              />
            )}
            {isScreenSharing && localParticipant && (
              <ParticipantTile
                participant={{ ...localParticipant, isMuted: true }}
                isLocal
                stream={localStream ?? undefined}
                kind="screen"
                trackIndex={localParticipant.isVideoEnabled ? 1 : 0}
              />
            )}
            {remoteParticipants.map((participant) => {
              const remoteStream = remoteStreams.get(participant.userId);
              return (
                <React.Fragment key={participant.userId}>
                  <ParticipantTile
                    participant={participant}
                    isLocal={false}
                    stream={remoteStream}
                    trackIndex={participant.isVideoEnabled ? 0 : 99}
                    isSpeaking={participant.isSpeaking}
                    placeholderText={isJoinOnly ? 'Камера появится после подключения' : 'Камера выключена'}
                  />
                  {participant.isScreenSharing && (
                    <ParticipantTile
                      participant={{ ...participant, isMuted: true }}
                      isLocal={false}
                      stream={remoteStream}
                      kind="screen"
                      trackIndex={participant.isVideoEnabled ? 1 : 0}
                      placeholderText={isJoinOnly ? 'Демонстрация появится после подключения' : 'Демонстрация без видео'}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="m-3 flex items-center justify-center gap-3 rounded-full border border-white/15 bg-black/30 p-3 backdrop-blur">
          {isJoinOnly ? (
            <button onClick={onJoinCall} className="flex items-center gap-2 rounded-full bg-green-500 px-8 py-3 font-semibold text-white transition hover:bg-green-600 hover:scale-105" type="button">
              <MdCall size={22} /> Подключиться к звонку
            </button>
          ) : (
            <>
              <button onClick={onToggleMute} className={`rounded-full p-3 transition hover:scale-110 ${localParticipant?.isMuted ? 'bg-red-500/25 text-red-300' : 'bg-white/10 text-white hover:bg-white/20'}`} type="button" title={localParticipant?.isMuted ? 'Включить микрофон' : 'Отключить микрофон'}>
                {localParticipant?.isMuted ? <MdMicOff size={22} /> : <MdMic size={22} />}
              </button>
              <button onClick={onToggleVideo} className={`rounded-full p-3 transition hover:scale-110 ${localParticipant?.isVideoEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/25 text-red-300'}`} type="button" title={localParticipant?.isVideoEnabled ? 'Отключить камеру' : 'Включить камеру'}>
                {localParticipant?.isVideoEnabled ? <MdVideocam size={22} /> : <MdVideocamOff size={22} />}
              </button>
              {onToggleScreenShare && (
                <button onClick={onToggleScreenShare} className={`rounded-full p-3 transition hover:scale-110 ${isScreenSharing ? 'bg-cyan-500/25 text-cyan-200' : 'bg-white/10 text-white hover:bg-white/20'}`} type="button" title={isScreenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана'}>
                  {isScreenSharing ? <MdStop size={22} /> : <MdDesktopMac size={22} />}
                </button>
              )}
              <button onClick={onEndCall} className="rounded-full bg-red-500 p-3 text-white transition hover:bg-red-600 hover:scale-110" type="button" title="Покинуть звонок">
                <MdCallEnd size={22} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

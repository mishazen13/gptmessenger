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
  const [audioLevel, setAudioLevel] = React.useState(0);

  React.useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  React.useEffect(() => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

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
  }, [stream]);

  const hasVideo = isVideoCall && participant.isVideoEnabled && stream?.getVideoTracks().length;

  return (
    <div className={`relative aspect-video overflow-hidden rounded-xl border-2 ${audioLevel > 0.06 ? 'border-green-400' : 'border-transparent'} bg-slate-900/50`}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center bg-gradient-to-br from-indigo-900/60 to-cyan-900/60">
          <Avatar name={participant.name} imageUrl={participant.avatarUrl} size={64} />
        </div>
      )}

      {!participant.isMuted && audioLevel > 0.06 && (
        <div className="absolute bottom-0 left-0 h-1 bg-green-400" style={{ width: `${Math.min(100, audioLevel * 160)}%` }} />
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-between text-xs">
          <span>{participant.name}{isLocal ? ' (Вы)' : ''}</span>
          {!participant.isMuted && audioLevel > 0.06 && <MdVolumeUp className="text-green-300" />}
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
}: Props): JSX.Element | null => {
  if (!isOpen) return null;

  const localParticipant = participants.find((p) => p.userId === localParticipantId);
  const remoteParticipants = participants.filter((p) => p.userId !== localParticipantId);

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
        <ParticipantTile participant={localParticipant!} isLocal stream={localStream ?? undefined} isVideoCall={callType === 'video'} />
        <div className="grid gap-2 md:grid-cols-2">
          {remoteParticipants.map((p) => (
            <ParticipantTile key={p.userId} participant={p} isLocal={false} stream={remoteStreams.get(p.userId)} isVideoCall={callType === 'video'} />
          ))}
        </div>

        <div className="mt-2 flex items-center justify-center gap-3 border-t border-white/10 pt-2">
          <button onClick={onToggleMute} className={`rounded-full p-2 ${localParticipant?.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10'}`} type="button">
            {localParticipant?.isMuted ? <MdMicOff size={18} /> : <MdMic size={18} />}
          </button>
          {callType === 'video' && (
            <button onClick={onToggleVideo} className={`rounded-full p-2 ${localParticipant?.isVideoEnabled ? 'bg-white/10' : 'bg-red-500/20 text-red-400'}`} type="button">
              {localParticipant?.isVideoEnabled ? <MdVideocam size={18} /> : <MdVideocamOff size={18} />}
            </button>
          )}
          <button onClick={onEndCall} className="rounded-full bg-red-500 p-2 text-white" type="button"><MdCallEnd size={18} /></button>
        </div>
      </div>
    </div>
  );
};

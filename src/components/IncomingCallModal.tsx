import { MdCall, MdCallEnd } from 'react-icons/md';
import { Avatar } from './Avatar';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="w-80 rounded-2xl border border-white/20 bg-slate-900/95 p-6 shadow-2xl animate-slideDown">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <Avatar name={callerName} imageUrl={callerAvatar} size={80} />
              <div className="absolute -bottom-1 -right-1 h-4 w-4 animate-pulse rounded-full bg-green-400" />
            </div>
          </div>

          <h3 className="mb-1 text-lg font-semibold">{callerName}</h3>
          <p className="mb-6 text-sm text-white/60">{callType === 'video' ? '📹 Видеозвонок' : '🎧 Аудиозвонок'}</p>

          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="flex-1 rounded-xl bg-green-500 py-3 text-white transition hover:bg-green-600 flex items-center justify-center gap-2"
              type="button"
            >
              <MdCall size={20} />
              Принять
            </button>
            <button
              onClick={onReject}
              className="flex-1 rounded-xl bg-red-500 py-3 text-white transition hover:bg-red-600 flex items-center justify-center gap-2"
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

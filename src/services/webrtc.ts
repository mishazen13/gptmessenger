// services/webrtc.ts
import Peer from 'simple-peer';

class WebRTCService {
  private peers: Map<string, Peer.Instance> = new Map();
  private localStream: MediaStream | null = null;
  private cameraStream: MediaStream | null = null;
  private onRemoteStreamCallbacks: ((userId: string, stream: MediaStream) => void)[] = [];
  private onCallEndCallbacks: (() => void)[] = [];
  private pendingOffers: Map<string, any> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private isScreenSharing: boolean = false;

  async initLocalStream(videoEnabled: boolean = false): Promise<MediaStream> {
    if (this.localStream && this.localStream.active && !this.isScreenSharing) {
      console.log('📹 Reusing existing local stream');
      return this.localStream;
    }

    try {
      console.log('📹 Requesting media with constraints:', { audio: true, video: videoEnabled });
      
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: videoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Сохраняем копию потока с камеры
      if (!this.cameraStream && videoEnabled) {
        this.cameraStream = this.localStream.clone();
      }
      
      // Убеждаемся, что звук включен
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
        console.log('🔊 Audio track enabled:', track.label);
      });
      
      console.log('📹 Media stream obtained, tracks:', this.localStream.getTracks().length);
      return this.localStream;
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      throw error;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`🔊 Audio ${enabled ? 'enabled' : 'disabled'}`);
      });
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream && !this.isScreenSharing) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`📹 Video ${enabled ? 'enabled' : 'disabled'}`);
      });
    }
  }

  // Демонстрация экрана
  async startScreenShare(): Promise<MediaStream | null> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: true
      });
      
      // Добавляем аудио дорожку из микрофона
      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          screenStream.addTrack(audioTrack);
        }
      }
      
      console.log('🖥️ Screen share started');
      return screenStream;
    } catch (error) {
      console.error('❌ Failed to start screen share:', error);
      return null;
    }
  }

  async replaceLocalStream(newStream: MediaStream, isSharing: boolean): Promise<void> {
    // Сохраняем старый поток если нужно вернуться
    if (!this.isScreenSharing && isSharing && this.cameraStream) {
      // Уже есть сохраненный поток
    } else if (isSharing && this.localStream && !this.cameraStream) {
      this.cameraStream = this.localStream.clone();
    }
    
    // Обновляем локальный поток
    this.localStream = newStream;
    this.isScreenSharing = isSharing;
    console.log(`🖥️ Local stream replaced, screen sharing: ${isSharing}`);
    
    // Обновляем все пиры с новым потоком
    for (const [userId, peer] of this.peers) {
      this.updatePeerStream(peer, newStream);
    }
  }

  async stopScreenShare(): Promise<void> {
    if (this.cameraStream && this.isScreenSharing) {
      // Останавливаем экранный поток
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
      }
      
      // Возвращаемся к камере
      this.localStream = this.cameraStream;
      this.isScreenSharing = false;
      
      // Обновляем все пиры обратно на камеру
      for (const [userId, peer] of this.peers) {
        this.updatePeerStream(peer, this.cameraStream);
      }
      
      console.log('🖥️ Screen share stopped, returned to camera');
    }
  }

  private updatePeerStream(peer: Peer.Instance, stream: MediaStream): void {
    try {
      // Получаем видео трек
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) return;
      
      // Находим sender для видео
      if (peer._pc) {
        const senders = peer._pc.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender && videoTrack) {
          videoSender.replaceTrack(videoTrack)
            .then(() => {
              console.log('✅ Video track replaced');
            })
            .catch(err => {
              console.error('❌ Failed to replace track:', err);
              // Если replaceTrack не работает, пересоздаем peer
              this.recreatePeer(peer, stream);
            });
        } else if (videoTrack) {
          peer.addStream(stream);
        }
      }
    } catch (error) {
      console.error('❌ Error updating peer stream:', error);
    }
  }

  private recreatePeer(peer: Peer.Instance, stream: MediaStream): void {
    // Находим userId для этого peer
    let userId: string | null = null;
    for (const [id, p] of this.peers) {
      if (p === peer) {
        userId = id;
        break;
      }
    }
    
    if (userId) {
      console.log('🔄 Recreating peer for', userId);
      const oldOnSignal = peer._events?.signal;
      peer.destroy();
      this.peers.delete(userId);
      
      // Создаем новый peer с новым потоком
      const newPeer = new Peer({
        initiator: false, // будет инициирован удаленной стороной
        stream,
        trickle: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
          ]
        }
      });
      
      newPeer.on('signal', (signal) => {
        if (oldOnSignal) {
          oldOnSignal(signal);
        }
      });
      
      this.peers.set(userId, newPeer);
    }
  }

  isSharingScreen(): boolean {
    return this.isScreenSharing;
  }

  getCameraStream(): MediaStream | null {
    return this.cameraStream;
  }

  private playRemoteAudio(userId: string, stream: MediaStream): void {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log(`🔇 No audio tracks for user ${userId}`);
      return;
    }
    
    audioTracks.forEach(track => {
      track.enabled = true;
    });
    
    let audioElement = this.audioElements.get(userId);
    if (!audioElement) {
      audioElement = new Audio();
      audioElement.autoplay = true;
      audioElement.muted = false;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
      this.audioElements.set(userId, audioElement);
    }
    
    audioElement.srcObject = stream;
    
    const playAudio = () => {
      if (audioElement && audioElement.paused) {
        audioElement.play()
          .then(() => {
            console.log(`✅ Audio playing for user ${userId}`);
          })
          .catch(err => {
            console.log(`❌ Audio play failed for user ${userId}:`, err.message);
            const resumeAudio = () => {
              audioElement?.play().catch(console.log);
              document.removeEventListener('click', resumeAudio);
              document.removeEventListener('touchstart', resumeAudio);
            };
            document.addEventListener('click', resumeAudio);
            document.addEventListener('touchstart', resumeAudio);
          });
      }
    };
    
    playAudio();
  }

  createPeer(
    userId: string,
    initiator: boolean,
    stream: MediaStream,
    onSignal: (signal: any) => void
  ): Peer.Instance {
    console.log(`🔄 Creating peer for ${userId}, initiator: ${initiator}`);
    
    if (!stream || !stream.active) {
      console.error('❌ Stream is not active');
      throw new Error('Stream is not active');
    }

    if (this.peers.has(userId)) {
      console.log(`⚠️ Removing existing peer for ${userId}`);
      this.removePeer(userId);
    }

    stream.getTracks().forEach(track => {
      track.enabled = true;
    });

    const peer = new Peer({
      initiator,
      stream,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stun.stunprotocol.org:3478' },
        ],
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 5
      },
      sdpTransform: (sdp) => {
        if (sdp.includes('m=audio')) {
          sdp = sdp.replace(/b=AS:\d+/g, 'b=AS:128');
          sdp = sdp.replace(/a=rtpmap:(\d+) opus/g, 'a=rtpmap:$1 opus');
        }
        return sdp;
      }
    });

    peer.on('signal', (data) => {
      console.log('📡 Peer signal generated:', data.type, 'for', userId);
      onSignal(data);
    });

    peer.on('stream', (remoteStream) => {
      console.log('🎥 Remote stream received from:', userId);
      console.log('🎥 Stream tracks:', remoteStream.getTracks().map(t => t.kind));
      
      remoteStream.getTracks().forEach(track => {
        track.enabled = true;
      });
      
      this.playRemoteAudio(userId, remoteStream);
      this.onRemoteStreamCallbacks.forEach(cb => cb(userId, remoteStream));
    });

    peer.on('connect', () => {
      console.log('✅ Peer connection established with:', userId);
      this.pendingOffers.delete(userId);
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error with', userId, ':', err);
    });

    peer.on('close', () => {
      console.log('🔌 Peer connection closed with:', userId);
      this.removePeer(userId);
    });

    this.peers.set(userId, peer);
    return peer;
  }

  signalPeer(userId: string, signal: any): boolean {
    const peer = this.peers.get(userId);
    if (peer) {
      try {
        console.log('🔄 Signaling peer', userId, 'with signal type:', signal.type);
        
        if (signal.type === 'offer' && this.pendingOffers.has(userId)) {
          console.log('⚠️ Ignoring duplicate offer from', userId);
          return true;
        }
        
        if (signal.type === 'offer') {
          this.pendingOffers.set(userId, signal);
        }
        
        peer.signal(signal);
        return true;
      } catch (error) {
        console.error('❌ Error signaling peer:', error);
        return false;
      }
    } else {
      console.warn('⚠️ No peer found for', userId);
      return false;
    }
  }

  removePeer(userId: string): void {
    const audioElement = this.audioElements.get(userId);
    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
      document.body.removeChild(audioElement);
      this.audioElements.delete(userId);
    }
    
    const peer = this.peers.get(userId);
    if (peer) {
      peer.destroy();
      this.peers.delete(userId);
      console.log('🔌 Removed peer for', userId);
    }
    this.pendingOffers.delete(userId);
  }

  endAllCalls(): void {
    console.log('🔚 Ending all calls');
    
    this.audioElements.forEach((audio, userId) => {
      audio.pause();
      audio.srcObject = null;
      document.body.removeChild(audio);
    });
    this.audioElements.clear();
    
    this.peers.forEach((peer, userId) => {
      peer.destroy();
    });
    this.peers.clear();
    this.pendingOffers.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
    
    if (this.cameraStream) {
      this.cameraStream = null;
    }
    
    this.isScreenSharing = false;
    this.onCallEndCallbacks.forEach(cb => cb());
  }

  onRemoteStream(callback: (userId: string, stream: MediaStream) => void): void {
    this.onRemoteStreamCallbacks.push(callback);
  }

  onCallEnd(callback: () => void): void {
    this.onCallEndCallbacks.push(callback);
  }

  removeListeners(): void {
    this.onRemoteStreamCallbacks = [];
    this.onCallEndCallbacks = [];
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;
// services/webrtc.ts
import Peer from 'simple-peer';

type LegacyNavigator = Navigator & {
  getUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: Error) => void
  ) => void;
  webkitGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: Error) => void
  ) => void;
  mozGetUserMedia?: (
    constraints: MediaStreamConstraints,
    successCallback: (stream: MediaStream) => void,
    errorCallback: (error: Error) => void
  ) => void;
};

class WebRTCService {
  private peers: Map<string, Peer.Instance> = new Map();
  private localStream: MediaStream | null = null;
  private cameraStream: MediaStream | null = null;
  private onRemoteStreamCallbacks: ((userId: string, stream: MediaStream) => void)[] = [];
  private onCallEndCallbacks: (() => void)[] = [];
  private pendingOffers: Map<string, any> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private isScreenSharing: boolean = false;
  private screenStream: MediaStream | null = null;
  private cameraTrackId: string | null = null;
  private screenTrackId: string | null = null;

  private getMediaErrorMessage(): string {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return 'Медиаустройства доступны только в браузере.';
    }

    const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    if (window.location.protocol !== 'https:' && !isLocalhost) {
      return 'Доступ к медиаустройствам требует HTTPS или localhost. Откройте приложение по HTTPS, иначе браузер скрывает getUserMedia.';
    }

    return 'Браузер не поддерживает доступ к микрофону и камере через getUserMedia.';
  }

  private async requestUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    if (typeof navigator === 'undefined') {
      throw new Error(this.getMediaErrorMessage());
    }

    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }

    const legacyNavigator = navigator as LegacyNavigator;
    const legacyGetUserMedia = legacyNavigator.getUserMedia
      ?? legacyNavigator.webkitGetUserMedia
      ?? legacyNavigator.mozGetUserMedia;

    if (legacyGetUserMedia) {
      return new Promise((resolve, reject) => {
        legacyGetUserMedia.call(legacyNavigator, constraints, resolve, reject);
      });
    }

    throw new Error(this.getMediaErrorMessage());
  }

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
      
      this.localStream = await this.requestUserMedia(constraints);
      
      // Сохраняем копию потока с камеры
      if (!this.cameraStream && videoEnabled) {
        this.cameraStream = this.localStream.clone();
      }
      this.cameraTrackId = this.localStream.getVideoTracks()[0]?.id ?? this.cameraTrackId;
      
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

  async setCameraEnabled(enabled: boolean): Promise<MediaStream | null> {
    if (!this.localStream) {
      this.localStream = await this.requestUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      });
    }

    const currentCameraTrack = this.localStream.getVideoTracks().find(track => track.id === this.cameraTrackId) ?? null;
    if (enabled && !currentCameraTrack) {
      const cameraOnlyStream = await this.requestUserMedia({
        audio: false,
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      const cameraTrack = cameraOnlyStream.getVideoTracks()[0];
      if (cameraTrack) {
        this.cameraTrackId = cameraTrack.id;
        this.localStream.addTrack(cameraTrack);
      }
    } else if (currentCameraTrack) {
      currentCameraTrack.enabled = enabled;
    }

    for (const [, peer] of this.peers) this.updatePeerStream(peer, this.localStream);
    return this.localStream;
  }

  toggleVideo(enabled: boolean): void {
    void this.setCameraEnabled(enabled);
  }

  // Демонстрация экрана
  async startScreenShare(): Promise<MediaStream | null> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
        throw new Error(this.getMediaErrorMessage());
      }
      if (!this.localStream) await this.initLocalStream(false);
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (screenTrack && this.localStream) {
        this.screenTrackId = screenTrack.id;
        this.localStream.addTrack(screenTrack);
        screenTrack.onended = () => { void this.stopScreenShare(); };
      }
      this.isScreenSharing = true;
      for (const [, peer] of this.peers) if (this.localStream) this.updatePeerStream(peer, this.localStream);
      console.log('🖥️ Screen share started');
      return this.localStream;
    } catch (error) {
      console.error('❌ Failed to start screen share:', error);
      return null;
    }
  }

  async replaceLocalStream(newStream: MediaStream, isSharing: boolean): Promise<void> {
    this.localStream = newStream;
    this.isScreenSharing = isSharing;
    for (const [, peer] of this.peers) this.updatePeerStream(peer, newStream);
  }

  async stopScreenShare(): Promise<void> {
    if (!this.localStream || !this.isScreenSharing) return;
    const screenTracks = this.screenStream?.getVideoTracks() ?? [];
    screenTracks.forEach(track => {
      this.localStream?.removeTrack(track);
      if (track.readyState === 'live') track.stop();
    });
    this.screenStream = null;
    this.screenTrackId = null;
    this.isScreenSharing = false;
    for (const [, peer] of this.peers) this.updatePeerStream(peer, this.localStream);
    console.log('🖥️ Screen share stopped');
  }

  private updatePeerStream(peer: Peer.Instance, stream: MediaStream): void {
    try {
      const rtcpPeer = (peer as Peer.Instance & { _pc?: RTCPeerConnection })._pc;
      if (!rtcpPeer) return;
      const senders = rtcpPeer.getSenders();
      stream.getTracks().forEach(track => {
        const sameSender = senders.find(sender => sender.track?.id === track.id);
        if (sameSender) return;
        const kindSender = senders.find(sender => sender.track?.kind === track.kind && sender.track.readyState !== 'live');
        if (kindSender) {
          kindSender.replaceTrack(track).catch(err => console.error('❌ Failed to replace track:', err));
          return;
        }
        try {
          peer.addTrack(track, stream);
        } catch (error) {
          console.warn('⚠️ Track already exists or cannot be added:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error updating peer stream:', error);
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
    
    this.audioElements.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      document.body.removeChild(audio);
    });
    this.audioElements.clear();
    
    this.peers.forEach((peer) => {
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

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    this.screenTrackId = null;
    this.cameraTrackId = null;
    
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

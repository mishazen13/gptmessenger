// services/webrtc.ts
import Peer from 'simple-peer';

class WebRTCService {
  private peers: Map<string, Peer.Instance> = new Map();
  private localStream: MediaStream | null = null;
  private onRemoteStreamCallbacks: ((userId: string, stream: MediaStream) => void)[] = [];
  private onCallEndCallbacks: (() => void)[] = [];

  async initLocalStream(videoEnabled: boolean = false): Promise<MediaStream> {
    if (this.localStream && this.localStream.active) {
      console.log('📹 Reusing existing local stream');
      return this.localStream;
    }

    try {
      console.log('📹 Requesting media with constraints:', { audio: true, video: videoEnabled });
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoEnabled
      });
      
      console.log('📹 Media stream obtained successfully, tracks:', this.localStream.getTracks().length);
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
        console.log(`🔊 Audio track ${enabled ? 'enabled' : 'disabled'}`);
      });
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`📹 Video track ${enabled ? 'enabled' : 'disabled'}`);
      });
    }
  }

  createPeer(
    userId: string,
    initiator: boolean,
    stream: MediaStream,
    onSignal: (signal: any) => void
  ): Peer.Instance {
    console.log(`🔄 Creating peer for ${userId}, initiator: ${initiator}`);
    
    if (!stream.active) {
      console.error('❌ Stream is not active');
      throw new Error('Stream is not active');
    }

    const peer = new Peer({
      initiator,
      stream,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
        ]
      }
    });

    peer.on('signal', (data) => {
      console.log('📡 Peer signal generated:', data.type);
      onSignal(data);
    });

    peer.on('stream', (remoteStream) => {
      console.log('🎥 Remote stream received from:', userId);
      this.onRemoteStreamCallbacks.forEach(cb => cb(userId, remoteStream));
    });

    peer.on('connect', () => {
      console.log('✅ Peer connection established with:', userId);
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
      console.log('🔄 Signaling peer', userId, 'with signal type:', signal.type);
      try {
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
    const peer = this.peers.get(userId);
    if (peer) {
      peer.destroy();
      this.peers.delete(userId);
    }
  }

  endAllCalls(): void {
    console.log('🔚 Ending all calls');
    this.peers.forEach((peer, userId) => {
      peer.destroy();
    });
    this.peers.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track stopped:', track.kind);
      });
      this.localStream = null;
    }
    
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
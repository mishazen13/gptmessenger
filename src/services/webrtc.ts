// services/webrtc.ts
import Peer from 'simple-peer';

export interface PeerConnection {
  peerId: string;
  peer: Peer.Instance;
  stream?: MediaStream;
}

class WebRTCService {
  private peers: Map<string, Peer.Instance> = new Map();
  private localStream: MediaStream | null = null;
  private onRemoteStreamCallbacks: ((userId: string, stream: MediaStream) => void)[] = [];
  private onCallEndCallbacks: (() => void)[] = [];

  async initLocalStream(videoEnabled: boolean = false): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoEnabled
      });
      return this.localStream;
    } catch (error) {
      console.error('Failed to get user media:', error);
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
      });
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  createPeer(
    userId: string,
    initiator: boolean,
    stream: MediaStream,
    onSignal: (signal: any) => void
  ): Peer.Instance {
    const peer = new Peer({
      initiator,
      stream,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    });

    peer.on('signal', (data) => {
      onSignal(data);
    });

    peer.on('stream', (remoteStream) => {
      this.onRemoteStreamCallbacks.forEach(cb => cb(userId, remoteStream));
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    peer.on('close', () => {
      this.removePeer(userId);
    });

    this.peers.set(userId, peer);
    return peer;
  }

  signalPeer(userId: string, signal: any): void {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.signal(signal);
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
    this.peers.forEach((peer) => {
      peer.destroy();
    });
    this.peers.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
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
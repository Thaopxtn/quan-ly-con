import { serverApiClient } from './serverApiClient';

export type WebRTCSignalType = 'offer' | 'answer' | 'candidate' | 'end';

export interface WebRTCSignal {
  type: WebRTCSignalType;
  toId: string;
  fromId: string;
  payload: any;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  public onRemoteStream?: (stream: MediaStream) => void;
  public onConnectionStateChange?: (state: string) => void;
  public onError?: (err: Error) => void;

  private myId: string;
  private targetId: string;
  private signalListener: ((signal: WebRTCSignal) => void) | null = null;

  private isCaller: boolean = false;

  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(myId: string, targetId: string) {
    this.myId = myId;
    this.targetId = targetId;

    this.signalListener = (data: any) => {
      const signal = data as WebRTCSignal;
      if (signal.toId === this.myId && signal.fromId === this.targetId) {
        this.handleSignal(signal);
      }
    };
    serverApiClient.on('webrtc_signal', this.signalListener);
  }

  public async startCall(video: boolean = true, audio: boolean = true) {
    this.isCaller = true;
    await this.initPeerConnection();
    await this.setupLocalStream(video, audio);
    
    if (!this.peerConnection) return;
    
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSignal({
        type: 'offer',
        toId: this.targetId,
        fromId: this.myId,
        payload: offer
      });
    } catch (e: any) {
      this.onError?.(e);
    }
  }

  public async setupLocalStream(video: boolean = true, audio: boolean = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video, audio });
      if (this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }
    } catch (e: any) {
      console.warn("Failed to get local stream", e);
      // In KidApp, it might not have screen/video permission yet. We shouldn't fail totally.
    }
  }

  private async initPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'candidate',
          toId: this.targetId,
          fromId: this.myId,
          payload: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream?.(this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(this.peerConnection?.connectionState || 'closed');
    };
  }

  private async handleSignal(signal: WebRTCSignal) {
    try {
      if (!this.peerConnection) {
        await this.initPeerConnection();
      }
      const pc = this.peerConnection!;

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        // Setup local stream if not caller before creating answer (e.g., kid device returning video)
        if (!this.isCaller && !this.localStream) {
            await this.setupLocalStream(true, true);
        }
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        this.sendSignal({
          type: 'answer',
          toId: this.targetId,
          fromId: this.myId,
          payload: answer
        });

        // Add pending candidates
        while (this.pendingCandidates.length > 0) {
          const cand = this.pendingCandidates.shift();
          if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
        }

      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      } else if (signal.type === 'candidate') {
        const candidate = new RTCIceCandidate(signal.payload);
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
        } else {
          this.pendingCandidates.push(candidate);
        }
      } else if (signal.type === 'end') {
        this.close();
      }
    } catch (e: any) {
      console.error("Handle WebRTC signal error", e);
      this.onError?.(e);
    }
  }

  private sendSignal(signal: WebRTCSignal) {
    serverApiClient.sendWebRTCSignal(signal);
  }

  public getLocalStream() {
    return this.localStream;
  }

  public close() {
    if (this.signalListener) {
      serverApiClient.off('webrtc_signal', this.signalListener);
      this.signalListener = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.onConnectionStateChange?.('closed');
  }
}

import React, { useEffect, useRef } from 'react';
import { WebRTCManager } from '@shared/services/webRtcService';

interface KidWebRTCListenerProps {
  childId: string;
  parentId: string;
}

export const KidWebRTCListener: React.FC<KidWebRTCListenerProps> = ({ childId, parentId }) => {
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    if (!childId || !parentId) return;

    // Listen and manage WebRTC from the background
    const manager = new WebRTCManager(childId, parentId);
    webrtcManagerRef.current = manager;

    // On remote stream (parent video/audio), we can either play it automatically or keep it hidden.
    // Usually kid doesn't need to see parent, but we might want two-way audio.
    // For now, let's auto-play parent's audio if available.
    manager.onRemoteStream = (stream) => {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.play().catch(e => console.log('Audio autoplay blocked', e));
    };

    return () => {
      manager.close();
      webrtcManagerRef.current = null;
    };
  }, [childId, parentId]);

  return null;
};

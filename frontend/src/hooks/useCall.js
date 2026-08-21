import { useEffect, useRef } from 'react';
import { useMedia } from './useMedia';
import { useSocket } from './useSocket';
import { usePeer } from './usePeer';
import { useSpeakingDetection } from './useSpeaking';
import { sendMediaState } from '../services/socket';

const SCREEN_SHARE_UNSUPPORTED_MESSAGE = 'Screen sharing is not supported on this device.';

export function useCall({ displayName, showToast } = {}) {
  const media = useMedia();
  const socket = useSocket({ displayName });
  const peer = usePeer({
    mySocketId: socket.socketId,
    localStream: media.localStream,
    remoteParticipants: socket.remoteParticipants,
    onOffer: socket.onOffer,
    onAnswer: socket.onAnswer,
    onIceCandidate: socket.onIceCandidate,
    onPeersReset: socket.onPeersReset,
    showToast,
  });

  const speakingIds = useSpeakingDetection(peer.remoteStreams, media.localStream);

  const prevMicRef = useRef(media.isMicEnabled);
  const prevCamRef = useRef(media.isCamEnabled);

  useEffect(() => {
    if (!media.localStream || !socket.socketId) return;

    if (prevMicRef.current !== media.isMicEnabled) {
      console.log(`[useCall] Mic state change: ${media.isMicEnabled ? 'on' : 'off'}`);
      sendMediaState('microphone', media.isMicEnabled);
      prevMicRef.current = media.isMicEnabled;
    }

    if (prevCamRef.current !== media.isCamEnabled) {
      console.log(`[useCall] Cam state change: ${media.isCamEnabled ? 'on' : 'off'}`);
      sendMediaState('camera', media.isCamEnabled);
      prevCamRef.current = media.isCamEnabled;
    }
  }, [media.localStream, media.isMicEnabled, media.isCamEnabled, socket.socketId]);

  const replaceOutgoingVideo = async (stream, failureMessage) => {
    try {
      peer.replaceVideoTrackForAllPeers(stream);
    } catch (error) {
      console.error('[CALL] VIDEO TRACK REPLACE ERROR:', error);
      if (failureMessage && typeof showToast === 'function') {
        showToast(failureMessage);
      }
    }
  };

  const restoreCameraTrackForAllPeers = async () => {
    if (!media.localStream) {
      return;
    }
    await replaceOutgoingVideo(media.localStream);
    console.log('[CALL] CAMERA RESTORED FOR ALL PEERS');
  };

  const startScreenShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      if (typeof showToast === 'function') {
        showToast(SCREEN_SHARE_UNSUPPORTED_MESSAGE);
      }
      return;
    }

    const stream = await media.startScreenShare(async () => {
      sendMediaState('screen', false);
      await restoreCameraTrackForAllPeers();
    });
    if (!stream) {
      return;
    }

    await replaceOutgoingVideo(stream);
    sendMediaState('screen', true);
    console.log('[CALL] SCREEN SHARE STARTED');
  };

  const stopScreenShare = async () => {
    media.stopScreenShare();
    sendMediaState('screen', false);
    await restoreCameraTrackForAllPeers();
  };

  const switchCamera = async () => {
    try {
      const stream = await media.switchCamera();
      if (!stream || media.isSharingScreen) {
        return;
      }
      await replaceOutgoingVideo(stream);
    } catch (error) {
      console.error('[CALL] CAMERA SWITCH ERROR:', error);
      if (typeof showToast === 'function') {
        showToast('Could not switch camera.');
      }
    }
  };

  const leaveCall = () => {
    console.log('[CALL] LEAVE CLICKED');
    media.stopAllMedia();
    console.log('[CALL] LOCAL TRACKS STOPPED');
    peer.destroyAllPeers();
    console.log('[CALL] PEER CONNECTIONS CLOSED');
    socket.leaveCallSocket();
  };

  return {
    ...media,
    ...socket,
    remoteStreams: peer.remoteStreams,
    speakingIds,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    leaveCall,
  };
}

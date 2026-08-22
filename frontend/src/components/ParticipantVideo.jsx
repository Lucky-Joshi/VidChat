import { useEffect, useRef } from 'react';

function MicStatusIcon({ enabled }) {
  if (enabled) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .87-.16 1.71-.46 2.49" />
    </svg>
  );
}

export function ParticipantVideo({ participant, stream, isSpeaking }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !stream) {
      return;
    }
    if (element.srcObject !== stream) {
      element.srcObject = stream;
    }

    const tryPlay = () => {
      if (element.paused) {
        element.play().catch((error) => {
          console.warn(
            `[PARTICIPANT] Playback blocked for ${participant.socketId}: ${error.name}`
          );
        });
      }
    };

    tryPlay();
    element.addEventListener('loadedmetadata', tryPlay);
    return () => {
      element.removeEventListener('loadedmetadata', tryPlay);
    };
  }, [stream, participant.socketId]);

  const mediaState = participant.mediaState || {};
  const isCamEnabled = mediaState.camera !== false;
  const isMicEnabled = mediaState.microphone !== false;
  const isSharingScreen = mediaState.screen === true;

  return (
    <div className={`participant-tile ${isSpeaking ? 'speaking' : ''}`}>
      <video
        id={`remote-video-${participant.socketId}`}
        ref={videoRef}
        autoPlay
        playsInline
        className={`video-element tile-video ${isCamEnabled ? '' : 'tile-video-hidden'}`}
        style={{ objectFit: 'contain' }}
      />

      {!isCamEnabled && (
        <div className="avatar-placeholder">
          <div className="avatar-circle">
            {participant.name.charAt(0).toUpperCase()}
          </div>
          <p className="avatar-name">{participant.name}</p>
        </div>
      )}

      <div className="tile-overlay">
        <span className={`speaking-dot ${isSpeaking ? 'active' : ''}`} />
        <span className="participant-name">{participant.name}</span>
        <span className={`mic-status ${isMicEnabled ? '' : 'muted'}`} title={isMicEnabled ? 'Microphone on' : 'Microphone muted'}>
          <MicStatusIcon enabled={isMicEnabled} />
        </span>
        {isSharingScreen && <span className="screen-share-badge">Screen</span>}
      </div>
    </div>
  );
}

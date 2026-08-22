export const ROOM_ID = 'vidchat-room';

const DEFAULT_ICE_SERVERS = [
  {
    urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
  },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

function resolveIceServers() {
  const raw = import.meta.env.VITE_ICE_SERVERS;
  if (!raw) {
    return DEFAULT_ICE_SERVERS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('[CONFIG] Invalid VITE_ICE_SERVERS JSON, falling back to defaults');
    return DEFAULT_ICE_SERVERS;
  }
}

export const RTC_CONFIG = {
  iceServers: resolveIceServers(),
  iceCandidatePoolSize: 10,
};

export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  WAITING: 'waiting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
};

export const MEDIA_CONSTRAINTS = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export const SCREEN_SHARE_CONSTRAINTS = {
  video: {
    cursor: 'always',
  },
  audio: false,
};

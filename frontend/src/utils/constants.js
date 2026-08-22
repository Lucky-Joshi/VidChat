export const ROOM_ID = 'vidchat-room';

const DEFAULT_ICE_SERVERS = [
  {
    urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
  },
];

function buildIceServers() {
  const rawOverride = import.meta.env.VITE_ICE_SERVERS;
  if (rawOverride) {
    try {
      return JSON.parse(rawOverride);
    } catch {
      console.warn('[CONFIG] Invalid VITE_ICE_SERVERS JSON, falling back to defaults');
    }
  }

  const servers = [...DEFAULT_ICE_SERVERS];
  const turnUrls = import.meta.env.VITE_TURN_URL;
  if (turnUrls) {
    servers.push({
      urls: turnUrls.split(',').map((url) => url.trim()),
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
    });
  } else if (import.meta.env.PROD) {
    console.warn(
      '[CONFIG] No TURN server configured. Media will fail across NATs/corporate networks. ' +
        'Set VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL (or VITE_ICE_SERVERS) at build time.'
    );
  }
  return servers;
}

export const RTC_CONFIG = {
  iceServers: buildIceServers(),
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
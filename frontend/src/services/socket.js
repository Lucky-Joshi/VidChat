import { io } from 'socket.io-client';
import { ROOM_ID } from '../utils/constants';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;
let currentDisplayName = null;

export function connectSocket() {
  if (socket) {
    console.log('[SOCKET] Reusing existing socket instance');
    return socket;
  }

  console.log('[SOCKET] Creating singleton socket connection to', SOCKET_URL);

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[SOCKET] CONNECTED:', socket.id);
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function joinRoom(displayName) {
  currentDisplayName = displayName ?? localStorage.getItem('displayName') ?? '';
  if (socket?.connected) {
    console.log(`[SOCKET] JOIN-ROOM emitted (name=${currentDisplayName})`);
    socket.emit('join-room', { roomId: ROOM_ID, name: currentDisplayName });
  } else {
    console.warn('[SOCKET] Cannot join room - socket not connected');
  }
}

export function updateName(name) {
  currentDisplayName = name;
  if (socket?.connected) {
    console.log(`[SOCKET] UPDATE-NAME emitted (name=${name})`);
    socket.emit('update-name', { name });
  }
}

export function leaveRoom() {
  if (socket?.connected) {
    socket.emit('leave-room', { roomId: ROOM_ID });
  }
}

export function sendOffer(target, offer) {
  if (socket?.connected) {
    console.log(`[SIGNAL] OFFER SENT -> ${target}`);
    socket.emit('offer', { target, offer });
  } else {
    console.warn('[SIGNAL] Cannot send offer - socket not connected');
  }
}

export function sendAnswer(target, answer) {
  if (socket?.connected) {
    console.log(`[SIGNAL] ANSWER SENT -> ${target}`);
    socket.emit('answer', { target, answer });
  } else {
    console.warn('[SIGNAL] Cannot send answer - socket not connected');
  }
}

export function sendIceCandidate(target, candidate) {
  if (socket?.connected) {
    socket.emit('ice-candidate', { target, candidate });
  }
}

export function sendMediaState(type, enabled) {
  if (socket?.connected) {
    socket.emit('media-state', { type, enabled });
  }
}

export function disconnectSocket() {
  if (socket) {
    console.log('[SOCKET] SOCKET DISCONNECTED');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

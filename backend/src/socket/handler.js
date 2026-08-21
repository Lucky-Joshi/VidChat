import { config } from '../config/index.js';

const MEDIA_TYPES = new Set(['microphone', 'camera', 'screen']);
const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const rooms = new Map();

function sanitizeName(rawName) {
  if (typeof rawName !== 'string') return null;
  const cleaned = rawName.replace(/\s+/g, ' ').trim();
  if (cleaned.length < config.minNameLength || cleaned.length > config.maxNameLength) {
    return null;
  }
  return cleaned;
}

function sanitizeRoomId(rawRoomId) {
  if (typeof rawRoomId !== 'string') return null;
  const cleaned = rawRoomId.trim();
  if (!cleaned || cleaned.length > config.maxRoomIdLength || !ROOM_ID_PATTERN.test(cleaned)) {
    return null;
  }
  return cleaned;
}

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }
  return room;
}

function getParticipantSnapshot(room) {
  return [...room.entries()].map(([socketId, info]) => ({
    socketId,
    name: info.name,
    mediaState: { ...info.mediaState },
  }));
}

function pruneStaleSockets(io, room) {
  for (const socketId of [...room.keys()]) {
    if (!io.sockets.sockets.has(socketId)) {
      room.delete(socketId);
      console.log(`[BACKEND] PRUNED STALE PARTICIPANT: ${socketId}`);
    }
  }
}

function removeFromRoomAndNotify(io, socket, reason) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = rooms.get(roomId);
  socket.leave(roomId);
  socket.data.roomId = null;

  if (!room) return;

  pruneStaleSockets(io, room);

  const hadParticipant = room.delete(socket.id);
  console.log(
    `[BACKEND] PARTICIPANT REMOVED: ${socket.id} room=${roomId} removed=${hadParticipant} reason=${reason}`
  );

  if (room.size === 0) {
    rooms.delete(roomId);
    console.log(`[BACKEND] ROOM DELETED: ${roomId}`);
    return;
  }

  if (hadParticipant) {
    io.to(roomId).emit('user-left', { peerId: socket.id });
    console.log(`[BACKEND] ROOM SIZE: ${room.size} room=${roomId}`);
  }
}

export function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[BACKEND] SOCKET CONNECT: ${socket.id}`);

    socket.on('join-room', (payload = {}) => {
      const roomId = sanitizeRoomId(payload.roomId) || config.roomId;
      const name = sanitizeName(payload.name);

      if (!name) {
        console.log(`[BACKEND] JOIN REJECTED: ${socket.id} reason=invalid-name`);
        socket.emit('join-error', {
          reason: 'invalid-name',
          message: `Name must be between ${config.minNameLength} and ${config.maxNameLength} characters.`,
        });
        return;
      }

      if (socket.data.roomId && socket.data.roomId !== roomId) {
        removeFromRoomAndNotify(io, socket, 'switch-room');
      }

      const room = getOrCreateRoom(roomId);
      pruneStaleSockets(io, room);

      const isRejoin = room.has(socket.id);
      if (isRejoin) {
        room.get(socket.id).name = name;
      } else {
        room.set(socket.id, {
          name,
          mediaState: { microphone: true, camera: true, screen: false },
        });
      }
      socket.data.roomId = roomId;
      socket.join(roomId);

      console.log(
        `[BACKEND] JOIN-ROOM: ${socket.id} (${name}) joined ${roomId} (size=${room.size})`
      );

      socket.emit('participants', {
        roomId,
        participants: getParticipantSnapshot(room),
      });

      if (!isRejoin) {
        socket.to(roomId).emit('user-joined', { peerId: socket.id, name });
      }

      if (room.size === 1) {
        socket.emit('waiting-for-partner');
      }
    });

    const forwardSignal = (eventName, payloadKey) => (payload = {}) => {
      const target = typeof payload.target === 'string' ? payload.target : null;
      const body = payload[payloadKey];
      if (!target || target === socket.id || !body) return;
      if (!io.sockets.sockets.has(target)) {
        console.log(
          `[BACKEND] ${eventName.toUpperCase()} DROPPED: target=${target} not connected`
        );
        return;
      }

      const senderRoom = socket.data.roomId;
      const targetSocket = io.sockets.sockets.get(target);
      if (!senderRoom || targetSocket.data.roomId !== senderRoom) {
        console.log(
          `[BACKEND] ${eventName.toUpperCase()} DROPPED: ${socket.id} -> ${target} (different rooms)`
        );
        return;
      }

      io.to(target).emit(eventName, { from: socket.id, [payloadKey]: body });
    };

    socket.on('offer', forwardSignal('offer', 'offer'));
    socket.on('answer', forwardSignal('answer', 'answer'));
    socket.on('ice-candidate', forwardSignal('ice-candidate', 'candidate'));

    socket.on('media-state', (data = {}) => {
      const type = typeof data.type === 'string' ? data.type : '';
      const enabled = Boolean(data.enabled);
      if (!MEDIA_TYPES.has(type)) return;

      const roomId = socket.data.roomId;
      const participant = rooms.get(roomId)?.get(socket.id);
      if (participant) {
        participant.mediaState[type] = enabled;
      }

      console.log(`[BACKEND] MEDIA STATE: ${socket.id} ${type}=${enabled}`);
      socket.to(roomId).emit('media-state', { userId: socket.id, type, enabled });
    });

    socket.on('update-name', (payload = {}) => {
      const name = sanitizeName(payload.name);
      if (!name) {
        socket.emit('join-error', {
          reason: 'invalid-name',
          message: `Name must be between ${config.minNameLength} and ${config.maxNameLength} characters.`,
        });
        return;
      }

      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      const participant = room?.get(socket.id);
      if (!room || !participant) return;

      participant.name = name;
      console.log(`[BACKEND] NAME UPDATED: ${socket.id} -> ${name}`);
      io.to(roomId).emit('participants', {
        roomId,
        participants: getParticipantSnapshot(room),
      });
    });

    socket.on('leave-room', () => {
      console.log(`[BACKEND] USER LEFT MANUALLY: ${socket.id}`);
      removeFromRoomAndNotify(io, socket, 'manual-leave');
    });

    socket.on('disconnect', () => {
      console.log(`[BACKEND] USER DISCONNECTED: ${socket.id}`);
      removeFromRoomAndNotify(io, socket, 'disconnect');
    });

    socket.on('error', (err) => {
      console.error(`[BACKEND] Socket error for ${socket.id}:`, err);
    });
  });
}

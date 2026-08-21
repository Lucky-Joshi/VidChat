import { useState, useEffect, useCallback, useRef } from 'react';
import {
  connectSocket,
  joinRoom,
  updateName,
  leaveRoom,
  disconnectSocket,
} from '../services/socket';
import { CONNECTION_STATES } from '../utils/constants';

const DEFAULT_MEDIA_STATE = { microphone: true, camera: true, screen: false };

export function useSocket({ displayName }) {
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.CONNECTING);
  const [socketId, setSocketId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [joinError, setJoinError] = useState(null);

  const socketRef = useRef(null);
  const participantsRef = useRef([]);
  const displayNameRef = useRef(displayName);
  const onOfferRef = useRef(null);
  const onAnswerRef = useRef(null);
  const onIceCandidateRef = useRef(null);
  const onUserLeftRef = useRef(null);
  const onPeersResetRef = useRef(null);
  const handlerSetupRef = useRef(false);
  const manualLeaveRef = useRef(false);
  const joinedOnceRef = useRef(false);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  const setParticipantsSafe = useCallback((next) => {
    const list = Array.isArray(next) ? next : [];
    participantsRef.current = list;
    setParticipants(list);
  }, []);

  useEffect(() => {
    if (handlerSetupRef.current) {
      console.log('[SOCKET HOOK] Handlers already setup, skipping');
      return;
    }

    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[EVENT] SOCKET CONNECT:', socket.id);
      manualLeaveRef.current = false;
      joinedOnceRef.current = true;
      setSocketId(socket.id);
      setConnectionState(CONNECTION_STATES.CONNECTING);
      setParticipantsSafe([]);
      setJoinError(null);
      joinRoom(displayNameRef.current);
    });

    socket.on('participants', ({ participants: list } = {}) => {
      console.log(`[EVENT] PARTICIPANTS: ${(list || []).length} in room`);
      const normalized = (list || []).map((p) => ({
        socketId: p.socketId,
        name: p.name,
        mediaState: { ...DEFAULT_MEDIA_STATE, ...(p.mediaState || {}) },
      }));
      setParticipantsSafe(normalized);
      const others = normalized.filter((p) => p.socketId !== socket.id);
      setConnectionState(others.length > 0 ? CONNECTION_STATES.CONNECTED : CONNECTION_STATES.WAITING);
    });

    socket.on('waiting-for-partner', () => {
      console.log('[EVENT] WAITING FOR PARTNER (alone in room)');
      setConnectionState(CONNECTION_STATES.WAITING);
    });

    socket.on('user-joined', ({ peerId, name } = {}) => {
      console.log(`[EVENT] USER-JOINED: ${peerId} (${name})`);
      const existing = participantsRef.current;
      if (!existing.some((p) => p.socketId === peerId)) {
        setParticipantsSafe([
          ...existing,
          { socketId: peerId, name: name || 'Guest', mediaState: { ...DEFAULT_MEDIA_STATE } },
        ]);
      }
      setConnectionState(CONNECTION_STATES.CONNECTED);
    });

    socket.on('user-left', ({ peerId } = {}) => {
      const leaving = participantsRef.current.find((p) => p.socketId === peerId);
      console.log(`[EVENT] USER LEFT: ${peerId}${leaving ? ` (${leaving.name})` : ''}`);
      setParticipantsSafe(participantsRef.current.filter((p) => p.socketId !== peerId));
      const others = participantsRef.current.filter(
        (p) => p.socketId !== peerId && p.socketId !== socket.id
      );
      setConnectionState(others.length > 0 ? CONNECTION_STATES.CONNECTED : CONNECTION_STATES.WAITING);
      if (onUserLeftRef.current) {
        onUserLeftRef.current({ peerId, name: leaving?.name });
      }
    });

    socket.on('media-state', ({ userId, type, enabled } = {}) => {
      if (!userId || !type) return;
      console.log(`[EVENT] MEDIA STATE: ${userId} ${type}=${enabled}`);
      setParticipantsSafe(
        participantsRef.current.map((p) =>
          p.socketId === userId
            ? { ...p, mediaState: { ...p.mediaState, [type]: Boolean(enabled) } }
            : p
        )
      );
    });

    socket.on('offer', ({ from, offer } = {}) => {
      console.log(`[SIGNAL] OFFER RECEIVED from=${from}`);
      if (onOfferRef.current && from && offer) {
        onOfferRef.current(offer, from);
      }
    });

    socket.on('answer', ({ from, answer } = {}) => {
      console.log(`[SIGNAL] ANSWER RECEIVED from=${from}`);
      if (onAnswerRef.current && from && answer) {
        onAnswerRef.current(answer, from);
      }
    });

    socket.on('ice-candidate', ({ from, candidate } = {}) => {
      if (onIceCandidateRef.current && from && candidate) {
        onIceCandidateRef.current(candidate, from);
      }
    });

    socket.on('join-error', ({ message } = {}) => {
      console.log(`[EVENT] JOIN ERROR: ${message}`);
      setJoinError(message || 'Unable to join the room.');
    });

    socket.on('disconnect', () => {
      console.log('[EVENT] SOCKET DISCONNECT');
      if (manualLeaveRef.current) {
        setConnectionState(CONNECTION_STATES.WAITING);
        setParticipantsSafe([]);
        setSocketId(null);
        return;
      }
      setConnectionState(CONNECTION_STATES.RECONNECTING);
    });

    socket.on('reconnect', () => {
      console.log('[EVENT] SOCKET RECONNECT');
      setParticipantsSafe([]);
      setConnectionState(CONNECTION_STATES.CONNECTING);
      if (onPeersResetRef.current) {
        onPeersResetRef.current();
      }
      joinRoom(displayNameRef.current);
    });

    socket.on('connect_error', (error) => {
      console.log('[EVENT] SOCKET CONNECTION ERROR:', error);
      setConnectionState(CONNECTION_STATES.RECONNECTING);
    });

    handlerSetupRef.current = true;

    return () => {
      console.log('[SOCKET HOOK] Cleanup');
      socket.removeAllListeners();
    };
  }, [setParticipantsSafe]);

  const onOffer = useCallback((handler) => {
    onOfferRef.current = handler;
  }, []);

  const onAnswer = useCallback((handler) => {
    onAnswerRef.current = handler;
  }, []);

  const onIceCandidate = useCallback((handler) => {
    onIceCandidateRef.current = handler;
  }, []);

  const onUserLeft = useCallback((handler) => {
    onUserLeftRef.current = handler;
  }, []);

  const onPeersReset = useCallback((handler) => {
    onPeersResetRef.current = handler;
  }, []);

  useEffect(() => {
    displayNameRef.current = displayName;
    if (joinedOnceRef.current && displayName && socketRef.current?.connected) {
      updateName(displayName);
    }
  }, [displayName]);

  const dismissJoinError = useCallback(() => {
    setJoinError(null);
  }, []);

  const leaveCallSocket = useCallback(() => {
    manualLeaveRef.current = true;
    leaveRoom();
    disconnectSocket();
    setConnectionState(CONNECTION_STATES.WAITING);
    setParticipantsSafe([]);
    setSocketId(null);
    setJoinError(null);
  }, [setParticipantsSafe]);

  return {
    connectionState,
    socketId,
    participants,
    remoteParticipants: participants.filter((p) => p.socketId !== socketId),
    joinError,
    socket: socketRef.current,
    onOffer,
    onAnswer,
    onIceCandidate,
    onUserLeft,
    onPeersReset,
    dismissJoinError,
    leaveCallSocket,
  };
}

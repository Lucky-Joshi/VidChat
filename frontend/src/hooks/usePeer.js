import { useState, useRef, useCallback, useEffect } from 'react';
import { RTC_CONFIG } from '../utils/constants';
import { sendOffer, sendAnswer, sendIceCandidate } from '../services/socket';

export function usePeer({
  mySocketId,
  localStream,
  remoteParticipants,
  onOffer,
  onAnswer,
  onIceCandidate,
  onPeersReset,
  showToast,
}) {
  const [remoteStreams, setRemoteStreams] = useState({});

  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef({});
  const pendingIceRef = useRef({});
  const pendingOffersRef = useRef([]);
  const makingOfferRef = useRef({});
  const lastFailureToastRef = useRef({});
  const localStreamRef = useRef(null);
  const mySocketIdRef = useRef(mySocketId);
  const prevParticipantIdsRef = useRef(new Set());

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    mySocketIdRef.current = mySocketId;
  }, [mySocketId]);

  const isInitiatorFor = useCallback((peerId) => {
    const myId = mySocketIdRef.current;
    return Boolean(myId && myId < peerId);
  }, []);

  const notifyConnectionFailure = useCallback(
    (peerId) => {
      const now = Date.now();
      if (now - (lastFailureToastRef.current[peerId] || 0) > 15000) {
        lastFailureToastRef.current[peerId] = now;
        if (typeof showToast === 'function') {
          showToast('Connection issue with a participant. Trying to recover...');
        }
      }
    },
    [showToast]
  );

  const flushPendingIceCandidates = useCallback(async (peerId) => {
    const peer = peerConnectionsRef.current[peerId];
    const queue = pendingIceRef.current[peerId];
    if (!peer || !peer.remoteDescription || !queue || queue.length === 0) {
      return;
    }
    pendingIceRef.current[peerId] = [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error(`[PEER] Failed to add queued ICE candidate for ${peerId}:`, error);
      }
    }
  }, []);

  const negotiateIfNeeded = useCallback(
    async (peerId) => {
      const peer = peerConnectionsRef.current[peerId];
      if (!peer) {
        return;
      }
      if (peer.signalingState !== 'stable') {
        console.log(
          `[PEER] Negotiation deferred for ${peerId} (signalingState=${peer.signalingState})`
        );
        return;
      }
      if (makingOfferRef.current[peerId]) {
        return;
      }
      if (!isInitiatorFor(peerId)) {
        return;
      }

      makingOfferRef.current[peerId] = true;
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        sendOffer(peerId, peer.localDescription);
        console.log(`[PEER] OFFER CREATED for ${peerId}`);
      } catch (error) {
        console.error(`[PEER] Negotiation failed with ${peerId}:`, error);
      } finally {
        makingOfferRef.current[peerId] = false;
      }
    },
    [isInitiatorFor]
  );

  const syncLocalTracks = useCallback(
    (peer, peerId) => {
      const stream = localStreamRef.current;
      if (!peer || !stream) {
        return;
      }

      const senders = peer.getSenders();
      let addedNewTrack = false;

      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          if (sender.track?.id !== track.id) {
            sender.replaceTrack(track).catch((error) => {
              console.error(`[PEER] replaceTrack failed for ${peerId}:`, error);
            });
          }
        } else {
          peer.addTrack(track, stream);
          addedNewTrack = true;
        }
      });

      if (addedNewTrack) {
        negotiateIfNeeded(peerId);
      }
    },
    [negotiateIfNeeded]
  );

  const createPeerConnection = useCallback(
    (peerId) => {
      if (peerConnectionsRef.current[peerId]) {
        return peerConnectionsRef.current[peerId];
      }

      const peer = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionsRef.current[peerId] = peer;
      console.log(`[PEER] RTCPeerConnection created for ${peerId}`);

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sendIceCandidate(peerId, event.candidate);
        }
      };

      peer.ontrack = (event) => {
        let stream = remoteStreamsRef.current[peerId];
        if (!stream) {
          stream = new MediaStream();
          remoteStreamsRef.current[peerId] = stream;
        }

        const incomingTracks =
          event.streams && event.streams[0] ? event.streams[0].getTracks() : [event.track];
        incomingTracks.forEach((track) => {
          if (!stream.getTracks().some((existing) => existing.id === track.id)) {
            stream.addTrack(track);
          }
        });

        console.log(`[PEER] REMOTE TRACK RECEIVED from ${peerId}`);
        setRemoteStreams({ ...remoteStreamsRef.current });
      };

      peer.onconnectionstatechange = () => {
        console.log(`[PEER] ${peerId} connectionState=${peer.connectionState}`);
        if (peer.connectionState === 'failed') {
          notifyConnectionFailure(peerId);
          try {
            peer.restartIce();
          } catch (error) {
            console.error(`[PEER] ICE restart failed for ${peerId}:`, error);
          }
        }
      };

      peer.onnegotiationneeded = () => {
        negotiateIfNeeded(peerId);
      };

      syncLocalTracks(peer, peerId);

      return peer;
    },
    [notifyConnectionFailure, negotiateIfNeeded, syncLocalTracks]
  );

  const removePeerConnection = useCallback((peerId) => {
    const peer = peerConnectionsRef.current[peerId];
    if (peer) {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onconnectionstatechange = null;
      peer.onnegotiationneeded = null;
      try {
        peer.close();
      } catch (error) {
        console.error(`[PEER] Error closing connection for ${peerId}:`, error);
      }
      delete peerConnectionsRef.current[peerId];
      console.log(`[PEER] PEER CONNECTION CLOSED for ${peerId}`);
    }
    delete pendingIceRef.current[peerId];
    delete makingOfferRef.current[peerId];
    if (remoteStreamsRef.current[peerId]) {
      delete remoteStreamsRef.current[peerId];
      setRemoteStreams({ ...remoteStreamsRef.current });
    }
  }, []);

  const destroyAllPeers = useCallback(() => {
    Object.keys(peerConnectionsRef.current).forEach((peerId) => {
      removePeerConnection(peerId);
    });
    pendingOffersRef.current = [];
    prevParticipantIdsRef.current = new Set();
    console.log('[PEER] ALL PEER CONNECTIONS CLEARED');
  }, [removePeerConnection]);

  const processOffer = useCallback(
    async (offer, from) => {
      if (!localStreamRef.current) {
        console.log(`[PEER] Offer from ${from} buffered (local media not ready)`);
        pendingOffersRef.current.push({ from, offer });
        return;
      }

      try {
        const peer = createPeerConnection(from);

        console.log(`[SIGNAL] OFFER HANDLED from=${from} (signalingState=${peer.signalingState})`);
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendAnswer(from, peer.localDescription);
        await flushPendingIceCandidates(from);
      } catch (error) {
        console.error(`[PEER] Failed to handle offer from ${from}:`, error);
      }
    },
    [createPeerConnection, flushPendingIceCandidates]
  );

  const handleOffer = processOffer;

  const handleAnswer = useCallback(
    async (answer, from) => {
      const peer = peerConnectionsRef.current[from];
      if (!peer) {
        console.warn(`[PEER] Answer from unknown peer ${from} ignored`);
        return;
      }
      if (peer.signalingState !== 'have-local-offer') {
        console.log(
          `[PEER] Answer from ${from} ignored (signalingState=${peer.signalingState})`
        );
        return;
      }

      try {
        console.log(`[SIGNAL] ANSWER HANDLED from=${from}`);
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIceCandidates(from);
      } catch (error) {
        console.error(`[PEER] Failed to handle answer from ${from}:`, error);
      }
    },
    [flushPendingIceCandidates]
  );

  const handleIceCandidate = useCallback(
    async (candidate, from) => {
      if (!candidate) return;

      const peer = peerConnectionsRef.current[from];
      if (peer && peer.remoteDescription) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error(`[PEER] Failed to add ICE candidate from ${from}:`, error);
        }
      } else {
        if (!pendingIceRef.current[from]) {
          pendingIceRef.current[from] = [];
        }
        pendingIceRef.current[from].push(candidate);
      }
    },
    []
  );

  useEffect(() => {
    if (!onOffer) return;
    onOffer(handleOffer);
  }, [onOffer, handleOffer]);

  useEffect(() => {
    if (!onAnswer) return;
    onAnswer(handleAnswer);
  }, [onAnswer, handleAnswer]);

  useEffect(() => {
    if (!onIceCandidate) return;
    onIceCandidate(handleIceCandidate);
  }, [onIceCandidate, handleIceCandidate]);

  useEffect(() => {
    if (!onPeersReset) return;
    onPeersReset(destroyAllPeers);
  }, [onPeersReset, destroyAllPeers]);

  useEffect(() => {
    if (!localStream || !mySocketId) return;

    remoteParticipants.forEach((participant) => {
      const peerId = participant.socketId;
      if (peerId === mySocketId) return;
      if (isInitiatorFor(peerId)) {
        createPeerConnection(peerId);
        negotiateIfNeeded(peerId);
      }
    });
  }, [
    remoteParticipants,
    localStream,
    mySocketId,
    isInitiatorFor,
    createPeerConnection,
    negotiateIfNeeded,
  ]);

  useEffect(() => {
    if (!localStream) return;

    Object.entries(peerConnectionsRef.current).forEach(([peerId, peer]) => {
      syncLocalTracks(peer, peerId);
    });

    const buffered = pendingOffersRef.current;
    if (buffered.length > 0) {
      pendingOffersRef.current = [];
      (async () => {
        for (const { from, offer } of buffered) {
          await processOffer(offer, from);
        }
      })();
    }
  }, [localStream, remoteParticipants, syncLocalTracks, processOffer]);

  useEffect(() => {
    const currentIds = new Set(remoteParticipants.map((p) => p.socketId));
    for (const knownId of prevParticipantIdsRef.current) {
      if (!currentIds.has(knownId)) {
        removePeerConnection(knownId);
      }
    }
    prevParticipantIdsRef.current = currentIds;
  }, [remoteParticipants, removePeerConnection]);

  useEffect(() => {
    return () => {
      Object.values(peerConnectionsRef.current).forEach((peer) => {
        try {
          peer.close();
        } catch (error) {
          console.error('[PEER] Error closing connection during unmount:', error);
        }
      });
      peerConnectionsRef.current = {};
    };
  }, []);

  const replaceVideoTrackForAllPeers = useCallback((stream) => {
    const track = stream?.getVideoTracks?.()[0];
    if (!track) {
      return false;
    }

    Object.entries(peerConnectionsRef.current).forEach(([peerId, peer]) => {
      const sender = peer.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(track).catch((error) => {
          console.error(`[PEER] replaceTrack failed for ${peerId}:`, error);
        });
      } else {
        peer.addTrack(track, stream);
      }
    });

    return true;
  }, []);

  return {
    remoteStreams,
    replaceVideoTrackForAllPeers,
    destroyAllPeers,
  };
}

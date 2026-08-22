# Technical Requirements Document

## Tech Stack

### Frontend
- React 18
- Vite 6
- CSS3 (dark theme, no framework)
- Socket.IO Client
- Native WebRTC (`RTCPeerConnection` — no wrapper library)

### Backend
- Node.js (LTS)
- Express
- Socket.IO

### Infrastructure
- Frontend: any static host (Vercel / Netlify / Cloudflare Pages)
- Backend: any Node host (Render / Railway / Fly.io)
- TURN relay: Metered free tier or self-hosted coturn (**required** for cross-network media)

---

## Architecture

Full mesh topology. The server is signaling-only; media flows directly between browsers (or via TURN when direct paths fail).

```
Frontend ──► Socket.IO Server ──► WebRTC Signaling relay
                                        │
                     per-pair RTCPeerConnection mesh
                                        │
                            P2P media (STUN) / TURN relay
```

Each participant keeps one `RTCPeerConnection` per remote participant:

- Local tracks attached at creation (`addTrack`)
- Offer created by the side whose socket ID sorts lexicographically smaller (glare-free deterministic rule), triggered by `onnegotiationneeded` plus an explicit negotiation kick after creation
- Answerer applies offer with implicit-rollback tolerance, attaches its tracks, replies with an answer
- Trickle ICE both ways; candidates arriving before `remoteDescription` are buffered per peer and flushed afterwards
- Screen share / camera switch use `RTCRtpSender.replaceTrack()` across all peers — no renegotiation needed

Server room state is in-memory: `rooms: Map<roomId, Map<socketId, { name, mediaState }>>`, pruned of stale sockets on every join/leave.

---

## Communication Flow

1. User opens application, enters display name, grants media permissions
2. Client emits `join-room { roomId, name }`
3. Server validates name (2–30 chars), stores participant, returns `participants` snapshot, broadcasts `user-joined`
4. For each known peer, eligible side creates `RTCPeerConnection` and sends SDP offer
5. Peer answers; ICE candidates exchanged (buffered until applicable)
6. Peer connection established → media streams flow
7. Toggles/renames propagate via `media-state` / `update-name`

---

## Media APIs

Camera & Microphone:

```js
navigator.mediaDevices.getUserMedia()
```

Screen Share:

```js
navigator.mediaDevices.getDisplayMedia()
```

Speaking detection: Web Audio API `AnalyserNode` over local + remote streams.

---

## WebRTC Configuration

Defined in `frontend/src/utils/constants.js`. STUN is built in; TURN comes from build-time env vars so credentials never live in source.

```js
iceServers: [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  // appended when VITE_TURN_URL is set:
  { urls: [...], username: "...", credential: "..." }
],
iceCandidatePoolSize: 10
```

Diagnostics: the client logs ICE candidate errors (401 = auth failure, 701 = unreachable) and dumps the attempted candidate-pair types on connection failure.

---

## Room Configuration

```js
ROOM_ID = "vidchat-room"
```

Fixed single room. Name length limits: 2–30 chars (validated on client and server).

---

## Environment Variables

| Var | Side | Purpose |
|-----|------|---------|
| `PORT` | backend | Listen port |
| `CORS_ORIGIN` | backend | Allowed origins |
| `VITE_SOCKET_URL` | frontend | Signaling URL (baked at build time) |
| `VITE_TURN_URL` | frontend | TURN URLs, comma-separated |
| `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` | frontend | TURN auth |
| `VITE_ICE_SERVERS` | frontend | Full JSON override for iceServers |

> `VITE_*` values are compiled into the bundle during `vite build`; they must be present in the CI/platform build environment. `.env` files are gitignored.

npm ≥ 11.16 blocks dependency install scripts by default; `frontend/package.json` whitelists esbuild via `"allowScripts": { "esbuild": true }`.

---

## Security

- HTTPS deployment required (getUserMedia + secure context)
- WSS socket transport in production
- WebRTC DTLS-SRTP encryption (spec-mandated)
- Server-side validation: name sanitization, roomId pattern, signaling target must share the sender's room

---

## Scalability

Current:
- Mesh scales practically to ~6–8 participants (each browser uploads N−1 streams)

Future:
- Multiple rooms via room codes
- SFU (mediasoup/LiveKit) for larger groups

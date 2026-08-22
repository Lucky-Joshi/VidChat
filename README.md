# VidChat

A lightweight multi-participant video calling application built for pair programming, coding interviews, and remote collaboration. Real-time video, audio, screen sharing, and live participant state — with no accounts and no database.

**No authentication. No database. No chat. Just instant peer-to-peer connections.**

---

## 🎯 Quick Overview

- **What it is:** A real-time group video conferencing app (WebRTC mesh — practical limit ~6–8 participants)
- **How it works:** Native `RTCPeerConnection` mesh with Socket.IO signaling
- **Use cases:** Pair programming, coding interviews, study groups, screen sharing sessions
- **Deployment:** Frontend on Vercel (or any static host), Backend on Render (or any Node host)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Architecture](#-architecture)
- [API & Events](#--api--events)
- [Configuration](#️-configuration)
- [TURN Server Setup](#-turn-server-setup)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)
- [License](#-license)

---

## ✨ Features

### Core Communication
- **Multi-participant calls** — Everyone connects to everyone via a WebRTC mesh; join/leave at any time
- **Display names** — Name entry screen (persisted in `localStorage`), rename mid-call, name validation on client and server
- **Video Calling** — Enable/disable camera with real-time toggle
- **Audio Calling** — Mute/unmute microphone with echo cancellation / noise suppression
- **Screen Sharing** — Share your screen to all participants via `replaceTrack()` (camera stays switchable)
- **Speaking Detection** — Active-speaker highlighting using the Web Audio API

### Smart Room Management
- **Auto-Connect** — Automatically joins the fixed room (`vidchat-room`)
- **Live Participant List** — Tiles appear instantly as people join, with per-tile mic/camera/screen state
- **Waiting Status** — Clear waiting screen while you are alone in the room

### Reliability & Recovery
- **Connection Recovery** — Auto-reconnects signaling; peers reset and rebuild cleanly after reconnects
- **Glare-Free Negotiation** — Deterministic offer rule (lexicographically smaller socket ID initiates), implicit rollback support
- **ICE Hardening** — Trickle ICE, candidate buffering until remote description exists, automatic ICE restart on failure, TURN relay support
- **Health Check** — Backend health monitoring for deployment verification
- **Graceful Cleanup** — Room cleanup on leave/disconnect, stale socket pruning

### User Experience
- **Permission Handling** — Friendly error messages for denied permissions
- **Media State Sync** — Everyone sees who is muted/camera-off/screen-sharing in real time
- **Responsive Design** — Desktop, tablet, and mobile support
- **Dark Theme** — Eye-friendly dark interface optimized for long coding sessions
- **Error Boundary** — Graceful error handling with reload option

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React 18, Vite, CSS3, Socket.IO Client | 18.3.1 |
| **WebRTC** | Native `RTCPeerConnection` (no wrapper library) | — |
| **Backend** | Node.js, Express, Socket.IO | LTS |
| **Build** | Vite | ^6 |
| **Deployment** | Frontend → static host, Backend → Node host | — |

### Key Dependencies

**Backend (`backend/package.json`):**
- `express` ^4.21.1 — Web server framework
- `socket.io` ^4.8.1 — Real-time bidirectional communication
- `cors` ^2.8.5 — Cross-Origin Resource Sharing middleware

**Frontend (`frontend/package.json`):**
- `react` / `react-dom` ^18.3.1 — UI library
- `socket.io-client` ^4.8.1 — WebSocket client
- `vite` ^6 — Build tool
- `@vitejs/plugin-react` ^4.3.4 — React plugin

> Note: `frontend/package.json` contains an `allowScripts.esbuild = true` entry. npm ≥ 11.16 blocks package install scripts by default; this approves esbuild's postinstall explicitly.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20 or higher
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)

### 1️⃣ Backend Setup

```bash
cd backend
npm install
npm run dev
```

The server starts on `http://localhost:3001`.

**Available commands:**
- `npm run dev` — Start server with file watching (development)
- `npm start` — Start server (production)

### 2️⃣ Frontend Setup

```bash
cd frontend
npm install        # see note below if npm warns about install scripts
npm run dev
```

The app opens at `http://localhost:5173`.

> On npm ≥ 11.16 you may see an `allow-scripts` warning about `esbuild`. The repo already whitelists it via `"allowScripts"` in `package.json`, so installs work out of the box.

### 3️⃣ Testing Locally

Open **two separate browser windows** at `http://localhost:5173`:
- Enter a display name in each window
- Window 1 shows "waiting" until window 2 enters
- Both windows connect automatically — video/audio flow P2P
- Use controls to toggle camera/mic or share your screen

Locally this always works because both tabs are on the same machine. **Testing across different networks requires a TURN server** — see [TURN Server Setup](#-turn-server-setup).

---

## 📁 Project Structure

```
VidChat/
├── README.md                       # This file
├── .gitignore                      # Git ignore rules (.env files excluded)
│
├── frontend/                       # React client application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConnectionStatus.jsx  # Signaling/connection status banner
│   │   │   ├── ControlBar.jsx        # Mic/camera/screen/leave controls
│   │   │   ├── NameEntry.jsx         # Display-name entry modal
│   │   │   ├── ParticipantVideo.jsx  # Single participant tile (video/avatar + overlays)
│   │   │   ├── PermissionPrompt.jsx  # Camera/mic permission states
│   │   │   ├── SettingsMenu.jsx      # Rename / device settings menu
│   │   │   ├── Toast.jsx             # Transient notifications
│   │   │   ├── VideoGrid.jsx         # Responsive participant grid
│   │   │   └── RoomFull.jsx          # (unused legacy component)
│   │   ├── hooks/
│   │   │   ├── useCall.js            # Orchestrator (composes all hooks)
│   │   │   ├── useMedia.js           # Camera, mic, screen share logic
│   │   │   ├── usePeer.js            # WebRTC mesh (native RTCPeerConnection)
│   │   │   ├── useSocket.js          # Socket.IO events + participants state
│   │   │   └── useSpeaking.js        # Audio-level speaking detection
│   │   ├── pages/
│   │   │   └── CallPage.jsx          # Main call interface
│   │   ├── services/
│   │   │   └── socket.js             # Socket.IO singleton + emit helpers
│   │   ├── styles/
│   │   │   └── index.css             # Global styles (dark theme)
│   │   ├── utils/
│   │   │   ├── constants.js          # RTC config, constraints, room id
│   │   │   └── validation.js         # Display-name validation
│   │   ├── App.jsx                   # Root component with error boundary
│   │   └── main.jsx                  # App entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json                  # includes allowScripts policy
│   ├── .env.example
│   └── .gitignore
│
├── backend/                        # Node.js/Express server
│   ├── src/
│   │   ├── index.js                # Server entry point (HTTP + Socket.IO)
│   │   ├── config/index.js         # Config from env vars
│   │   ├── controllers/health.js   # Health check endpoint
│   │   └── socket/handler.js       # Room state + signaling relay
│   ├── package.json
│   └── .env.example
│
└── docs/                           # Documentation
    ├── PRD.md                      # Product Requirements Document
    ├── TRD.md                      # Technical Requirements Document
    ├── DESIGN.md                   # UI/UX Design details
    ├── APP_FLOW.md                 # Application flow diagram
    └── USER_FLOW.md                # User interaction flows
```

---

## 🏗️ Architecture

### Topology

VidChat uses a **full mesh**: every participant maintains one `RTCPeerConnection` to every other participant. The server only relays signaling (SDP offers/answers, ICE candidates) and room state — media never touches it.

```
                    ┌────────────────────────┐
                    │     Signal Server      │
                    │   (Express + SIO :3001)│
                    │ rooms Map<roomId, Map> │
                    └───────────┬────────────┘
              join-room / offer / answer / ice-candidate
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
      ┌────────────┐   ┌────────────┐   ┌────────────┐
      │ Browser A  │◄─►│ Browser B  │◄─►│ Browser C  │
      └─────┬──────┘   └────────────┘   └─────┬──────┘
            │                                 │
            └────────────►◄───────────────────┘
              Direct P2P media (STUN) or relayed (TURN)
```

### Data Flow

**Joining:**
1. User opens app → name entry → media permission granted
2. Client emits `join-room { roomId, name }`
3. Server adds `{ name, mediaState }` to the room map, replies with a `participants` snapshot (includes self; self filtered client-side), broadcasts `user-joined { peerId, name }` to existing members
4. If alone, client receives `waiting-for-partner`

**Connecting (per new peer pair):**
5. Each side creates an `RTCPeerConnection`; local tracks are attached immediately
6. **Initiator rule:** the side whose own socket ID sorts lexicographically *before* the peer's creates and sends the offer (via `onnegotiationneeded` plus an explicit kick). The other side waits.
7. Receiver applies the offer (implicit rollback supported), attaches its tracks, sends an `answer`
8. ICE candidates trickle both ways; candidates arriving before the remote description are buffered per-peer
9. `connectionState === 'connected'` → media flows; `ontrack` populates the tile's `MediaStream`

**During call:** toggles emit `media-state`; renames emit `update-name`; screen share swaps the outgoing video track on every peer with `replaceTrack()`.

---

## 📡 API & Events

### Socket.IO Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `{ roomId, name }` | Join/create a room with a validated display name |
| `offer` | `{ target, offer }` | SDP offer for a specific peer |
| `answer` | `{ target, answer }` | SDP answer for a specific peer |
| `ice-candidate` | `{ target, candidate }` | Trickle ICE candidate for a specific peer |
| `media-state` | `{ type, enabled }` | type ∈ `microphone \| camera \| screen` |
| `update-name` | `{ name }` | Rename mid-call (broadcasts fresh `participants`) |
| `leave-room` | `{}` | Explicitly leave the room |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `participants` | `{ roomId, participants[] }` | Full snapshot: `{ socketId, name, mediaState }` (includes self) |
| `user-joined` | `{ peerId, name }` | New participant joined |
| `waiting-for-partner` | `{}` | You are alone in the room |
| `user-left` | `{ peerId }` | Participant left/disconnected |
| `offer` | `{ from, offer }` | Received SDP offer |
| `answer` | `{ from, answer }` | Received SDP answer |
| `ice-candidate` | `{ from, candidate }` | Received ICE candidate |
| `media-state` | `{ userId, type, enabled }` | Peer's media state changed |
| `join-error` | `{ reason, message }` | Invalid name (length must be 2–30 chars) |

Signaling payloads are validated server-side: target must be a connected socket in the same room, or the message is dropped with a log line.

### HTTP Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (returns 200) |

---

## ⚙️ Configuration

> ⚠️ **All `VITE_*` variables are baked into the bundle at BUILD time.** Setting them in `.env` only affects builds on that same machine — and `.env` is gitignored, so CI/platform builds never see it. Configure them as build environment variables on your hosting platform.

### Backend (`backend/.env`)

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origins (comma-separated for multiple) |

### Frontend (`frontend/.env` — local development only!)

```env
VITE_SOCKET_URL=http://localhost:3001
# Optional but required across networks:
VITE_TURN_URL=turn:host:port,turns:host:port?transport=tcp
VITE_TURN_USERNAME=...
VITE_TURN_CREDENTIAL=...
# Or full override:
VITE_ICE_SERVERS=[{"urls":"stun:..."},{"urls":"turn:...","username":"...","credential":"..."}]
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SOCKET_URL` | `http://localhost:3001` | Signaling server URL |
| `VITE_TURN_URL` | *(none)* | TURN URLs, comma-separated (TCP/TLS variants recommended) |
| `VITE_TURN_USERNAME` | *(none)* | TURN username |
| `VITE_TURN_CREDENTIAL` | *(none)* | TURN credential |
| `VITE_ICE_SERVERS` | *(none)* | Full JSON replacement for `iceServers` |

Production builds without a TURN server log a console warning: `[CONFIG] No TURN server configured...`

### WebRTC Configuration (`frontend/src/utils/constants.js`)

| Setting | Value | Purpose |
|---------|-------|---------|
| STUN servers | Google STUN ×2 | NAT discovery (free, no signup) |
| TURN servers | From env vars | Media relay when direct paths fail |
| `iceCandidatePoolSize` | 10 | Faster candidate gathering |
| Room ID | `vidchat-room` | Fixed room identifier |

---

## 🌐 TURN Server Setup

STUN alone cannot traverse symmetric NATs / CGNAT (mobile hotspots, carrier NAT, corporate networks). Symptoms of missing/broken TURN: **participant names appear, but video and audio never show.**

There is no longer a reliable free credential-less public TURN service. Options:

1. **Metered.ca free tier (easiest)** — sign up free (500 MB/month), copy credentials from the dashboard into `VITE_TURN_URL` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL`.
2. **Self-host coturn** on a VPS with a public IP.
3. Any commercial provider (Twilio NTS, Cloudflare Calls TURN, Xirsys…).

Set the values as platform build env vars and redeploy. Verify in DevTools console: the `[CONFIG] No TURN server configured...` warning must be gone.

---

## 🚢 Deployment

### Backend (Render.com example)

1. New Web Service → connect repo
2. Root Directory: `backend` · Build: `npm install` · Start: `node src/index.js`
3. Environment variables:
   ```env
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```
4. Note your backend URL (e.g., `https://vidchat-api.onrender.com`). Health check: `/health`.

### Frontend (Vercel example)

1. Import project → Framework Preset: Vite · Root Directory: `frontend` · Output: `dist`
2. **Build environment variables** (not runtime!):
   ```env
   VITE_SOCKET_URL=https://vidchat-api.onrender.com
   VITE_TURN_URL=...        # from your TURN provider
   VITE_TURN_USERNAME=...
   VITE_TURN_CREDENTIAL=...
   ```
3. Deploy. Any change to `VITE_*` values requires a rebuild/redeploy.

### Post-Deployment Checklist

- [ ] Backend health: `curl https://your-backend.onrender.com/health`
- [ ] Backend `CORS_ORIGIN` matches the exact frontend origin(s)
- [ ] Frontend rebuilt with correct `VITE_SOCKET_URL` (no localhost!)
- [ ] TURN configured — production console shows **no** `[CONFIG] No TURN server configured` warning
- [ ] Two browsers on **different networks** can see/hear each other
- [ ] Screen share works over HTTPS

---

## 🔍 Troubleshooting

### Names appear but no video/audio (most common)

This means signaling works but the WebRTC media path failed:

1. Open DevTools console and look for `[ICE] FAILED ...` lines — they show which candidate types were attempted (e.g., `local=srflx remote=srflx` means TURN was never reached).
2. `[ICE] candidate error code=401` → wrong TURN credentials; `code=701` → TURN unreachable.
3. `[CONFIG] No TURN server configured` warning → env vars missing from the production build. Remember: `.env` is not deployed; set platform build env vars and rebuild.
4. Confirm TURN works at https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/ (look for `relay` candidates).

### Env vars seem ignored in production

- `VITE_*` values are compiled in at build time — changing platform env vars without redeploying changes nothing.
- `.env.example` is documentation only; nothing reads it.
- `.env` files are gitignored — they never reach CI/platform builds.

### "Waiting for partner..." never resolves
- Backend running? `CORS_ORIGIN` matches the frontend URL exactly (scheme + host + port)?
- `VITE_SOCKET_URL` points at the backend (and is reachable — check Network tab WS frames)?

### npm warns about `allow-scripts` / esbuild
Expected on npm ≥ 11.16. The repo whitelists esbuild via `"allowScripts"` in `frontend/package.json`. If you add packages with install scripts, approve them explicitly (`npm approve-scripts <pkg>`).

### Camera/Microphone not working
Verify browser permissions, clear site settings, try another browser. getUserMedia requires HTTPS in production (localhost is exempt).

### Screen sharing not working
Desktop browsers only; HTTPS required in production.

### Logging reference

**Backend:**
```
[BACKEND] SOCKET CONNECT: abc123
[BACKEND] JOIN-ROOM: abc123 (Alice) joined vidchat-room (size=2)
[BACKEND] PARTICIPANT REMOVED: abc123 room=vidchat-room removed=true reason=disconnect
```

**Frontend (DevTools console):**
```
[SIGNAL] OFFER HANDLED from=xyz (signalingState=stable)
[PEER] OFFER CREATED for xyz
[PEER] xyz connectionState=connected
[PEER] REMOTE TRACK RECEIVED from xyz
```

---

## 👨‍💻 Development

```bash
git clone <repo>
cd VidChat
cd backend && npm install && npm run dev      # terminal 1
cd frontend && npm install && npm run dev     # terminal 2
```

### Code Organization

- All call logic lives in hooks (`useCall` composes `useMedia`, `useSocket`, `usePeer`, `useSpeaking`)
- Components render only; state flows down from `CallPage`
- The socket service is a singleton; handlers register once per session

### Adding Features

- **New socket event:** handler in `backend/src/socket/handler.js` → emitter in `services/socket.js` → consumer in a hook → update the events tables above
- **New env var:** add to the relevant `.env.example` + config module, update Configuration section here

### Testing Tips

- Test cross-network with a mobile hotspot before trusting "it works"
- Chrome DevTools → `chrome://webrtc-internals` for deep connection inspection
- Watch signaling frames in DevTools → Network → WS

---

## 🤝 Contributing

Contributions welcome! Please test locally (including one cross-network test if touching WebRTC), follow existing code style, and keep components/hooks small.

## 📄 License

MIT License — see LICENSE file for details.

---

## 🆘 Support & Feedback

For issues, feature requests, or feedback, please open an issue on GitHub.

**Last Updated:** August 2026

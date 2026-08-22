# Application Flow

User Opens App
        ↓
Name Entry Screen (display name, remembered locally)
        ↓
Continue
        ↓
Loading / Permission Request
        ↓
Camera + Microphone Access Granted
        ↓
Socket Connection → join-room (vidchat-room)
        ↓
Participants Snapshot Received
        ↓
┌─ Alone ──► Waiting For Partner screen
│                ↓ partner joins (user-joined)
└─ Others ─► Create one RTCPeerConnection per peer
                 ↓
         Deterministic initiator sends SDP offer
                 ↓
         Peer answers; ICE candidates trickle
         (buffered until remote description exists)
                 ↓
     connectionState = connected → media flows
                 ↓
Group Call Active (grid, speaking indicators,
media-state sync, rename via update-name)
                 ↓
Screen Sharing Optional (replaceTrack to all peers)
                 ↓
Leave / Disconnect
        ↓
Tracks stopped, peers destroyed, room notified
        ↓
Server prunes participant, broadcasts user-left

Reconnect path: socket auto-reconnects → session reset
(peers destroyed, participants re-fetched) → mesh rebuilds.

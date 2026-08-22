# Product Requirements Document (PRD)

## Product Name
VidChat

## Vision

A lightweight platform that enables a small group of people (2–8) to connect instantly through video calls and screen sharing while solving problems together.

The application removes the complexity of traditional meeting tools — no accounts, no scheduling, no plugins. Open the page, type your name, share the link, start talking.

---

## Problem Statement

Students preparing for coding interviews often juggle multiple tools:

- Google Meet for calls
- WhatsApp for communication
- LeetCode for problems
- VS Code for coding

Switching between platforms creates friction.

VidChat provides a minimal environment for pair programming, mock interviews, and group DSA practice.

---

## Target Users

### Primary Users
- College students
- Placement aspirants
- Coding buddies
- Competitive programmers

### Secondary Users
- Mentors
- Tutors
- Interview preparation groups

---

## Core Features

### Group Video Calling

Users can:

- Join a shared room instantly (no account creation)
- See every participant in a responsive grid with their display name
- Enable/disable their own camera at any time
- See each participant's camera/mic state on their tile

### Audio Calling

Users can:

- Mute/unmute microphone
- See who is currently speaking (active-speaker highlighting)

### Screen Sharing

Users can:

- Share screen with all participants simultaneously
- Stop sharing; camera track restores automatically for everyone

### Display Names

Users can:

- Set a display name before joining (remembered locally)
- Rename mid-call; everyone sees the change live
- Invalid names (under 2 / over 30 chars) are rejected client- and server-side

### Fixed Study Room

Everyone automatically joins one predefined room (`vidchat-room`).

---

## Non-Functional Requirements

### Performance
- Call connection < 5 seconds
- Low-latency peer-to-peer media (mesh topology)

### Reliability
- Stable peer connections with automatic ICE restart on failure
- Signaling auto-reconnect with clean session rebuild
- TURN relay fallback so calls work across NATs/carrier networks

### Security
- HTTPS required in production
- WebRTC DTLS-SRTP encryption (mandatory by spec)
- Server-side input validation for names and signaling targets

---

## MVP Scope

Included:

- Multi-participant video/audio mesh calling
- Display names + live participant list
- Screen sharing
- Media state sync
- Leave call

Excluded:

- Authentication
- Chat
- Database / persistence
- Recording
- Whiteboard
- Collaborative editor
- SFU scaling (mesh caps practical usage around 6–8 participants)

---

## Success Metrics

- Successful connection rate (especially across different networks)
- Session duration
- Screen share usage
- Call stability (no mid-call failures)

---

## Future Enhancements

- Shared Code Editor
- Whiteboard
- Session Recording
- AI DSA Assistant
- Shared Timer
- Multiple rooms / room codes
- SFU backend for larger groups

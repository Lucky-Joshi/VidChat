# User Flow

## First-Time User (any participant)

Open App
    ↓
Type Display Name
    ↓
Continue
    ↓
Allow Camera
    ↓
Allow Microphone
    ↓
Join Room
    ↓
See Participant Grid (self tile)
    ↓
Wait For Others / Connect Automatically
    ↓
Talk, Toggle Camera/Mic, Share Screen
    ↓
Leave Call

## Returning User

Open App
    ↓
Name Pre-Filled (localStorage)
    ↓
Continue → straight into the room

## Additional Participants

Each new person who opens the app:
    ↓
Joins the same room
    ↓
Everyone sees their tile appear instantly
    ↓
Mesh connections form automatically
    ↓
Everyone can rename mid-call via Settings menu

--------------------------------

## Happy Path

User A opens app, enters name
        ↓
User B opens app, enters name
        ↓
Connection established (< 5s)
        ↓
Video visible both ways
        ↓
Audio active, speaking indicator works
        ↓
Screen shared for code walkthrough
        ↓
Call ended cleanly by either user

--------------------------------

## Failure Flows

Permission Denied
        ↓
Friendly error message with retry
        ↓
Retry Permissions

Invalid Name (empty / too long)
        ↓
Inline validation + server join-error
        ↓
Prompt to fix name

Names Appear But No Video/Audio (NAT blocked media path)
        ↓
Console shows [ICE] FAILED diagnostics
        ↓
Fix: configure TURN credentials in build env vars and redeploy
        ↓
Rejoin call

Socket Disconnects Mid-Call
        ↓
Auto-reconnect with backoff
        ↓
Session reset → peers rebuilt from fresh participants snapshot

Peer Connection Fails Mid-Call
        ↓
Automatic ICE restart
        ↓
If still failed → toast notification, connection status banner

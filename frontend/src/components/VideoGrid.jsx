import { ParticipantVideo } from './ParticipantVideo';

function getGridColumnCount(participantCount) {
  if (participantCount <= 1) return 1;
  if (participantCount <= 4) return 2;
  if (participantCount <= 9) return 3;
  return 4;
}

export function VideoGrid({
  remoteParticipants,
  remoteStreams,
  localVideoRef,
  displayName,
  isSharingScreen,
  isPartnerConnected,
  speakingIds,
}) {
  const gridClass = `participant-grid cols-${getGridColumnCount(remoteParticipants.length)}`;

  return (
    <div id="video-grid" className="video-grid">
      <div id="participant-grid" className={gridClass}>
        {remoteParticipants.map((participant) => (
          <ParticipantVideo
            key={participant.socketId}
            participant={participant}
            stream={remoteStreams[participant.socketId]}
            isSpeaking={speakingIds.has(participant.socketId)}
          />
        ))}

        {!isPartnerConnected && (
          <div className="video-placeholder grid-placeholder">
            <div className="placeholder-avatar">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <p className="placeholder-text">Waiting for your study partner...</p>
            <p className="placeholder-hint">
              Share this app link with your partner to get started
            </p>
          </div>
        )}
      </div>

      <div
        id="local-video-container"
        className={`local-video ${isSharingScreen ? 'screen-sharing-active' : ''}`}
      >
        <video
          id="local-video-element"
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="video-element"
        />
        <span className="video-label local-label">
          {isSharingScreen ? 'Sharing Screen' : `${displayName} (You)`}
        </span>
      </div>
    </div>
  );
}

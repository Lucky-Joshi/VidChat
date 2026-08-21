import { useEffect, useRef, useState } from 'react';
import { useCall } from '../hooks/useCall';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { PermissionPrompt } from '../components/PermissionPrompt';
import { VideoGrid } from '../components/VideoGrid';
import { ControlBar } from '../components/ControlBar';
import { Toast } from '../components/Toast';
import { NameEntry } from '../components/NameEntry';
import { SettingsMenu } from '../components/SettingsMenu';

function CallSession({ displayName, onEditName }) {
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);
  const toastTimerRef = useRef(null);

  const showToast = (message) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    setIsToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setIsToastVisible(false);
    }, 3000);
  };

  const call = useCall({ displayName, showToast });

  useEffect(() => {
    call.requestMedia();
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!call.joinError) {
      return;
    }
    showToast(call.joinError);
    call.dismissJoinError();
  }, [call.joinError, call.dismissJoinError]);

  useEffect(() => {
    if (!call.onUserLeft) {
      return;
    }
    call.onUserLeft(({ name }) => {
      showToast(name ? `${name} left the call` : 'A participant left the call');
    });
  }, [call.onUserLeft]);

  if (hasLeft) {
    return (
      <div className="permission-prompt">
        <div className="permission-card">
          <div className="permission-icon room-full-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
          <h2>You left the call</h2>
          <p className="permission-message">
            You can rejoin the study room whenever you are ready.
          </p>
          <button
            id="btn-rejoin-call"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Rejoin
          </button>
        </div>
      </div>
    );
  }

  if (call.isLoading) {
    return (
      <div id="loading-screen" className="loading-screen">
        <div className="loading-content">
          <div className="loading-brand">
            <h1 className="loading-title">VidChat</h1>
            <p className="loading-subtitle">Pair Programming Made Simple</p>
          </div>
          <div className="spinner" />
          <p className="loading-message">Accessing camera and microphone...</p>
        </div>
      </div>
    );
  }

  if (call.permissionError) {
    return (
      <PermissionPrompt
        permissionError={call.permissionError}
        onRetry={call.retryPermissions}
      />
    );
  }

  const isPartnerConnected = call.remoteParticipants.length > 0;

  return (
    <div id="call-container" className="call-container">
      <ConnectionStatus state={call.connectionState} />

      <SettingsMenu displayName={displayName} onChangeName={onEditName} />

      <VideoGrid
        remoteParticipants={call.remoteParticipants}
        remoteStreams={call.remoteStreams}
        localVideoRef={call.localVideoRef}
        displayName={displayName}
        isSharingScreen={call.isSharingScreen}
        isPartnerConnected={isPartnerConnected}
        speakingIds={call.speakingIds}
      />

      <ControlBar
        isMicEnabled={call.isMicEnabled}
        isCamEnabled={call.isCamEnabled}
        isSharingScreen={call.isSharingScreen}
        isPartnerConnected={isPartnerConnected}
        onToggleMic={call.toggleMic}
        onToggleCam={call.toggleCam}
        onSwitchCamera={call.switchCamera}
        onStartScreenShare={call.startScreenShare}
        onStopScreenShare={call.stopScreenShare}
        onLeaveCall={() => {
          setHasLeft(true);
          call.leaveCall();
        }}
      />
      <Toast message={toastMessage} visible={isToastVisible} />
    </div>
  );
}

export function CallPage() {
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('displayName'));
  const [isEditingName, setIsEditingName] = useState(false);

  if (!displayName) {
    return (
      <NameEntry
        onSubmit={(name) => {
          localStorage.setItem('displayName', name);
          setDisplayName(name);
        }}
      />
    );
  }

  return (
    <>
      <CallSession
        key="call-session"
        displayName={displayName}
        onEditName={() => setIsEditingName(true)}
      />
      {isEditingName && (
        <NameEntry
          isModal
          initialName={displayName}
          onSubmit={(name) => {
            localStorage.setItem('displayName', name);
            setDisplayName(name);
            setIsEditingName(false);
          }}
          onCancel={() => setIsEditingName(false)}
        />
      )}
    </>
  );
}

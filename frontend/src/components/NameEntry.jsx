import { useState } from 'react';
import { validateDisplayName, NAME_MAX_LENGTH } from '../utils/validation';

export function NameEntry({ initialName, onSubmit, onCancel, isModal = false }) {
  const [value, setValue] = useState(initialName ?? '');
  const [error, setError] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = validateDisplayName(value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onSubmit(result.name);
  };

  const handleChange = (event) => {
    setValue(event.target.value);
    if (error) {
      setError(null);
    }
  };

  return (
    <div className={isModal ? 'name-modal-overlay' : 'name-entry-screen'}>
      <form className="name-card" onSubmit={handleSubmit}>
        <div className="name-brand">
          <h1 className="loading-title">VidChat</h1>
          <p className="loading-subtitle">Pair Programming Made Simple</p>
        </div>

        <h2 className="name-question">What&apos;s your name?</h2>
        <p className="name-hint">
          Your name is shown to other participants in the call.
        </p>

        <input
          id="name-input"
          className={`name-input ${error ? 'name-input-error' : ''}`}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Enter your name"
          maxLength={NAME_MAX_LENGTH}
          autoFocus
          autoComplete="name"
        />
        {error && <p className="name-error">{error}</p>}

        <div className="name-actions">
          <button id="btn-continue-name" type="submit" className="btn btn-primary name-continue-btn">
            Continue
          </button>
          {isModal && onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

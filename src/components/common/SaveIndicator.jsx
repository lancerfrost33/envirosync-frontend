import React, { useMemo } from 'react';
import { Check, Loader2 } from 'lucide-react';
import './SaveIndicator.css';

/**
 * SaveIndicator component shows auto-save status
 * @param {boolean} isSaving - Whether currently saving
 * @param {Date} lastSaved - Timestamp of last save
 * @param {string} position - Position: 'top' (header) or 'inline' (within form)
 * @returns {JSX.Element}
 */
const SaveIndicator = ({ isSaving = false, lastSaved = null, position = 'top' }) => {
  // Format the last saved time
  const formattedLastSaved = useMemo(() => {
    if (!lastSaved) return null;

    const now = new Date();
    const diffMs = now - lastSaved;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 1) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return lastSaved.toLocaleDateString();
  }, [lastSaved]);

  const containerClass = `save-indicator save-indicator-${position}`;

  return (
    <div className={containerClass}>
      <div className="save-indicator-content">
        {isSaving ? (
          <>
            <Loader2 size={16} className="save-indicator-spinner" />
            <span className="save-indicator-text saving">Saving...</span>
          </>
        ) : lastSaved ? (
          <>
            <Check size={16} className="save-indicator-check" />
            <span className="save-indicator-text saved">Saved {formattedLastSaved}</span>
          </>
        ) : (
          <span className="save-indicator-text unsaved">Unsaved changes</span>
        )}
      </div>
    </div>
  );
};

export default SaveIndicator;

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { X, ArrowRight, Wand2 } from 'lucide-react';
import './WelcomeBackModal.css';

// Empty array constant to avoid new reference each render
const EMPTY_DRAFTS = [];

/**
 * WelcomeBackModal - Shows on login if user has incomplete drafts
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Array} props.drafts - Array of draft objects with id, fileName, currentStage, route, label, lastModified
 * @param {Function} props.onClose - Called when modal should close
 * @param {Function} props.onResume - Called when user clicks resume (receives draftId and route)
 */
function WelcomeBackModal({ isOpen = false, drafts, onClose, onResume }) {
  const [dontShowToday, setDontShowToday] = useState(false);
  
  // Use stable reference for drafts
  const safeDrafts = drafts || EMPTY_DRAFTS;

  // Memoize sorted drafts to avoid infinite loops
  const displayedDrafts = useMemo(() => {
    if (!safeDrafts || !Array.isArray(safeDrafts) || safeDrafts.length === 0) {
      return EMPTY_DRAFTS;
    }
    return [...safeDrafts]
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 3);
  }, [safeDrafts]);

  const handleClose = useCallback(() => {
    if (dontShowToday) {
      // Store preference in localStorage to not show again today
      const today = new Date().toDateString();
      localStorage.setItem('envirosync.welcomeModal.dismissedDate', today);
    }
    onClose?.();
  }, [dontShowToday, onClose]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleOverlayClick = (e) => {
    // Close only if clicking directly on overlay
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleResume = useCallback((draft) => {
    if (dontShowToday) {
      const today = new Date().toDateString();
      localStorage.setItem('envirosync.welcomeModal.dismissedDate', today);
    }
    onResume?.(draft.id, draft.route);
  }, [dontShowToday, onResume]);

  const formatTimeAgo = (date) => {
    if (!date) return 'Recently';
    
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="welcome-modal-overlay" onClick={handleOverlayClick}>
      <div className="welcome-modal-container">
        {/* Header with close button */}
        <div className="welcome-modal-header">
          <div className="welcome-modal-title-section">
            <span className="welcome-modal-icon">👋</span>
            <div>
              <h2 className="welcome-modal-title">Welcome back!</h2>
              <p className="welcome-modal-subtitle">You have {displayedDrafts.length} incomplete assessment{displayedDrafts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="welcome-modal-close-btn"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Drafts list */}
        <div className="welcome-modal-content">
          <div className="welcome-modal-drafts-list">
            {displayedDrafts.map((draft) => (
              <div key={draft.id} className="welcome-modal-draft-item">
                <div className="welcome-draft-icon-badge">
                  <Wand2 size={16} />
                </div>
                <div className="welcome-draft-details">
                  <p className="welcome-draft-name">{draft.fileName}</p>
                  <p className="welcome-draft-meta">
                    <span className="welcome-draft-stage">{draft.label}</span>
                    <span className="welcome-draft-separator">•</span>
                    <span className="welcome-draft-time">{formatTimeAgo(draft.lastModified)}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleResume(draft)}
                  className="welcome-draft-resume-btn"
                  aria-label={`Resume ${draft.fileName}`}
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* More drafts indicator */}
          {drafts.length > 3 && (
            <p className="welcome-modal-more-drafts">
              +{drafts.length - 3} more assessment{drafts.length - 3 !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="welcome-modal-footer">
          <label className="welcome-modal-checkbox">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
            />
            <span>Don't show this again today</span>
          </label>

          <div className="welcome-modal-buttons">
            {drafts.length > 3 && (
              <a href="/dashboard/drafts" className="welcome-modal-view-all-btn">
                View All Drafts
                <ArrowRight size={16} />
              </a>
            )}
            <button 
              onClick={handleClose}
              className="welcome-modal-dismiss-btn"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeBackModal;

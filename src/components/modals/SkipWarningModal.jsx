import React from 'react';
import { AlertCircle, ChevronRight, X } from 'lucide-react';
import './SkipWarningModal.css';

/**
 * SkipWarningModal Component
 * Shows warning when user tries to skip without completing required fields
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {Function} props.onClose - Called when user closes modal
 * @param {Function} props.onConfirm - Called when user confirms skip
 * @param {Array} props.missingFields - List of incomplete field names
 * @param {string} props.currentPage - Current workflow stage
 * @param {string} props.nextPage - Next workflow stage
 * @returns {JSX.Element}
 */
const SkipWarningModal = ({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  missingFields = [],
  currentPage = 'Current Step',
  nextPage = 'Next Step',
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div className="skip-warning-overlay">
      <div className="skip-warning-modal">
        {/* Header */}
        <div className="skip-warning-header">
          <div className="skip-warning-title-bar">
            <AlertCircle size={24} className="warning-icon" />
            <h2 className="skip-warning-title">Incomplete Data</h2>
          </div>
          <button
            className="skip-warning-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="skip-warning-content">
          <p className="skip-warning-message">
            You're about to skip <strong>{currentPage}</strong> with incomplete data. The following fields are missing:
          </p>

          {/* Missing Fields List */}
          <ul className="missing-fields-list">
            {missingFields.map((field, index) => (
              <li key={index} className="missing-field-item">
                <span className="missing-field-bullet">•</span>
                <span className="missing-field-name">{field}</span>
              </li>
            ))}
          </ul>

          <div className="skip-warning-info">
            <p>
              You can still continue to <strong>{nextPage}</strong>, but you'll need to complete these
              fields later or use the "Back" button to fill them in now.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="skip-warning-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Go Back & Complete
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            Skip Anyway
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkipWarningModal;

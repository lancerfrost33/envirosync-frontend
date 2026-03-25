import React from 'react';
import { ChevronLeft, ChevronRight, LogOut, SkipForward } from 'lucide-react';
import './PageNavigation.css';

/**
 * PageNavigation Component
 * Reusable navigation controls for workflow pages
 * Provides: Back, Save & Exit, Skip to Next buttons
 *
 * @param {Object} props
 * @param {Function} props.onBack - Callback when "Back" clicked
 * @param {Function} props.onSaveExit - Callback when "Save & Exit" clicked
 * @param {Function} props.onNext - Callback when "Next" clicked
 * @param {Function} props.onSkip - Callback when "Skip" clicked
 * @param {string} props.currentPage - Current workflow stage for display
 * @param {string} props.nextPage - Next workflow stage for display
 * @param {boolean} props.isLoading - Disable buttons while loading
 * @param {boolean} props.showSkip - Show skip button (default: true)
 * @param {string} props.position - 'bottom' (default) or 'sticky'
 * @returns {JSX.Element}
 */
const PageNavigation = ({
  onBack = () => {},
  onSaveExit = () => {},
  onNext = () => {},
  onSkip = () => {},
  currentPage = 'Step',
  nextPage = 'Next Step',
  isLoading = false,
  showSkip = true,
  position = 'bottom',
}) => {
  const containerClassName = `page-navigation page-navigation--${position}`;

  return (
    <div className={containerClassName}>
      <div className="page-navigation-container">
        {/* Left: Back Button */}
        <button
          className="nav-btn nav-btn--back"
          onClick={onBack}
          disabled={isLoading}
          aria-label="Go back to previous page"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>

        {/* Center: Page Info */}
        <div className="nav-page-info">
          <span className="nav-current-page">{currentPage}</span>
        </div>

        {/* Right: Action Buttons */}
        <div className="nav-actions">
          {/* Save & Exit Button */}
          <button
            className="nav-btn nav-btn--secondary"
            onClick={onSaveExit}
            disabled={isLoading}
            title="Save progress and return to dashboard"
            aria-label="Save and exit to dashboard"
          >
            <LogOut size={18} />
            <span className="nav-btn-text">Save & Exit</span>
          </button>

          {/* Skip Button (if shown) */}
          {showSkip && (
            <button
              className="nav-btn nav-btn--secondary nav-btn--skip"
              onClick={onSkip}
              disabled={isLoading}
              title="Skip to next step (data will be saved)"
              aria-label={`Skip to ${nextPage}`}
            >
              <SkipForward size={18} />
              <span className="nav-btn-text">Skip</span>
            </button>
          )}

          {/* Next Button (Primary) */}
          <button
            className="nav-btn nav-btn--primary"
            onClick={onNext}
            disabled={isLoading}
            title={`Continue to ${nextPage}`}
            aria-label={`Continue to ${nextPage}`}
          >
            <span className="nav-btn-text">
              Continue to {nextPage}
            </span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageNavigation;

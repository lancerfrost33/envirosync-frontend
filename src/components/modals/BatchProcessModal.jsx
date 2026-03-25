import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Loader2, X } from 'lucide-react';
import './BatchProcessModal.css';

/**
 * BatchProcessModal Component
 * Shows real-time progress of batch processing with individual file status
 * 
 * @param {boolean} isOpen - Modal visibility
 * @param {Array} projects - Projects being processed
 * @param {Function} onClose - Called when modal closes
 * @param {Function} onCancel - Called to cancel processing
 * @param {Object} progress - Progress tracking { projectId: 'processing'|'completed'|'failed' }
 * @param {Object} results - Final results from batch processing
 * @param {boolean} isProcessing - Whether still processing
 */
const BatchProcessModal = ({
  isOpen = false,
  projects = [],
  onClose = () => {},
  onCancel = () => {},
  progress = {},
  results = null,
  isProcessing = false,
}) => {
  const [displayedProjects, setDisplayedProjects] = useState([]);
  const [scrollToBottom, setScrollToBottom] = useState(true);

  // Update displayed projects with status
  useEffect(() => {
    const updated = projects.map((proj) => ({
      id: proj.id,
      fileName: proj.fileName,
      status: progress[proj.id] || 'pending',
    }));
    setDisplayedProjects(updated);
  }, [projects, progress]);

  if (!isOpen) return null;

  const processedCount = Object.values(progress).filter((s) => s !== 'pending').length;
  const totalCount = projects.length;
  const progressPercentage = Math.round((processedCount / totalCount) * 100);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Check size={18} className="status-icon success" />;
      case 'failed':
        return <AlertCircle size={18} className="status-icon error" />;
      case 'processing':
        return <Loader2 size={18} className="status-icon processing" />;
      default:
        return <div className="status-icon pending" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing...';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="batch-modal-overlay">
      <div className="batch-modal-container">
        {/* Header */}
        <div className="batch-modal-header">
          <h2 className="batch-modal-title">
            {isProcessing ? '⚙️ Processing Projects' : '✨ Processing Complete'}
          </h2>
          {!isProcessing && (
            <button className="batch-modal-close" onClick={onClose} aria-label="Close modal">
              <X size={24} />
            </button>
          )}
        </div>

        {/* Progress Section */}
        {isProcessing && (
          <div className="batch-modal-progress">
            <div className="progress-header">
              <span className="progress-text">Processing {processedCount} of {totalCount} files...</span>
              <span className="progress-percentage">{progressPercentage}%</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Files List */}
        <div className="batch-modal-content">
          <div className="files-list">
            {displayedProjects.map((proj) => (
              <div
                key={proj.id}
                className={`file-item file-item--${proj.status}`}
                role="status"
                aria-label={`${proj.fileName} - ${getStatusText(proj.status)}`}
              >
                <div className="file-item-left">
                  {getStatusIcon(proj.status)}
                  <span className="file-name">{proj.fileName}</span>
                </div>
                <span className="file-status">{getStatusText(proj.status)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Results Summary (shown after processing) */}
        {!isProcessing && results && (
          <div className="batch-modal-results">
            <div className={`results-summary ${results.summary.failed === 0 ? 'success' : 'partial'}`}>
              <h3 className="results-title">
                {results.summary.successful === results.summary.total
                  ? '🎉 All projects processed successfully!'
                  : `⚠️ ${results.summary.successful} of ${results.summary.total} completed`}
              </h3>

              <div className="results-stats">
                <div className="stat">
                  <span className="stat-label">Successful</span>
                  <span className="stat-value success">{results.summary.successful}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Failed</span>
                  <span className="stat-value error">{results.summary.failed}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Duration</span>
                  <span className="stat-value">
                    {results.summary.duration ? `${Math.round(results.summary.duration / 1000)}s` : '0s'}
                  </span>
                </div>
              </div>

              {/* Failed Projects List */}
              {results.failed && results.failed.length > 0 && (
                <div className="failed-projects">
                  <h4 className="failed-title">Failed Projects:</h4>
                  <ul className="failed-list">
                    {results.failed.map((failed) => (
                      <li key={failed.projectId} className="failed-item">
                        <AlertCircle size={16} className="failed-icon" />
                        <div className="failed-info">
                          <span className="failed-name">{failed.fileName}</span>
                          <span className="failed-error">{results.errors[failed.projectId]}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="batch-modal-footer">
          {isProcessing ? (
            <button className="btn btn-cancel" onClick={onCancel}>
              <X size={18} />
              Cancel Processing
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchProcessModal;

/**
 * BATCH PROCESSING INTEGRATION EXAMPLE
 * 
 * Shows how to integrate batch processing into DraftsPage.jsx
 * This includes:
 * 1. Selection state management
 * 2. Starting batch processing
 * 3. Progress tracking
 * 4. Toast notifications
 * 5. Handling results
 */

// ============================================
// IMPORTS TO ADD
// ============================================

import React, { useState, useCallback } from 'react';
import { useDrafts } from '../../context/ProjectContext';
import BatchProcessModal from '../../components/modals/BatchProcessModal';
import { processBatchProjects } from '../../utils/batchProcessor';
import { CheckCircle, AlertCircle } from 'lucide-react';

// ============================================
// TOAST NOTIFICATION HELPER (simple version)
// ============================================

const showToast = (message, type = 'success', duration = 3000) => {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10B981' : '#EF4444'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 2000;
    animation: slideUp 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// ============================================
// DRAFTS PAGE COMPONENT WITH BATCH PROCESSING
// ============================================

const DraftsPage = () => {
  const drafts = useDrafts(); // Get all draft projects

  // Selection state
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  // Batch processing state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({}); // { projectId: 'processing'|'completed'|'failed' }
  const [batchResults, setBatchResults] = useState(null);

  // ============================================
  // SELECTION HANDLERS
  // ============================================

  const handleSelectProject = useCallback((projectId) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProjectIds.length === drafts.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(drafts.map((d) => d.id));
    }
  }, [selectedProjectIds.length, drafts.length, drafts]);

  // ============================================
  // BATCH PROCESSING HANDLERS
  // ============================================

  const handleStartBatchProcess = useCallback(async () => {
    if (selectedProjectIds.length === 0) {
      showToast('Please select at least one project', 'error');
      return;
    }

    // Get selected projects
    const selectedProjects = drafts.filter((d) => selectedProjectIds.includes(d.id));

    // Show modal
    setShowBatchModal(true);
    setBatchProgress({});
    setBatchResults(null);
    setIsProcessing(true);

    try {
      // Call batch processing with progress callback
      const results = await processBatchProjects(selectedProjects, {
        parallel: false, // Sequential: process one at a time
        autoGenerateReports: true,
        onProgress: (projectId, status) => {
          // Update progress state for UI
          setBatchProgress((prev) => ({
            ...prev,
            [projectId]: status,
          }));
        },
      });

      // Store results
      setBatchResults(results);
      setIsProcessing(false);

      // Show completion toast
      if (results.summary.failed === 0) {
        showToast(
          `✨ Successfully processed ${results.summary.successful} projects!`,
          'success',
          4000
        );
      } else {
        showToast(
          `⚠️ ${results.summary.successful} succeeded, ${results.summary.failed} failed`,
          'error',
          4000
        );
      }

      // Clear selection after successful processing
      if (results.summary.failed === 0) {
        setSelectedProjectIds([]);
      }
    } catch (error) {
      console.error('Batch processing error:', error);
      showToast('Error during batch processing', 'error');
      setIsProcessing(false);
    }
  }, [selectedProjectIds, drafts]);

  const handleCancelBatchProcess = useCallback(() => {
    setIsProcessing(false);
    setShowBatchModal(false);
    setBatchProgress({});
    showToast('Batch processing cancelled', 'error');
  }, []);

  const handleCloseBatchModal = useCallback(() => {
    setShowBatchModal(false);
    setBatchProgress({});
    setBatchResults(null);
  }, []);

  // ============================================
  // JSX EXAMPLE
  // ============================================

  return (
    <div className="drafts-page">
      {/* Header with selection controls */}
      <div className="drafts-header">
        <h1>My Drafts</h1>

        {selectedProjectIds.length > 0 && (
          <div className="selection-info">
            <span>{selectedProjectIds.length} selected</span>
            <button
              className="btn-batch-process"
              onClick={handleStartBatchProcess}
              disabled={isProcessing}
            >
              Process Selected ({selectedProjectIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Drafts List */}
      <div className="drafts-list">
        {/* Select All Checkbox */}
        {drafts.length > 0 && (
          <div className="draft-item draft-select-all">
            <input
              type="checkbox"
              checked={selectedProjectIds.length === drafts.length}
              onChange={handleSelectAll}
              id="select-all-drafts"
            />
            <label htmlFor="select-all-drafts">Select All ({drafts.length})</label>
          </div>
        )}

        {/* Individual Draft Items */}
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className={`draft-item ${selectedProjectIds.includes(draft.id) ? 'selected' : ''}`}
          >
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={selectedProjectIds.includes(draft.id)}
              onChange={() => handleSelectProject(draft.id)}
              id={`draft-${draft.id}`}
            />

            {/* Draft Info */}
            <label htmlFor={`draft-${draft.id}`} className="draft-info">
              <div className="draft-name">{draft.fileName}</div>
              <div className="draft-meta">
                {draft.currentStage} • Last modified{' '}
                {draft.lastModified.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </label>

            {/* Action Buttons */}
            <div className="draft-actions">
              <button className="btn-continue">Continue</button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {drafts.length === 0 && (
          <div className="empty-state">
            <p>No draft projects yet.</p>
            <p>Start by uploading a file to create a new assessment.</p>
          </div>
        )}
      </div>

      {/* Batch Processing Modal */}
      <BatchProcessModal
        isOpen={showBatchModal}
        projects={drafts.filter((d) => selectedProjectIds.includes(d.id))}
        onClose={handleCloseBatchModal}
        onCancel={handleCancelBatchProcess}
        progress={batchProgress}
        results={batchResults}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default DraftsPage;

// ============================================
// ADDITIONAL CSS FOR SELECTION UI
// ============================================

/*
.drafts-page {
  padding: 40px 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.drafts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.selection-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn-batch-process {
  background: linear-gradient(135deg, #379c8a, #2d8b7a);
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-batch-process:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(55, 156, 138, 0.4);
}

.btn-batch-process:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.draft-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  transition: all 0.2s ease;
}

.draft-item input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.draft-item.selected {
  background: #f0fdf4;
  border-color: #10b981;
}

.draft-select-all {
  background: #f9fafb;
  font-weight: 600;
}

.draft-info {
  flex: 1;
  cursor: pointer;
}

.draft-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.draft-meta {
  font-size: 14px;
  color: #6b7280;
}

.draft-actions {
  display: flex;
  gap: 8px;
}

.btn-continue {
  background: white;
  color: #379c8a;
  border: 1px solid #379c8a;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-continue:hover {
  background: #f0fdf4;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}
*/

// ============================================
// HOW TO TEST BATCH PROCESSING
// ============================================

/*
1. Navigate to /dashboard/drafts
2. Create or load some draft projects
3. Check the checkboxes next to projects
4. Click "Process Selected" button
5. Modal opens showing individual file progress
6. Files are processed sequentially (2-3 seconds each)
7. See green checkmarks for success, red X for failures
8. At the end, see summary with stats
9. Close modal and continue

To test with multiple projects:
- Set { parallel: true } in batchProcessing options to process all at once
- Check browser console for processing logs
- View localStorage to see updated project data
*/

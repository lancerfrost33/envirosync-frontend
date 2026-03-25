/**
 * EXAMPLE: Integrating auto-save into CategorizationPage.jsx
 * 
 * This shows the exact code changes needed. Apply these to your file.
 */

// ============================================
// 1. ADD THESE IMPORTS (top of file)
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';  // ADD useParams
import PageLayout from '../../components/common/PageLayout';
import SectionHeader from '../../components/common/SectionHeader';
import ProgressStepper from '../../components/common/ProgressStepper';
import SaveIndicator from '../../components/common/SaveIndicator';  // ADD THIS
import useAutoSave from '../../hooks/useAutoSave';              // ADD THIS
import { useProject } from '../../context/ProjectContext';      // ADD THIS
import './CategorizationPage.css';

// [rest of imports...]

// ============================================
// 2. ADD INSIDE COMPONENT (after const navigate = useNavigate())
// ============================================

const CategorizationPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();  // ADD THIS - Get projectId from URL
  const { project, updateData } = useProject(projectId);  // ADD THIS
  const [selectedRow, setSelectedRow] = useState(null);
  const [projectName, setProjectName] = useState('');

  // [existing state declarations...]
  // const [uploadedDocuments, setUploadedDocuments] = useState([...]);
  // const [extractionData, setExtractionData] = useState([...]);
  // const [currentPage, setCurrentPage] = useState(1);
  // etc.

  // ============================================
  // 3. ADD AUTO-SAVE DATA OBJECT (before useEffect)
  // ============================================
  
  // Prepare data for auto-save
  const autoSaveData = {
    extractedMaterials: extractionData,
    uploadedDocuments,
    currentPage,
    projectName,
  };

  // Initialize auto-save hook (2 second debounce)
  const { isSaving, lastSaved, saveNow } = useAutoSave(projectId, autoSaveData, 2000);

  // ============================================
  // 4. MODIFY handleSaveDraft FUNCTION
  // ============================================

  // REPLACE the existing handleSaveDraft with this:
  const handleSaveDraft = useCallback(() => {
    try {
      // Trigger immediate auto-save (bypasses debounce timer)
      saveNow();

      // Optional: Keep legacy localStorage save for backwards compatibility
      const payload = {
        files: uploadedDocuments.map((doc) => ({
          id: doc.id,
          name: doc.fileName,
          size: 0,
          addedAt: new Date().toISOString(),
          status: 'Draft',
          key: `${doc.fileName}::draft`,
        })),
        extractionData,
        currentPage,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('envirosync.categorization.draft.v1', JSON.stringify(payload));
      console.log('Draft saved to localStorage & ProjectContext');
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [uploadedDocuments, extractionData, currentPage, saveNow]);

  // ============================================
  // 5. UPDATE return() JSX
  // ============================================

  // Add SaveIndicator right after <PageLayout opens>:
  return (
    <div className="categorization-page">
      <PageLayout
        title=""
        subtitle=""
        showNavbar={false}
        showHeader={true}
        showFooter={true}
        maxWidth="1440px"
      >
        {/* ADD THIS: Save Status Indicator */}
        <SaveIndicator 
          isSaving={isSaving}
          lastSaved={lastSaved}
          position="top"
        />

        {/* Progress Stepper */}
        <ProgressStepper 
          currentStage="categorization"
          completedStages={['upload']}
          onStageClick={(stageId) => {
            if (stageId === 'upload') {
              navigate('/upload');
            }
          }}
        />

        {/* Rest of your existing JSX... */}
        {/* ... */}
      </PageLayout>
    </div>
  );
};

export default CategorizationPage;

// ============================================
// WHAT THIS ACCOMPLISHES
// ============================================
// 1. Auto-saves extractionData every 2 seconds (debounced)
// 2. Saves to ProjectContext instead of just localStorage
// 3. Shows "Saving..." spinner during save
// 4. Shows green "Saved 30s ago" after save completes
// 5. Existing "Save Draft" button still works, now triggers immediate save
// 6. Data persists in browser localStorage AND in ProjectContext

// ============================================
// DEBUGGING: Check if auto-save is working
// ============================================
// Open DevTools (F12) and run:
// 1. Check localStorage:
//    localStorage.getItem('envirosync_projects')
// 2. You should see your projectId and auto-saved data
// 3. Edit a field in the form
// 4. Wait 2 seconds - "Saving..." should appear
// 5. Check localStorage again - data should be updated

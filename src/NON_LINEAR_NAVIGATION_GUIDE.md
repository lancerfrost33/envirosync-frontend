/**
 * NON-LINEAR NAVIGATION INTEGRATION GUIDE
 * 
 * How to integrate PageNavigation and SkipWarningModal
 * into workflow pages (Categorization, Calculation, Suggestions, Analysis)
 */

// ============================================
// COMPONENTS CREATED
// ============================================

/**
 * 1. PageNavigation (src/components/common/PageNavigation.jsx)
 *    Reusable navigation buttons component
 *    
 *    Props:
 *    - onBack: callback when "Back" clicked
 *    - onSaveExit: callback for "Save & Exit"
 *    - onNext: callback for "Continue to Next" (primary button)
 *    - onSkip: callback for "Skip" button
 *    - currentPage: display name of current step
 *    - nextPage: display name of next step
 *    - isLoading: disable buttons while processing
 *    - showSkip: show/hide skip button
 *    - position: 'bottom' (default) or 'sticky'
 *    
 *    Buttons:
 *    ← Back | CURRENT STEP | Save & Exit | Skip | Continue to NEXT →
 */

/**
 * 2. SkipWarningModal (src/components/modals/SkipWarningModal.jsx)
 *    Modal that shows when trying to skip without completing fields
 *    
 *    Props:
 *    - isOpen: show/hide modal
 *    - onClose: dismiss modal
 *    - onConfirm: user confirmed skip
 *    - missingFields: array of incomplete field names
 *    - currentPage: current workflow stage
 *    - nextPage: destination workflow stage
 *    
 *    Shows:
 *    - Warning icon + title
 *    - List of incomplete fields
 *    - Info message about consequences
 *    - "Go Back & Complete" and "Skip Anyway" buttons
 */

// ============================================
// STEP 1: IDENTIFY REQUIRED FIELDS
// ============================================

/**
 * For each page, define which fields are required.
 * Only show skip warning if required fields are missing.
 */

// Example for CategorizationPage:
const REQUIRED_FIELDS_CATEGORIZATION = {
  extractionData: 'Material extraction data',
  uploadedDocuments: 'Uploaded documents',
};

// Example for CalculationPage:
const REQUIRED_FIELDS_CALCULATION = {
  calculationResults: 'Calculation results',
};

// Example for SuggestionsPage:
const REQUIRED_FIELDS_SUGGESTIONS = {
  evaluatedSuggestions: 'Evaluated suggestions',
};

// Example for AnalysisPage:
const REQUIRED_FIELDS_ANALYSIS = {
  analysisNotes: 'Analysis notes',
};

/**
 * Function to check if required fields are filled:
 */
const getMissingFields = (data, requiredFields) => {
  return Object.entries(requiredFields)
    .filter(([key, label]) => {
      const value = data[key];
      // Check if field is empty/null/undefined
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return !value;
    })
    .map(([_, label]) => label);
};

// ============================================
// STEP 2: COMPLETE INTEGRATION EXAMPLE
// ============================================

/**
 * FULL CategorizationPage.jsx integration:
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import useAutoSave from '../../hooks/useAutoSave';
import SaveIndicator from '../../components/common/SaveIndicator';
import ProgressStepper from '../../components/common/ProgressStepper';
import PageNavigation from '../../components/common/PageNavigation';
import SkipWarningModal from '../../components/modals/SkipWarningModal';
import PageLayout from '../../components/common/PageLayout';

const CategorizationPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { project, updateData, updateProjectStage } = useProject(projectId);

  // Page state
  const [extractionData, setExtractionData] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Navigation state
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const REQUIRED_FIELDS = {
    extractionData: 'Material extraction data',
    uploadedDocuments: 'Document uploads',
  };

  // ============================================
  // LOAD DATA FROM PROJECT CONTEXT ON MOUNT
  // ============================================

  useEffect(() => {
    if (project?.data) {
      // Load from project context if resuming
      if (project.data.extractedMaterials) {
        setExtractionData(project.data.extractedMaterials);
      }
      if (project.data.uploadedDocuments) {
        setUploadedDocuments(project.data.uploadedDocuments);
      }
    } else {
      // Load from localStorage (legacy)
      try {
        const raw = localStorage.getItem('envirosync.categorization.draft.v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.extractionData) setExtractionData(parsed.extractionData);
          if (parsed.uploadedDocuments) setUploadedDocuments(parsed.uploadedDocuments);
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, [project?._id]);

  // ============================================
  // AUTO-SAVE SETUP
  // ============================================

  const autoSaveData = {
    extractedMaterials: extractionData,
    uploadedDocuments,
    currentPage,
  };

  const { isSaving, lastSaved, saveNow } = useAutoSave(projectId, autoSaveData, 2000);

  // ============================================
  // SAVE TO PROJECT CONTEXT
  // ============================================

  const saveToProjectContext = useCallback(async () => {
    if (!projectId) return;

    try {
      // Save data to ProjectContext
      await updateData({
        extractedMaterials: extractionData,
        uploadedDocuments,
        currentPage,
      });

      // Also save to localStorage for backwards compatibility
      localStorage.setItem(
        'envirosync.categorization.draft.v1',
        JSON.stringify({
          extractionData,
          uploadedDocuments,
          currentPage,
          savedAt: new Date().toISOString(),
        })
      );

      return true;
    } catch (error) {
      console.error('Failed to save:', error);
      return false;
    }
  }, [projectId, extractionData, uploadedDocuments, currentPage, updateData]);

  // ============================================
  // NAVIGATION HANDLERS
  // ============================================

  const handleBack = useCallback(async () => {
    await saveToProjectContext();
    navigate('/upload');
  }, [saveToProjectContext, navigate]);

  const handleSaveExit = useCallback(async () => {
    setIsLoading(true);
    const saved = await saveToProjectContext();
    setIsLoading(false);

    if (saved) {
      navigate('/dashboard');
    }
  }, [saveToProjectContext, navigate]);

  const handleNext = useCallback(async () => {
    // For normal next, don't check for required fields
    setIsLoading(true);
    const saved = await saveToProjectContext();
    setIsLoading(false);

    if (saved) {
      // Update project stage to "calculation"
      await updateProjectStage('calculation');
      navigate('/calculation');
    }
  }, [saveToProjectContext, navigate, updateProjectStage]);

  const handleSkip = useCallback(() => {
    // Check if required fields are missing
    const dataToCheck = {
      extractionData: extractionData.length > 0 ? extractionData : null,
      uploadedDocuments: uploadedDocuments.length > 0 ? uploadedDocuments : null,
    };

    const missingFields = getMissingFields(dataToCheck, REQUIRED_FIELDS);

    if (missingFields.length > 0) {
      // Show warning modal
      setShowSkipWarning(true);
      setPendingNavigation('calculation');
    } else {
      // Safe to skip - proceed
      handleSkipConfirmed('calculation');
    }
  }, [extractionData, uploadedDocuments]);

  const handleSkipConfirmed = useCallback(async (nextRoute) => {
    setIsLoading(true);
    const saved = await saveToProjectContext();
    setIsLoading(false);

    setShowSkipWarning(false);
    setPendingNavigation(null);

    if (saved) {
      const routeMap = {
        calculation: '/calculation',
        suggestion: '/suggestions',
        analysis: '/analysis',
        report: '/report',
      };
      navigate(routeMap[nextRoute] || '/calculation');
    }
  }, [saveToProjectContext, navigate]);

  // ============================================
  // JSX STRUCTURE
  // ============================================

  return (
    <div className="categorization-page">
      <PageLayout showNavbar={false} showHeader={true} showFooter={false}>
        {/* Save Indicator */}
        <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} position="top" />

        {/* Progress Stepper */}
        <ProgressStepper
          currentStage="categorization"
          completedStages={['upload']}
          onStageClick={(stageId) => {
            if (stageId === 'upload') navigate('/upload');
          }}
        />

        {/* Main Content */}
        <div className="categorization-content">
          {/* Your existing page content here */}
        </div>

        {/* Page Navigation */}
        <PageNavigation
          onBack={handleBack}
          onSaveExit={handleSaveExit}
          onNext={handleNext}
          onSkip={handleSkip}
          currentPage="OCR Review & Extraction"
          nextPage="Calculation"
          isLoading={isLoading}
          showSkip={true}
          position="bottom"
        />
      </PageLayout>

      {/* Skip Warning Modal */}
      <SkipWarningModal
        isOpen={showSkipWarning}
        onClose={() => setShowSkipWarning(false)}
        onConfirm={() => handleSkipConfirmed(pendingNavigation)}
        missingFields={getMissingFields(
          {
            extractionData: extractionData.length > 0 ? extractionData : null,
            uploadedDocuments: uploadedDocuments.length > 0 ? uploadedDocuments : null,
          },
          REQUIRED_FIELDS
        )}
        currentPage="OCR Review"
        nextPage="Calculation"
      />
    </div>
  );
};

// ============================================
// HELPER FUNCTION
// ============================================

const getMissingFields = (data, requiredFields) => {
  return Object.entries(requiredFields)
    .filter(([key, label]) => {
      const value = data[key];
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return !value || Object.keys(value).length === 0;
      return !value;
    })
    .map(([_, label]) => label);
};

export default CategorizationPage;

// ============================================
// APPLY TO OTHER PAGES
// ============================================

/**
 * Follow same pattern for:
 * - CalculationPage.jsx
 * - SuggestionsPage.jsx
 * - AnalysisPage.jsx
 * 
 * Key changes:
 * 1. Update currentPage/nextPage strings
 * 2. Update REQUIRED_FIELDS for each page
 * 3. Update navigation routes (calculate, suggestion, analysis, report)
 * 4. Update updateProjectStage calls with correct stage name
 * 5. Customize which fields show in skip warning
 */

// ============================================
// NAVIGATION FLOW DIAGRAM
// ============================================

/**
 * Upload Page
 *   ↓ (Continue)
 *   ↓ (Back)            ← Categorization Page
 *   ↓ (Save & Exit) → Dashboard
 *   ↓ (Skip) → ⚠️ Check validation → Yes → Calculation Page
 *                                    No → Shows warning modal
 *   ↓
 * Calculation Page
 *   ↓ (Continue to Suggestions)
 *   ↓ (Back to Categorization)
 *   ↓ (Save & Exit) → Dashboard
 *   ↓ (Skip to Analysis) → ⚠️ Check validation
 *   ↓
 * etc.
 */

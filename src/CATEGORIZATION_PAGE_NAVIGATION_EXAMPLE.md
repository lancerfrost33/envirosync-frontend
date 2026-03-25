/**
 * CATEGORIZATION PAGE INTEGRATION - COMPLETE EXAMPLE
 * 
 * Shows exact code to add navigation to CategorizationPage.jsx
 * Copy the entire component or apply changes step-by-step
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/common/PageLayout';
import SectionHeader from '../../components/common/SectionHeader';
import ProgressStepper from '../../components/common/ProgressStepper';
import SaveIndicator from '../../components/common/SaveIndicator'; // ADD THIS
import useAutoSave from '../../hooks/useAutoSave'; // ADD THIS
import PageNavigation from '../../components/common/PageNavigation'; // ADD THIS
import SkipWarningModal from '../../components/modals/SkipWarningModal'; // ADD THIS
import './CategorizationPage.css';

import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  RotateCw, Sparkles, Plus, AlertCircle, Trash2, Check, Save, Edit, X
} from 'lucide-react';

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

// ============================================
// COMPONENT
// ============================================

const CategorizationPage = () => {
  const navigate = useNavigate();

  // Define required fields for validation
  const REQUIRED_FIELDS = {
    extractionData: 'Material extraction data',
    uploadedDocuments: 'Document uploads',
  };

  // ============================================
  // EXISTING STATE (keep all original state)
  // ============================================

  const [selectedRow, setSelectedRow] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState([
    { id: 'doc-001', fileName: 'invoice_1.pdf', pageNumber: 1 },
    { id: 'doc-002', fileName: 'invoice_2.pdf', pageNumber: 2 },
    { id: 'doc-003', fileName: 'invoice_3.pdf', pageNumber: 3 },
    { id: 'doc-004', fileName: 'invoice_4.pdf', pageNumber: 4 }
  ]);

  const [extractionData, setExtractionData] = useState([
    {
      id: 1,
      materialName: 'Ready-mix Concrete (RC 20/25)',
      qty: '600',
      unit: 'm³',
      category: 'Concrete',
      isAccurate: true
    },
    // ... rest of initial data
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, uploadedDocuments.length);
  const [zoom, setZoom] = useState(100);
  const [isRescanning, setIsRescanning] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);

  // ============================================
  // NEW STATE FOR NAVIGATION (ADD THIS)
  // ============================================

  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const nowIso = () => new Date().toISOString();

  // ============================================
  // LOAD FROM CONTEXT ON MOUNT (ADD THIS)
  // ============================================

  useEffect(() => {
    // Load data from localStorage (existing functionality)
    try {
      const raw = localStorage.getItem('envirosync.categorization.draft.v1');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed) return;

      if (Array.isArray(parsed.files) && parsed.files.length > 0) {
        const docs = parsed.files.map((file, index) => ({
          id: String(file.id || `doc-${index + 1}`),
          fileName: String(file.name || `Document ${index + 1}`),
          pageNumber: index + 1,
        }));
        setUploadedDocuments(docs);
      }

      if (Array.isArray(parsed.extractionData) && parsed.extractionData.length > 0) {
        setExtractionData(parsed.extractionData);
      }

      if (typeof parsed.currentPage === 'number') {
        setCurrentPage(parsed.currentPage);
      }
    } catch {
      // ignore draft parse errors
    }
  }, []);

  // ============================================
  // AUTO-SAVE SETUP (ADD THIS)
  // ============================================

  const autoSaveData = {
    extractedMaterials: extractionData,
    uploadedDocuments,
    currentPage,
  };

  const { isSaving, lastSaved, saveNow } = useAutoSave(
    undefined, // projectId (optional)
    autoSaveData,
    2000 // 2 second debounce
  );

  // ============================================
  // SAVE TO STORAGE FUNCTION (ADD THIS)
  // ============================================

  const saveToStorage = useCallback(async () => {
    try {
      const payload = {
        files: uploadedDocuments.map((doc) => ({
          id: doc.id,
          name: doc.fileName,
          size: 0,
          addedAt: nowIso(),
          status: 'Draft',
          key: `${doc.fileName}::draft`,
        })),
        extractionData,
        currentPage,
        savedAt: nowIso(),
      };
      localStorage.setItem('envirosync.categorization.draft.v1', JSON.stringify(payload));
      console.log('Categorization draft saved');
      return true;
    } catch (error) {
      console.error('Error saving draft:', error);
      return false;
    }
  }, [uploadedDocuments, extractionData, currentPage]);

  // ============================================
  // NAVIGATION HANDLERS (ADD THESE)
  // ============================================

  const handleBack = useCallback(async () => {
    // Save before navigating
    const saved = await saveToStorage();
    if (saved) {
      navigate('/upload');
    }
  }, [saveToStorage, navigate]);

  const handleSaveExit = useCallback(async () => {
    setIsLoading(true);
    const saved = await saveToStorage();
    setIsLoading(false);

    if (saved) {
      navigate('/dashboard');
    }
  }, [saveToStorage, navigate]);

  const handleNext = useCallback(async () => {
    // Continue to Calculation page normally (no warning)
    setIsLoading(true);
    const saved = await saveToStorage();
    setIsLoading(false);

    if (saved) {
      navigate('/calculation');
    }
  }, [saveToStorage, navigate]);

  const handleSkip = useCallback(() => {
    // Check if required fields are missing before allowing skip
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
      // Safe to skip - proceed directly
      handleSkipConfirmed('calculation');
    }
  }, [extractionData, uploadedDocuments]);

  const handleSkipConfirmed = useCallback(async (nextRoute) => {
    setIsLoading(true);
    const saved = await saveToStorage();
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
  }, [saveToStorage, navigate]);

  // ============================================
  // EXISTING HANDLERS (keep all original handlers below)
  // ============================================

  const handleInputChange = useCallback((id, field, value) => {
    setExtractionData(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }, []);

  // ... rest of original handlers (handleAddRow, handleEditRow, etc)

  // ============================================
  // RETURN (JSX)
  // ============================================

  return (
    <div className="categorization-page">
      <PageLayout
        title=""
        subtitle=""
        showNavbar={false}
        showHeader={true}
        showFooter={false}
        maxWidth="1440px"
      >
        {/* ADD: Save Indicator */}
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

        {/* Main Content Section (EXISTING - keep everything below) */}
        <div className="categorization-content">
          <div className="content-header">
            <div className="header-text">
              <h1 className="page-title">OCR Review & Extraction</h1>
              <p className="page-subtitle">Verify the automatically extracted material data from your uploaded QTO.</p>
            </div>
            {/* ... rest of existing content ... */}
          </div>

          {/* ... keep all existing JSX for content ... */}
        </div>

        {/* ADD: Page Navigation at bottom */}
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

      {/* ADD: Skip Warning Modal */}
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

export default CategorizationPage;

// ============================================
// STEP-BY-STEP CHANGES SUMMARY
// ============================================

/**
 * 1. ADD IMPORTS (top of file)
 *    - SaveIndicator
 *    - useAutoSave hook
 *    - PageNavigation
 *    - SkipWarningModal
 * 
 * 2. ADD FUNCTION
 *    - getMissingFields (at top, before component)
 * 
 * 3. ADD STATE
 *    - showSkipWarning
 *    - pendingNavigation
 *    - isLoading
 * 
 * 4. ADD USEEFFECT (optional)
 *    - Load from context/localStorage (already have this)
 * 
 * 5. ADD AUTOSAVE
 *    - autoSaveData object
 *    - useAutoSave hook call
 * 
 * 6. ADD SAVE FUNCTION
 *    - saveToStorage (wraps existing localStorage logic)
 * 
 * 7. ADD NAVIGATION HANDLERS
 *    - handleBack
 *    - handleSaveExit
 *    - handleNext
 *    - handleSkip
 *    - handleSkipConfirmed
 * 
 * 8. KEEP ALL EXISTING HANDLERS
 *    - handleInputChange
 *    - handleAddRow
 *    - handleEditRow
 *    - etc.
 * 
 * 9. ADD TO JSX
 *    - <SaveIndicator /> after <PageLayout> opens
 *    - <PageNavigation /> before </PageLayout> closes
 *    - <SkipWarningModal /> before </div> closes
 */

// ============================================
// APPLY SAME PATTERN TO OTHER PAGES
// ============================================

/**
 * For CalculationPage.jsx:
 * - Change route paths and stage names
 * - Update REQUIRED_FIELDS for calculation page
 * - Update currentPage/nextPage strings
 * - Modify data to save (calculations, results, etc)
 * 
 * For SuggestionsPage.jsx:
 * - Similar pattern
 * - Suggestions may be optional (no warning on skip)
 * 
 * For AnalysisPage.jsx:
 * - Similar pattern
 * - Last step before report generation
 */

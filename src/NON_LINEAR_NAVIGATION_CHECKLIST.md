/**
 * QUICK INTEGRATION CHECKLIST
 * 
 * Step-by-step to add navigation to each workflow page
 */

// ============================================
// IMPORTS (Add to each page)
// ============================================

import { useNavigate, useParams } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import useAutoSave from '../../hooks/useAutoSave';
import SaveIndicator from '../../components/common/SaveIndicator';
import ProgressStepper from '../../components/common/ProgressStepper';
import PageNavigation from '../../components/common/PageNavigation';
import SkipWarningModal from '../../components/modals/SkipWarningModal';

// ============================================
// STATE TO ADD (each page)
// ============================================

const [showSkipWarning, setShowSkipWarning] = useState(false);
const [pendingNavigation, setPendingNavigation] = useState(null);
const [isLoading, setIsLoading] = useState(false);

// ============================================
// FOR EACH PAGE BELOW
// ============================================

// ============================================
// PAGE 1: CategorizationPage.jsx
// ============================================

/**
 * Current Stage: 'categorization'
 * Next Stage: 'calculation'
 * Previous Stage: 'upload'
 * 
 * Required Fields:
 *   - extractionData (array)
 *   - uploadedDocuments (array)
 * 
 * Data to Save:
 *   - extractedMaterials
 *   - uploadedDocuments
 *   - currentPage
 * 
 * Integration:
 *   1. Add state: showSkipWarning, pendingNavigation, isLoading
 *   2. Load from project.data.extractedMaterials on mount
 *   3. Add saveToProjectContext() function
 *   4. Add navigation handlers (handleBack, handleNext, handleSkip, etc)
 *   5. Add <PageNavigation> before closing </PageLayout>
 *   6. Add <SkipWarningModal> before closing </div>
 *   7. ProgressStepper: currentStage="categorization" completedStages={['upload']}
 */

// Navigation Routes:
// Back → '/upload'
// Save & Exit → '/dashboard'
// Next → '/calculation'
// Skip (with validation) → '/calculation'

// ============================================
// PAGE 2: CalculationPage.jsx (or Calculation.jsx)
// ============================================

/**
 * Current Stage: 'calculation'
 * Next Stage: 'suggestion'
 * Previous Stage: 'categorization'
 * 
 * Required Fields:
 *   - calculationResults (object)
 * 
 * Data to Save:
 *   - materials
 *   - results
 *   - selectedCategory
 * 
 * Integration:
 *   - Same pattern as CategorizationPage
 *   - Update stage names and required fields
 *   - Update routes
 */

// Navigation Routes:
// Back → '/categorization'
// Save & Exit → '/dashboard'
// Next → '/suggestions'
// Skip (with validation) → '/suggestions'

// ProgressStepper:
// currentStage="calculation" completedStages={['upload', 'categorization']}

// ============================================
// PAGE 3: SuggestionsPage.jsx
// ============================================

/**
 * Current Stage: 'suggestion'
 * Next Stage: 'analysis'
 * Previous Stage: 'calculation'
 * 
 * Required Fields:
 *   - evaluatedSuggestions (array)
 * 
 * Data to Save:
 *   - suggestions
 *   - selectedAlternatives
 *   - impactScores
 * 
 * Integration:
 *   - Same pattern
 *   - Fewer required fields (suggestions are optional to skip)
 */

// Navigation Routes:
// Back → '/calculation'
// Save & Exit → '/dashboard'
// Next → '/analysis'
// Skip (with validation) → '/analysis'

// ProgressStepper:
// currentStage="suggestion" completedStages={['upload', 'categorization', 'calculation']}

// ============================================
// PAGE 4: AnalysisPage.jsx
// ============================================

/**
 * Current Stage: 'analysis'
 * Next Stage: 'report'
 * Previous Stage: 'suggestion'
 * 
 * Required Fields:
 *   - analysisNotes (string, can be optional)
 * 
 * Data to Save:
 *   - analysisResults
 *   - charts
 *   - metrics
 *   - notes
 * 
 * Integration:
 *   - Same pattern
 *   - May make analysis optional (skip to report without warning)
 */

// Navigation Routes:
// Back → '/suggestions'
// Save & Exit → '/dashboard'
// Next → '/report'
// Skip (optional) → '/report'

// ProgressStepper:
// currentStage="analysis" completedStages={['upload', 'categorization', 'calculation', 'suggestion']}

// ============================================
// FUNCTION TO USE IN ALL PAGES
// ============================================

/**
 * Copy this helper function to each page or create utils/navigationHelpers.js
 */
function getMissingFields(data, requiredFields) {
  return Object.entries(requiredFields)
    .filter(([key, label]) => {
      const value = data[key];
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return !value || Object.keys(value).length === 0;
      return !value;
    })
    .map(([_, label]) => label);
}

// ============================================
// NAVIGATION HANDLER TEMPLATE
// ============================================

/**
 * Copy and customize for each page:
 */

// Define required fields
const REQUIRED_FIELDS = {
  extractionData: 'Material extraction data',
  uploadedDocuments: 'Uploaded documents',
};

// Handle back button
const handleBack = useCallback(async () => {
  await saveToProjectContext();
  navigate('/previous-page');
}, [saveToProjectContext, navigate]);

// Handle save and exit
const handleSaveExit = useCallback(async () => {
  setIsLoading(true);
  const saved = await saveToProjectContext();
  setIsLoading(false);
  if (saved) navigate('/dashboard');
}, [saveToProjectContext, navigate]);

// Handle continue to next
const handleNext = useCallback(async () => {
  setIsLoading(true);
  const saved = await saveToProjectContext();
  setIsLoading(false);
  if (saved) {
    await updateProjectStage('next-stage');
    navigate('/next-page');
  }
}, [saveToProjectContext, navigate, updateProjectStage]);

// Handle skip with validation
const handleSkip = useCallback(() => {
  const dataToCheck = {
    extractionData: extractionData.length > 0 ? extractionData : null,
    uploadedDocuments: uploadedDocuments.length > 0 ? uploadedDocuments : null,
  };

  const missingFields = getMissingFields(dataToCheck, REQUIRED_FIELDS);

  if (missingFields.length > 0) {
    setShowSkipWarning(true);
    setPendingNavigation('next-stage-key');
  } else {
    handleSkipConfirmed('next-stage-key');
  }
}, [extractionData, uploadedDocuments]);

// Handle confirmed skip
const handleSkipConfirmed = useCallback(async (nextStage) => {
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
    navigate(routeMap[nextStage] || '/dashboard');
  }
}, [saveToProjectContext, navigate]);

// ============================================
// SAVE TO PROJECT CONTEXT FUNCTION
// ============================================

/**
 * Use in each page (customize data fields):
 */
const saveToProjectContext = useCallback(async () => {
  if (!projectId) return;

  try {
    await updateData({
      extractedMaterials: extractionData,
      uploadedDocuments,
      currentPage,
      // Add all fields you want to save
    });

    // Also save to localStorage for backwards compatibility
    localStorage.setItem(
      'envirosync.categorization.draft.v1', // Update key per page
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
// JSX ADDITIONS
// ============================================

/**
 * Add to end of each page's JSX (before closing </PageLayout>):
 */

{/* Page Navigation */}
<PageNavigation
  onBack={handleBack}
  onSaveExit={handleSaveExit}
  onNext={handleNext}
  onSkip={handleSkip}
  currentPage="Page Name"
  nextPage="Next Page Name"
  isLoading={isLoading}
  showSkip={true}
  position="bottom"
/>

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
  currentPage="Current Page"
  nextPage="Next Page"
/>

// ============================================
// CHECKLIST FOR EACH PAGE
// ============================================

/**
 * [ ] Import all 6 required modules
 * [ ] Import ProjectContext hooks
 * [ ] Add 3 state variables (showSkipWarning, pendingNavigation, isLoading)
 * [ ] Add useEffect to load from project.data on mount
 * [ ] Add saveToProjectContext function
 * [ ] Add navigation handlers (4 functions)
 * [ ] Add getMissingFields helper
 * [ ] Add ProgressStepper with correct stage
 * [ ] Add PageNavigation before closing PageLayout
 * [ ] Add SkipWarningModal before closing outer div
 * [ ] Test Back button works
 * [ ] Test Save & Exit goes to dashboard
 * [ ] Test Continue to next page
 * [ ] Test Skip with validation warning
 * [ ] Test Skip when fields are complete
 * [ ] Verify data saves to localStorage
 * [ ] Verify data saves to ProjectContext
 * [ ] Test resuming page from bookmark (load from context)
 */

// ============================================
// EXAMPLE: COMPLETE CATEGORIZATION PAGE
// ============================================

/**
 * See NON_LINEAR_NAVIGATION_GUIDE.md for complete example
 * Copy the CategorizationPage code and adapt for each page
 */

// ============================================
// TROUBLESHOOTING
// ============================================

/**
 * Q: Navigation buttons don't appear
 * A: Check <PageNavigation> component is added before closing </PageLayout>
 *    Make sure position="bottom" is set
 *
 * Q: Skip warning doesn't show
 * A: Check REQUIRED_FIELDS is defined
 *    Verify getMissingFields function is included
 *    Test data is actually missing
 *
 * Q: Data doesn't persist when going back
 * A: Verify updateData(projectId, data) is called
 *    Check ProjectContext is working (test /dashboard)
 *    Verify project?.data is available on mount
 *
 * Q: Previous page button says "undefined"
 * A: Set currentPage prop on <PageNavigation>
 *
 * Q: Styling looks wrong on mobile
 * A: Check PageNavigation.css includes responsive design
 *    Test on actual mobile with DevTools
 */

// ============================================
// FILES CREATED
// ============================================

/**
 * ✓ src/components/common/PageNavigation.jsx (130 lines)
 * ✓ src/components/common/PageNavigation.css (250 lines)
 * ✓ src/components/modals/SkipWarningModal.jsx (90 lines)
 * ✓ src/components/modals/SkipWarningModal.css (280 lines)
 * ✓ src/NON_LINEAR_NAVIGATION_GUIDE.md (detailed guide)
 * ✓ src/NON_LINEAR_NAVIGATION_CHECKLIST.md (this file)
 */

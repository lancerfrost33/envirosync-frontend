/**
 * AUTO-SAVE IMPLEMENTATION SUMMARY
 * 
 * Apply these changes to all 5 pages:
 * 1. src/pages/upload/Upload.jsx
 * 2. src/pages/processing/CategorizationPage.jsx
 * 3. src/pages/calculation/Calculation.jsx (CalculationPage.jsx)
 * 4. src/pages/suggestions/SuggestionsPage.jsx
 * 5. src/pages/analysis/AnalysisPage.jsx
 */

// ============================================
// CORE PATTERN FOR ALL 5 PAGES
// ============================================

/**
 * IMPORTS TO ADD:
 */
import { useParams } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import useAutoSave from '../../hooks/useAutoSave';
import SaveIndicator from '../../components/common/SaveIndicator';

/**
 * INSIDE COMPONENT FUNCTION:
 */
const MyPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();  // Get from URL
  const { project } = useProject(projectId);

  // Your existing state declarations...
  const [state1, setState1] = useState('');
  const [state2, setState2] = useState('');

  // Create data object to auto-save
  const autoSaveData = {
    state1,
    state2,
    // ... include other state you want to persist
  };

  // Setup auto-save (2 second debounce)
  const { isSaving, lastSaved, saveNow } = useAutoSave(projectId, autoSaveData, 2000);

  // Update your save handler
  const handleSaveDraft = useCallback(() => {
    saveNow(); // Trigger immediate save
  }, [saveNow]);

  // In JSX, add near top:
  return (
    <div className="page">
      <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} position="top" />
      {/* Rest of JSX */}
    </div>
  );
};

// ============================================
// PAGE-SPECIFIC DATA TO AUTO-SAVE
// ============================================

/**
 * 1. UPLOAD PAGE
 * Path: src/pages/upload/Upload.jsx
 * Auto-save:
 */
const uploadAutoSaveData = {
  files,          // File queue with status
  processedCount,
};

/**
 * 2. CATEGORIZATION PAGE  
 * Path: src/pages/processing/CategorizationPage.jsx
 * Auto-save:
 */
const categorizationAutoSaveData = {
  extractedMaterials: extractionData,
  uploadedDocuments,
  currentPage,
  projectName,
};

/**
 * 3. CALCULATION PAGE
 * Path: src/pages/calculation/Calculation.jsx
 * Auto-save:
 */
const calculationAutoSaveData = {
  materials,        // Materials with calculations
  results,          // Calculated results
  selectedCategory, // Current selection
};

/**
 * 4. SUGGESTIONS PAGE
 * Path: src/pages/suggestions/SuggestionsPage.jsx
 * Auto-save:
 */
const suggestionsAutoSaveData = {
  selectedItems,    // Selected alternatives
  suggestions,      // Suggestion list
  scores,           // Evaluation scores
};

/**
 * 5. ANALYSIS PAGE
 * Path: src/pages/analysis/AnalysisPage.jsx
 * Auto-save:
 */
const analysisAutoSaveData = {
  analysisResults,  // Analysis data
  charts,           // Chart data
  metrics,          // Calculated metrics
  notes,            // User notes
};

// ============================================
// FILES CREATED (already done for you)
// ============================================

/**
 * 1. useAutoSave Hook
 * Location: src/hooks/useAutoSave.js
 * Usage: const { isSaving, lastSaved, saveNow } = useAutoSave(projectId, data, 2000);
 * Returns: { isSaving, lastSaved, saveNow }
 */

/**
 * 2. SaveIndicator Component
 * Location: src/components/common/SaveIndicator.jsx
 * Usage: <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} position="top" />
 * Props: { isSaving, lastSaved, position: 'top'|'inline' }
 */

/**
 * 3. SaveIndicator Styles
 * Location: src/components/common/SaveIndicator.css
 * Includes: animations, responsive design, accessibility
 */

// ============================================
// STEP-BY-STEP IMPLEMENTATION
// ============================================

/**
 * Step 1: Copy the pattern for one page
 *   - Pick one page (e.g., CategorizationPage)
 *   - Follow CATEGORIZATION_EXAMPLE.md
 *   - Test that auto-save works
 *
 * Step 2: Apply to remaining pages
 *   - Use the same pattern for each page
 *   - Adjust the autoSaveData object for page-specific fields
 *   - Test each page individually
 *
 * Step 3: Verify localStorage
 *   - Open DevTools (F12)
 *   - Applications > Local Storage
 *   - Check "envirosync_projects" key
 *   - Verify data saves when you edit fields
 *
 * Step 4: Test workflow
 *   - Create a new project from Upload page
 *   - Progress through Categorization
 *   - Check that data persists across page refreshes
 *   - Test browser back/forward navigation
 */

// ============================================
// COMMON ERRORS & SOLUTIONS
// ============================================

/**
 * Error: "projectId is undefined"
 * Solution: Ensure useParams() is imported and page is accessed via /upload/:projectId
 *           Currently pages use file uploads directly - may need to refactor routing
 *
 * Error: "useProject is not a function"
 * Solution: Verify ProjectContext.jsx is wrapped around App in main.jsx
 *           Check: <ProjectProvider><App /></ProjectProvider>
 *
 * Error: "SaveIndicator not showing"
 * Solution: Check that SaveIndicator.css is imported
 *           Verify position prop: 'top' or 'inline'
 *           Check CSS class names in browser inspector
 *
 * Error: "Data not saving to ProjectContext"
 * Solution: Check browser DevTools localStorage for "envirosync_projects"
 *           Verify autoSaveData object is not empty
 *           Check useAutoSave hook debounce timer (2000ms delay)
 */

// ============================================
// OPTIONAL: ENHANCED SAVE INDICATOR
// ============================================

/**
 * If you want more detailed save feedback, you can use SaveIndicator inline:
 */
<div className="form-section">
  <h2>Materials Extraction</h2>
  
  {/* Show save status within the form */}
  <SaveIndicator 
    isSaving={isSaving}
    lastSaved={lastSaved}
    position="inline"
  />

  {/* Form content */}
  <form>
    {/* ... form fields ... */}
  </form>
</div>

// ============================================
// NEXT STEPS
// ============================================

/**
 * 1. Review CATEGORIZATION_EXAMPLE.md for detailed walkthrough
 * 2. Apply pattern to CategorizationPage first
 * 3. Test auto-save (edit field, wait 2 seconds, check localStorage)
 * 4. Apply to remaining 4 pages
 * 5. Test complete workflow (Upload → Categorization → Calculation → etc)
 * 6. Optional: Add route parameters if projects created dynamically
 */

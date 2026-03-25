/**
 * INTEGRATION GUIDE: Auto-Save with ProjectContext
 * 
 * This file shows how to integrate auto-save functionality into pages
 * using the useAutoSave hook and SaveIndicator component.
 */

// ============================================
// STEP 1: UPDATE IMPORTS
// ============================================
// Add these imports to your page component:

import { useProject } from '../../context/ProjectContext';
import useAutoSave from '../../hooks/useAutoSave';
import SaveIndicator from '../../components/common/SaveIndicator';
import { useParams } from 'react-router-dom';

// ============================================
// STEP 2: GET PROJECT ID FROM URL
// ============================================
// Add this inside your component function:

const CategorizationPage = () => {
  const { projectId } = useParams(); // Or get from context/location state
  const { project } = useProject(projectId);
  
  // ... rest of your state declarations

  // ============================================
  // STEP 3: SETUP AUTO-SAVE
  // ============================================
  // Create object with current page data to auto-save

  const autoSaveData = {
    extractionData,      // Your existing state
    uploadedDocuments,
    currentPage,
    projectName,
    // Add other fields you want to auto-save
  };

  // Use the auto-save hook (debounce: 2000ms = 2 seconds)
  const { isSaving, lastSaved, saveNow } = useAutoSave(projectId, autoSaveData, 2000);

  // ============================================
  // STEP 4: SYNC WITH EXISTING SAVE BUTTON
  // ============================================
  // Update your handleSaveDraft function:

  const handleSaveDraft = useCallback(() => {
    // Optional: perform any validation before save
    
    // Trigger immediate save (bypasses debounce)
    saveNow();
    
    // Optionally navigate after save
    // navigate('/calculation');
  }, [saveNow]);

  // ============================================
  // STEP 5: ADD SAVE INDICATOR TO JSX
  // ============================================
  // In your JSX, add SaveIndicator near the top of the page:

  return (
    <div className="categorization-page">
      {/* Add this near the top of your page, after PageLayout opens */}
      <SaveIndicator 
        isSaving={isSaving}
        lastSaved={lastSaved}
        position="top"  // "top" for header, "inline" for within form
      />

      <PageLayout /* ... existing props ... */>
        {/* Rest of your content */}
      </PageLayout>
    </div>
  );
};

// ============================================
// ALTERNATIVE: INLINE SAVE INDICATOR
// ============================================
// If you want to show save status within a form section:

<div className="extraction-form">
  <SaveIndicator 
    isSaving={isSaving}
    lastSaved={lastSaved}
    position="inline"
  />
  
  {/* Your form content */}
</div>

// ============================================
// INTEGRATION CHECKLIST
// ============================================
// [ ] Import useProject, useAutoSave, SaveIndicator, useParams
// [ ] Call useParams() to get projectId
// [ ] Call useProject(projectId) to get project
// [ ] Create autoSaveData object with all fields to save
// [ ] Call useAutoSave(projectId, autoSaveData, 2000)
// [ ] Update handleSaveDraft to call saveNow()
// [ ] Add <SaveIndicator /> component to JSX
// [ ] Test auto-save by editing form and waiting 2 seconds
// [ ] Verify data appears in browser DevTools localStorage
// [ ] Test manual save button still works

// ============================================
// CLEANUP: LOADING FROM SAVED DATA
// ============================================
// If you currently load from localStorage directly:

// OLD WAY (localStorage only):
useEffect(() => {
  const raw = localStorage.getItem('envirosync.categorization.draft.v1');
  // ... parse and setState
}, []);

// NEW WAY (ProjectContext):
useEffect(() => {
  if (project?.data?.extractionData) {
    setExtractionData(project.data.extractionData);
  }
  if (project?.data?.uploadedDocuments) {
    setUploadedDocuments(project.data.uploadedDocuments);
  }
}, [project?._id]); // Watch project changes

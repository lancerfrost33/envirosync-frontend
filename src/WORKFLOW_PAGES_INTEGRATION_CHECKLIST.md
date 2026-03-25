## WORKFLOW PAGES INTEGRATION CHECKLIST

Use this to track applying navigation, auto-save, and other features to workflow pages.

---

## PAGE 1: CategorizationPage (/upload → /calculation)

**File:** `src/pages/processing/CategorizationPage.jsx`

**Status:** ⏳ READY TO START

### Step 1: Import New Components
- [ ] Add: `import SaveIndicator from '../../components/common/SaveIndicator';`
- [ ] Add: `import useAutoSave from '../../hooks/useAutoSave';`
- [ ] Add: `import PageNavigation from '../../components/common/PageNavigation';`
- [ ] Add: `import SkipWarningModal from '../../components/modals/SkipWarningModal';`

### Step 2: Add Navigation State
```javascript
const [showSkipWarning, setShowSkipWarning] = useState(false);
const [pendingNavigation, setPendingNavigation] = useState(null);
const [isLoading, setIsLoading] = useState(false);
```

### Step 3: Define Required Fields
```javascript
const REQUIRED_FIELDS = {
  extractionData: 'Material extraction data',
  uploadedDocuments: 'Document uploads',
};
```

### Step 4: Add Helper Function (before component)
```javascript
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
```

### Step 5: Setup Auto-Save
```javascript
const autoSaveData = {
  extractedMaterials: extractionData,
  uploadedDocuments,
  currentPage,
};

const { isSaving, lastSaved, saveNow } = useAutoSave(
  undefined,
  autoSaveData,
  2000
);
```

### Step 6: Add Save Function
```javascript
const saveToStorage = useCallback(async () => {
  try {
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
    return true;
  } catch (error) {
    console.error('Error saving draft:', error);
    return false;
  }
}, [uploadedDocuments, extractionData, currentPage]);
```

### Step 7: Add Navigation Handlers
```javascript
const handleBack = useCallback(async () => {
  const saved = await saveToStorage();
  if (saved) navigate('/upload');
}, [saveToStorage, navigate]);

const handleSaveExit = useCallback(async () => {
  setIsLoading(true);
  const saved = await saveToStorage();
  setIsLoading(false);
  if (saved) navigate('/dashboard');
}, [saveToStorage, navigate]);

const handleNext = useCallback(async () => {
  setIsLoading(true);
  const saved = await saveToStorage();
  setIsLoading(false);
  if (saved) navigate('/calculation');
}, [saveToStorage, navigate]);

const handleSkip = useCallback(() => {
  const dataToCheck = {
    extractionData: extractionData.length > 0 ? extractionData : null,
    uploadedDocuments: uploadedDocuments.length > 0 ? uploadedDocuments : null,
  };
  const missingFields = getMissingFields(dataToCheck, REQUIRED_FIELDS);
  if (missingFields.length > 0) {
    setShowSkipWarning(true);
    setPendingNavigation('calculation');
  } else {
    handleSkipConfirmed('calculation');
  }
}, [extractionData, uploadedDocuments]);

const handleSkipConfirmed = useCallback(async (nextRoute) => {
  setIsLoading(true);
  const saved = await saveToStorage();
  setIsLoading(false);
  setShowSkipWarning(false);
  setPendingNavigation(null);
  if (saved) navigate('/calculation');
}, [saveToStorage, navigate]);
```

### Step 8: Update JSX
- [ ] Add after `<PageLayout>` opens: `<SaveIndicator isSaving={isSaving} lastSaved={lastSaved} position="top" />`
- [ ] Add before `</PageLayout>` closes:
```javascript
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
```
- [ ] Add after `</PageLayout>` closes:
```javascript
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
```

### Step 9: Update ProgressStepper
- [ ] Change `completedStages` to include 'upload': `completedStages={['upload']}`
- [ ] Verify `currentStage="categorization"`

### Step 10: Test Navigation
- [ ] Back button → returns to /upload with data saved
- [ ] Save & Exit → returns to /dashboard
- [ ] Continue → goes to /calculation with data saved
- [ ] Skip with empty data → shows warning modal
- [ ] Skip Anyway → navigates to /calculation

---

## PAGE 2: CalculationPage (/categorization → /suggestions)

**File:** `src/pages/calculation/Calculation.jsx`

**Status:** ⏳ READY TO START

### Template Changes from Categorization:

1. **Imports** - Same 4 imports as Categorization
2. **State** - Same 3 new state variables
3. **Required Fields:**
```javascript
const REQUIRED_FIELDS = {
  calculations: 'Emission calculations',
  selectedMaterials: 'Materials selected for calculation',
};
```
4. **Auto-Save Data** - Modify to include calculation fields:
```javascript
const autoSaveData = {
  calculations,
  selectedMaterials,
};
```
5. **Save Function** - Update localStorage key and payload:
```javascript
localStorage.setItem('envirosync.calculation.draft.v1', JSON.stringify(payload));
```
6. **Navigation Routes:**
   - Back → '/categorization'
   - Save & Exit → '/dashboard'
   - Next → '/suggestions'
   - Skip → '/suggestions' (with warning if calculations empty)
7. **ProgressStepper:**
```javascript
currentStage="calculation"
completedStages={['upload', 'categorization']}
```
8. **PageNavigation Props:**
```javascript
currentPage="Calculation"
nextPage="Suggestions"
```

**Checklist:**
- [ ] Copy imports from Categorization
- [ ] Add state variables
- [ ] Define REQUIRED_FIELDS for calculations
- [ ] Update autoSaveData object
- [ ] Update saveToStorage localStorage key
- [ ] Update navigation handlers (routes)
- [ ] Update ProgressStepper props
- [ ] Add JSX components (SaveIndicator, PageNavigation, SkipWarningModal)
- [ ] Test navigation flow

---

## PAGE 3: SuggestionsPage (/calculation → /analysis)

**File:** `src/pages/suggestions/SuggestionsPage.jsx`

**Status:** ⏳ READY TO START

### Template Changes:

1. **Imports** - Same 4 imports
2. **State** - Same 3 new state variables
3. **Required Fields:**
```javascript
const REQUIRED_FIELDS = {
  suggestions: 'Environmental suggestions',
  selectedSuggestions: 'At least one suggestion selected', // Can be optional
};
```
4. **Auto-Save Data:**
```javascript
const autoSaveData = {
  suggestions,
  selectedSuggestions,
  implementationPlan,
};
```
5. **Save Function** - Update localStorage key:
```javascript
localStorage.setItem('envirosync.suggestions.draft.v1', JSON.stringify(payload));
```
6. **Navigation Routes:**
   - Back → '/calculation'
   - Save & Exit → '/dashboard'
   - Next → '/analysis'
   - Skip → '/analysis' (optional - no warning)
7. **ProgressStepper:**
```javascript
currentStage="suggestions"
completedStages={['upload', 'categorization', 'calculation']}
```
8. **PageNavigation Props:**
```javascript
currentPage="Suggestions"
nextPage="Analysis"
showSkip={true} // or false if optional
```

**Checklist:**
- [ ] Copy template from Calculation
- [ ] Update localStorage key to "suggestions"
- [ ] Define REQUIRED_FIELDS (can be less strict)
- [ ] Update autoSaveData
- [ ] Update navigation routes
- [ ] Update ProgressStepper
- [ ] Add JSX components
- [ ] Test navigation flow

---

## PAGE 4: AnalysisPage (/suggestions → /report)

**File:** `src/pages/analysis/AnalysisPage.jsx`

**Status:** ⏳ READY TO START

### Template Changes:

1. **Imports** - Same 4 imports
2. **State** - Same 3 new state variables
3. **Required Fields:**
```javascript
const REQUIRED_FIELDS = {
  analysisResults: 'Sustainability analysis complete',
  recommendations: 'Recommendations generated',
};
```
4. **Auto-Save Data:**
```javascript
const autoSaveData = {
  analysisResults,
  recommendations,
  metrics,
};
```
5. **Save Function:**
```javascript
localStorage.setItem('envirosync.analysis.draft.v1', JSON.stringify(payload));
```
6. **Navigation Routes:**
   - Back → '/suggestions'
   - Save & Exit → '/dashboard'
   - Next → '/report' (or '/final-report')
   - Skip → '/report' (with warning if incomplete)
7. **ProgressStepper:**
```javascript
currentStage="analysis"
completedStages={['upload', 'categorization', 'calculation', 'suggestions']}
```
8. **PageNavigation Props:**
```javascript
currentPage="Analysis"
nextPage="Final Report"
showSkip={true}
```

**Checklist:**
- [ ] Copy template from Suggestions
- [ ] Update localStorage key to "analysis"
- [ ] Define REQUIRED_FIELDS for analysis
- [ ] Update autoSaveData
- [ ] Update navigation routes
- [ ] Update ProgressStepper
- [ ] Add JSX components
- [ ] Test navigation flow

---

## OVERALL PROGRESS

| Page | Imports | State | ReqFields | AutoSave | Handlers | JSX | Testing |
|------|---------|-------|-----------|----------|----------|-----|---------|
| Categorization | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Calculation | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Suggestions | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Analysis | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

---

## TESTING CHECKLIST

After integrating each page, test:

### Navigation Flow
- [ ] Back button navigates to previous page
- [ ] Save & Exit navigates to dashboard
- [ ] Continue button navigates to next page
- [ ] Skip button shows warning if data missing
- [ ] Skip Anyway bypasses warning and navigates
- [ ] All data saves to localStorage before navigation

### Data Persistence
- [ ] Close and reopen browser
- [ ] Data should still be available in /dashboard/drafts
- [ ] Auto-save indicator shows "Saving..." and "Saved X ago"
- [ ] Manual saveNow() works when called

### Progressive Bar
- [ ] Shows correct completed stages
- [ ] Shows correct current stage (highlighted)
- [ ] Clicking on completed stage navigates back

### Skip Validation
- [ ] Shows list of missing required fields
- [ ] "Go Back & Complete" returns to current page
- [ ] "Skip Anyway" proceeds despite missing data
- [ ] Can press ESC to close modal

---

## COMMON PITFALLS TO AVOID

1. **Forgetting to call saveToStorage** - Always save before navigating
2. **Wrong route paths** - Double-check navigate() calls match /upload, /calculation, /suggestions, /analysis
3. **Missing localStorage key updates** - Each page needs unique key (categorization, calculation, suggestions, analysis)
4. **ProgressStepper completedStages** - Must be cumulative (add new stage to previous list)
5. **REQUIRED_FIELDS mismatch** - Must match actual state variables
6. **Auto-save debounce conflicts** - Don't call saveNow() immediately if auto-save just triggered
7. **State not importing** - Verify useState and useCallback imported from 'react'

---

## REFERENCE LINKS

- Full CategorizationPage example: [CATEGORIZATION_PAGE_NAVIGATION_EXAMPLE.md](./CATEGORIZATION_PAGE_NAVIGATION_EXAMPLE.md)
- Integration guide: [NON_LINEAR_NAVIGATION_GUIDE.md](./NON_LINEAR_NAVIGATION_GUIDE.md)
- Auto-save setup: [AUTO-SAVE_SUMMARY.md](./AUTO-SAVE_SUMMARY.md)
- Batch processing: [BATCH_PROCESSING_INTEGRATION.md](./BATCH_PROCESSING_INTEGRATION.md)

---

## NEXT STEPS

1. **Start with CategorizationPage** - It's first in the workflow
2. **Use CATEGORIZATION_PAGE_NAVIGATION_EXAMPLE.md as reference**
3. **Apply pattern to other 3 pages sequentially**
4. **Test navigation between pages**
5. **Verify data persists in localStorage and /dashboard/drafts**
6. **Then integrate batch processing to DraftsPage**

---

**Estimated Time:** ~30 minutes per page = 2 hours total for all 4 pages + testing

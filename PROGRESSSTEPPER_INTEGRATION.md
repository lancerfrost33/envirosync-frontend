# ProgressStepper Integration Guide

This guide shows how to integrate the new reusable ProgressStepper component into all workflow pages.

---

## 1. Upload.jsx

### Import the component:
```jsx
import ProgressStepper from '../../components/common/ProgressStepper';
```

### Remove old stepper code (lines ~303-330):
Delete the existing `steps` array definition and the entire progress stepper JSX block.

### Add the new ProgressStepper:
```jsx
{/* Progress Stepper */}
<ProgressStepper 
    currentStage="upload"
    completedStages={[]}
    onStageClick={(stageId) => {
        // Navigation is handled by the component via Link
        console.log('Clicked on:', stageId);
    }}
/>
```

### Remove old stepper CSS from Upload.css:
Delete the `.progress-stepper`, `.step-item`, `.step-circle`, `.step-label`, and `.step-connector` styles.

---

## 2. CategorizationPage.jsx (src/pages/processing/)

### Add import at the top (after line 3):
```jsx
import ProgressStepper from '../../components/common/ProgressStepper';
```

### Find the existing stepper JSX (search for "progress-stepper" class) and replace with:
```jsx
<ProgressStepper 
    currentStage="categorization"
    completedStages={['upload']}
    onStageClick={(stageId) => {
        // Handle navigation to completed stages
        if (stageId === 'upload') {
            navigate('/upload');
        }
    }}
/>
```

### Remove stepper styles from CategorizationPage.css:
Remove any `.progress-stepper`, `.step-*` related CSS rules if they exist.

---

## 3. Calculation.jsx (src/pages/calculation/)

### Add import at the top:
```jsx
import ProgressStepper from '../../components/common/ProgressStepper';
```

### Remove the `steps` array (lines 8-15).

### Replace the existing stepper JSX with:
```jsx
<ProgressStepper 
    currentStage="calculation"
    completedStages={['upload', 'categorization']}
    onStageClick={(stageId) => {
        // Allow navigation to previous stages
        const routes = {
            upload: '/upload',
            categorization: '/categorization'
        };
        if (routes[stageId]) {
            navigate(routes[stageId]);
        }
    }}
/>
```

---

## 4. SuggestionsPage.jsx (src/pages/suggestions/)

### Add import:
```jsx
import ProgressStepper from '../../components/common/ProgressStepper';
```

### Remove the `steps` array (lines 11-18).

### Replace stepper JSX with:
```jsx
<ProgressStepper 
    currentStage="suggestion"
    completedStages={['upload', 'categorization', 'calculation']}
    onStageClick={(stageId) => {
        const routes = {
            upload: '/upload',
            categorization: '/categorization',
            calculation: '/calculation'
        };
        if (routes[stageId]) {
            navigate(routes[stageId]);
        }
    }}
/>
```

---

## 5. AnalysisPage.jsx (src/pages/analysis/)

### Add import:
```jsx
import ProgressStepper from '../../components/common/ProgressStepper';
```

### Remove the `steps` array (lines 26-33).

### Replace stepper JSX with:
```jsx
<ProgressStepper 
    currentStage="analysis"
    completedStages={['upload', 'categorization', 'calculation', 'suggestion']}
    onStageClick={(stageId) => {
        const routes = {
            upload: '/upload',
            categorization: '/categorization',
            calculation: '/calculation',
            suggestion: '/suggestions'
        };
        if (routes[stageId]) {
            navigate(routes[stageId]);
        }
    }}
/>
```

---

## 6. FinalReportPage.jsx (src/pages/reports/)

### Add import:
```jsx
import ProgressStepper from '../../components/common/ProgressStepper';
```

### Remove the `steps` array (lines 10-17).

### Replace stepper JSX with:
```jsx
<ProgressStepper 
    currentStage="report"
    completedStages={['upload', 'categorization', 'calculation', 'suggestion', 'analysis']}
    onStageClick={(stageId) => {
        const routes = {
            upload: '/upload',
            categorization: '/categorization',
            calculation: '/calculation',
            suggestion: '/suggestions',
            analysis: '/analysis'
        };
        if (routes[stageId]) {
            navigate(routes[stageId]);
        }
    }}
/>
```

---

## Features of the New Component

### ✅ Icons for Each Step:
- 📤 Upload → UploadCloud
- 📋 Categorization → Layers
- 🧮 Calculation → Calculator
- 💡 Suggestion → Lightbulb
- 📊 Analysis → BarChart3
- 📄 Report → FileText

### ✅ Visual States:
- **Current Stage:** Teal/blue with pulsing animation
- **Completed Stages:** Green with checkmark, clickable
- **Upcoming Stages:** Gray, disabled

### ✅ Responsive Design:
- **Desktop:** Horizontal layout with connecting lines
- **Mobile:** Vertical layout with vertical connectors
- **Tablet:** Optimized sizing

### ✅ Accessibility:
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode support
- Reduced motion support

### ✅ Smooth Animations:
- Hover effects on clickable stages
- Pulsing animation on current stage
- Connector fill animation
- Transform effects on interaction

---

## Example Usage Pattern

```jsx
import ProgressStepper from '../../components/common/ProgressStepper';

function YourWorkflowPage() {
    const navigate = useNavigate();
    
    return (
        <PageLayout>
            <ProgressStepper 
                currentStage="your-stage-id"
                completedStages={['previous', 'stages']}
                onStageClick={(stageId) => {
                    // Handle navigation
                    navigate(\`/\${stageId}\`);
                }}
            />
            
            {/* Your page content */}
        </PageLayout>
    );
}
```

---

## Benefits

1. **Consistency:** Same stepper across all workflow pages
2. **Maintainability:** Update stepper in one place
3. **Reusability:** Easy to add new workflow stages
4. **Accessibility:** Built-in ARIA support
5. **Responsive:** Works on all screen sizes
6. **Visual Feedback:** Clear indication of progress
7. **Navigation:** Easy to jump back to previous stages

---

## Testing Checklist

- [ ] Upload page shows Upload as current, no completed
- [ ] Categorization shows Upload as completed (green checkmark)
- [ ] Calculation shows Upload + Categorization completed
- [ ] Suggestion shows first 3 stages completed
- [ ] Analysis shows first 4 stages completed
- [ ] Report shows all 5 previous stages completed
- [ ] Clicking completed stages navigates correctly
- [ ] Current stage has pulsing animation
- [ ] Hover effects work on completed stages
- [ ] Mobile view shows vertical layout
- [ ] Icons display correctly for all stages

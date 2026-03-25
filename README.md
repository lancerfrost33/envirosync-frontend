# enviro-sync
Project: EnviroSync - AI-Powered Carbon Footprint Calculator


## Reminder
1. Make sure make your own branch before working on your coding. Don't / cannot edit in main.
2. Make sure to sync the latest changes from main before starting your work.
3. Name your branch on what you work out on. For example "login/design"
4. Recommended to not make the changes too big to ensure fast sync and lesser errors.
5. After finish your work, make a pull request to main branch.

## Task

- Keda - Login + Past Suggestion
- Wawa - Analysis + Past report
- Philip - About Us + Upload
- Peshal - Dashboard + Calculation
- Hafiz - Report + Suggestion
- fira - Categorization + Cover the hardest part (upload, calculation, suggestion)

## Colours Use

/* Primary Colors */
--primary-blue: #2563eb;
--primary-green: #059669;

/* Secondary Colors */
--secondary-gray: #6b7280;
--background-light: #f9fafb;
--background-dark: #111827;

/* Status Colors */
--success-green: #10b981;
--warning-yellow: #f59e0b;
--danger-red: #ef4444;
--info-blue: #3b82f6;

/* Text Colors */
--text-primary: #111827;
--text-secondary: #6b7280;
--text-light: #9ca3af;

## Typography
/* Font Family */
font-family: 'Inter', 'Segoe UI', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */


## Spacing
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */


## Code Structure
// 1. Imports
import React, { useState } from 'react';
import './YourPage.css';

// 2. Component
function YourPage() {
  // 3. State
  const [data, setData] = useState([]);
  
  // 4. Functions
  const handleAction = () => {
    // logic
  };
  
  // 5. Return JSX
  return (
    <div className="your-page">
      {/* Your UI */}
    </div>
  );
}

// 6. Export

export default YourPage;

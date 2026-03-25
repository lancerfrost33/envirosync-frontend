import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Landing            from './pages/landing/Landing';
import Dashboard          from './pages/dashboard/Dashboard';
import DraftsPage         from './pages/dashboard/DraftsPage';
import Upload             from './pages/upload/Upload';
import ExamplePage        from './pages/examples/ExamplePage';
import Calculation        from './pages/calculation/Calculation';
import CategorizationPage from './pages/processing/CategorizationPage';
import UserProfilePage from './pages/userprofile/UserProfilePage';
import SuggestionsPage from './pages/suggestions/SuggestionsPage';
import FinalReportPage from './pages/reports/FinalReportPage';
import PastSuggestionPage from './pages/history/PastSuggestionPage';
import LoginPage          from './pages/auth/LoginPage';
import PastReportsPage    from './pages/history/PastReportsPage';
import DemoGuard          from './components/common/DemoGuard';
import DemoBlockedPage    from './pages/demo/DemoBlockedPage';

// AnalysisPage is intentionally removed.
// Its Cost Variance, Material Breakdown table, and Download CSV button
// now live inside FinalReportPage.
// SuggestionsPage.handleConfirmChanges() navigates to '/report' directly.

function AppRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>

      {/* ── Public routes ───────────────────────────────────────── */}
      <Route path="/"       element={<Landing />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login"   element={<LoginPage />} />

      {/* ── Demo-allowed routes ──────────────────────────────────── */}
      <Route path="/upload"          element={<Upload />} />
      <Route path="/calculation"     element={<Calculation />} />
      <Route path="/categorization"  element={<CategorizationPage />} />

      {/* ── Demo-restricted routes ───────────────────────────────── */}
      <Route path="/dashboard"        element={<DemoGuard><Dashboard /></DemoGuard>} />
      <Route path="/dashboard/drafts" element={<DemoGuard><DraftsPage /></DemoGuard>} />
      <Route path="/examples"         element={<DemoGuard><ExamplePage /></DemoGuard>} />
      <Route path="/userprofile"      element={<DemoGuard><UserProfilePage /></DemoGuard>} />
      <Route path="/history"          element={<DemoGuard><PastSuggestionPage /></DemoGuard>} />
      <Route path="/history/pastReports" element={<DemoGuard><PastReportsPage /></DemoGuard>} />
      <Route path="/suggestions" element={<DemoGuard><SuggestionsPage /></DemoGuard>} />
      <Route path="/report" element={<DemoGuard><FinalReportPage /></DemoGuard>} />

      {/* ── Demo blocked page ────────────────────────────────────── */}
      <Route path="/demo-blocked" element={<DemoBlockedPage />} />

    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
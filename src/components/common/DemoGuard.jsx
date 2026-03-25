// src/components/common/DemoGuard.jsx
// Wrap routes that demo users CANNOT access.
// Demo users (envirosync.demo_mode = 'true') can only access:
//   /upload, /categorization, /calculation
// All other protected pages → redirect to /demo-blocked

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const DEMO_ALLOWED_PREFIXES = ['/upload', '/categorization', '/calculation'];

const DemoGuard = ({ children }) => {
  const isDemo = localStorage.getItem('envirosync.demo_mode') === 'true';
  const location = useLocation(); // Get current path

  // If not in demo mode, allow access to all children
  if (!isDemo) {
    return children;
  }

  // If in demo mode, check if the current path is allowed
  const isPathAllowed = DEMO_ALLOWED_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix)
  );

  // If the path is not allowed for demo users, redirect to the blocked page
  if (!isPathAllowed) {
    return <Navigate to="/demo-blocked" replace />;
  }

  // If in demo mode and the path is allowed, render children
  return children;
};

export default DemoGuard;

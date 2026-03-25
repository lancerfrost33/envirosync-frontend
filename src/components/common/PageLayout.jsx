import React from 'react';
import Navbar from './Navbar';
import Header from './Header';
import Footer from './Footer';
import './PageLayout.css';

/**
 * PageLayout Component
 * Wrapper component for all pages to ensure consistent layout
 *
 * Header (design baru dengan logo.png, search, user) – set showHeader={true}
 * Footer – set showFooter={true} (default true)
 * Navbar (lama) – set showNavbar={true}, showHeader={false}
 *
 * Usage:
 * <PageLayout title="Dashboard" subtitle="Welcome back!" showHeader showFooter>
 *   <YourPageContent />
 * </PageLayout>
 */

const PageLayout = ({
  children,
  title,
  subtitle,
  showNavbar = true,
  showHeader = false,
  showFooter = true,
  maxWidth = '1440px', // Grid container max-width dengan space di tepi
  transparentBg = false // NEW: Allow transparent background for pages with patterns
}) => {
  return (
    <div className={`page-layout ${transparentBg ? 'transparent-bg' : ''}`}>
      {showHeader && <Header />}
      {!showHeader && showNavbar && <Navbar />}

      <main className="page-content">
        <div className="page-container" style={{ maxWidth }}>
          {(title || subtitle) && (
            <div className="page-header">
              {title && <h1 className="page-title">{title}</h1>}
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
          )}

          <div className="page-body">
            {children}
          </div>
        </div>
      </main>

      {showFooter && <Footer />}
    </div>
  );
};

export default PageLayout;
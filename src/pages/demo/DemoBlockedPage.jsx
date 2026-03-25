// src/pages/demo/DemoBlockedPage.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DemoBlockedPage = () => {
  const navigate = useNavigate();

  const handleExitDemo = () => {
    localStorage.removeItem('envirosync.demo_mode');
    navigate('/'); // Go back to the landing page
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      fontFamily: "'Inter', sans-serif", // Ensure this font is available or change it
      padding: '24px',
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '460px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,.06)',
      }}>

        {/* Lock icon */}
        <div style={{
          width: '56px', height: '56px',
          borderRadius: '14px',
          background: 'rgba(55,156,138,.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="26" height="26" fill="none" stroke="#379c8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Demo Access Only
        </h1>

        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 8px', lineHeight: 1.6 }}>
          You're currently in <strong style={{ color: '#379c8a' }}>Demo Mode</strong>.
          Only these pages are available:
        </p>

        {/* Allowed pages list */}
        <div style={{
          background: '#f0fdf9',
          border: '1px solid rgba(55,156,138,.2)',
          borderRadius: '10px',
          padding: '14px 18px',
          margin: '16px 0 24px',
          textAlign: 'left',
        }}>
          {[
            { label: 'Upload', path: '/upload' },
            { label: 'Categorization', path: '/categorization' },
            { label: 'Calculation', path: '/calculation' },
          ].map((item) => (
            <div key={item.path} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 0',
              borderBottom: '1px solid rgba(55,156,138,.1)',
              fontSize: '13px',
              color: '#334155',
              fontWeight: 500,
            }}>
              <svg width="14" height="14" fill="none" stroke="#379c8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <Link to={item.path} style={{ color: '#379c8a', textDecoration: 'none', fontWeight: 600 }}>
                {item.label}
              </Link>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px' }}>
          Log in to your account to access all features including Suggestions, Analysis, Reports, and more.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link
            to="/login"
            onClick={() => localStorage.removeItem('envirosync.demo_mode')}  // Clear demo flag when going to login
            style={{
              display: 'block',
              padding: '11px 24px',
              background: '#379c8a',
              color: '#ffffff',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2d8274'}
            onMouseOut={(e) => e.currentTarget.style.background = '#379c8a'}
          >
            Log In to Your Account
          </Link>

          <button
            onClick={handleExitDemo}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 24px',
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            Exit Demo → Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoBlockedPage;

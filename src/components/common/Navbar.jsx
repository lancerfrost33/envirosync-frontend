import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const [searchValue, setSearchValue] = useState('');

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  const isReportsPage = ['/', '/history', '/reports'].includes(location.pathname);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-icon" aria-hidden>🌿</span>
          <span>ENVIROSYNC</span>
        </Link>

        {/* Navigation Links */}
        <ul className="navbar-menu">
          <li>
            <Link to="/dashboard" className={isActive('/dashboard')}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/dashboard/drafts" className={isActive('/dashboard/drafts')}>
              My Drafts
            </Link>
          </li>
          <li>
            <Link to="/projects" className={isActive('/projects')}>
              Projects
            </Link>
          </li>
          <li>
            <Link to="/suggestions" className={isActive('/suggestions')}>
              Suggestions
            </Link>
          </li>
          <li>
            <Link to="/" className={`nav-link ${isReportsPage ? 'active' : ''}`}>
              Reports
            </Link>
          </li>
        </ul>

        {/* Search */}
        <div className="navbar-search">
          <span className="search-icon" aria-hidden>🔍</span>
          <input
            type="search"
            placeholder="Q Search reports..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="search-input"
            aria-label="Search reports"
          />
        </div>

        {/* User & Dark Mode */}
        <div className="navbar-actions">
          <button className="icon-btn" aria-label="Toggle dark mode" type="button">
            <span aria-hidden>🌙</span>
          </button>
          <button className="user-button">
            <span className="user-avatar">U</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
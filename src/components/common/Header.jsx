import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, UserCircle, Menu, X, Loader2, FolderOpen } from 'lucide-react';
import './Header.css';
import { supabase } from '../../lib/supabase.js';
import { API_BASE } from '../../lib/api';

const BACKEND_HEALTH_CACHE_KEY = 'envirosync.backend.health.v1';

function readCachedBackendHealth() {
  try {
    const raw = sessionStorage.getItem(BACKEND_HEALTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.status !== 'online') return null;
    if (!parsed.checkedAt || Date.now() - Number(parsed.checkedAt) > 45000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedBackendHealth(status, latencyMs) {
  try {
    sessionStorage.setItem(BACKEND_HEALTH_CACHE_KEY, JSON.stringify({
      status,
      latencyMs,
      checkedAt: Date.now(),
    }));
  } catch {
    // ignore storage issues
  }
}

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userName, setUserName] = useState('');
  const cachedHealth = readCachedBackendHealth();
  const [backendHealth, setBackendHealth] = useState(cachedHealth ? 'online' : 'checking');
  const [backendLatencyMs, setBackendLatencyMs] = useState(cachedHealth?.latencyMs ?? null);
  const failureCountRef = useRef(0);
  const pollTimerRef = useRef(null);

  const pingEndpoint = useCallback(async (path, timeoutMs) => {
    const startedAt = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) return { ok: false, latency: null };
      return { ok: true, latency: Math.round(performance.now() - startedAt) };
    } catch {
      return { ok: false, latency: null };
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  const checkBackendHealth = useCallback(async () => {
    // Prefer dedicated API health endpoint (works with local proxy), then fall back.
    let result = await pingEndpoint('/api/health', 900);
    if (!result.ok) {
      result = await pingEndpoint('/health', 1200);
    }

    if (result.ok) {
      failureCountRef.current = 0;
      setBackendHealth('online');
      setBackendLatencyMs(result.latency);
      writeCachedBackendHealth('online', result.latency);
      return;
    }

    failureCountRef.current += 1;
    setBackendLatencyMs(null);

    // Avoid flicker: first miss shows reconnecting; only then mark disconnected.
    if (failureCountRef.current >= 2) {
      setBackendHealth('offline');
    } else {
      setBackendHealth('reconnecting');
    }
  }, [pingEndpoint]);

  useEffect(() => {
    let cancelled = false;

    const loop = async () => {
      await checkBackendHealth();
      if (cancelled) return;
      const nextMs = failureCountRef.current > 0 ? 1500 : 4000;
      pollTimerRef.current = setTimeout(loop, nextMs);
    };

    loop();

    const onFocus = () => {
      checkBackendHealth();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkBackendHealth();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkBackendHealth]);

  // Re-check immediately on route changes so next page reflects status quickly.
  useEffect(() => {
    checkBackendHealth();
  }, [location.pathname, checkBackendHealth]);

  // ── Fetch avatar on mount ─────────────────────────────────────────
  useEffect(() => {
    const fetchAvatar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .single();

      if (data) {
        setAvatarUrl(data.avatar_url || null);
        setUserName(data.full_name || '');
      }
    };

    fetchAvatar();
  }, []);

  // ── Search projects (debounced) ────────────────────────────────
  const searchProjects = useCallback(async (query) => {
    if (!query || query.trim().length < 1) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    setSearchOpen(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, total_carbon, created_at')
        .eq('user_id', user.id)
        .ilike('name', `%${query.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(8);

      if (!error && data) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchProjects(val), 300);
  };

  const handleSearchSelect = (project) => {
    setSearchValue('');
    setSearchResults([]);
    setSearchOpen(false);
    closeMobileMenu();

    // Navigate to Past Reports with selected project info for pre-filtering
    navigate('/history/pastReports', {
      state: { projectId: project.id, projectName: project.name },
    });
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Status badge helper ────────────────────────────────────────
  const getStatusBadge = (status) => {
    const map = {
      draft: { label: 'Draft', cls: 'search-status-draft' },
      uploaded: { label: 'Uploaded', cls: 'search-status-uploaded' },
      categorized: { label: 'Categorized', cls: 'search-status-categorized' },
      calculated: { label: 'Calculated', cls: 'search-status-calculated' },
      suggested: { label: 'Suggested', cls: 'search-status-suggested' },
      completed: { label: 'Completed', cls: 'search-status-completed' },
    };
    const info = map[status] || { label: status || 'Unknown', cls: 'search-status-draft' };
    return <span className={`search-status-badge ${info.cls}`}>{info.label}</span>;
  };

  // ── Search Results Dropdown ────────────────────────────────────
  const SearchDropdown = () => {
    if (!searchOpen) return null;
    return (
      <div className="header-search-dropdown">
        {searchLoading ? (
          <div className="search-loading">
            <Loader2 size={16} className="search-spinner" />
            <span>Searching…</span>
          </div>
        ) : searchResults.length > 0 ? (
          searchResults.map((project) => (
            <button
              key={project.id}
              type="button"
              className="search-result-item"
              onClick={() => handleSearchSelect(project)}
            >
              <FolderOpen size={16} className="search-result-icon" />
              <div className="search-result-info">
                <span className="search-result-name">{project.name}</span>
                <span className="search-result-meta">
                  {getStatusBadge(project.status)}
                  {project.total_carbon != null && (
                    <span className="search-result-carbon">
                      {Number(project.total_carbon).toFixed(2)} tCO₂e
                    </span>
                  )}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="search-no-results">No projects found</div>
        )}
      </div>
    );
  };

  // ── Avatar component ──────────────────────────────────────────────
  const AvatarButton = () => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={userName || 'User'}
          style={{
            width: 32, height: 32,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #2D9183',
            display: 'block',
          }}
        />
      );
    }

    // Initials fallback
    if (userName) {
      const initials = userName
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      return (
        <div style={{
          width: 32, height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2D9183 0%, #1a6b60 100%)',
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {initials}
        </div>
      );
    }

    // Default icon
    return <UserCircle size={24} />;
  };

  const isActive = (path) => {
    if (path === '/upload') {
      const projectPages = ['/upload', '/categorization', '/calculation', '/suggestions', '/analysis', '/report'];
      return projectPages.includes(location.pathname)
        ? 'header-nav-link active'
        : 'header-nav-link';
    }
    if (path === '/history') {
      return location.pathname === '/history'
        ? 'header-nav-link active'
        : 'header-nav-link';
    }
    return location.pathname === path ? 'header-nav-link active' : 'header-nav-link';
  };

  const handleProfileClick = () => setDropdownOpen(!dropdownOpen);

  const handleNavigateProfile = () => {
    navigate('/userprofile');
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    navigate('/');
    setDropdownOpen(false);
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/upload', label: 'Projects' },
    { path: '/history', label: 'Suggestions' },
    { path: '/history/pastReports', label: 'Reports' },
  ];

  const backendStatusLabel = backendHealth === 'online'
    ? `Backend connected${backendLatencyMs != null ? ` (${backendLatencyMs}ms)` : ''}`
    : backendHealth === 'reconnecting'
      ? 'Reconnecting backend...'
    : backendHealth === 'offline'
      ? 'Backend disconnected'
      : 'Checking backend';

  const backendTarget = API_BASE || window.location.origin;

  return (
    <header className="header">
      <div className="header-main">
        <div className="header-container">
          {/* Logo */}
          <Link to="/dashboard" className="header-logo" aria-label="EnviroSync">
            <span className="header-logo-text header-logo-enviro">Enviro</span>
            <span className="header-logo-circle">
              <img src="/images/logo.png" alt="" className="header-logo-img" aria-hidden="true" />
            </span>
            <span className="header-logo-text header-logo-ync">ync</span>
          </Link>

          {/* Desktop navigation links */}
          <nav className="header-nav">
            {navLinks.map(({ path, label }) => (
              <Link key={path} to={path} className={isActive(path)}>
                {label}
              </Link>
            ))}
          </nav>

          {/* Right: Search + User profile */}
          <div className="header-right">
            <div
              className={`header-backend-health header-backend-health--${backendHealth}`}
              title={`${backendStatusLabel} at ${backendTarget}`}
              aria-live="polite"
              aria-label={backendStatusLabel}
            >
              <span className="header-backend-dot" aria-hidden="true" />
            </div>
            <div className="header-search" ref={searchRef}>
              <Search size={18} className="header-search-icon" />
              <input
                type="search"
                placeholder="Search projects…"
                value={searchValue}
                onChange={handleSearchChange}
                onFocus={() => { if (searchValue.trim().length >= 1) setSearchOpen(true); }}
                className="header-search-input"
                aria-label="Search projects"
              />
              <SearchDropdown />
            </div>
            <button
              type="button"
              className="header-user-btn"
              aria-label="User profile"
              onClick={handleProfileClick}
            >
              <AvatarButton />
            </button>
            {dropdownOpen && (
              <div className="header-dropdown">
                <button
                  type="button"
                  className="header-dropdown-item"
                  onClick={() => { navigate('/dashboard/drafts'); setDropdownOpen(false); }}
                >
                  Drafts
                </button>
                <button
                  type="button"
                  className="header-dropdown-item"
                  onClick={handleNavigateProfile}
                >
                  User Profile
                </button>
                <button
                  type="button"
                  className="header-dropdown-item header-dropdown-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="header-mobile-menu-btn"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="header-mobile-menu">
          <div className="header-mobile-search" ref={searchRef}>
            <Search size={18} className="header-search-icon" />
            <input
              type="search"
              placeholder="Search projects…"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={() => { if (searchValue.trim().length >= 1) setSearchOpen(true); }}
              className="header-search-input"
              aria-label="Search projects"
            />
            <SearchDropdown />
          </div>
          <nav className="header-mobile-nav">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={isActive(path)}
                onClick={closeMobileMenu}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-mobile-actions">
            <button
              type="button"
              className="header-mobile-action-btn"
              onClick={() => { handleNavigateProfile(); closeMobileMenu(); }}
            >
              User Profile
            </button>
            <button
              type="button"
              className="header-mobile-action-btn logout"
              onClick={() => { handleLogout(); closeMobileMenu(); }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
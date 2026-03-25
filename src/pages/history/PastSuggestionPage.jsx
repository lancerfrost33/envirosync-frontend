import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import Card from '../../components/common/Card';
import './PastSuggestionPage.css';
import { supabase } from '../../lib/supabase.js';
import { API_BASE } from '../../lib/api';

// React Icons
import { CiExport } from "react-icons/ci";
import { IoMdSearch } from "react-icons/io";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiX, FiClock, FiTrendingDown, FiBox, FiActivity, FiRefreshCw } from "react-icons/fi";
import { BsMailbox } from "react-icons/bs";
import { FaArrowDown } from "react-icons/fa";

// --- HELPER FUNCTIONS ---
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function withinDateRange(dateStr, rangeKey) {
  const today = new Date();
  const d = new Date(dateStr + "T00:00:00");
  const msDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((today - d) / msDay);
  if (rangeKey === "all") return true;
  if (rangeKey === "30") return diffDays <= 30;
  if (rangeKey === "90") return diffDays <= 90;
  if (rangeKey === "365") return diffDays <= 365;
  return true;
}

function getStatusClass(status) {
  const lowerStatus = (status || '').toLowerCase();
  if (lowerStatus === "applied") return "ps-status-pill ps-status--applied";
  if (lowerStatus === "pending") return "ps-status-pill ps-status--pending";
  return "ps-status-pill";
}

// --- MAIN COMPONENT ---
const PastSuggestionPage = () => {
  const navigate = useNavigate();

  // NO localStorage line here — removed

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoadError(null);

      // Build query with filters
      const params = new URLSearchParams();
      params.set('limit', '1000'); // Fetch max 1000 at once
      
      console.log('🔍 Fetching suggestions from:', `${API_BASE}/api/suggestions/history?${params.toString()}`);
      // Fetch suggestions with pagination limit
      const response = await fetch(`${API_BASE}/api/suggestions/history?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('📊 API Response:', data);
      console.log('📈 Total:', data.total, 'Suggestions:', data.suggestions);

      // Resolve project names from project_id on the frontend when backend doesn't provide project_name.
      const rawSuggestions = data.suggestions || [];
      const projectIds = Array.from(
        new Set(rawSuggestions.map((s) => s.project_id).filter(Boolean))
      );

      let projectNameById = {};
      if (projectIds.length > 0) {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);

        if (projectsError) {
          console.error('Error fetching project names:', projectsError);
        } else {
          projectNameById = (projectsData || []).reduce((acc, project) => {
            acc[project.id] = project.name;
            return acc;
          }, {});
        }
      }

      // Minimal transformation - keep data closer to API response
      const transformedSuggestions = rawSuggestions.map((s) => {
        const normalizedStatus = ((s.status || 'applied').toLowerCase() === 'suggested')
          ? 'applied'
          : (s.status || 'applied');

        return {
        id: s.id,
        project_id: s.project_id,
        project_name: s.project_name || projectNameById[s.project_id] || 'Unknown Project',
        material_id: s.material_id,
        date: s.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        originalMaterial: s.original_material || 'Material',
        originalCarbon: (s.original_carbon > 0) ? `${s.original_carbon.toFixed(2)} kg CO₂e` : '—',
        originalCarbonValue: s.original_carbon || 0,
        recommendedAlternative: s.recommended_alternative || 'N/A',
        recommendedCarbon: (s.recommended_carbon > 0) ? `${s.recommended_carbon.toFixed(2)} kg CO₂e` : '—',
        recommendedCarbonValue: s.recommended_carbon || 0,
        potentialSaving: s.potential_saving_pct || 0,
        status: normalizedStatus
      };
      });
      setSuggestions(transformedSuggestions);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setLoadError(err.message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []); // Only run once on mount

  useEffect(() => {
    setLoading(true);
    fetchSuggestions();
  }, []);

  // Filters State
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingSuggestion, setViewingSuggestion] = useState(null);

  // Pagination State
  const pageSize = 4;
  const [page, setPage] = useState(1);

  // Status options
  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(suggestions.map((s) => s.status)));
    return ["all", ...statuses];
  }, [suggestions]);

  // Filtered suggestions
  const filteredSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();

    return suggestions.filter((s) => {
      const matchesDate = withinDateRange(s.date, dateFilter);
      const matchesStatus = statusFilter === "all" ? true : s.status === statusFilter;

      const matchesSearch =
        q.length === 0
          ? true
          : (s.originalMaterial || '').toLowerCase().includes(q) ||
          (s.recommendedAlternative || '').toLowerCase().includes(q) ||
          (s.status || '').toLowerCase().includes(q);

      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [statusFilter, dateFilter, search, suggestions]);

  // Summary stats
  const stats = useMemo(() => {
    const total = suggestions.length;
    const applied = suggestions.filter(s => (s.status || '').toLowerCase() === 'applied').length;
    const pending = suggestions.filter(s => (s.status || '').toLowerCase() === 'pending').length;
    const avgReduction = total > 0
      ? Math.round(suggestions.reduce((sum, s) => sum + (s.potentialSaving || 0), 0) / total)
      : 0;
    return { total, applied, pending, avgReduction };
  }, [suggestions]);

  // Pagination
  const totalItems = filteredSuggestions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageSafe = Math.min(page, totalPages);

  const pagedSuggestions = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filteredSuggestions.slice(start, start + pageSize);
  }, [filteredSuggestions, pageSafe, pageSize]);

  // --- HANDLERS ---
  const handleViewDetail = (suggestion) => {
    setViewingSuggestion(suggestion);
    setDetailModalOpen(true);
  };

  const exportHistory = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);

    fetch(`${API_BASE}/api/suggestions/export?${params.toString()}`)
      .then(response => {
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "EnviroSync_SuggestionHistory.csv";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Export error:', err);
        alert('Failed to export history');
      });
  }, [statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFilter, search]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchSuggestions();
  };

  // Render page numbers
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPageButtons = 5;

    if (totalPages <= maxPageButtons) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      if (pageSafe > 2 && pageSafe < totalPages - 1) {
        if (pageSafe > 3) pageNumbers.push("...");
        pageNumbers.push(pageSafe - 1, pageSafe, pageSafe + 1);
        if (pageSafe < totalPages - 2) pageNumbers.push("...");
      } else if (pageSafe <= 2) {
        pageNumbers.push(2, 3);
        if (totalPages > 4) pageNumbers.push("...");
      } else if (pageSafe >= totalPages - 1) {
        if (totalPages > 4) pageNumbers.push("...");
        pageNumbers.push(totalPages - 2, totalPages - 1);
      }
      if (!pageNumbers.includes(totalPages)) pageNumbers.push(totalPages);
    }

    return pageNumbers.map((p, index) =>
      p === "..." ? (
        <span key={`ellipsis-${index}`} className="ps-page-ellipsis">…</span>
      ) : (
        <button
          key={p}
          type="button"
          className={`ps-page-btn ${pageSafe === p ? "active" : ""}`}
          onClick={() => setPage(p)}
        >
          {p}
        </button>
      )
    );
  };

  const hasNoData = !loading && suggestions.length === 0 && !loadError;

  return (
    <div className="past-suggestion-page">
      <Header />
      <div className="ps-page-container">
        {/* Page Title Section */}
        <div className="ps-title-section">
          <div>
            <h1 className="ps-page-title">Suggestion History</h1>
            <p className="ps-page-subtitle">Track all past material optimisation suggestions and carbon savings across your projects.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="ps-export-btn ps-refresh-btn"
              onClick={handleManualRefresh}
              disabled={loading}
            >
              <FiRefreshCw className="box-btn-icon" />
              <span>Refresh</span>
            </button>
            <button className="ps-export-btn" onClick={exportHistory} disabled={loading || suggestions.length === 0}>
              <CiExport className="box-btn-icon" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="ps-stats-grid">
          <div className="ps-stat-card">
            <div className="ps-stat-icon-wrap ps-stat-icon--total">
              <FiBox size={20} />
            </div>
            <div className="ps-stat-content">
              <span className="ps-stat-value">{hasNoData ? '—' : stats.total}</span>
              <span className="ps-stat-label">Total Suggestions</span>
            </div>
          </div>
          <div className="ps-stat-card">
            <div className="ps-stat-icon-wrap ps-stat-icon--applied">
              <FiActivity size={20} />
            </div>
            <div className="ps-stat-content">
              <span className="ps-stat-value">{hasNoData ? '—' : stats.applied}</span>
              <span className="ps-stat-label">Applied</span>
            </div>
          </div>
          <div className="ps-stat-card">
            <div className="ps-stat-icon-wrap ps-stat-icon--pending">
              <FiClock size={20} />
            </div>
            <div className="ps-stat-content">
              <span className="ps-stat-value">{hasNoData ? '—' : stats.pending}</span>
              <span className="ps-stat-label">Pending</span>
            </div>
          </div>
          <div className="ps-stat-card">
            <div className="ps-stat-icon-wrap ps-stat-icon--reduction">
              <FiTrendingDown size={20} />
            </div>
            <div className="ps-stat-content">
              <span className="ps-stat-value">{hasNoData ? '—' : `${stats.avgReduction}%`}</span>
              <span className="ps-stat-label">Avg. CO₂e Reduction</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="ps-loading-state">
            <div className="ps-loading-spinner"></div>
            <p>Loading suggestion history...</p>
          </div>
        )}

        {/* Error State */}
        {loadError && !loading && (
          <div className="ps-error-state">
            <div className="ps-error-icon">!</div>
            <h3>Unable to Load Suggestions</h3>
            <p>{loadError}</p>
            <button className="ps-btn ps-btn-primary" onClick={handleManualRefresh}>Retry</button>
          </div>
        )}

        {/* Empty State */}
        {hasNoData && (
          <div className="ps-empty-hero">
            <div className="ps-empty-illustration">
              <div className="ps-empty-circle">
                <BsMailbox size={48} />
              </div>
              <div className="ps-empty-pulse"></div>
            </div>
            <h2 className="ps-empty-title">No Suggestions Yet</h2>
            <p className="ps-empty-desc">
              Material optimisation suggestions will appear here once you apply alternatives through the Suggestions page.
              Go to Suggestions and select at least one alternative to see results here.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="ps-btn ps-btn-primary ps-empty-cta" onClick={() => navigate('/reports')}>
                View Final Report
              </button>
              <button className="ps-btn ps-btn-secondary" onClick={() => window.open(`${API_BASE}/api/suggestions/debug/all`, '_blank')} style={{ background: '#666', padding: '8px 16px', borderRadius: '4px', border: 'none', color: 'white', cursor: 'pointer' }}>
                🔍 Debug: Check Database
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !hasNoData && !loadError && (
          <>
            {/* Search + Filter Bar */}
            <div className="ps-controls-row">
              <div className="ps-search-box">
                <IoMdSearch className="ps-search-icon" aria-hidden />
                <input
                  type="search"
                  placeholder="Search material, alternative, or status..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-search-input"
                  aria-label="Search past suggestions"
                />
              </div>
              <div className="ps-filters-row">
                <div className="ps-select-wrapper">
                  <select className="toolbar-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} aria-label="Filter by date">
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 3 Months</option>
                    <option value="365">Last 12 Months</option>
                    <option value="all">All Time</option>
                  </select>
                  <FiChevronDown className="select-arrow-icon" />
                </div>
                <div className="ps-select-wrapper">
                  <select className="toolbar-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
                    {statusOptions.map((s) => (<option key={s} value={s}>{s === "all" ? "All Statuses" : s}</option>))}
                  </select>
                  <FiChevronDown className="select-arrow-icon" />
                </div>
              </div>
            </div>

            {/* Empty Filter Result */}
            {filteredSuggestions.length === 0 ? (
              <div className="ps-no-results">
                <IoMdSearch size={40} />
                <h3>No Matching Suggestions</h3>
                <p>Try adjusting your filters or search keyword.</p>
              </div>
            ) : (
              <>
                {/* Card Grid */}
                <div className="ps-card-grid">
                  {pagedSuggestions.map((s) => (
                    <div className="ps-suggestion-card" key={s.id} onClick={() => handleViewDetail(s)}>
                      <div className="ps-card-top">
                        <span className="ps-card-date">{formatDate(s.date)}</span>
                        <span className={getStatusClass(s.status)}>{s.status}</span>
                      </div>
                      <h3 className="ps-card-material">{s.originalMaterial}</h3>
                      <p className="ps-card-project">{s.project_name}</p>
                      <div className="ps-card-metrics">
                        <div className="ps-card-metric">
                          <span className="ps-card-metric-label">Original</span>
                          <span className="ps-card-metric-value ps-text-muted">{s.originalCarbon}</span>
                        </div>
                        <div className="ps-card-metric-arrow">
                          <FaArrowDown />
                        </div>
                        <div className="ps-card-metric">
                          <span className="ps-card-metric-label">Alternative</span>
                          <span className="ps-card-metric-value ps-text-green">
                            {s.recommendedAlternative}
                          </span>
                        </div>
                      </div>
                      <div className="ps-card-bottom">
                        <div className="ps-card-saving">
                          <FiTrendingDown size={14} />
                          <span>{s.potentialSaving > 0 ? `${s.potentialSaving}% Reduction` : '—'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="ps-pagination-row">
                    <div className="ps-pagination-meta">
                      Showing <strong>{(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> suggestions
                    </div>
                    <div className="ps-pagination-controls">
                      <button type="button" className="ps-page-arrow" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe === 1}>
                        <FiChevronLeft />
                      </button>
                      {renderPageNumbers()}
                      <button type="button" className="ps-page-arrow" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages}>
                        <FiChevronRight />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detailModalOpen && viewingSuggestion && (
        <div className="ps-modal-overlay" onClick={() => setDetailModalOpen(false)}>
          <div className="ps-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <h2 className="ps-modal-title">Suggestion Detail</h2>
              <button className="ps-modal-close" onClick={() => setDetailModalOpen(false)}>
                <FiX size={24} />
              </button>
            </div>

            <div className="ps-modal-body">
              <div className="ps-modal-section">
                <h3 className="ps-section-title">Original Material</h3>
                <div className="ps-material-info-card">
                  <div className="ps-info-row">
                    <span className="ps-info-label">Material</span>
                    <span className="ps-info-value">{viewingSuggestion.originalMaterial}</span>
                  </div>
                  <div className="ps-info-row">
                    <span className="ps-info-label">Carbon Emission</span>
                    <span className="ps-info-value ps-carbon-high">{viewingSuggestion.originalCarbon}</span>
                  </div>
                </div>
              </div>

              <div className="ps-modal-section">
                <h3 className="ps-section-title">Recommended Alternative</h3>
                <div className="ps-material-info-card ps-current-rec">
                  <div className="ps-info-row">
                    <span className="ps-info-label">Alternative</span>
                    <span className="ps-info-value">{viewingSuggestion.recommendedAlternative}</span>
                  </div>
                  <div className="ps-info-row">
                    <span className="ps-info-label">Carbon Emission</span>
                    <span className="ps-info-value ps-carbon-low">{viewingSuggestion.recommendedCarbon}</span>
                  </div>
                  <div className="ps-info-row">
                    <span className="ps-info-label">Reduction</span>
                    <span className="ps-info-value ps-green-text">{viewingSuggestion.potentialSaving}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ps-modal-footer">
              <button className="ps-btn ps-btn-secondary" onClick={() => setDetailModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default PastSuggestionPage;

// src/pages/history/PastReportsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import Card from "../../components/common/Card";
import { CiExport } from "react-icons/ci";
import { MdOutlineRemoveRedEye, MdOutlinePictureAsPdf } from "react-icons/md";
import { BsMailbox } from "react-icons/bs";
import { IoMdSearch, IoMdClose } from "react-icons/io";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiFileText, FiBarChart2, FiAward, FiTrendingDown } from "react-icons/fi";
import { jsPDF } from "jspdf";
import { API_BASE } from '../../lib/api';
import "./PastReportsPage.css";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function withinDateRange(dateStr, rangeKey) {
  if (!dateStr || rangeKey === "all") return true;
  const today = new Date();
  const d = new Date(dateStr + "T00:00:00");
  const diffDays = Math.floor((today - d) / (24 * 60 * 60 * 1000));
  if (rangeKey === "30") return diffDays <= 30;
  if (rangeKey === "90") return diffDays <= 90;
  if (rangeKey === "365") return diffDays <= 365;
  return true;
}

function gradeClass(tone) {
  if (tone === "success") return "grade grade-success";
  if (tone === "warning") return "grade grade-warning";
  if (tone === "danger") return "grade grade-danger";
  return "grade";
}

function fallbackToneFromGrade(grade) {
  if (grade === "A" || grade === "A-") return "success";
  if (grade === "B+" || grade === "B" || grade === "B-") return "warning";
  return "danger";
}

const GRADE_BANDS = [
  { range: '< 15', grade: 'A', label: 'Sustainable' },
  { range: '15 - < 30', grade: 'A-', label: 'Sustainable' },
  { range: '30 - < 40', grade: 'B+', label: 'Efficient' },
  { range: '40 - < 55', grade: 'B', label: 'Efficient' },
  { range: '55 - < 70', grade: 'B-', label: 'Moderate' },
  { range: '70 - < 85', grade: 'C', label: 'Moderate' },
  { range: '85 - < 100', grade: 'D', label: 'Poor' },
  { range: '>= 100', grade: 'F', label: 'Critical' },
];

function buildPdf(report) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("EnviroSync - Carbon Report", 14, 18);
  doc.setFontSize(11);
  doc.text(`Project: ${report.project}`, 14, 32);
  doc.text(`Reference: ${report.ref}`, 14, 40);
  doc.text(`Date: ${formatDate(report.date)}`, 14, 48);
  doc.setFontSize(14);
  doc.text(`Total Carbon: ${report.totalCarbonT?.toFixed(1)} T CO2e`, 14, 62);
  doc.setFontSize(11);
  doc.text(`Grade: ${report.grade} (${report.gradeLabel})`, 14, 74);
  doc.setFontSize(10);
  doc.text("Note: This report was generated from EnviroSync data.", 14, 92);
  doc.save(`EnviroSync_${(report.project || "Report").replace(/\s+/g, "_")}_${report.ref}.pdf`);
}

// ── Fallback mock data ────────────────────────────────────────────────────────
// Shown when backend is offline or returns no data.
// Remove once backend is reliably returning real reports.

function getFallbackReports() {
  const today = new Date();
  const ago = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  };
  return [
    { id: "demo-001", project_id: null, project: "Project ABC",  ref: "2025/GRN-8821-MC", date: ago(5),  totalCarbonT: 42.8, grade: "A",  gradeLabel: "Sustainable", gradeTone: "success" },
    { id: "demo-002", project_id: null, project: "Project DFG",  ref: "2025/GRN-8820-MC", date: ago(7),  totalCarbonT: 58.3, grade: "B+", gradeLabel: "Efficient",   gradeTone: "warning" },
    { id: "demo-003", project_id: null, project: "Project XYZ",  ref: "2025/GRN-8819-MC", date: ago(9),  totalCarbonT: 72.1, grade: "C",  gradeLabel: "Moderate",    gradeTone: "danger"  },
    { id: "demo-004", project_id: null, project: "Project 123",  ref: "2025/GRN-8818-MC", date: ago(12), totalCarbonT: 35.2, grade: "A",  gradeLabel: "Sustainable", gradeTone: "success" },
    { id: "demo-005", project_id: null, project: "Project 345",  ref: "2025/GRN-8817-MC", date: ago(14), totalCarbonT: 48.9, grade: "B-", gradeLabel: "Moderate",    gradeTone: "warning" },
    { id: "demo-006", project_id: null, project: "Project EGF",  ref: "2025/GRN-8816-MC", date: ago(16), totalCarbonT: 61.4, grade: "B",  gradeLabel: "Efficient",   gradeTone: "warning" },
  ];
}

const IS_DEMO_ID = (id) => typeof id === "string" && id.startsWith("demo-");

// ── Component ─────────────────────────────────────────────────────────────────

const PastReportsPage = () => {
  const location = useLocation();
  const [allReports, setAllReports] = useState([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("365");
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showGradeGuide, setShowGradeGuide] = useState(false);

  // Pagination
  const pageSize = 6;
  const [page, setPage] = useState(1);

  // ── Fetch reports ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);

        const response = await fetch(`${API_BASE}/api/reports`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const reports = data.reports || [];

        if (reports.length === 0) {
          // Backend returned empty — show demo data
          setAllReports(getFallbackReports());
          setIsDemoMode(true);
          return;
        }

        // Normalize shape from backend
        const normalized = reports.map((r) => ({
          id: r.id,
          project_id: r.project_id,
          // Backend joins project name via carbon_service.get_all_reports → r.project
          project: r.project || r.project_name || "Unknown Project",
          ref: r.ref || r.reference_id || "—",
          date: r.date || (r.created_at ? r.created_at.split("T")[0] : ""),
          totalCarbonT: parseFloat(r.totalCarbonT ?? r.total_carbon_t ?? 0),
          grade: r.grade || r.sustainability_grade || "—",
          gradeLabel: r.gradeLabel || r.grade_label || "Unknown",
          gradeTone: r.gradeTone || fallbackToneFromGrade(r.grade || r.sustainability_grade),
        }));

        setAllReports(normalized);
        setIsDemoMode(false);
      } catch (err) {
        console.warn("Backend unavailable, using demo data:", err.message);
        setAllReports(getFallbackReports());
        setIsDemoMode(true);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // ── Auto-filter from header search (route state) ─────────────────────────
  useEffect(() => {
    if (!loading && allReports.length > 0 && location.state?.projectId) {
      const { projectId, projectName } = location.state;

      // Try matching by project_id first, then fall back to projectName
      const match = allReports.find((r) => r.project_id === projectId);
      const filterValue = match ? match.project : projectName || null;

      if (filterValue) {
        setProjectFilter(filterValue);
      }

      // Clear route state so refreshing / navigating back doesn't re-apply
      window.history.replaceState({}, '');
    }
  }, [loading, allReports, location.state]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const projectOptions = useMemo(() => {
    const projects = Array.from(new Set(allReports.map((r) => r.project).filter(Boolean)));
    return ["all", ...projects];
  }, [allReports]);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allReports.filter((r) => {
      const matchesProject = projectFilter === "all" || r.project === projectFilter;
      const matchesDate    = withinDateRange(r.date, dateFilter);
      // Safe .toLowerCase() — guard against undefined grade
      const matchesSearch  =
        q.length === 0 ||
        (r.project || "").toLowerCase().includes(q) ||
        (r.ref     || "").toLowerCase().includes(q) ||
        (r.grade   || "").toLowerCase().includes(q);
      return matchesProject && matchesDate && matchesSearch;
    });
  }, [projectFilter, dateFilter, search, allReports]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const pageSafe   = Math.min(page, totalPages);

  const pagedReports = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, pageSafe]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [projectFilter, dateFilter, search, viewMode]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openPreview = (report) => { setSelectedReport(report); setPreviewOpen(true); };
  const closePreview = () => { setPreviewOpen(false); setSelectedReport(null); };

  const exportHistory = () => {
    const headers = ["date", "project", "ref", "totalCarbonT", "grade", "gradeLabel"];
    const rows = filteredReports.map((r) =>
      [r.date, r.project, r.ref, r.totalCarbonT, r.grade, r.gradeLabel]
        .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = "EnviroSync_ReportHistory.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Summary stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = allReports.length;
    const avgCarbon = total > 0
      ? (allReports.reduce((sum, r) => sum + (r.totalCarbonT || 0), 0) / total).toFixed(1)
      : '—';
    const gradeOrder = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
    const bestGrade = total > 0
      ? allReports.reduce((best, r) => {
          const bi = gradeOrder.indexOf(best);
          const ri = gradeOrder.indexOf(r.grade);
          return ri !== -1 && (bi === -1 || ri < bi) ? r.grade : best;
        }, allReports[0]?.grade || '—')
      : '—';
    const lowestCarbon = total > 0
      ? Math.min(...allReports.map(r => r.totalCarbonT || Infinity)).toFixed(1)
      : '—';
    return { total, avgCarbon, bestGrade, lowestCarbon };
  }, [allReports]);

  const hasNoData = !loading && allReports.length === 0;

  // ── Pagination helpers ────────────────────────────────────────────────────
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPageButtons = 5;
    if (totalPages <= maxPageButtons) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      if (pageSafe > 3) pageNumbers.push('...');
      for (let i = Math.max(2, pageSafe - 1); i <= Math.min(totalPages - 1, pageSafe + 1); i++) pageNumbers.push(i);
      if (pageSafe < totalPages - 2) pageNumbers.push('...');
      if (!pageNumbers.includes(totalPages)) pageNumbers.push(totalPages);
    }
    return pageNumbers.map((p, index) =>
      p === '...' ? (
        <span key={`ellipsis-${index}`} className="pr-page-ellipsis">…</span>
      ) : (
        <button key={p} type="button" className={`pr-page-btn ${pageSafe === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
      )
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="past-reports-page">
      <Header />
      <div className="pr-page-container">

        {/* Title Section */}
        <div className="pr-title-section">
          <div>
            <h1 className="pr-page-title">Past Reports Archive</h1>
            <p className="pr-page-subtitle">Manage and access historical environmental impact reports. Track your progress across all construction projects.</p>
          </div>
          <button className="pr-export-btn" onClick={exportHistory} disabled={loading || allReports.length === 0}>
            <CiExport className="box-btn-icon" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="pr-demo-banner">
            <p>
              <strong>Demo Mode:</strong> Showing sample reports. Connect the backend at{" "}
              <code>{API_BASE}</code> and generate reports to see real data.
            </p>
          </div>
        )}

        {/* Summary Stat Cards */}
        <div className="pr-stats-grid">
          <div className="pr-stat-card">
            <div className="pr-stat-icon-wrap pr-stat-icon--total">
              <FiFileText size={20} />
            </div>
            <div className="pr-stat-content">
              <span className="pr-stat-value">{hasNoData ? '—' : stats.total}</span>
              <span className="pr-stat-label">Total Reports</span>
            </div>
          </div>
          <div className="pr-stat-card">
            <div className="pr-stat-icon-wrap pr-stat-icon--carbon">
              <FiBarChart2 size={20} />
            </div>
            <div className="pr-stat-content">
              <span className="pr-stat-value">{hasNoData ? '—' : `${stats.avgCarbon}T`}</span>
              <span className="pr-stat-label">Avg. Carbon</span>
            </div>
          </div>
          <div className="pr-stat-card">
            <div className="pr-stat-icon-wrap pr-stat-icon--grade">
              <FiAward size={20} />
            </div>
            <div className="pr-stat-content">
              <span className="pr-stat-value">{hasNoData ? '—' : stats.bestGrade}</span>
              <span className="pr-stat-label">Best Grade</span>
            </div>
          </div>
          <div className="pr-stat-card">
            <div className="pr-stat-icon-wrap pr-stat-icon--lowest">
              <FiTrendingDown size={20} />
            </div>
            <div className="pr-stat-content">
              <span className="pr-stat-value">{hasNoData ? '—' : `${stats.lowestCarbon}T`}</span>
              <span className="pr-stat-label">Lowest Carbon</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="pr-loading-state">
            <div className="pr-loading-spinner"></div>
            <p>Loading reports...</p>
          </div>
        )}

        {/* Empty State — No Data */}
        {hasNoData && (
          <div className="pr-empty-hero">
            <div className="pr-empty-illustration">
              <div className="pr-empty-circle">
                <BsMailbox size={48} />
              </div>
              <div className="pr-empty-pulse"></div>
            </div>
            <h2 className="pr-empty-title">No Reports Yet</h2>
            <p className="pr-empty-desc">
              Your generated carbon reports will appear here. Complete a carbon calculation and generate a report to get started.
            </p>
            <div className="pr-empty-grid-preview">
              <div className="pr-skeleton-card">
                <div className="pr-skeleton-header"></div>
                <div className="pr-skeleton-line pr-skeleton--w80"></div>
                <div className="pr-skeleton-line pr-skeleton--w60"></div>
                <div className="pr-skeleton-footer">
                  <div className="pr-skeleton-badge"></div>
                  <div className="pr-skeleton-badge pr-skeleton--short"></div>
                </div>
              </div>
              <div className="pr-skeleton-card">
                <div className="pr-skeleton-header"></div>
                <div className="pr-skeleton-line pr-skeleton--w70"></div>
                <div className="pr-skeleton-line pr-skeleton--w90"></div>
                <div className="pr-skeleton-footer">
                  <div className="pr-skeleton-badge"></div>
                  <div className="pr-skeleton-badge pr-skeleton--short"></div>
                </div>
              </div>
              <div className="pr-skeleton-card">
                <div className="pr-skeleton-header"></div>
                <div className="pr-skeleton-line pr-skeleton--w60"></div>
                <div className="pr-skeleton-line pr-skeleton--w80"></div>
                <div className="pr-skeleton-footer">
                  <div className="pr-skeleton-badge"></div>
                  <div className="pr-skeleton-badge pr-skeleton--short"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content — Data Present */}
        {!loading && !hasNoData && (
          <>
            {/* Search + Filter Bar */}
            <div className="pr-controls-row">
              <div className="pr-search-box">
                <IoMdSearch className="pr-search-icon" aria-hidden />
                <input
                  type="search"
                  placeholder="Search project, reference, or grade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-search-input"
                  aria-label="Search past reports"
                />
              </div>
              <div className="pr-filters-row">
                <div className="pr-select-wrapper">
                  <select className="pr-toolbar-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Filter by project">
                    {projectOptions.map((p) => (<option key={p} value={p}>{p === "all" ? "All Projects" : p}</option>))}
                  </select>
                  <FiChevronDown className="pr-select-arrow" />
                </div>
                <div className="pr-select-wrapper">
                  <select className="pr-toolbar-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} aria-label="Filter by date range">
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 3 Months</option>
                    <option value="365">Last 12 Months</option>
                    <option value="all">All Time</option>
                  </select>
                  <FiChevronDown className="pr-select-arrow" />
                </div>
                <div className="pr-view-toggle">
                  <button type="button" className={`pr-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Grid</button>
                  <button type="button" className={`pr-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>List</button>
                </div>
              </div>
            </div>

            {/* Empty Filter Result */}
            {filteredReports.length === 0 ? (
              <div className="pr-no-results">
                <IoMdSearch size={40} />
                <h3>No Matching Reports</h3>
                <p>Try adjusting your filters or search keyword.</p>
              </div>
            ) : (
              <>
                {/* Report Card Grid / List */}
                <div className={viewMode === 'grid' ? 'pr-card-grid' : 'pr-card-list'}>
                  {pagedReports.map((r) => (
                    <div className="pr-report-card" key={r.id} onClick={() => openPreview(r)}>
                      <div className="pr-card-top">
                        <span className="pr-card-date">{formatDate(r.date)}</span>
                        <div className={`pr-grade-badge pr-grade--${r.gradeTone}`}>
                          <span className="pr-grade-value">{r.grade}</span>
                        </div>
                      </div>
                      <h3 className="pr-card-project">{r.project}</h3>
                      <p className="pr-card-ref">REF: {r.ref}</p>
                      <div className="pr-card-carbon">
                        <span className="pr-card-carbon-label">Total Carbon</span>
                        <div className="pr-card-carbon-value">
                          <span className="pr-carbon-number">{r.totalCarbonT?.toFixed(1)}T</span>
                          <span className="pr-carbon-unit">CO₂e</span>
                        </div>
                      </div>
                      <div className="pr-card-bottom">
                        <span className={`pr-grade-label-pill pr-grade-label--${r.gradeTone}`}>{r.gradeLabel}</span>
                        <div className="pr-card-actions">
                          <button className="pr-action-btn pr-action-preview" onClick={(e) => { e.stopPropagation(); openPreview(r); }} title="Preview">
                            <MdOutlineRemoveRedEye size={16} />
                          </button>
                          <button className="pr-action-btn pr-action-pdf" onClick={(e) => { e.stopPropagation(); buildPdf(r); }} title="Download PDF">
                            <MdOutlinePictureAsPdf size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pr-pagination-row">
                    <div className="pr-pagination-meta">
                      Showing <strong>{(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, filteredReports.length)}</strong> of <strong>{filteredReports.length}</strong> reports
                    </div>
                    <div className="pr-pagination-controls">
                      <button type="button" className="pr-page-arrow" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe === 1}>
                        <FiChevronLeft />
                      </button>
                      {renderPageNumbers()}
                      <button type="button" className="pr-page-arrow" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages}>
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

      {/* Preview Modal */}
      {previewOpen && selectedReport && (
        <div className="pr-modal-overlay" onClick={closePreview} role="dialog" aria-modal="true">
          <div className="pr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <div>
                <h2 className="pr-modal-title">{selectedReport.project}</h2>
                <p className="pr-modal-subtitle">{formatDate(selectedReport.date)} • {selectedReport.ref}</p>
              </div>
              <button type="button" className="pr-modal-close" onClick={closePreview} aria-label="Close preview">
                <IoMdClose size={22} />
              </button>
            </div>
            <div className="pr-modal-body">
              {/* Grade Overview */}
              <div className="pr-modal-section">
                <h3 className="pr-section-title">
                  Sustainability Grade
                  <button
                    type="button"
                    className="pr-info-btn"
                    onClick={() => setShowGradeGuide(true)}
                    aria-label="Open grade guide"
                    title="Open grade guide"
                  >
                    ?
                  </button>
                </h3>
                <div className="pr-grade-overview">
                  <div className={`pr-grade-circle pr-grade--${selectedReport.gradeTone}`}>
                    <span>{selectedReport.grade}</span>
                  </div>
                  <div className="pr-grade-info">
                    <span className={`pr-grade-label-pill pr-grade-label--${selectedReport.gradeTone}`}>{selectedReport.gradeLabel}</span>
                    <p className="pr-grade-desc">Based on total carbon emissions relative to project benchmarks.</p>
                  </div>
                </div>
              </div>

              {/* Report Details */}
              <div className="pr-modal-section">
                <h3 className="pr-section-title">Report Details</h3>
                <div className="pr-detail-card">
                  <div className="pr-detail-row">
                    <span className="pr-detail-label">Project</span>
                    <span className="pr-detail-value">{selectedReport.project}</span>
                  </div>
                  <div className="pr-detail-row">
                    <span className="pr-detail-label">Reference</span>
                    <span className="pr-detail-value">{selectedReport.ref}</span>
                  </div>
                  <div className="pr-detail-row">
                    <span className="pr-detail-label">Date</span>
                    <span className="pr-detail-value">{formatDate(selectedReport.date)}</span>
                  </div>
                  <div className="pr-detail-row">
                    <span className="pr-detail-label">Total Carbon</span>
                    <span className="pr-detail-value pr-carbon-highlight">{selectedReport.totalCarbonT?.toFixed(1)}T CO₂e</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pr-modal-footer">
              <button type="button" className="pr-btn pr-btn-secondary" onClick={closePreview}>Close</button>
              <button type="button" className="pr-btn pr-btn-primary" onClick={() => buildPdf(selectedReport)}>
                <MdOutlinePictureAsPdf size={16} />
                Download PDF
              </button>
            </div>

            {showGradeGuide && (
              <div className="pr-guide-overlay" onClick={() => setShowGradeGuide(false)}>
                <div className="pr-guide-card" onClick={(e) => e.stopPropagation()}>
                  <div className="pr-guide-header">
                    <h4>System Carbon Evaluation Guide</h4>
                    <button type="button" className="pr-guide-close" onClick={() => setShowGradeGuide(false)} aria-label="Close guide">x</button>
                  </div>
                  <div className="pr-guide-body">
                    <p>Total CO2e Reduction = Baseline CO2e - Optimised CO2e</p>
                    <p>Reduction Achieved (%) = ((Baseline - Optimised) / Baseline) * 100</p>
                    <table className="pr-guide-table">
                      <thead>
                        <tr>
                          <th>Total Carbon (tCO2e)</th>
                          <th>Grade</th>
                          <th>Label</th>
                        </tr>
                      </thead>
                      <tbody>
                        {GRADE_BANDS.map((row) => (
                          <tr key={row.range}>
                            <td>{row.range}</td>
                            <td>{row.grade}</td>
                            <td>{row.label}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

// ── Local helper (mirrors carbon_service._grade_to_tone) ─────────────────────
function _gradeToTone(grade) {
  if (!grade) return "danger";
  if (["A", "A-"].includes(grade)) return "success";
  if (["B+", "B", "B-"].includes(grade)) return "warning";
  return "danger";
}

export default PastReportsPage;
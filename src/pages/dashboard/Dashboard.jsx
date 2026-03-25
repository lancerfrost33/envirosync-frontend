import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import WelcomeBackModal from '../../components/modals/WelcomeBackModal';
import ChatWizard from '../../components/chatbot/ChatbotWidget';
import { useChatbotIndexing } from '../../hooks/useChatbotindexing';
import './Dashboard.css';
import { supabase } from '../../lib/supabase';
import { API_BASE } from '../../lib/api';
import {
  ArrowRight,
  Building2,       // Organization icon — replaces 🏢
  BarChart2,       // Project icon — replaces 📊
  Leaf,            // CO2 Saved — replaces 🌱
  Trees,           // Trees — replaces 🌳
  Star,            // Score — replaces ⭐
  Target,          // YoY target — replaces 🎯
} from 'lucide-react';

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

const Dashboard = () => {
  const navigate = useNavigate();

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { 'Authorization': `Bearer ${session.access_token}` }
      : {};
  };

  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    const loadDrafts = async () => {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      try {
        const res = await fetch(`${API_BASE}/api/drafts`, { headers });
        const data = await res.json();
        const STAGE_META = {
          upload: { label: 'Upload Stage', route: '/upload' },
          categorization: { label: 'Categorization Stage', route: '/categorization' },
          calculation: { label: 'Calculation Stage', route: '/calculation' },
          suggestion: { label: 'Suggestion Stage', route: '/suggestions' },
          analysis: { label: 'Analysis Stage', route: '/analysis' },
        };
        setDrafts(data.map(d => ({
          id: d.id,
          fileName: d.file_name || `${d.stage} Draft`,
          currentStage: d.stage,
          label: STAGE_META[d.stage]?.label || d.stage,
          route: STAGE_META[d.stage]?.route || '/upload',
          lastModified: d.saved_at,
        })));
      } catch (err) {
        console.error('Failed to load drafts for modal:', err);
      }
    };
    loadDrafts();
  }, []);

  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    const today = new Date().toDateString();
    const dismissedDate = localStorage.getItem('envirosync.welcomeModal.dismissedDate');
    if (dismissedDate === today) return false;
    const shownThisSession = sessionStorage.getItem('envirosync.welcomeModal.shownThisSession');
    if (shownThisSession === 'true') return false;
    sessionStorage.setItem('envirosync.welcomeModal.shownThisSession', 'true');
    return true;
  });

  const [viewMode, setViewMode] = useState('organization');
  const [showGradeGuide, setShowGradeGuide] = useState(false);
  const [selectedProject, setSelectedProject] = useState('all');
  const [timePeriod, setTimePeriod] = useState('this-year');

  const [summary, setSummary] = useState(null);
  const [emissions, setEmissions] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  useChatbotIndexing(summary, emissions, breakdown);  // ← add this line

  const view = viewMode === 'organization' ? 'organization' : 'project';
  const projectIdParam = viewMode === 'project' && selectedProject !== 'all' ? selectedProject : null;

  useEffect(() => {
    const params = new URLSearchParams({ view });
    if (projectIdParam) params.set('project_id', projectIdParam);

    const fetchDashboard = async () => {
      setLoading(true);
      setApiError(null);
      const headers = await getAuthHeaders();
      let isMounted = true;

      try {
        // CRITICAL FIRST: Fetch summary (shows immediately)
        const summaryRes = await fetch(`${API_BASE}/api/dashboard/summary?${params}`, { headers });
        if (!summaryRes.ok) throw new Error('Summary failed');
        const summaryData = await summaryRes.json();

        if (isMounted) {
          setSummary(summaryData);
          setLoading(false); // Show UI immediately
        }

        // BACKGROUND: Load charts without delay
        Promise.allSettled([
          fetch(`${API_BASE}/api/dashboard/emissions?${params}`, { headers }).then(r => r.json()),
          fetch(`${API_BASE}/api/dashboard/breakdown?${params}`, { headers }).then(r => r.json()),
          fetch(`${API_BASE}/api/dashboard/activity?${params}`, { headers }).then(r => r.json()),
        ]).then(results => {
          if (!isMounted) return;

          const [emissionsResult, breakdownResult, activityResult] = results;

          if (emissionsResult.status === 'fulfilled') {
            setEmissions(Array.isArray(emissionsResult.value) ? emissionsResult.value : []);
          }
          if (breakdownResult.status === 'fulfilled') {
            setBreakdown(Array.isArray(breakdownResult.value) ? breakdownResult.value : []);
          }
          if (activityResult.status === 'fulfilled') {
            setRecentActivity(Array.isArray(activityResult.value) ? activityResult.value : []);
          }
        });

      } catch (err) {
        console.error('Dashboard critical error:', err);
        if (isMounted) {
          setApiError(err.message || 'Failed to load dashboard');
          setLoading(false);
        }
      }

      return () => {
        isMounted = false;
      };
    };

    const cleanup = fetchDashboard();
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [view, projectIdParam]);

  const projectMaterials = useMemo(() => {
    if (viewMode !== 'project' || selectedProject === 'all' || !breakdown.length) return {};
    const key = selectedProject;
    return {
      [key]: breakdown.map((b) => ({
        name: b.label,
        emission: Math.round(b.emission_kg),
        percentage: b.percentage,
      })),
    };
  }, [viewMode, selectedProject, breakdown]);

  // ── Impact metrics — REPLACED emoji with Lucide icon components ──
  const impactMetrics = useMemo(() => {
    if (!summary || viewMode !== 'organization') return [];
    return [
      {
        label: 'CO₂e Saved',
        value: summary.co2eSavedFormatted ?? String(summary.co2eSaved ?? '0'),
        unit: 'kg CO₂e',
        icon: <Leaf size={20} strokeWidth={2} />,
      },
      {
        label: 'Trees Equivalent',
        value: summary.treesEquivalentFormatted ?? String(summary.treesEquivalent ?? '0'),
        unit: 'trees',
        icon: <Trees size={20} strokeWidth={2} />,
      },
      {
        label: 'Sustainability Score',
        value: summary.sustainabilityScore ?? '—',
        unit: '',
        icon: <Star size={20} strokeWidth={2} />,
        info: 'Score reflects latest project-level sustainability marker. Final report grade uses tCO2e threshold bands shown in this guide.',
      },
    ];
  }, [summary, viewMode]);

  const maxDisplayValue = useMemo(() => {
    if (!emissions.length) return 1;
    return Math.max(...emissions.map((p) => p.baseline || 0), 1);
  }, [emissions]);

  const filteredData = useMemo(() => {
    if (apiError || loading) {
      return { totalCarbon: loading ? '—' : '0', totalProjects: 0, emissions: [], impactMetrics: [], recentActivity: [] };
    }
    if (viewMode === 'organization') {
      return {
        totalCarbon: summary?.totalCarbonFormatted ?? String(summary?.totalCarbon ?? '0'),
        totalProjects: summary?.totalProjects ?? 0,
        emissions,
        impactMetrics,
        recentActivity,
      };
    }
    if (selectedProject === 'all') {
      return {
        totalCarbon: summary?.totalCarbonFormatted ?? String(summary?.totalCarbon ?? '0'),
        totalProjects: summary?.totalProjects ?? 0,
        emissions,
        impactMetrics: [],
        recentActivity,
      };
    }
    const projectData = emissions.find((p) => p.id === selectedProject || p.slug === selectedProject);
    if (!projectData) {
      return { totalCarbon: '0', totalProjects: 0, emissions: [], impactMetrics: [], recentActivity: [] };
    }
    return {
      totalCarbon: projectData.baseline != null ? Math.round(projectData.baseline).toLocaleString() : '0',
      totalProjects: 1,
      emissions: [projectData],
      impactMetrics: [],
      recentActivity: recentActivity.filter((a) => a.project === projectData.name),
    };
  }, [apiError, loading, summary, viewMode, selectedProject, emissions, impactMetrics, recentActivity]);

  const handleProjectClick = (projectIdOrName) => {
    if (viewMode === 'organization') {
      setViewMode('project');
      setSelectedProject(projectIdOrName);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="dashboard">
      <Header />
      <main className="dashboard-content">

        {/* ── Row 1: Title + Upload btn ── */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Assessment Dashboard</h1>
          <Link to="/upload" className="dashboard-upload-btn">
            Upload Here
          </Link>
        </div>

        {/* ── View Mode Selector — Lucide icons replace emoji ── */}
        <div className="view-mode-selector">
          <button
            className={`view-mode-btn ${viewMode === 'organization' ? 'active' : ''}`}
            onClick={() => setViewMode('organization')}
          >
            {/* FIXED: was 🏢 emoji */}
            <span className="view-icon">
              <Building2 size={15} strokeWidth={2} />
            </span>
            Organization View
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'project' ? 'active' : ''}`}
            onClick={() => setViewMode('project')}
          >
            {/* FIXED: was 📊 emoji */}
            <span className="view-icon">
              <BarChart2 size={15} strokeWidth={2} />
            </span>
            Project View
          </button>
        </div>

        {apiError && <div className="dashboard-api-error">{apiError}</div>}
        {loading && <div className="dashboard-loading">Loading dashboard…</div>}

        {/* ── Filters (project view only) ── */}
        {viewMode === 'project' && (
          <div className="dashboard-filters">
            <div className="filter-group">
              <label className="filter-label">Project:</label>
              <select
                className="filter-select"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="all">All Projects</option>
                {emissions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Time Period:</label>
              <select
                className="filter-select"
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
              >
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-year">This Year</option>
                <option value="last-year">Last Year</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Quick Drafts Card (org view only) ── */}
        {viewMode === 'organization' && (
          <div className="quick-action-card">
            <div className="quick-action-content">
              <h3>Your Drafts</h3>
              <p>Manage all your uploaded files and project drafts in one place.</p>
            </div>
            <Link to="/dashboard/drafts" className="quick-action-btn">
              Go to Drafts Management
              <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="dashboard-stat-cards-row">
          <div className="dashboard-stat-card">
            <div className="stat-card-context">
              {/* FIXED: removed emoji from badge */}
              <span className="stat-context-badge">
                {viewMode === 'organization'
                  ? <><Building2 size={11} strokeWidth={2.5} /> Organization-wide</>
                  : selectedProject === 'all'
                    ? <><BarChart2 size={11} strokeWidth={2.5} /> All Projects</>
                    : <><BarChart2 size={11} strokeWidth={2.5} /> Single Project</>
                }
              </span>
            </div>
            <span className="dashboard-stat-label">Total Carbon Footprint</span>
            <div className="dashboard-stat-value-row">
              <span className="dashboard-stat-value">{filteredData.totalCarbon}</span>
              <span className="dashboard-stat-unit">kg CO₂e</span>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-card-context">
              <span className="stat-context-badge">
                {viewMode === 'organization'
                  ? <><Building2 size={11} strokeWidth={2.5} /> Organization-wide</>
                  : selectedProject === 'all'
                    ? <><BarChart2 size={11} strokeWidth={2.5} /> All Projects</>
                    : <><BarChart2 size={11} strokeWidth={2.5} /> Single Project</>
                }
              </span>
            </div>
            <span className="dashboard-stat-label">Total Projects</span>
            <span className="dashboard-stat-value dashboard-stat-value-single">
              {filteredData.totalProjects}
            </span>
          </div>
        </div>

        {/* ── Impact Metrics — icon now Lucide SVG ── */}
        {filteredData.impactMetrics && filteredData.impactMetrics.length > 0 && (
          <div className="dashboard-impact-metrics-row">
            {filteredData.impactMetrics.map((metric, index) => (
              <div key={index} className="dashboard-impact-metric-card">
                {/* FIXED: was emoji span, now proper icon box */}
                <div className="dashboard-metric-icon">
                  {metric.icon}
                </div>
                <div className="dashboard-metric-content">
                  <span className="dashboard-metric-label">
                    {metric.label}
                    {metric.info && (
                      <button
                        type="button"
                        className="dashboard-info-btn"
                        onClick={() => setShowGradeGuide(true)}
                        aria-label="Open carbon evaluation guide"
                        title={metric.info}
                      >
                        ?
                      </button>
                    )}
                  </span>
                  <div className="dashboard-metric-value-row">
                    <span className="dashboard-metric-value">{metric.value}</span>
                    {metric.unit && <span className="dashboard-metric-unit">{metric.unit}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'organization' && (
          <p className="dashboard-metric-explainer">
            System rule: Total CO2e Reduction is absolute kg saved, Reduction Achieved is percentage saved from baseline, and official report grade follows tCO2e threshold bands.
          </p>
        )}

        {/* ── YoY Card (org view only) ── */}
        {viewMode === 'organization' && summary && (
          <div className="dashboard-yoy-comparison-card">
            <h2>Year-on-Year Performance</h2>
            <div className="yoy-stats-grid">
              <div className="yoy-stat-item yoy-current">
                <div className="yoy-year-badge">{new Date().getFullYear()}</div>
                <div className="yoy-value">{summary.totalCarbonFormatted || '0'} <span className="yoy-unit">kg CO\u2082e</span></div>
                <div className="yoy-change positive">
                  {parseFloat(summary.co2eSaved || 0) > 0
                    ? <>
                      <span className="yoy-arrow">↓</span>
                      {((parseFloat(summary.co2eSaved || 0) / (parseFloat(summary.totalCarbon || 1) + parseFloat(summary.co2eSaved || 0))) * 100).toFixed(1)}% reduction achieved
                    </>
                    : <span>Current total</span>
                  }
                </div>
              </div>
              <div className="yoy-stat-item">
                <div className="yoy-year-badge secondary">Baseline</div>
                <div className="yoy-value">{((parseFloat(summary.totalCarbon || 0) + parseFloat(summary.co2eSaved || 0)) * 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="yoy-unit">kg CO\u2082e</span></div>
                <div className="yoy-change neutral">Before optimisation</div>
              </div>
              <div className="yoy-stat-item highlight">
                <div className="yoy-metric-label">CO₂e Reduction</div>
                <div className="yoy-value savings">{summary.co2eSavedFormatted || '0'} <span className="yoy-unit">kg CO\u2082e</span></div>
                <div className="yoy-change positive">
                  <span className="yoy-icon">
                    <Target size={13} strokeWidth={2} style={{ color: '#f59e0b' }} />
                  </span>
                  From confirmed alternatives
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Grid: Emissions + Breakdown ── */}
        <div className="dashboard-grid">
          <div className="dashboard-emissions-card">
            <div className="dashboard-emissions-header">
              <h2>
                {viewMode === 'organization' || selectedProject === 'all'
                  ? 'Top Emissions By Project'
                  : 'Material Breakdown'}
              </h2>
              {(viewMode === 'organization' || selectedProject === 'all') && (
                <div className="dashboard-color-hint-legend">
                  <div className="dashboard-color-hint" data-tooltip="Emissions before alternative materials applied.">
                    <span className="dashboard-color-swatch dashboard-color-swatch-baseline" />
                    <span className="dashboard-color-hint-label">Baseline</span>
                  </div>
                  <div className="dashboard-color-hint" data-tooltip="Emissions after alternative materials applied.">
                    <span className="dashboard-color-swatch dashboard-color-swatch-optimized" />
                    <span className="dashboard-color-hint-label">Optimized</span>
                  </div>
                </div>
              )}
            </div>

            {viewMode === 'organization' || selectedProject === 'all' ? (
              <div className="dashboard-project-list">
                {filteredData.emissions.slice(0, 7).map((project) => (
                  <div
                    key={project.id || project.name}
                    className={`dashboard-project-row ${viewMode === 'organization' ? 'clickable' : ''}`}
                    onClick={() => viewMode === 'organization' && handleProjectClick(project.id || project.name)}
                    title={viewMode === 'organization' ? 'Click to view project details' : ''}
                  >
                    <div className="dashboard-project-info">
                      <span className="dashboard-project-name">{project.name}</span>
                      <span className="dashboard-project-value">{project.baseline}t</span>
                    </div>
                    <div className="dashboard-progress-bar-container dashboard-bar-with-tooltip">
                      <div
                        className="dashboard-baseline-bar-fill"
                        style={{ width: `${(project.baseline / maxDisplayValue) * 100}%` }}
                        data-tooltip={`Baseline: ${project.baseline}t`}
                      />
                      <div
                        className="dashboard-optimized-bar-fill"
                        style={{ width: `${(project.optimized / maxDisplayValue) * 100}%` }}
                        data-tooltip={`Optimized: ${project.optimized}t`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-project-list">
                {projectMaterials[selectedProject]?.map((material, idx) => (
                  <div key={idx} className="dashboard-project-row">
                    <div className="dashboard-project-info">
                      <span className="dashboard-project-name">{material.name}</span>
                      <span className="dashboard-project-value">
                        {material.emission}t ({material.percentage}%)
                      </span>
                    </div>
                    <div className="dashboard-progress-bar-container">
                      <div
                        className="dashboard-baseline-bar-fill"
                        style={{ width: `${material.percentage}%` }}
                      />
                    </div>
                  </div>
                )) || (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '20px', fontSize: '13px' }}>
                      No material data available for this project.
                    </p>
                  )}
              </div>
            )}
          </div>

          <div className="dashboard-breakdown-card">
            <h2>Total Carbon Breakdown</h2>
            <div className="dashboard-donut-chart-container">
              <div
                className="dashboard-donut-chart"
                style={{
                  background: breakdown.length
                    ? `conic-gradient(${breakdown
                      .map((item, i) => {
                        const start = breakdown.slice(0, i).reduce((acc, x) => acc + (x.percentage || 0), 0);
                        const deg = (start / 100) * 360;
                        const endDeg = ((start + (item.percentage || 0)) / 100) * 360;
                        return `${item.color || '#94A3B8'} ${deg}deg ${endDeg}deg`;
                      })
                      .join(', ')})`
                    : 'conic-gradient(#e2e8f0 0deg 360deg)',
                }}
              >
                <div className="dashboard-donut-hole">
                  <span className="dashboard-donut-label">Total kg CO₂e</span>
                  <span className="dashboard-donut-value">
                    {summary?.totalCarbonFormatted ?? summary?.totalCarbon ?? '0'}
                  </span>
                </div>
              </div>
            </div>
            <div className="dashboard-breakdown-legend">
              {breakdown.map((item) => (
                <div key={item.label} className="dashboard-legend-item">
                  <span className="dashboard-legend-dot" style={{ backgroundColor: item.color }} />
                  <span className="dashboard-legend-label">{item.label}</span>
                  <span className="dashboard-legend-value">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent Activity (project view only) ── */}
        {viewMode === 'project' && (
          <div className="dashboard-recent-activity-card">
            <div className="dashboard-activity-header">
              <h2>Recent Activity</h2>
              <Link to="/history" className="dashboard-view-all-link">View All →</Link>
            </div>
            <div className="dashboard-activity-list">
              {filteredData.recentActivity.map((activity, index) => (
                <div key={index} className="dashboard-activity-item">
                  <div className="dashboard-activity-main">
                    <div className="dashboard-activity-left">
                      <span className="dashboard-activity-project">{activity.project}</span>
                      <span className="dashboard-activity-date">{activity.date}</span>
                    </div>
                    <div className="dashboard-activity-right">
                      <span className={`dashboard-activity-status dashboard-status-${activity.status.toLowerCase().replace(' ', '-')}`}>
                        {activity.status}
                      </span>
                      <span className="dashboard-activity-savings">{activity.savings}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <WelcomeBackModal
        isOpen={showWelcomeModal}
        drafts={drafts}
        onClose={() => setShowWelcomeModal(false)}
        onResume={(draftId, route) => { setShowWelcomeModal(false); navigate(route); }}
      />

      {showGradeGuide && (
        <div className="dashboard-modal-overlay" onClick={() => setShowGradeGuide(false)} role="dialog" aria-modal="true">
          <div className="dashboard-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-modal-header">
              <h3>System Carbon Evaluation Guide</h3>
              <button type="button" className="dashboard-modal-close" onClick={() => setShowGradeGuide(false)} aria-label="Close guide">x</button>
            </div>
            <div className="dashboard-modal-body">
              <p>Total CO2e Reduction = Baseline CO2e - Optimised CO2e</p>
              <p>Reduction Achieved (%) = ((Baseline - Optimised) / Baseline) * 100</p>
              <div className="dashboard-modal-table-wrap">
                <table className="dashboard-modal-table">
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
        </div>
      )}

      <ChatWizard />
      <Footer />
    </div>
  );
};

export default Dashboard;
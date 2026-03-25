import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE } from '../../lib/api';

import PageLayout from '../../components/common/PageLayout';
import ProgressStepper from '../../components/common/ProgressStepper';
import DataOriginBadge from '../../components/common/DataOriginBadge';
import MethodologyModal from '../../components/modals/MethodologyModal';
import './Calculation.css';

// React Icons for the design
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiDownload, FiInfo, FiX } from "react-icons/fi"; // Dropdown arrows, pagination arrows, download, and info
import { Sparkles } from "lucide-react"; // For "Find Carbon Alternatives" button icon

// Project-level assumptions for audit trail transparency
// System focuses on Scope 3 Category 1: Purchased Goods and Services (Materials)
const PROJECT_ASSUMPTIONS = [
  'Scope 3 Category 1: Purchased Goods and Services (construction materials only)',
  'All emission factors sourced from ICE DB Advanced V4.1 (October 2025)',
  'Cradle-to-gate (A1-A3): Raw material supply, transport to factory, manufacturing',
  'Industry average values used where supplier-specific EPD unavailable',
  'Material density based on standard specifications',
  'Excludes: Transport to site (A4), installation (A5), use & end-of-life (B-C stages)',
];

// Fallback empty list when no project or API not loaded yet
const EMPTY_MATERIALS = [];

// Helper function to generate comprehensive audit trail breakdown
const generateEmissionBreakdown = (material) => {
  if (!material || !material.emissionFactor) return '';
  
  const { emissionFactor, calculation, metadata } = material;
  
  return `
    <div class="breakdown-section">
      <div class="breakdown-title">EMISSION FACTOR DETAILS</div>
      <div class="breakdown-row">
        <span class="breakdown-label">Value:</span>
        <span class="breakdown-value">${emissionFactor.value} ${emissionFactor.unit}</span>
      </div>
      <div class="breakdown-row">
        <span class="breakdown-label">Source:</span>
        <span class="breakdown-value">${emissionFactor.source} ${emissionFactor.version}</span>
      </div>
      <div class="breakdown-row">
        <span class="breakdown-label">Last Updated:</span>
        <span class="breakdown-value">${emissionFactor.lastUpdated}</span>
      </div>
      <div class="breakdown-row">
        <span class="breakdown-label">Category:</span>
        <span class="breakdown-value">${emissionFactor.category}</span>
      </div>
      <div class="breakdown-row">
        <span class="breakdown-label">Reliability:</span>
        <span class="breakdown-value">${'⭐'.repeat(emissionFactor.reliability)}</span>
      </div>
    </div>
    
    <div class="breakdown-section">
      <div class="breakdown-title">CALCULATION</div>
      <div class="breakdown-row">
        <span class="breakdown-label">Formula:</span>
        <span class="breakdown-value">${calculation.formula}</span>
      </div>
      <div class="breakdown-row">
        <span class="breakdown-label">Steps:</span>
        <span class="breakdown-value">${calculation.steps}</span>
      </div>
      <div class="breakdown-row">
        <span class="breakdown-label">Result:</span>
        <span class="breakdown-value">${calculation.result} ${calculation.resultUnit}</span>
      </div>
    </div>
    
    <div class="breakdown-section">
      <div class="breakdown-title">METADATA</div>
      <div class="breakdown-row">
        <span class="breakdown-label">Data Origin:</span>
        <span class="breakdown-value">
          ${metadata.dataOrigin === 'OCR' ? '🤖 OCR' : metadata.dataOrigin === 'Manual' ? '✍️ Manual' : '📊 Excel'}
          ${metadata.confidence ? ` (${metadata.confidence}% confidence)` : ''}
        </span>
      </div>
      <div class="breakdown-row">
        <span class="breakdown-label">Calculated:</span>
        <span class="breakdown-value">${new Date(metadata.timestamp).toLocaleString()}</span>
      </div>
      ${metadata.assumptions.length > 0 ? `
        <div class="breakdown-assumptions">
          <div class="breakdown-label">Assumptions:</div>
          <ul class="assumptions-list-tooltip">
            ${metadata.assumptions.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
};

function Calculation() {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = location.state?.projectId ?? location.state?.project_id ?? null;
  const projectName = location.state?.projectName || 'Project ABC';

  const [materials, setMaterials] = useState(EMPTY_MATERIALS);
  const [totalFormatted, setTotalFormatted] = useState('0.00');
  const [loading, setLoading] = useState(!!projectId);
  const [calcError, setCalcError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('total-desc');
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);
  const [showAssumptionsPopup, setShowAssumptionsPopup] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  const fetchCalculation = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setCalcError(null);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${id}/calculation`);
      if (!res.ok) throw new Error('Failed to load calculation');
      const data = await res.json();
      const list = data.materials || [];
      setMaterials(list.map((m) => ({
        ...m,
        metadata: {
          ...m.metadata,
          assumptions: Array.isArray(m.metadata?.assumptions) ? m.metadata.assumptions : ['ICE DB Advanced V4.1 industry average'],
        },
      })));
      setTotalFormatted(data.total_formatted ?? `${Number(data.total_emission_kg ?? 0).toFixed(0)} kg CO₂e`);
      if (list.length > 0) {
        try {
          await fetch(`${API_BASE}/api/projects/${id}/calculate`, { method: 'POST' });
        } catch (_) {
          // Non-blocking: dashboard may still show 0 until next time
        }
      }
    } catch (err) {
      console.error(err);
      setCalcError(err.message || 'Could not load calculation');
      setMaterials(EMPTY_MATERIALS);
      setTotalFormatted('0.00');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchCalculation(projectId);
    } else {
      setMaterials(EMPTY_MATERIALS);
      setTotalFormatted('0.00');
      setLoading(false);
    }
  }, [projectId, fetchCalculation]);

  const categories = ['All', ...Array.from(new Set(materials.map((item) => item.category).filter(Boolean)))];

  const parseTotal = (value) => {
    const numeric = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const getQualityTooltip = (quality) => {
    const tooltips = {
      high: 'High Quality: Supplier-specific data or verified emission factors',
      medium: 'Medium Quality: Industry average from reliable database',
      low: 'Low Quality: Estimated data with assumptions',
    };
    return tooltips[quality] || 'Unknown quality';
  };

  const filteredMaterials = materials.filter((item) =>
    selectedCategory === 'All' ? true : item.category === selectedCategory
  );

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    const totalA = parseTotal(a.total);
    const totalB = parseTotal(b.total);
    if (sortBy === 'total-asc') return totalA - totalB;
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    return totalB - totalA; // Default to total-desc
  });

  const totalItems = sortedMaterials.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(totalItems, startIndex + pageSize);
  const pagedMaterials = sortedMaterials.slice(startIndex, endIndex);

  const handleFindAlternatives = () => {
    navigate('/suggestions', { state: { projectName, projectId } });
  };

  const handleExportDetailed = async () => {
    if (projectId) {
      try {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/calculation/export`);
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition');
        const filenameMatch = disposition && /filename="?([^"]+)"?/.exec(disposition);
        const filename = filenameMatch ? filenameMatch[1] : `EnviroSync_Detailed_Calculations_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
      }
      return;
    }
    // Fallback: client-side CSV from current materials
    const headers = ['Material Name', 'Quantity', 'Unit', 'EF Value', 'EF Unit', 'EF Source', 'EF Version', 'Calculation Formula', 'Calculation Steps', 'Total Emission', 'Total Unit', 'Data Origin', 'Confidence %', 'Data Quality', 'Timestamp', 'Assumptions'];
    const rows = sortedMaterials.map((material) => [
      material.name,
      material.quantity,
      material.unit,
      material.emissionFactor?.value ?? '',
      material.emissionFactor?.unit ?? '',
      material.emissionFactor?.source ?? '',
      material.emissionFactor?.version ?? '',
      material.calculation?.formula ?? '',
      `"${(material.calculation?.steps ?? '').replace(/"/g, '""')}"`,
      material.calculation?.result ?? '',
      material.calculation?.resultUnit ?? '',
      material.metadata?.dataOrigin ?? '',
      material.metadata?.confidence ?? 'N/A',
      material.dataQuality ?? '',
      material.metadata?.timestamp ?? '',
      `"${(material.metadata?.assumptions || []).join('; ')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `EnviroSync_Detailed_Calculations_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PAGINATION LOGIC (Refined for ellipsis as per image) ---
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5; // e.g., < 1 2 3 ... 4 >

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // Determine start and end for middle block
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if near beginning or end
      if (currentPage <= 3) {
          endPage = maxVisiblePages - 1;
      } else if (currentPage >= totalPages - 2) {
          startPage = totalPages - (maxVisiblePages - 2);
      }

      // Add ellipsis if needed after page 1
      if (startPage > 2) {
          pageNumbers.push("...");
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
          pageNumbers.push(i);
      }

      // Add ellipsis if needed before last page
      if (endPage < totalPages - 1) {
          pageNumbers.push("...");
      }

      // Always show last page if not already included
      if (!pageNumbers.includes(totalPages)) {
          pageNumbers.push(totalPages);
      }
    }

    // Filter out duplicates and ensure order
    const uniquePageNumbers = [];
    pageNumbers.forEach(p => {
        if (uniquePageNumbers.length === 0 || uniquePageNumbers[uniquePageNumbers.length - 1] !== p) {
            uniquePageNumbers.push(p);
        }
    });

    return uniquePageNumbers.map((pageNumber, index) =>
      pageNumber === "..." ? (
        <span key={`ellipsis-${index}`} className="calculation-page-ellipsis">…</span>
      ) : (
        <button
          key={pageNumber}
          type="button"
          className={`calculation-page-btn ${pageNumber === currentPage ? 'active' : ''}`}
          onClick={() => setCurrentPage(pageNumber)}
        >
          {pageNumber}
        </button>
      )
    );
  };


  return (
    <div className="calculation-page">
      <PageLayout
        title=""
        subtitle=""
        showNavbar={false}
        showHeader={true}
        showFooter={true}
        maxWidth="1440px"
      >
        <div className="calculation-content">
          {/* Progress Stepper */}
            <ProgressStepper 
              currentStage="calculation"
              completedStages={["upload", "categorization", "calculation"]}
              onStageClick={(stageId) => {
                if (stageId === 'upload') navigate('/upload');
                if (stageId === 'categorization') navigate('/categorization');
                if (stageId === 'calculation') navigate('/calculation');
                if (stageId === 'suggestion') navigate('/suggestions');
              }}
          />

          {/* Page title */}
        <div className='title-section'>
          <div className="title-header-row">
            <div>
              <h1 className="calculation-title">Emissions Calculation Breakdown</h1>
              <p className="calculation-subtitle">
                Detailed lifecycle emission breakdown based on the verified material extraction from your project QTOs.
              </p>
              {/* Project Name with Info Icon */}
              <div className="project-info-row">
                <span className="calculation-project-name">{projectName}</span>
                <div className="methodology-info-wrapper">
                  <button 
                    type="button" 
                    className="methodology-info-btn"
                    onClick={() => setShowAssumptionsPopup(!showAssumptionsPopup)}
                    aria-label="View calculation methodology and assumptions"
                  >
                    <FiInfo size={16} />
                  </button>
                  
                  {/* Assumptions Popup */}
                  {showAssumptionsPopup && (
                    <div className="assumptions-popup">
                      <div className="assumptions-popup-header">
                        <span className="assumptions-popup-title">Calculation Methodology</span>
                        <button 
                          type="button" 
                          className="assumptions-popup-close"
                          onClick={() => setShowAssumptionsPopup(false)}
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                      <ul className="assumptions-popup-list">
                        {PROJECT_ASSUMPTIONS.map((assumption, idx) => (
                          <li key={idx}>{assumption}</li>
                        ))}
                      </ul>
                      <button 
                        className="assumptions-popup-btn"
                        onClick={() => {
                          setShowAssumptionsPopup(false);
                          setShowMethodologyModal(true);
                        }}
                      >
                        View Detailed Methodology
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="calculation-system-note">
                System note: Calculation shows baseline emissions before AI optimisation. Reduction and grade are finalized after selected alternatives in Suggestions and Final Report.
              </p>
            </div>
            <div className="calculation-cta-wrap">
              <button 
                type="button" 
                className="calculation-export-btn" 
                onClick={handleExportDetailed}
              >
                <FiDownload size={16} />
                Export Detailed Breakdown
              </button>
              <button type="button" className="calculation-cta-btn" onClick={handleFindAlternatives}>
                <Sparkles size={17} color="#FFFFFF" />
                Find Carbon Alternatives
              </button>
            </div>
          </div>
        </div>

        {calcError && (
          <div style={{ padding: '12px', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px' }}>
            {calcError}
          </div>
        )}
        {loading && (
          <div style={{ padding: '12px', color: '#64748b', marginBottom: '8px' }}>Loading calculation…</div>
        )}

          {/* Main card */}
          <div className="calculation-card">
          {/* Toolbar */}
          <div className="calculation-card-toolbar">
            <h2 className="calculation-card-heading">Inventory & Metrics</h2>
            <div className="calculation-card-actions">
              <div className="calculation-dropdown">
                <span className="dropdown-selected-text">{selectedCategory === 'All' ? 'All Material Categories' : selectedCategory}</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by material category"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'All Material Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="calculation-dropdown">
                <span className="dropdown-selected-text">
                  {sortBy === 'total-desc' && 'Sort By: Total CO2e (Desc)'}
                  {sortBy === 'total-asc' && 'Sort By: Total CO2e (Asc)'}
                  {sortBy === 'name-asc' && 'Sort By: Name (A-Z)'}
                  {sortBy === 'name-desc' && 'Sort By: Name (Z-A)'}
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Sort materials"
                >
                  <option value="total-desc">Sort By: Total CO2e (Desc)</option>
                  <option value="total-asc">Sort By: Total CO2e (Asc)</option>
                  <option value="name-asc">Sort By: Name (A-Z)</option>
                  <option value="name-desc">Sort By: Name (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="calculation-table-wrap">
            <table className="calculation-table">
              <thead>
                <tr>
                  <th className="th-material">Material Name</th>
                  <th className="th-quantity">Quantity</th>
                  <th className="th-unit">Unit</th>
                  <th className="th-factor">
                    <div className="tooltip-container">
                      ICE V4.1 Emission Factor
                      <div className="tooltip-content tooltip-content-header">
                        This factor is based on the ICE DB Advanced V4.1 (October 2025). <br/>
                        Published by Circular Ecology / University of Bath.
                      </div>
                    </div>
                  </th>
                  <th className="th-total">Total Emission (CO2e)</th>
                </tr>
              </thead>
              <tbody>
                {pagedMaterials.map((row, idx) => (
                  <tr key={row.id ?? row.db_id ?? row.name}>
                    <td className="td-material">
                      <span className="material-name">{row.name}</span>
                      <div className="material-invoice">{row.invoice}</div>
                    </td>
                    <td className="td-quantity">{row.quantity}</td>
                    <td className="td-unit">{row.unit}</td>
                    <td className="td-factor">
                      <div className={`tooltip-container${idx >= pagedMaterials.length - 3 ? ' tooltip-flip' : ''}`}>
                        {row.factor}
                        <div
                          className="tooltip-content tooltip-content-factor"
                          dangerouslySetInnerHTML={{ __html: generateEmissionBreakdown(row) }}
                        />
                      </div>
                    </td>
                    <td className="td-total">
                      <div className="total-with-quality">
                        <span className="total-value">{row.total}</span>
                        <span 
                          className={`quality-indicator quality-${row.dataQuality}`}
                          title={getQualityTooltip(row.dataQuality)}
                        >
                          {row.dataQuality === 'high' && '🟢'}
                          {row.dataQuality === 'medium' && '🟡'}
                          {row.dataQuality === 'low' && '🔴'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total section */}
          <div className="calculation-total-section">
            <div className="calculation-total-left">
              <div className="calculation-total-icon">
                <Sparkles size={21} color="#379C8A" /> {/* Lucide Sparkles icon */}
              </div>
              <div>
                <div className="calculation-total-title">Total Calculated Emissions</div>
                <div className="calculation-total-desc">Aggregate carbon footprint across all listed materials</div>
              </div>
            </div>
            <div className="calculation-total-right">
              <div className="calculation-total-value-row">
                <span className="calculation-total-value">{totalFormatted.replace(/\s*kg\s*CO₂e.*$/i, '').trim()}</span>
                <span className="calculation-total-unit">kg CO₂e</span>
              </div>
              <div className="calculation-total-gwp">Global Warming Potential (GWP100)</div>
            </div>
          </div>

          {/* Pagination */}
          <div className="calculation-pagination">
            <div className="calculation-pagination-left">
              <span className="calculation-pagination-info">
                Showing {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} of {totalItems} Materials
              </span>
              <select
                className="calculation-pagesize-select"
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? totalItems || 100 : Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                aria-label="Items per page"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value="all">Show All</option>
              </select>
            </div>
            {totalPages > 1 && (
              <div className="calculation-pagination-controls">
                <button
                  type="button"
                  className="calculation-page-btn calculation-page-prev"
                  aria-label="Previous"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft size={16} />
                </button>
                {renderPageNumbers()}
                <button
                  type="button"
                  className="calculation-page-btn calculation-page-next"
                  aria-label="Next"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
          </div> {/* End calculation-card */}
        </div>
      </PageLayout>
      
      {/* Methodology Documentation Modal */}
      <MethodologyModal 
        isOpen={showMethodologyModal} 
        onClose={() => setShowMethodologyModal(false)} 
      />
    </div>
  );
}

export default Calculation;

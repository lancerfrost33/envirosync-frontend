import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../../components/common/PageLayout';
import ProgressStepper from '../../components/common/ProgressStepper';
import '../suggestions/Suggestions.css';
import { ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { API_BASE } from '../../lib/api';

const SuggestionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get projectId and projectName from navigation state (passed from Calculation page)
  const projectId = location.state?.projectId ?? null;
  const projectName = location.state?.projectName || 'Project ABC';
  const passedMaterials = location.state?.materials || [];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalSuggestions, setTotalSuggestions] = useState(0);

  // State to track which material's alternatives popup is open
  const [openAlternativesId, setOpenAlternativesId] = useState(null);
  const [filterBy, setFilterBy] = useState('All materials');
  const [sortBy, setSortBy] = useState('Total CO₂e (Desc)');
  const [suggestions, setSuggestions] = useState([]);
  const [allSuggestions, setAllSuggestions] = useState([]);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [projectData, setProjectData] = useState(null);

  // Track selected alternatives: { materialId: { name, carbon, price, is_selected: true } }
  const [selectedAlternatives, setSelectedAlternatives] = useState({});

  // Fetch suggestions from backend with pagination
  const fetchSuggestions = useCallback(async (id, page = 1) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}/api/projects/${id}/suggestions?page=${page}&page_size=${pageSize}`,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      setProjectData({
        name: data.project_name
      });
      setSuggestions(data.suggestions || []);
      setTotalSuggestions(data.total || 0);
      setTotalPages(data.total_pages || 0);
      setCurrentPage(data.page || 1);
      setError(null);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError(err.message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const fetchAllSuggestions = useCallback(async (id) => {
    if (!id) return [];

    const pageSizeAll = 50;
    let page = 1;
    let total = 1;
    const all = [];

    while (page <= total) {
      const response = await fetch(
        `${API_BASE}/api/projects/${id}/suggestions?page=${page}&page_size=${pageSizeAll}`,
        { headers: { 'Content-Type': 'application/json' } },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch all suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      total = data.total_pages || 1;
      all.push(...(data.suggestions || []));
      page += 1;
    }

    setAllSuggestions(all);
    return all;
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchSuggestions(projectId, 1);
      fetchAllSuggestions(projectId).catch((err) => {
        console.error('Error fetching all suggestions:', err);
      });
    } else {
      setSuggestions([]);
      setAllSuggestions([]);
      setLoading(false);
      setError('No project selected');
    }
  }, [projectId, fetchSuggestions, fetchAllSuggestions]);

  // Refetch suggestions when page size changes
  useEffect(() => {
    if (projectId && currentPage === 1) {
      fetchSuggestions(projectId, 1);
    }
  }, [pageSize, projectId, fetchSuggestions]);

  // Merge selected alternatives from backend whenever the visible page changes.
  // This preserves already-selected items across pagination.
  useEffect(() => {
    const selectionsFromPage = {};
    suggestions.forEach((s) => {
      if (s.is_selected && s.selected_alternative_name) {
        selectionsFromPage[s.material_id] = {
          name: s.selected_alternative_name,
          carbon: s.selected_alternative_carbon,
          price: s.selected_alternative_price,
          is_selected: true
        };
      }
    });

    if (Object.keys(selectionsFromPage).length > 0) {
      setSelectedAlternatives((prev) => ({ ...prev, ...selectionsFromPage }));
    }
  }, [suggestions]);

  const cleanMaterialName = (name) => String(name || '').replace(/\s*\(Optimized\)\s*$/i, '').trim();

  // Format materials for display
  const materials = suggestions.map(s => {
    const baseName = cleanMaterialName(s.material_name);
    const alternatives = (s.alternatives || [])
      .filter((alt) => cleanMaterialName(alt.name).toLowerCase() !== baseName.toLowerCase())
      .map(alt => ({
        name: cleanMaterialName(alt.name),
        carbon_value: alt.carbon_value,
        carbon_unit: alt.carbon_unit,
        price: alt.price,
        reduction: `${Math.round(alt.reduction_percentage)}%`,
        priceChange: `${alt.price > s.original_price ? '+' : ''}RM${(alt.price - s.original_price).toFixed(2)} price diff`,
        label: alt.reduction_percentage >= 20 ? 'RECOMMENDED CHANGES' : 'SUGGESTED ALTERNATIVE',
        description: alt.description,
        source: alt.source || 'AI-Powered ICE DB Advanced V4.1 RAG Analysis'
      }));

    return {
      id: s.material_id,
      name: baseName,
      quantity: s.quantity,
      category: s.category,
      emissions: s.original_carbon_value,
      emissionsLabel: s.original_carbon_unit,
      emissionsNote: 'Calculated from ICE Database',
      unitPrice: s.original_price,
      currency: 'RM',
      alternatives,
    };
  });

  // Calculate metrics based on ALL suggestions (across all pages)
  const calculateMetrics = () => {
    const sourceSuggestions = allSuggestions.length > 0 ? allSuggestions : suggestions;
    const hasSelectedAlternatives = Object.keys(selectedAlternatives).length > 0;

    if (sourceSuggestions.length === 0) {
      return [
        { title: 'Estimated Reduction', value: '0%', subtitle: 'Awaiting material selection', icon: '✓', pending: true },
        { title: 'Cost Impact', value: 'RM 0', subtitle: 'Awaiting material selection', icon: '💰', pending: true },
        { title: 'Materials Selected', value: '0/0', subtitle: 'AI-optimized recommendations', icon: '⭐', pending: false }
      ];
    }

    let totalReduction = 0;
    let totalCostChange = 0;
    let materialsWithSelection = 0;

    sourceSuggestions.forEach((s) => {
      const selection = selectedAlternatives[s.material_id];
      if (!selection || !selection.is_selected) return;

      const carbonSaved = (s.original_carbon_value || 0) - (selection.carbon || 0);
      const quantity = parseFloat(s.quantity) || 1;
      totalReduction += carbonSaved;
      totalCostChange += ((selection.price || 0) - (s.original_price || 0)) * quantity;
      materialsWithSelection += 1;
    });

    const totalOriginalEmissions = sourceSuggestions.reduce((sum, s) => sum + (s.original_carbon_value || 0), 0);
    const avgReduction = totalOriginalEmissions > 0 && materialsWithSelection > 0
      ? Math.round((totalReduction / totalOriginalEmissions) * 100)
      : 0;

    return [
      {
        title: 'Estimated Reduction',
        value: hasSelectedAlternatives ? `${avgReduction}%` : '0%',
        subtitle: hasSelectedAlternatives ? `${materialsWithSelection} materials optimized` : 'Select alternatives to calculate',
        icon: '✓',
        pending: !hasSelectedAlternatives
      },
      {
        title: 'Cost Impact',
        value: hasSelectedAlternatives
          ? `${totalCostChange >= 0 ? '+' : '-'}RM${Math.abs(totalCostChange).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : 'RM 0',
        subtitle: hasSelectedAlternatives ? 'Budget change' : 'Select alternatives to calculate',
        icon: '💰',
        pending: !hasSelectedAlternatives
      },
      {
        title: 'Materials Selected',
        value: `${materialsWithSelection}/${sourceSuggestions.length}`,
        subtitle: 'Selected across all pages',
        icon: '⭐',
        pending: false
      }
    ];
  };

  const metrics = calculateMetrics();

  // Handle selecting/deselecting an alternative
  const handleSelectAlternative = async (materialId, alternative, isSelected) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/suggestions/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            material_id: materialId,
            selected_alternative_name: alternative.name,
            selected_alternative_carbon: alternative.carbon_value,
            selected_alternative_price: alternative.price,
            is_selected: isSelected  // Track selection state
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `Failed to update material selection (${response.status})`);
      }

      console.log('✅ Alternative confirmed successfully for:', materialId);

      // Update local state
      if (isSelected) {
        setSelectedAlternatives(prev => ({
          ...prev,
          [materialId]: {
            name: alternative.name,
            carbon: alternative.carbon_value,
            price: alternative.price,
            is_selected: true
          }
        }));
      } else {
        setSelectedAlternatives(prev => {
          const updated = { ...prev };
          delete updated[materialId];
          return updated;
        });
      }

      setOpenAlternativesId(null); // Close the popup after selection
      await fetchAllSuggestions(projectId);
    } catch (err) {
      console.error('Error updating material selection:', err);
      alert('Failed to update material selection');
    }
  };

  // Function to toggle the alternatives popup for a given material ID
  const toggleAlternatives = (materialId) => {
    setOpenAlternativesId(openAlternativesId === materialId ? null : materialId);
  };

  const filteredMaterials = materials.filter((material) =>
    filterBy === 'All materials' ? true : material.category === filterBy
  );

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    if (sortBy === 'Total CO₂e (Asc)') return a.emissions - b.emissions;
    if (sortBy === 'Price (Desc)') return b.unitPrice - a.unitPrice;
    if (sortBy === 'Price (Asc)') return a.unitPrice - b.unitPrice;
    return b.emissions - a.emissions; // Total CO₂e (Desc)
  });

  const allMaterials = (allSuggestions.length > 0 ? allSuggestions : suggestions).map((s) => ({
    id: s.material_id,
    name: cleanMaterialName(s.material_name),
    emissionsLabel: s.original_carbon_unit,
  }));

  // Selected materials list for display (across all pages)
  const selectedMaterials = allMaterials
    .filter((m) => !!selectedAlternatives[m.id])
    .map((m) => ({
      ...m,
      selection: selectedAlternatives[m.id],
    }));

  // Pagination info calculations
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(totalSuggestions, startIndex + pageSize);

  // Render page number buttons for pagination (same logic as Calculation page)
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

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

    // Filter out duplicates
    const uniquePageNumbers = [];
    pageNumbers.forEach(p => {
        if (uniquePageNumbers.length === 0 || uniquePageNumbers[uniquePageNumbers.length - 1] !== p) {
            uniquePageNumbers.push(p);
        }
    });

    return uniquePageNumbers.map((pageNumber, index) =>
      pageNumber === "..." ? (
        <span key={`ellipsis-${index}`} className="suggestions-page-ellipsis">…</span>
      ) : (
        <button
          key={pageNumber}
          type="button"
          className={`suggestions-page-btn ${pageNumber === currentPage ? 'active' : ''}`}
          onClick={() => { setCurrentPage(pageNumber); fetchSuggestions(projectId, pageNumber); }}
        >
          {pageNumber}
        </button>
      )
    );
  };

  const handleConfirmChanges = async () => {
    if (!projectId) return;

    try {
      setConfirming(true);
      const allSuggestions = await fetchAllSuggestions(projectId);
      const sourceSuggestions = allSuggestions.length > 0 ? allSuggestions : suggestions;

      const materialsData = sourceSuggestions.map((s) => {
        const hasAppliedAlternative = Boolean(s.is_selected && s.selected_alternative_name);
        const optimizedValue = hasAppliedAlternative
          ? (s.selected_alternative_carbon ?? s.original_carbon_value)
          : s.original_carbon_value;

        const originalName = cleanMaterialName(s.material_name);

        return {
          material: originalName,
          originalMaterial: originalName,
          appliedAlternative: hasAppliedAlternative ? cleanMaterialName(s.selected_alternative_name) : null,
          baseline: s.original_carbon_value,
          optimized: optimizedValue,
          unit: s.original_carbon_unit,
          category: s.category,
          quantity: s.quantity,
          is_alternative_applied: hasAppliedAlternative,
          selected_alternative_name: hasAppliedAlternative ? s.selected_alternative_name : null,
          selected_alternative_carbon: hasAppliedAlternative ? s.selected_alternative_carbon : null,
        };
      });

      navigate('/report', {
        state: {
          materials: materialsData,
          projectId: projectId,
          projectName: projectData?.name || projectName,
          projectRef: projectData?.ref_number || null,
        },
      });
    } catch (err) {
      console.error('Error preparing final report materials:', err);
      alert('Failed to prepare full report data. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <PageLayout
      title=""
      subtitle=""
      showNavbar={false}
      showHeader={true}
      showFooter={true}
      maxWidth="1440px"
    >
      <div className="suggestions-content-wrapper">
        {/* Progress Stepper */}
        <ProgressStepper
          currentStage="suggestion"
          completedStages={['upload', 'categorization', 'calculation']}
          onStageClick={(stageId) => {
            if (stageId === 'upload') navigate('/upload');
            if (stageId === 'categorization') navigate('/categorization');
            if (stageId === 'calculation') navigate('/calculation');
              if (stageId === 'suggestion') navigate('/suggestions');
          }}
        />

        {/* Title Section */}
        <div className="title-section">
          <div className="title-left">
            <h1>Material Suggestions</h1>
            <p className="suggestions-subtitle">Review and select optimised material alternatives for your project.</p>
            <div className="suggestions-project-badge">
              <span className="suggestions-project-name">Project: {projectData?.name || projectName}</span>
            </div>
            <p className="suggestions-system-note">
              System note: Estimated reduction here is relative to baseline materials only. Final report grade still depends on optimised total carbon (tCO2e) against system thresholds.
            </p>
          </div>
          <div className="title-right">
            <button
              className="btn-confirm"
              onClick={handleConfirmChanges}
              disabled={loading || confirming || materials.length === 0}
            >
              {confirming ? 'Preparing Report...' : 'Confirm Changes'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-container" style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading suggestions...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="error-container" style={{
            padding: '20px',
            backgroundColor: '#fee',
            borderLeft: '4px solid #f00',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <p style={{ color: '#c00', margin: 0 }}>Error: {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && materials.length === 0 && !error && (
          <div className="empty-container" style={{ textAlign: 'center', padding: '40px' }}>
            <p>No suggestions available. Please complete the calculation phase first.</p>
          </div>
        )}

        {/* Filter and Sort */}
        {!loading && materials.length > 0 && (
          <>
            <div className="filter-sort-section">
              <div className="filter-group">
                <label>FILTER BY:</label>
                <div className="dropdown">
                  <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
                    <option>All materials</option>
                    <option>Concrete</option>
                    <option>Glass</option>
                    <option>Tiles</option>
                    <option>Bricks</option>
                    <option>Steel</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>
              <div className="sort-group">
                <label>SORT BY:</label>
                <div className="dropdown">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option>Total CO₂e (Desc)</option>
                    <option>Total CO₂e (Asc)</option>
                    <option>Price (Desc)</option>
                    <option>Price (Asc)</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* Selected materials (only current page) */}
            {selectedMaterials.length > 0 && (
              <div className="selected-materials-summary">
                <h3 className="selected-materials-title">Selected alternatives</h3>
                <ul className="selected-materials-list">
                  {selectedMaterials.map((material) => {
                    const { selection } = material;
                    return (
                      <li key={material.id} className="selected-material-item">
                        <span className="selected-material-name">{selection.name}</span>
                        <span className="selected-material-base">(from {material.name})</span>
                        <span className="selected-material-meta">
                          {(selection.carbon || 0).toFixed(2)} {material.emissionsLabel} • RM{(selection.price || 0).toFixed(2)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Materials List with Headers */}
            <div className="materials-list-container">
              <div className="materials-header-row">
                <div className="material-header-item">MATERIAL ITEM (UPLOADED)</div>
                <div className="material-header-item">EMBODIED CARBON</div>
                <div className="material-header-item">UNIT PRICE</div>
                <div className="material-header-item">ACTIONS</div>
              </div>

              {sortedMaterials.map((material, index) => {
                const selection = selectedAlternatives[material.id];
                const displayName = material.name;
                const isSelected = !!selection;
                
                return (
                <div key={material.id} className={`material-card ${index === 0 ? 'highlighted' : ''} ${isSelected ? 'selected-alternative' : ''}`}>
                  <div className="material-column material-item-column">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isSelected && <Check size={20} color="#4CAF50" strokeWidth={3} />}
                      <div>
                        <h3 className="material-name">{displayName}</h3>
                        {isSelected && <p style={{ fontSize: '0.8em', color: '#4CAF50', marginTop: '2px' }}>✓ Alternative Selected</p>}
                      </div>
                    </div>
                    <p className="material-quantity">Quantity: {material.quantity}</p>
                  </div>

                  <div className="material-column emissions-column">
                    <div className="emissions-value">
                      <span className="value">{isSelected ? selection.carbon.toFixed(2) : material.emissions}</span>
                      <span className="unit">{material.emissionsLabel}</span>
                    </div>
                    <p className="emissions-note">{isSelected ? 'Optimized Emission' : 'Calculated from ICE Database'}</p>
                  </div>

                  <div className="material-column price-column">
                    <div className="price-value">
                      <span className="currency">RM</span>
                      <span className="price-amount">{isSelected ? selection.price.toFixed(2) : material.unitPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="material-column actions-column">
                    {material.alternatives.length > 0 ? (
                      <div className="actions-dropdown">
                        <button
                          className={`dropdown-btn ${openAlternativesId === material.id ? 'open' : ''}`}
                          onClick={() => toggleAlternatives(material.id)}
                        >
                          <span>{isSelected ? 'Change Alternative' : 'View Alternatives'}</span> <ChevronDown size={16} />
                        </button>
                        {openAlternativesId === material.id && (
                          <div className="alternatives-popup">
                            {material.alternatives.map((alt, altIndex) => {
                              const isAltSelected = selection && selection.name === alt.name;
                              return (
                                <div key={altIndex} className={`alternative-item ${isAltSelected ? 'selected' : ''}`}>
                                  <div className="alt-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                      <input
                                        type="checkbox"
                                        checked={isAltSelected}
                                        onChange={(e) => handleSelectAlternative(material.id, alt, e.target.checked)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      <div>
                                        <h4 style={{ margin: 0 }}>{alt.name}</h4>
                                        {alt.label && <span className="recommended-badge">{alt.label}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="alt-details">
                                    <p className="reduction">{alt.reduction} reduction</p>
                                    <p className="price-change">{alt.priceChange}</p>
                                    <p className="alt-description" style={{ fontSize: '0.85em', marginTop: '4px', color: '#666' }}>
                                      {alt.description}
                                    </p>
                                    {alt.source && <p style={{ fontSize: '0.75em', color: '#999', marginTop: '4px' }}>Source: {alt.source}</p>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="no-alternatives-inline">No alternatives available</p>
                    )}
                  </div>
                </div>
              );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="suggestions-pagination">
                <div className="suggestions-pagination-left">
                  <span className="suggestions-pagination-info">
                    Showing {totalSuggestions === 0 ? 0 : startIndex + 1}-{endIndex} of {totalSuggestions} Materials
                  </span>
                  <select
                    className="suggestions-pagesize-select"
                    value={pageSize}
                    onChange={(e) => {
                      const val = e.target.value === 'all' ? totalSuggestions || 100 : Number(e.target.value);
                      setPageSize(val);
                      setCurrentPage(1);
                    }}
                    aria-label="Items per page"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={15}>15 per page</option>
                    <option value="all">Show All</option>
                  </select>
                </div>
                <div className="suggestions-pagination-controls">
                  <button
                    type="button"
                    className="suggestions-page-btn suggestions-page-prev"
                    aria-label="Previous"
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        fetchSuggestions(projectId, currentPage - 1);
                      }
                    }}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="suggestions-page-numbers">
                    {renderPageNumbers()}
                  </div>

                  <button
                    type="button"
                    className="suggestions-page-btn suggestions-page-next"
                    aria-label="Next"
                    onClick={() => {
                      if (currentPage < totalPages) {
                        setCurrentPage(currentPage + 1);
                        fetchSuggestions(projectId, currentPage + 1);
                      }
                    }}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Metrics Section */}
            <div className="metrics-section">
              {metrics.map((metric, index) => (
                <div key={index} className="metric-card">
                  <div className="metric-icon">{metric.icon}</div>
                  <div className="metric-content">
                    <p className="metric-title">{metric.title}</p>
                    <h4 className={`metric-value${metric.pending ? ' pending' : ''}`}>{metric.value}</h4>
                    <p className="metric-subtitle">{metric.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default SuggestionsPage;
import React from 'react';
import { FiX, FiExternalLink, FiBook, FiDatabase, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import './MethodologyModal.css';

const MethodologyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="methodology-modal-backdrop" onClick={handleBackdropClick}>
      <div className="methodology-modal">
        <div className="methodology-modal-header">
          <div className="methodology-modal-title-wrap">
            <FiBook size={24} />
            <h2>Calculation Methodology Documentation</h2>
          </div>
          <button className="methodology-close-btn" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="methodology-modal-content">
          {/* Scope Statement */}
          <section className="methodology-section">
            <div className="methodology-card scope-card">
              <div className="scope-badge">GHG Protocol Scope 3 • Category 1</div>
              <h4>Purchased Goods and Services — Construction Materials</h4>
              <p>This system calculates <strong>embodied carbon emissions</strong> from construction materials purchased for the project. It covers upstream emissions associated with the extraction, production, and manufacturing of materials before delivery to site.</p>
            </div>
          </section>

          {/* Overview Section */}
          <section className="methodology-section">
            <h3><FiDatabase /> Emission Factor Database</h3>
            <div className="methodology-card">
              <p>All emission factors are sourced from the <strong>ICE DB Advanced V4.1</strong> (Inventory of Carbon and Energy), published October 2025 by the University of Bath.</p>
              <ul>
                <li><strong>Coverage:</strong> 200+ construction materials</li>
                <li><strong>Scope:</strong> Cradle-to-gate (A1-A3 lifecycle stages)</li>
                <li><strong>GHG Scope:</strong> Scope 3 Category 1 — Purchased Goods and Services</li>
                <li><strong>Region:</strong> Global averages with regional adjustments where available</li>
                <li><strong>Update Frequency:</strong> Annual review cycle</li>
              </ul>
              <a href="https://circularecology.com/embodied-carbon-footprint-database.html" target="_blank" rel="noopener noreferrer" className="methodology-link">
                <FiExternalLink size={14} /> View ICE Database Documentation
              </a>
            </div>
          </section>

          {/* Calculation Method */}
          <section className="methodology-section">
            <h3><FiCheckCircle /> Calculation Method</h3>
            <div className="methodology-card">
              <p>Emissions are calculated using the <strong>Activity Data × Emission Factor</strong> approach for <strong>Scope 3 Category 1</strong> (Purchased Goods and Services), aligned with:</p>
              <ul>
                <li><strong>ISO 14064-1:2018</strong> - Greenhouse gas quantification</li>
                <li><strong>GHG Protocol</strong> - Corporate Value Chain (Scope 3) Standard, Category 1</li>
                <li><strong>EN 15978:2011</strong> - Sustainability assessment of construction works</li>
              </ul>
              
              <div className="methodology-formula">
                <span className="formula-label">Formula:</span>
                <code>CO₂e = Quantity × Emission Factor</code>
              </div>

              <div className="methodology-example">
                <span className="example-label">Example:</span>
                <p>Ready-mix Concrete: 600 m³ × 238 kg CO₂e/m³ = 142,800 kg CO₂e</p>
              </div>
            </div>
          </section>

          {/* Data Quality */}
          <section className="methodology-section">
            <h3>Data Quality Assessment</h3>
            <div className="methodology-card">
              <p>Each material's data quality is assessed based on:</p>
              <div className="quality-criteria">
                <div className="quality-item">
                  <span className="quality-badge high">🟢 High Quality</span>
                  <ul>
                    <li>Supplier-specific EPD data available</li>
                    <li>Third-party verified emission factors</li>
                    <li>OCR extraction confidence ≥90%</li>
                  </ul>
                </div>
                <div className="quality-item">
                  <span className="quality-badge medium">🟡 Medium Quality</span>
                  <ul>
                    <li>Industry average from reliable database</li>
                    <li>Regional adjustment factors applied</li>
                    <li>OCR extraction confidence 70-89%</li>
                  </ul>
                </div>
                <div className="quality-item">
                  <span className="quality-badge low">🔴 Low Quality</span>
                  <ul>
                    <li>Estimated based on similar materials</li>
                    <li>Generic global averages used</li>
                    <li>Manual override or assumptions required</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Limitations */}
          <section className="methodology-section">
            <h3><FiAlertTriangle /> Limitations & Uncertainties</h3>
            <div className="methodology-card warning">
              <ul>
                <li><strong>Geographic Variation:</strong> Emission factors may vary by ±15-30% based on manufacturing location and energy mix</li>
                <li><strong>Temporal Changes:</strong> Database values represent industry averages as of publication date</li>
                <li><strong>Recycled Content:</strong> Default virgin material assumptions unless specified</li>
                <li><strong>Transportation:</strong> Site-specific transport emissions not included in current scope</li>
                <li><strong>Biogenic Carbon:</strong> Not separately accounted for timber/bio-based materials</li>
              </ul>
            </div>
          </section>

          {/* References */}
          <section className="methodology-section">
            <h3>References & Standards</h3>
            <div className="methodology-card">
              <ul className="references-list">
                <li>
                  <strong>ICE DB Advanced V4.1</strong> - Circular Ecology / University of Bath (2025)
                </li>
                <li>
                  <strong>ISO 14064-1:2018</strong> - Specification with guidance for quantification and reporting of greenhouse gas emissions
                </li>
                <li>
                  <strong>ISO 14067:2018</strong> - Carbon footprint of products
                </li>
                <li>
                  <strong>EN 15978:2011</strong> - Sustainability of construction works - Assessment of environmental performance
                </li>
                <li>
                  <strong>GHG Protocol</strong> - Corporate Value Chain (Scope 3) Accounting and Reporting Standard
                </li>
                <li>
                  <strong>RICS Whole Life Carbon Assessment</strong> - Professional Statement (2nd Edition, 2023)
                </li>
              </ul>
            </div>
          </section>
        </div>

        <div className="methodology-modal-footer">
          <p className="methodology-version">Documentation Version 2.1 | Last Updated: February 2026</p>
          <button className="methodology-done-btn" onClick={onClose}>
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};

export default MethodologyModal;

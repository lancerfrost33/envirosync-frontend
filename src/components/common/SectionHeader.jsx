import React from 'react';
import './SectionHeader.css';

/**
 * Header kat tengah - untuk section title & subtitle dalam page content.
 * Boleh guna di mana-mana page.
 *
 * Usage:
 * <SectionHeader
 *   title="OCR Review & Extraction"
 *   subtitle="Verify the automatically extracted material data from your uploaded invoices"
 * />
 */
const SectionHeader = ({ title, subtitle, className = '' }) => {
  return (
    <div className={`section-header ${className}`}>
      {title && <h2 className="section-header-title">{title}</h2>}
      {subtitle && <p className="section-header-subtitle">{subtitle}</p>}
    </div>
  );
};

export default SectionHeader;

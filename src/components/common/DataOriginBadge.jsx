import React from 'react';
import './DataOriginBadge.css';

const DataOriginBadge = ({ origin, confidence, size = 'sm' }) => {
  const getBadgeConfig = () => {
    switch(origin) {
      case 'OCR':
        return {
          icon: '🤖',
          label: 'OCR',
          color: '#3b82f6', // blue
          text: confidence ? `${confidence}%` : null
        };
      case 'Manual':
        return {
          icon: '✍️',
          label: 'Manual',
          color: '#10b981', // green
        };
      case 'Excel':
        return {
          icon: '📊',
          label: 'Excel',
          color: '#f59e0b', // orange
        };
      default:
        return {
          icon: '📄',
          label: origin,
          color: '#6b7280', // gray
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span 
      className={`data-origin-badge badge-${size}`}
      style={{ backgroundColor: `${config.color}20`, borderColor: config.color }}
      title={`Data extracted via ${origin}${confidence ? ` with ${confidence}% confidence` : ''}`}
    >
      <span className="badge-icon">{config.icon}</span>
      <span className="badge-text" style={{ color: config.color }}>
        {config.label}
        {config.text && ` ${config.text}`}
      </span>
    </span>
  );
};

export default DataOriginBadge;

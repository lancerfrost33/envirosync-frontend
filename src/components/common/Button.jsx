// src/components/common/Button.jsx
import React from 'react';
import './Button.css';




function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
}) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}


export default Button;
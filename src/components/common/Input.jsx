// src/components/common/Input.jsx
import React from 'react';
import './Input.css';

function Input({ label, type = 'text', value, onChange, error, ...props }) {
  return (
    <div className="input-group">
      {label && <label>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={error ? 'input-error' : ''}
        {...props}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

export default Input;
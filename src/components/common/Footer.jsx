import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-icon">
            <img src="/images/logo.png" alt="" className="footer-logo-img" />
          </div>
          <p className="footer-text">
            Copyright © {currentYear} EnviroSync Platform. Verified Carbon Reporting Tools
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
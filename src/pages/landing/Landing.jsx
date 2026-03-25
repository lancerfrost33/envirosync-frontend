import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../../components/common/Footer';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  const handleViewDemo = (e) => {
    e.preventDefault(); // Prevent default Link behavior if it was a Link
    localStorage.setItem('envirosync.demo_mode', 'true');
    navigate('/upload'); // Redirect to the first allowed demo page
  };

  return (
    <div className="landing-page">

      {/* ── HEADER ───────────────────────────────────────────── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="header-logo" aria-label="EnviroSync">
            <span className="header-logo-text header-logo-enviro">Enviro</span>
            <span className="header-logo-circle">
              <img src="/images/logo.png" alt="" className="header-logo-img" aria-hidden="true" />
            </span>
            <span className="header-logo-text header-logo-ync">ync</span>
          </Link>

          <nav className="landing-nav" aria-label="Primary">
            <a className="landing-nav-link" href="#about">About Us</a>
            <a className="landing-nav-link" href="#feature">Features</a>
            <a className="landing-nav-link" href="#transparency">Transparency</a>
            <a className="landing-nav-link" href="#faq">FAQ</a>
          </nav>

          <div className="landing-header-actions">
            <Link to="/login" className="landing-btn landing-btn--primary">Get Started</Link>
            <Link to="/login" className="landing-btn landing-btn--ghost">Log In</Link>
          </div>
        </div>
      </header>

      <main className="landing-main">

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="landing-hero landing-section" aria-label="Hero">
          <div className="landing-hero-blob landing-hero-blob--left" aria-hidden="true" />
          <div className="landing-hero-blob landing-hero-blob--right" aria-hidden="true" />

          <div className="landing-container landing-hero-container">

            {/* Eyebrow */}
            <div className="landing-hero-eyebrow">
              <span className="landing-hero-eyebrow-dot" />
              AI-Powered Carbon Intelligence
            </div>

            {/* Title */}
            <h1 className="landing-hero-title">
              Decarbonize Your{' '}
              <span className="accent">Design</span>
            </h1>

            {/* Subtitle */}
            <p className="landing-hero-subtitle">
              Streamline your project sustainability with automated tracking,
              material-level accuracy, and global benchmarks — helping you reach Net Zero faster.
            </p>

            {/* CTAs */}
            <div className="landing-hero-ctas">
              <Link to="/login" className="landing-cta landing-cta--primary">
                <span>Get Started Free</span>
                <img
                  className="landing-cta-icon"
                  src="/images/landing/cta-arrow.svg"
                  alt=""
                  aria-hidden="true"
                />
              </Link>
              <button onClick={handleViewDemo} className="landing-cta landing-cta--outline">
                View Demo
              </button>
            </div>

            {/* Stats */}
            <div className="landing-hero-stats">
              <div className="landing-hero-stat">
                <span className="landing-hero-stat-num">18.5%</span>
                <span className="landing-hero-stat-label">Avg. Carbon Reduction</span>
              </div>
              <div className="landing-hero-stat-divider" aria-hidden="true" />
              <div className="landing-hero-stat">
                <span className="landing-hero-stat-num">ICE v4.1</span>
                <span className="landing-hero-stat-label">Emission Database</span>
              </div>
              <div className="landing-hero-stat-divider" aria-hidden="true" />
              <div className="landing-hero-stat">
                <span className="landing-hero-stat-num">100%</span>
                <span className="landing-hero-stat-label">Audit-Ready Reports</span>
              </div>
            </div>

          </div>

          {/* Scroll hint */}
          <div className="landing-scroll-hint" aria-hidden="true">
            <span>Scroll</span>
            <div className="landing-scroll-mouse" />
          </div>
        </section>

        {/* ── TRUST TICKER ─────────────────────────────────────── */}
        <div className="landing-trust" aria-hidden="true">
          <div className="landing-trust-inner">
            <span className="landing-trust-label">Trusted Standards</span>
            {['ICE DB Advanced V4.1', 'RICS Carbon', 'BREEAM', 'LEED', 'ISO 14064', 'GHG Protocol', 'EN 15978',
              'ICE DB Advanced V4.1', 'RICS Carbon', 'BREEAM', 'LEED', 'ISO 14064', 'GHG Protocol', 'EN 15978'].map((item, i) => (
                <span className="landing-trust-item" key={i}>{item}</span>
              ))}
          </div>
        </div>

        {/* ── ABOUT ─────────────────────────────────────────────── */}
        <section className="landing-about landing-section" id="about" aria-label="About Us">
          <div className="landing-container">
            <div className="landing-about-header">
              <span className="landing-section-eyebrow">Who We Are</span>
              <h2 className="landing-section-title">Built for Construction Teams</h2>
              <p className="landing-section-subtitle">
                EnviroSync turns project data into actionable sustainability intelligence — no spreadsheets needed.
              </p>
            </div>

            <div className="landing-about-grid">
              <div className="landing-about-card">
                <div className="landing-about-card-num">01</div>
                <h3 className="landing-about-card-title">Our Mission</h3>
                <p className="landing-about-card-text">
                  Make carbon-conscious decision-making simple and practical for the construction industry
                  by turning project data into actionable sustainability intelligence.
                </p>
              </div>

              <div className="landing-about-card">
                <div className="landing-about-card-num">02</div>
                <h3 className="landing-about-card-title">What We Deliver</h3>
                <p className="landing-about-card-text">
                  Automated carbon calculations, intelligent material recommendations,
                  and professional, ready-to-use carbon emission reports.
                </p>
              </div>

              <div className="landing-about-card">
                <div className="landing-about-card-num">03</div>
                <h3 className="landing-about-card-title">Who It's For</h3>
                <p className="landing-about-card-text">
                  Project managers, engineers, sustainability teams, contractors, and developers
                  who want accurate, transparent, and easy-to-use carbon reporting tools.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────── */}
        <section
          className="landing-feature-strip landing-section landing-section--alt"
          id="feature"
          aria-label="Features"
        >
          <div className="landing-feature-container">
            <div className="landing-feature-header">
              <span className="landing-section-eyebrow">What We Offer</span>
              <h2 className="landing-section-title">Powerful Tools for Sustainable Design</h2>
              <p className="landing-section-subtitle">
                Everything your team needs to measure, manage, and reduce embodied carbon.
              </p>
            </div>

            <div className="landing-feature-grid">
              <div className="landing-feature-card">
                <div className="landing-feature-icon" aria-hidden="true">
                  <img src="/images/landing/feature-pdf.svg" alt="" />
                </div>
                <h3 className="landing-feature-title">Automated PDF Processing</h3>
                <p className="landing-feature-text">
                  Instantly extract environmental data from EPDs and QTO documents
                  with proprietary AI scanning — no manual entry.
                </p>
              </div>

              <div className="landing-feature-card">
                <div className="landing-feature-icon" aria-hidden="true">
                  <img src="/images/landing/feature-material.svg" alt="" />
                </div>
                <h3 className="landing-feature-title">Material-Level Accuracy</h3>
                <p className="landing-feature-text">
                  Go beyond estimates. Get granular carbon impact data based on
                  specific materials, quantities, and origins.
                </p>
              </div>

              <div className="landing-feature-card">
                <div className="landing-feature-icon" aria-hidden="true">
                  <img src="/images/landing/feature-benchmarks.svg" alt="" />
                </div>
                <h3 className="landing-feature-title">Global Benchmarks</h3>
                <p className="landing-feature-text">
                  Compare your project performance with global industry standards
                  and benchmarks in real time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRANSPARENCY ─────────────────────────────────────── */}
        <section className="landing-transparency landing-section" id="transparency" aria-label="Transparency section">
          <div className="landing-container">
            <div className="landing-transparency-header">
              <span className="landing-section-eyebrow">How It Works</span>
              <h2 className="landing-transparency-title">Transparency at Every Step</h2>
              <p className="landing-transparency-subtitle">
                Comprehensive tools designed to transform complex environmental data into actionable design intelligence.
              </p>
            </div>

            <div className="landing-card-row">
              <article className="landing-info-card">
                <img className="landing-info-icon" src="/images/landing/card-analytics.svg" alt="" aria-hidden="true" />
                <h3 className="landing-info-title">Deep Analytics</h3>
                <p className="landing-info-text">
                  Drill down into specific scope 3 emissions categories and identify major
                  hot spots in your supply chain with real-time dashboards.
                </p>
              </article>

              <article className="landing-info-card">
                <img className="landing-info-icon" src="/images/landing/card-portal.svg" alt="" aria-hidden="true" />
                <h3 className="landing-info-title">Supplier Transparency</h3>
                <p className="landing-info-text">
                  Collaborate with vendors via a dedicated portal. Collect EPDs and
                  compliance documents without manual follow-up emails.
                </p>
              </article>

              <article className="landing-info-card">
                <img className="landing-info-icon" src="/images/landing/card-reports.svg" alt="" aria-hidden="true" />
                <h3 className="landing-info-title">Project-wide Reporting</h3>
                <p className="landing-info-text">
                  Generate audit-ready reports in seconds. Perfect for ESG disclosures,
                  green building certification, and compliance.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────── */}
        <section className="landing-faq landing-section landing-section--alt" id="faq" aria-label="Frequently Asked Questions">
          <div className="landing-container">
            <div className="landing-faq-header">
              <span className="landing-section-eyebrow">Got Questions?</span>
              <h2 className="landing-section-title">FAQ</h2>
              <p className="landing-section-subtitle">Quick answers to common questions about EnviroSync.</p>
            </div>

            <div className="landing-faq-list">
              <details className="landing-faq-item">
                <summary className="landing-faq-q">What file types can I upload?</summary>
                <div className="landing-faq-a">PDF invoices, material schedules, XLSX, and CSV files are supported. More formats are coming soon.</div>
              </details>

              <details className="landing-faq-item">
                <summary className="landing-faq-q">How do you calculate carbon emissions?</summary>
                <div className="landing-faq-a">We map materials to verified emission factors from the ICE DB Advanced V4.1 and show all assumptions transparently in your report.</div>
              </details>

              <details className="landing-faq-item">
                <summary className="landing-faq-q">Can I export reports?</summary>
                <div className="landing-faq-a">Yes — project-wide PDF and CSV exports are fully supported with audit-ready formatting.</div>
              </details>

              <details className="landing-faq-item">
                <summary className="landing-faq-q">Is my data secure?</summary>
                <div className="landing-faq-a">Absolutely. All data is encrypted in transit and at rest. We use enterprise-grade security via Supabase infrastructure.</div>
              </details>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}

export default Landing;
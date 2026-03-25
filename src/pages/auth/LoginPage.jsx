// src/LoginPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, X, ShieldAlert, AlertCircle } from 'lucide-react';
import './LoginPage.css';
import { supabase } from '../../lib/supabase.js';
import { API_BASE } from '../../lib/api';

const HERO_IMAGE_URL = '/images/green.jpg';

// ── Error message map — friendly messages for Supabase error codes ──
const ERROR_MESSAGES = {
  'Invalid login credentials': {
    title: 'Incorrect Email or Password',
    detail: 'Double-check your credentials and try again.',
  },
  'Email not confirmed': {
    title: 'Email Not Verified',
    detail: 'Please check your inbox and confirm your email first.',
  },
  'Too many requests': {
    title: 'Too Many Attempts',
    detail: "You've been temporarily locked out. Try again in a few minutes.",
  },
};

function getErrorContent(message) {
  for (const [key, val] of Object.entries(ERROR_MESSAGES)) {
    if (message?.includes(key)) return val;
  }
  return { title: 'Login Failed', detail: message || 'Something went wrong. Please try again.' };
}

// ── Inline Error Toast Component ─────────────────────────────────────
function ErrorToast({ error, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!error) return;
    timerRef.current = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timerRef.current);
  }, [error, onDismiss]);

  if (!error) return null;

  const { title, detail } = getErrorContent(error);

  return (
    <div className="login-error-toast" role="alert" aria-live="assertive">
      <div className="login-error-toast-icon-wrap">
        <ShieldAlert size={20} strokeWidth={2} className="login-error-toast-icon" />
      </div>
      <div className="login-error-toast-body">
        <p className="login-error-toast-title">{title}</p>
        <p className="login-error-toast-detail">{detail}</p>
      </div>
      <button
        className="login-error-toast-close"
        onClick={onDismiss}
        aria-label="Dismiss error"
        type="button"
      >
        <X size={15} strokeWidth={2.5} />
      </button>
      <div className="login-error-toast-progress" />
    </div>
  );
}

// ── Field Error Component ─────────────────────────────────────────────
function FieldError({ message }) {
  if (!message) return null;
  return (
    <div className="field-error" role="alert">
      <AlertCircle size={13} strokeWidth={2.5} />
      <span>{message}</span>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Field validation state ────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  // ── Keep me logged in: restore email on mount ──────────────────
  useEffect(() => {
    const savedEmail = localStorage.getItem('envirosync.remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  // ── Test backend connection ─────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(data => console.log('✅ Backend connected:', data))
      .catch(err => console.error('❌ Backend connection failed:', err));
  }, []);

  // ── Validators ───────────────────────────────────────────────────
  const validateEmail = (val) => {
    if (!val.trim()) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) return 'Please enter a valid email address.';
    return '';
  };

  const validatePassword = (val) => {
    if (!val) return 'Password is required.';
    if (val.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  // ── onChange handlers — only show error if field was already touched ──
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setErrorMsg('');
    if (touched.email) {
      setFieldErrors(prev => ({ ...prev, email: validateEmail(e.target.value) }));
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setErrorMsg('');
    if (touched.password) {
      setFieldErrors(prev => ({ ...prev, password: validatePassword(e.target.value) }));
    }
  };

  // ── onBlur — mark field as touched and validate immediately ──────
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') setFieldErrors(prev => ({ ...prev, email: validateEmail(email) }));
    if (field === 'password') setFieldErrors(prev => ({ ...prev, password: validatePassword(password) }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    // Touch all fields on submit attempt
    setTouched({ email: true, password: true });
    const emailErr    = validateEmail(email);
    const passwordErr = validatePassword(password);
    setFieldErrors({ email: emailErr, password: passwordErr });

    // Block submission if any field invalid
    if (emailErr || passwordErr) return;

    setErrorMsg('');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // ── Keep me logged in — save or clear email ─────────────────
    if (remember) {
      localStorage.setItem('envirosync.remembered_email', email.trim());
    } else {
      localStorage.removeItem('envirosync.remembered_email');
    }

    navigate('/dashboard');
  }


  const handleContactAdmin = (e) => {
    e.preventDefault();
    console.log('Contact Administrator clicked');
  };

  return (
    <div className="login-page">
      {/* ── Left Panel ── */}
      <aside className="panel panel-brand">
        <div className="brand-content">
          <div className="logo">
            <span className="logo-text logo-enviro">Enviro</span>
            <span className="logo-circle">
              <img src="/images/logo.png" alt="EnviroSync Logo" className="logo-img" aria-hidden="true" />
            </span>
            <span className="logo-text logo-ync">ync</span>
          </div>
          <h2 className="brand-heading">Procure Sustainably</h2>
          <p className="tagline">Join the ecosystem of environmentally conscious procurement professionals.</p>
        </div>
        <div className="panel-image">
          <img src={HERO_IMAGE_URL} alt="Sustainable environment" />
          <div className="image-overlay" />
        </div>
      </aside>

      {/* ── Right Panel ── */}
      <main className="panel panel-form">
        <div className="form-wrapper">
          <div className="envirosync-logo-top">
            <span className="envirosync-logo-text envirosync-logo-enviro">Enviro</span>
            <span className="envirosync-logo-circle">
              <img src="/images/logo.png" alt="" className="envirosync-logo-img" aria-hidden="true" />
            </span>
            <span className="envirosync-logo-text envirosync-logo-ync">ync</span>
          </div>

          <header className="form-header">
            <h1 className="form-title">Welcome back</h1>
            <p className="form-subtitle">Please enter your details to sign in</p>
          </header>

          {/* ── Custom Error Toast — replaces browser alert() ── */}
          <ErrorToast error={errorMsg} onDismiss={() => setErrorMsg('')} />

          <form className="login-form" onSubmit={handleSubmit} noValidate>

            {/* ── Email field ── */}
            <div className={`field${touched.email && fieldErrors.email ? ' field--error' : ''}`}>
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="name@company.com"
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => handleBlur('email')}
                aria-invalid={touched.email && !!fieldErrors.email}
                required
              />
              <FieldError message={touched.email ? fieldErrors.email : ''} />
            </div>

            {/* ── Password field ── */}
            <div className={`field${touched.password && fieldErrors.password ? ' field--error' : ''}`}>
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => handleBlur('password')}
                  aria-invalid={touched.password && !!fieldErrors.password}
                  required
                />
                <button
                  type="button"
                  className="toggle-password-visibility"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FieldError message={touched.password ? fieldErrors.password : ''} />
            </div>

            <div className="form-options">
              {/* ── Keep me logged in — functional ── */}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="checkmark" />
                Keep me logged in
              </label>
            </div>

            <button
              type="submit"
              className={`btn-primary ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="btn-spinner" aria-hidden="true" />
              ) : 'Log in'}
            </button>
          </form>

          <button type="button" className="btn-secondary" onClick={handleContactAdmin}>
            Contact Administrator
          </button>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
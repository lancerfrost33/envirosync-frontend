import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './UserProfilePage.css';
import { supabase } from '../../lib/supabase.js';

import {
  FileText, CalendarDays, Camera, Save, AlertTriangle, Loader2
} from 'lucide-react';

// ── Avatar placeholder (initials) ────────────────────────────────────
function AvatarFallback({ name }) {
  const initials = (name || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #2D9183 0%, #1a6b60 100%)',
      color: '#fff', fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em',
    }}>
      {initials}
    </div>
  );
}

// ── Toast notification ────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const colors = {
    success: { bg: '#f0fdf9', border: '#86efcb', text: '#166534', bar: '#22c55e' },
    error:   { bg: '#fff5f5', border: '#fecaca', text: '#991b1b', bar: '#ef4444' },
  };
  const c = colors[type] || colors.success;

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 2000,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', borderRadius: 10, maxWidth: 360,
      background: c.bg, border: `1px solid ${c.border}`,
      borderLeft: `4px solid ${c.bar}`,
      boxShadow: '0 4px 16px rgba(0,0,0,.08)',
      animation: 'toastIn .25s cubic-bezier(.16,1,.3,1)',
      color: c.text, fontSize: 14, fontWeight: 500,
    }}>
      <span>{message}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'inherit', opacity: .6, fontSize: 18, lineHeight: 1, padding: 0,
      }}>×</button>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

const EMPTY = {
  full_name: '', professional_role: '', phone: '',
  org_name: '', company_size: '', primary_industry: '', avatar_url: '',
};

const UserProfilePage = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [profileData, setProfileData]   = useState(EMPTY);
  const [editData, setEditData]         = useState(EMPTY);
  const [isEditing, setIsEditing]       = useState(false);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile]     = useState(null);
  const [showSignOut, setShowSignOut]   = useState(false);
  const [toast, setToast]               = useState({ message: '', type: 'success' });
  const [userEmail, setUserEmail]       = useState('');
  const [projectCount, setProjectCount] = useState('—');

  const showToast = (message, type = 'success') => setToast({ message, type });
  const clearToast = () => setToast({ message: '', type: 'success' });

  // ── 1. Fetch profile on mount ──────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        navigate('/login', { replace: true });
        return;
      }

      // Store auth email separately (read-only, from auth)
      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        showToast('Failed to load profile.', 'error');
      }

      const profile = data || { ...EMPTY, id: user.id };
      setProfileData(profile);
      setEditData(profile);
      setLoading(false);

       const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setProjectCount(count ?? 0);
    };

    fetchProfile();
  }, [navigate]);

  // ── 2. Avatar file picker ─────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB.', 'error');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ── 3. Save changes ───────────────────────────────────────────────
  const handleSaveChanges = async () => {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    let avatar_url = editData.avatar_url;

    if (avatarFile) {
      const ext  = avatarFile.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });

      if (uploadErr) {
        showToast('Avatar upload failed: ' + uploadErr.message, 'error');
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      avatar_url = urlData.publicUrl;
    }

    const { error: saveErr } = await supabase
      .from('profiles')
      .upsert({
        id:                user.id,
        full_name:         editData.full_name,
        professional_role: editData.professional_role,
        phone:             editData.phone,
        org_name:          editData.org_name,
        company_size:      editData.company_size,
        primary_industry:  editData.primary_industry,
        avatar_url,
      }, { onConflict: 'id' });

    setSaving(false);

    if (saveErr) {
      showToast('Save failed: ' + saveErr.message, 'error');
      return;
    }

    const saved = { ...editData, avatar_url };
    setProfileData(saved);
    setEditData(saved);
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsEditing(false);
    showToast('Profile saved successfully!', 'success');
  };

  const handleCancelChanges = () => {
    setEditData(profileData);
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setIsEditing(false);
  };

  // ── 4. Sign out ───────────────────────────────────────────────────
  const handleConfirmSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('envirosync.remember');
    localStorage.removeItem('envirosync.remembered_email');
    navigate('/login', { replace: true });
  };

  const field = (key) => editData[key] ?? '';
  const setField = (key, val) => setEditData(prev => ({ ...prev, [key]: val }));

  const displayAvatar = avatarPreview || profileData.avatar_url;

  const memberSince = profileData.created_at
    ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="user-profile-page">
        <Header />
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: 12,
          color: '#64748b', fontSize: 14,
        }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Loading profile…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <Header />

      <Toast message={toast.message} type={toast.type} onClose={clearToast} />

      <div className="profile-title-section">
        <h1 className="profile-title">User Profile</h1>
      </div>

      <div className="profile-container">
        <div className="profile-content">

          {/* ── Stats — Projects Managed & Member Since ── */}
          <div className="stats-grid stats-grid-2">
            <div className="stat-card stat-card-blue">
              <div className="stat-icon"><FileText size={24} /></div>
              <div className="stat-info stat-info-center">
                <p className="stat-label">Projects Managed</p>
                <p className="stat-value">{projectCount}</p>
              </div>
            </div>
            <div className="stat-card stat-card-primary">
              <div className="stat-icon"><CalendarDays size={24} /></div>
              <div className="stat-info stat-info-center">
                <p className="stat-label">Member Since</p>
                <p className="stat-value">{memberSince}</p>
              </div>
            </div>
          </div>

          {/* ── Personal Information ── */}
          <div className="info-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Personal Information</h3>
                <p className="card-subtitle">Update your photo and personal details here.</p>
              </div>
              {!isEditing && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowSignOut(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 16px', borderRadius: 8, border: '1px solid #fecaca',
                      background: '#fff5f5', color: '#dc2626',
                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      transition: 'all .2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                    onMouseOut={e => e.currentTarget.style.background = '#fff5f5'}
                  >
                    Sign Out
                  </button>
                  <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </button>
                </div>
              )}
            </div>

            <div className="card-content">
              <div className="profile-section">

                {/* Avatar */}
                <div className="profile-photo-container">
                  <div className="profile-photo">
                    {displayAvatar
                      ? <img src={displayAvatar} alt={profileData.full_name || 'Avatar'} />
                      : <AvatarFallback name={profileData.full_name} />
                    }
                  </div>
                  {isEditing && (
                    <>
                      <button
                        className="photo-upload-btn"
                        onClick={() => fileRef.current?.click()}
                        title="Change photo"
                        type="button"
                      >
                        <Camera size={16} />
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleAvatarChange}
                      />
                    </>
                  )}
                </div>

                {/* Fields */}
                <div className="profile-details-grid">
                  {[
                    { label: 'Full Name',        key: 'full_name',         type: 'text' },
                    { label: 'Professional Role', key: 'professional_role', type: 'text' },
                    { label: 'Phone Number',      key: 'phone',             type: 'tel'  },
                  ].map(({ label, key, type }) => (
                    <div className="detail-item" key={key}>
                      <label className="detail-label">{label}</label>
                      {isEditing ? (
                        <input
                          type={type}
                          className="detail-input"
                          value={field(key)}
                          onChange={e => setField(key, e.target.value)}
                        />
                      ) : (
                        <p className="detail-value">{profileData[key] || '—'}</p>
                      )}
                    </div>
                  ))}

                  {/* Email — read-only from Supabase Auth */}
                  <div className="detail-item">
                    <label className="detail-label">Email Address</label>
                    <p className="detail-value" style={{ color: '#64748b', fontSize: '0.95rem' }}>
                      {userEmail || '—'}
                    </p>
                    {isEditing && (
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                        Email cannot be changed here.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Company Details ── */}
          <div className="info-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Company Details</h3>
                <p className="card-subtitle">Information about your primary organization.</p>
              </div>
            </div>
            <div className="card-content">
              <div className="company-details-grid">

                <div className="detail-item">
                  <label className="detail-label">Organization Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="detail-input"
                      value={field('org_name')}
                      onChange={e => setField('org_name', e.target.value)}
                    />
                  ) : (
                    <div className="company-name-section">
                      <div className="company-logo">
                        {(profileData.org_name || '?')[0].toUpperCase()}
                      </div>
                      <p className="detail-value">{profileData.org_name || '—'}</p>
                    </div>
                  )}
                </div>

                <div className="detail-item">
                  <label className="detail-label">Company Size</label>
                  {isEditing ? (
                    <select
                      className="detail-input"
                      value={field('company_size')}
                      onChange={e => setField('company_size', e.target.value)}
                    >
                      <option value="">Select size</option>
                      {['1–10 Employees','11–50 Employees','51–200 Employees',
                        '201–500 Employees','501–1,000 Employees',
                        '1,001–5,000 Employees','5,000+ Employees'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="detail-value">{profileData.company_size || '—'}</p>
                  )}
                </div>

                <div className="detail-item">
                  <label className="detail-label">Primary Industry</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="detail-input"
                      value={field('primary_industry')}
                      onChange={e => setField('primary_industry', e.target.value)}
                    />
                  ) : (
                    <p className="detail-value">{profileData.primary_industry || '—'}</p>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* ── Action buttons ── */}
          {isEditing && (
            <div className="action-buttons">
              <button className="cancel-btn" onClick={handleCancelChanges} disabled={saving}>
                Cancel Changes
              </button>
              <button className="save-btn" onClick={handleSaveChanges} disabled={saving}>
                {saving
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : <><Save size={16} /> Save Changes</>
                }
              </button>
            </div>
          )}

        </div>
      </div>
      <Footer />

      {/* ── Sign Out Modal ── */}
      {showSignOut && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <AlertTriangle size={24} className="modal-icon" />
              <h3 className="modal-title">Confirm Sign Out</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to sign out of your EnviroSync account?</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={() => setShowSignOut(false)}>
                Cancel
              </button>
              <button className="modal-btn-confirm" onClick={handleConfirmSignOut}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;
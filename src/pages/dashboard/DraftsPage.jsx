import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/common/PageLayout';
import { Search, Trash2, Play, FileText, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { API_BASE } from '../../lib/api';
import './DraftsPage.css';

const DraftsPage = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDrafts, setSelectedDrafts] = useState([]);


  const STAGE_META = {
    upload: { label: 'Upload', progress: 16, route: '/upload' },
    categorization: { label: 'Categorization', progress: 40, route: '/categorization' },
    calculation: { label: 'Calculation', progress: 60, route: '/calculation' },
    suggestion: { label: 'Suggestion', progress: 75, route: '/suggestions' },
    analysis: { label: 'Analysis', progress: 90, route: '/analysis' },
  };

  useEffect(() => {
    const loadDrafts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE}/api/drafts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to load drafts (${res.status})`);
      }
      const data = await res.json();

      // Map backend data to what the table needs
      const mapped = data.map(d => ({
        id: d.id,
        fileName: d.file_name || `${d.stage} Draft`,
        uploadDate: d.saved_at,
        currentStage: STAGE_META[d.stage]?.label || d.stage,
        progress: STAGE_META[d.stage]?.progress || 0,
        route: STAGE_META[d.stage]?.route || '/upload',
        status: 'In Progress',
        page_data: d.page_data,
        project_id: d.project_id,
        stage: d.stage,
      }));

      setDrafts(mapped);
    };
    loadDrafts().catch((err) => {
      console.error('Failed to load drafts:', err);
      setDrafts([]);
    });
  }, []);

  const filteredDrafts = useMemo(() => {
    return drafts.filter(draft => {
      // Exclude completed drafts from drafts page
      if (draft.status === 'Completed') return false;

      const matchesSearch = draft.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || draft.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drafts, searchQuery, statusFilter]);

  const toggleSelectAll = () => {
    if (selectedDrafts.length === filteredDrafts.length) {
      setSelectedDrafts([]);
    } else {
      setSelectedDrafts(filteredDrafts.map(d => d.id));
    }
  };

  const toggleSelectDraft = (id) => {
    if (selectedDrafts.includes(id)) {
      setSelectedDrafts(selectedDrafts.filter(draftId => draftId !== id));
    } else {
      setSelectedDrafts([...selectedDrafts, id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDrafts.length === 0) return;
    if (!window.confirm(`Delete ${selectedDrafts.length} selected draft(s)?`)) return;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const toDelete = drafts.filter(d => selectedDrafts.includes(d.id));

    await Promise.all(toDelete.map(d =>
      fetch(`${API_BASE}/api/drafts/${d.stage}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
    ));

    setDrafts(prev => prev.filter(d => !selectedDrafts.includes(d.id)));
    setSelectedDrafts([]);
  };

  const handleDeleteDraft = async (draft) => {
    if (!window.confirm('Delete this draft?')) return;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    await fetch(`${API_BASE}/api/drafts/${draft.stage}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    setDrafts(drafts.filter(d => d.id !== draft.id));
  };

  const handleResumeDraft = (draft) => {
    navigate(draft.route, {
      state: {
        fromDraft: true,
        draftData: draft.page_data,
        projectId: draft.project_id,
      }
    });
  };

  const handleProcessSelected = () => {
    if (selectedDrafts.length === 0) return;
    alert(`Processing ${selectedDrafts.length} draft(s)...`);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Draft':
        return 'draft-status-badge-draft';
      case 'In Progress':
        return 'draft-status-badge-inprogress';
      case 'Completed':
        return 'draft-status-badge-completed';
      default:
        return '';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  return (
    <PageLayout
      title={<span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>Drafts Management</span>}
      subtitle={<span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>Manage your uploaded files and project drafts</span>}
      showNavbar={true}
      showHeader={true}
      showFooter={true}
      maxWidth="1440px"
    >
      <span></span>
      <div className="drafts-page">
        {/* Filters and Actions Bar */}
        <div className="drafts-actions-bar">
          <div className="drafts-search-wrapper">
            <Search size={18} className="drafts-search-icon" />
            <input
              type="text"
              className="drafts-search-input"
              placeholder="Search by file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="drafts-filter-wrapper">
            <label htmlFor="status-filter" className="drafts-filter-label">Status:</label>
            <select
              id="status-filter"
              className="drafts-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Draft">Draft</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>

          {selectedDrafts.length > 0 && (
            <div className="drafts-bulk-actions">
              <button className="drafts-bulk-btn drafts-bulk-btn-process" onClick={handleProcessSelected}>
                <Play size={16} />
                Process Selected ({selectedDrafts.length})
              </button>
              <button className="drafts-bulk-btn drafts-bulk-btn-delete" onClick={handleDeleteSelected}>
                <Trash2 size={16} />
                Delete Selected
              </button>
            </div>
          )}
        </div>

        {/* Drafts Table */}
        {filteredDrafts.length > 0 ? (
          <div className="drafts-table-container">
            <table className="drafts-table">
              <thead>
                <tr>
                  <th className="drafts-th-checkbox">
                    <button onClick={toggleSelectAll} className="drafts-checkbox-btn">
                      {selectedDrafts.length === filteredDrafts.length && filteredDrafts.length > 0 ? (
                        <CheckSquare size={18} className="drafts-checkbox-checked" />
                      ) : (
                        <Square size={18} className="drafts-checkbox-unchecked" />
                      )}
                    </button>
                  </th>
                  <th>FILE NAME</th>
                  <th>UPLOAD DATE</th>
                  <th>CURRENT STAGE</th>
                  <th>STATUS</th>
                  <th className="drafts-th-actions">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrafts.map((draft) => (
                  <tr key={draft.id} className={selectedDrafts.includes(draft.id) ? 'drafts-row-selected' : ''}>
                    <td className="drafts-td-checkbox">
                      <button onClick={() => toggleSelectDraft(draft.id)} className="drafts-checkbox-btn">
                        {selectedDrafts.includes(draft.id) ? (
                          <CheckSquare size={18} className="drafts-checkbox-checked" />
                        ) : (
                          <Square size={18} className="drafts-checkbox-unchecked" />
                        )}
                      </button>
                    </td>
                    <td className="drafts-td-filename">
                      <div className="drafts-filename-wrapper">
                        <FileText size={18} className="drafts-file-icon" />
                        <span>{draft.fileName}</span>
                      </div>
                    </td>
                    <td className="drafts-td-date">{formatDate(draft.uploadDate)}</td>
                    <td className="drafts-td-stage">
                      <div className="drafts-stage-wrapper">
                        <span className="drafts-stage-text">{draft.currentStage}</span>
                        <div className="drafts-progress-bar">
                          <div
                            className="drafts-progress-fill"
                            style={{ width: `${draft.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="drafts-td-status">
                      <span className={`drafts-status-badge ${getStatusClass(draft.status)}`}>
                        {draft.status}
                      </span>
                    </td>
                    <td className="drafts-td-actions">
                      <div className="drafts-action-buttons">
                        {draft.status === 'Completed' ? (
                          <button
                            className="drafts-action-btn drafts-action-btn-report"
                            onClick={() => navigate('/report')}
                            title="View Report"
                          >
                            <FileText size={16} />
                            View Report
                          </button>
                        ) : (
                          <button
                            className="drafts-action-btn drafts-action-btn-resume"
                            onClick={() => handleResumeDraft(draft)}
                            title="Resume Draft"
                          >
                            <Play size={16} />
                            Resume
                          </button>
                        )}
                        <button
                          className="drafts-action-btn-icon drafts-action-btn-delete"
                          onClick={() => handleDeleteDraft(draft)}
                          title="Delete Draft"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="drafts-empty-state">
            <FileText size={64} className="drafts-empty-icon" />
            <h3 className="drafts-empty-title">No Drafts Found</h3>
            <p className="drafts-empty-text">
              {searchQuery || statusFilter !== 'all'
                ? 'No drafts match your search criteria. Try adjusting your filters.'
                : 'You haven\'t uploaded any files yet. Start by uploading your first project.'}
            </p>
            <button
              className="drafts-empty-btn"
              onClick={() => navigate('/upload')}
            >
              Upload New Project
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default DraftsPage;

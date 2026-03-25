import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/common/PageLayout';
import ProgressStepper from '../../components/common/ProgressStepper';
import './CategorizationPage.css';
import { supabase } from '../../lib/supabase';
import { API_BASE } from '../../lib/api';
import * as XLSX from 'xlsx';

import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  RotateCw, Sparkles, Plus, AlertCircle, Trash2,
  Check, Save, Edit, X, Loader2, Upload
} from 'lucide-react';

const API_URL = API_BASE;

const CategorizationPage = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [projectNameError, setProjectNameError] = useState(false);

  // ── Document & OCR state ──────────────────────────────────────────────────
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [extractionData, setExtractionData] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);   // initial OCR load
  const [extractError, setExtractError] = useState('');
  const [pdfUrls, setPdfUrls] = useState({});   // { fileId: { url, contentType } }
  const [spreadsheetData, setSpreadsheetData] = useState({});   // { fileId: { headers, rows } }
  const [isLoadingSpreadsheet, setIsLoadingSpreadsheet] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isRescanning, setIsRescanning] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);

  const totalPages = Math.max(1, uploadedDocuments.length);
  const units = ['m³', 'kg', 't', 'm²', 'm', 'pcs', 'units', 'bags'];
  const categories = ['Glass', 'Tiles', 'Concrete', 'Bricks', 'Steel', 'Wood', 'Additives', 'Other'];

  // Ensure currentPage doesn't exceed totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // ── Fetch and parse spreadsheet data ──────────────────────────────────────
  const fetchSpreadsheetData = useCallback(async (fileId, previewUrl) => {
    if (!previewUrl) return;
    try {
      setIsLoadingSpreadsheet(true);
      const response = await fetch(previewUrl);
      if (!response.ok) {
        console.warn(`Failed to fetch spreadsheet ${fileId}`);
        setIsLoadingSpreadsheet(false);
        return;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Get data as JSON array of objects
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      // Also get headers
      const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
      
      setSpreadsheetData((prev) => ({
        ...prev,
        [fileId]: { headers, rows: jsonData },
      }));
    } catch (err) {
      console.warn(`Error parsing spreadsheet ${fileId}:`, err);
    } finally {
      setIsLoadingSpreadsheet(false);
    }
  }, []);

  // ── 1. On mount: read file_ids from localStorage, call OCR extract ────────
  useEffect(() => {
    const init = async () => {
      try {
        // Get project_id and file metadata saved by Upload.jsx
        const projectId = localStorage.getItem('envirosync.project_id');
        const raw = localStorage.getItem('envirosync.upload.draft.v1');
        const uploadDraft = raw ? JSON.parse(raw) : null;

        // Build uploadedDocuments list from upload draft
        const savedFiles = uploadDraft?.files || [];
        if (savedFiles.length === 0) {
          setExtractError('No uploaded files found. Please go back and upload a file.');
          return;
        }

        const docs = savedFiles.map((f, idx) => ({
          id: f.id,
          fileName: f.name,
          pageNumber: idx + 1,
        }));
        setUploadedDocuments(docs);

        // Fetch signed preview URLs for all uploaded files
        if (projectId) {
          try {
            const urlMap = {};
            for (const f of savedFiles) {
              try {
                const res = await fetch(`${API_URL}/api/upload/${f.id}/preview-url`);
                if (res.ok) {
                  const data = await res.json();
                  if (data.url) {
                    urlMap[f.id] = {
                      url: data.url,
                      contentType: data.content_type || 'application/octet-stream',
                    };
                  }
                }
              } catch (err) {
                console.warn(`Preview URL failed for ${f.id}:`, err);
              }
            }
            setPdfUrls(urlMap);
          } catch (err) {
            console.warn('Failed to fetch preview URLs:', err);
          }
        }

        // Check if we have a categorization draft saved already
        const catRaw = localStorage.getItem('envirosync.categorization.draft.v1');
        const catDraft = catRaw ? JSON.parse(catRaw) : null;
        if (catDraft?.extractionData?.length > 0 && catDraft?.projectId === projectId) {
          // Restore from draft — no need to re-OCR
          setExtractionData(catDraft.extractionData);
          if (catDraft.projectName) setProjectName(catDraft.projectName);
          return;
        }

        // Run OCR for each file
        setIsExtracting(true);
        setExtractError('');

        const allMaterials = [];
        let idCounter = 1;

        for (const doc of docs) {
          try {
            const res = await fetch(`${API_URL}/api/ocr/extract?file_id=${doc.id}`, {
              method: 'POST',
            });

            if (!res.ok) {
              console.warn(`OCR failed for file ${doc.fileName}: ${res.status}`);
              continue;
            }

            const data = await res.json();
            const materials = data.materials || [];

            // Re-number IDs sequentially across all files
            const numbered = materials.map((m) => ({
              ...m,
              id: idCounter++,
              db_id: m.db_id || null,
            }));
            allMaterials.push(...numbered);

          } catch (err) {
            console.warn(`OCR error for ${doc.fileName}:`, err);
          }
        }

        if (allMaterials.length === 0) {
          setExtractError('No materials could be extracted. Please check your file and try re-scanning.');
        }

        setExtractionData(allMaterials);

      } catch (err) {
        console.error('Initialization error:', err);
        setExtractError('Failed to load extraction data. Please try again.');
      } finally {
        setIsExtracting(false);
      }
    };

    init();
  }, []);

  // ── 2. Autosave extraction data & uploaded documents to localStorage ──────
  useEffect(() => {
    if (extractionData.length === 0) return;
    try {
      const projectId = localStorage.getItem('envirosync.project_id');
      const existing = JSON.parse(localStorage.getItem('envirosync.categorization.draft.v1') || '{}');
      const uploadDraft = {
        files: uploadedDocuments.map(doc => ({
          id: doc.id,
          name: doc.fileName,
          pageNumber: doc.pageNumber,
        })),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('envirosync.upload.draft.v1', JSON.stringify(uploadDraft));
      
      localStorage.setItem('envirosync.categorization.draft.v1', JSON.stringify({
        ...existing,
        projectId,
        projectName,
        extractionData,
        currentPage,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      // ignore storage errors
    }
  }, [extractionData, projectName, currentPage, uploadedDocuments]);

  // ── 2b. Fetch spreadsheet data when page changes ──────────────────────────
  useEffect(() => {
    const currentDoc = uploadedDocuments[currentPage - 1];
    if (!currentDoc) return;

    const fileName = currentDoc.fileName || '';
    const fileExt = fileName.lastIndexOf('.') !== -1
      ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
      : '';

    const isSpreadsheet = ['csv', 'xlsx', 'xls'].includes(fileExt);
    
    // Only load spreadsheet data if it's a spreadsheet file and not already loaded
    if (isSpreadsheet && !spreadsheetData[currentDoc.id] && pdfUrls[currentDoc.id]) {
      fetchSpreadsheetData(currentDoc.id, pdfUrls[currentDoc.id].url);
    }
  }, [currentPage, uploadedDocuments, pdfUrls, spreadsheetData, fetchSpreadsheetData]);

  // ── 3. Rescan current document ────────────────────────────────────────────
  const handleRescan = async () => {
    const currentDoc = uploadedDocuments.find(d => d.pageNumber === currentPage);
    if (!currentDoc) return;

    setIsRescanning(true);
    try {
      const res = await fetch(`${API_URL}/api/ocr/${currentDoc.id}/rescan`, { method: 'POST' });
      const data = await res.json();

      if (data.materials?.length > 0) {
        // Replace materials from this specific file, keep others
        setExtractionData(prev => {
          const othersCount = prev.filter(m => m.sourceFileId !== currentDoc.id).length;
          const newMaterials = data.materials.map((m, i) => ({
            ...m,
            id: othersCount + i + 1,
            sourceFileId: currentDoc.id,
          }));
          const others = prev.filter(m => m.sourceFileId !== currentDoc.id);
          return [...others, ...newMaterials];
        });
      }
    } catch (err) {
      console.error('Rescan failed:', err);
    } finally {
      setIsRescanning(false);
    }
  };

  // ── 4. Table CRUD handlers ────────────────────────────────────────────────
  const handleInputChange = useCallback((id, field, value) => {
    setExtractionData(prev =>
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  }, []);

  const handleAddRow = useCallback(() => {
    const newId = extractionData.length > 0
      ? Math.max(...extractionData.map(i => i.id)) + 1
      : 1;
    setExtractionData(prev => [...prev, {
      id: newId,
      materialName: '',
      qty: '',
      unit: 'kg',
      category: 'Concrete',
      unitPrice: 0,
      isAccurate: false,
      db_id: null,
    }]);
    setEditingRowId(newId);
  }, [extractionData]);

  const handleSaveRow = useCallback(async (id) => {
    setExtractionData(prev =>
      prev.map(item => item.id === id ? { ...item, isAccurate: true } : item)
    );
    setEditingRowId(null);

    // If row already in DB, update it
    const row = extractionData.find(item => item.id === id);
    if (row?.db_id) {
      const projectId = localStorage.getItem('envirosync.project_id');
      try {
        await fetch(`${API_URL}/api/projects/${projectId}/materials/${row.db_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materialName: row.materialName,
            qty: row.qty,
            unit: row.unit,
            category: row.category,
            isAccurate: true,
          }),
        });
      } catch (err) {
        console.error('Save edit to backend failed:', err);
      }
    }
  }, [extractionData]);

  const handleCancelEdit = useCallback(() => setEditingRowId(null), []);

  const handleDeleteRow = useCallback(async (id) => {
    const rowToDelete = extractionData.find(item => item.id === id);
    setExtractionData(prev => prev.filter(item => item.id !== id));
    if (editingRowId === id) setEditingRowId(null);

    if (rowToDelete?.db_id) {
      const projectId = localStorage.getItem('envirosync.project_id');
      try {
        await fetch(
          `${API_URL}/api/projects/${projectId}/materials/${rowToDelete.db_id}`,
          { method: 'DELETE' }
        );
      } catch (err) {
        console.error('Delete from backend failed:', err);
      }
    }
  }, [editingRowId, extractionData]);

  // ── 5. Save Draft ─────────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const projectId = localStorage.getItem('envirosync.project_id');

      await fetch(`${API_URL}/api/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          stage: 'categorization',
          file_name: uploadedDocuments[0]?.fileName || 'Categorization Draft',
          project_id: projectId || null,
          page_data: { materials: extractionData, currentPage, projectName },
        }),
      });
      navigate('/dashboard/drafts');
    } catch (err) {
      console.error('Save draft failed:', err);
      alert('Failed to save draft. Please try again.');
    }
  }, [uploadedDocuments, extractionData, currentPage, projectName, navigate]);

  // ── 6. Confirm Extraction → POST to backend → navigate to /calculation ────
  const handleConfirmExtraction = useCallback(async () => {
    if (!projectName.trim()) {
      setProjectNameError(true);
      document.getElementById('project-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('project-name')?.focus();
      return;
    }
    setProjectNameError(false);

    const projectId = localStorage.getItem('envirosync.project_id');
    const fileIds = uploadedDocuments.map(doc => doc.id);

    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, materials: extractionData, fileIds }),
      });

      if (!res.ok) throw new Error('Failed to save materials');

      const data = await res.json();
      console.log('Categorization saved:', data);

      // Clear categorization draft
      localStorage.removeItem('envirosync.categorization.draft.v1');

      navigate('/calculation', { state: { projectName, projectId } });
    } catch (err) {
      console.error('Confirm extraction failed:', err);
      alert('Failed to save. Please try again.');
    }
  }, [navigate, projectName, extractionData, uploadedDocuments]);

  // ── 7. Total weight calc ──────────────────────────────────────────────────
  const getTotalWeight = useCallback(() => {
    // density in t/m³ for volumetric materials
    const densityMap = {
      Glass: 2.5, Tiles: 2.0, Concrete: 2.4,
      Bricks: 1.8, Steel: 7.85, Wood: 0.7, Additives: 1.0, Other: 1.0
    };
    // rough avg weight per piece (tons) by category
    const pieceWeightMap = {
      Glass: 0.025, Tiles: 0.002, Concrete: 0.05,
      Bricks: 0.003, Steel: 0.015, Wood: 0.01, Additives: 0.001, Other: 0.005
    };
    // weight per m² (tons) by category
    const areaWeightMap = {
      Glass: 0.025, Tiles: 0.04, Concrete: 0.24,
      Bricks: 0.18, Steel: 0.04, Wood: 0.015, Additives: 0.01, Other: 0.02
    };
    return extractionData.reduce((total, item) => {
      const qty = parseFloat(item.qty) || 0;
      const cat = item.category || 'Other';
      switch (item.unit) {
        case 'kg':   return total + qty / 1000;
        case 't':    return total + qty;
        case 'm³':   return total + qty * (densityMap[cat] || 1.0);
        case 'm²':   return total + qty * (areaWeightMap[cat] || 0.02);
        case 'm':    return total + qty * (areaWeightMap[cat] || 0.01);
        case 'pcs':
        case 'units': return total + qty * (pieceWeightMap[cat] || 0.005);
        case 'bags':  return total + qty * 0.05; // ~50kg per bag
        default:      return total;
      }
    }, 0).toFixed(2);
  }, [extractionData]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="categorization-page">
      <PageLayout
        title="" subtitle=""
        showNavbar={false} showHeader={true} showFooter={true}
        maxWidth="1440px"
      >
        <ProgressStepper
          currentStage="categorization"
          completedStages={['upload']}
          onStageClick={(stageId) => { if (stageId === 'upload') navigate('/upload'); }}
        />

        <div className="categorization-content">
          <div className="content-header">
            <div className="header-text">
              <h1 className="page-title">OCR Review & Extraction</h1>
              <p className="page-subtitle">Verify the automatically extracted material data from your uploaded QTO.</p>
            </div>
            <button className="rescan-document-btn" onClick={handleRescan} disabled={isRescanning || isExtracting}>
              <RotateCw size={20} />
              {isRescanning ? 'Rescanning...' : 'Re-Scan Document'}
            </button>
            <button 
              className="go-back-upload-btn"
              onClick={() => navigate('/upload', { state: { fromCategorization: true } })}
              title="Go back to upload page to add more files"
            >
              <Upload size={20} /> Upload More Files
            </button>
          </div>

          <div className="content-grid">
            {/* ── Left: Document Viewer ── */}
            <div className="document-viewer-card">
              <div className="document-toolbar">
                <div className="toolbar-left">
                  <button className="toolbar-btn" onClick={() => setZoom(p => Math.max(50, p - 10))}><ZoomOut size={20} /></button>
                  <button className="toolbar-btn" onClick={() => setZoom(p => Math.min(200, p + 10))}><ZoomIn size={20} /></button>
                  <div className="toolbar-divider" />
                  <span className="page-info">Page {currentPage} of {totalPages}</span>
                </div>
                <div className="toolbar-right">
                  <button className="toolbar-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={20} /></button>
                  <button className="toolbar-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={20} /></button>
                </div>
              </div>
              <div className="document-preview" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
                {(() => {
                  const currentDoc = uploadedDocuments[currentPage - 1];
                  const fileName = currentDoc?.fileName || '';
                  const fileExt = fileName.lastIndexOf('.') !== -1
                    ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
                    : '';
                  const isSpreadsheet = ['csv', 'xlsx', 'xls'].includes(fileExt);

                  // Get preview info (url + contentType) for current doc
                  const previewInfo = currentDoc ? pdfUrls[currentDoc.id] : null;
                  const previewUrl = previewInfo?.url || null;
                  const contentType = previewInfo?.contentType || '';
                  const isImage = contentType.startsWith('image/');
                  const isActualPdf = contentType === 'application/pdf';

                  if (isExtracting) {
                    return (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', gap: '0.75rem' }}>
                        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#379C8A' }} />
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>Extracting materials from document...</p>
                      </div>
                    );
                  }

                  // For CSV / Excel files, show the spreadsheet data or loading state
                  if (isSpreadsheet) {
                    const sheetData = currentDoc ? spreadsheetData[currentDoc.id] : null;

                    if (isLoadingSpreadsheet && !sheetData) {
                      return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', gap: '0.75rem' }}>
                          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#379C8A' }} />
                          <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading spreadsheet data...</p>
                        </div>
                      );
                    }

                    if (sheetData && sheetData.rows && sheetData.rows.length > 0) {
                      return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'auto' }}>
                          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#0F172A', fontSize: '1rem', fontWeight: 600 }}>
                            {fileName}
                          </h3>
                          <div style={{ overflowX: 'auto', flex: 1 }}>
                            <table style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '0.875rem',
                              backgroundColor: 'white'
                            }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                  {sheetData.headers.map((header, idx) => (
                                    <th key={idx} style={{
                                      padding: '0.75rem',
                                      textAlign: 'left',
                                      fontWeight: 600,
                                      color: '#0f172a',
                                      whiteSpace: 'nowrap',
                                      borderRight: idx < sheetData.headers.length - 1 ? '1px solid #e2e8f0' : 'none'
                                    }}>
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sheetData.rows.map((row, rowIdx) => (
                                  <tr key={rowIdx} style={{
                                    borderBottom: '1px solid #e2e8f0',
                                    backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc'
                                  }}>
                                    {sheetData.headers.map((header, colIdx) => (
                                      <td key={colIdx} style={{
                                        padding: '0.75rem',
                                        color: '#475569',
                                        borderRight: colIdx < sheetData.headers.length - 1 ? '1px solid #e2e8f0' : 'none',
                                        maxWidth: '300px',
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word'
                                      }}>
                                        {String(row[header] || '')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                            Showing {sheetData.rows.length} row{sheetData.rows.length !== 1 ? 's' : ''} from "{fileName}"
                          </div>
                        </div>
                      );
                    }

                    // Fallback if spreadsheet data couldn't be loaded
                    return (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#64748B', padding: '2rem' }}>
                        <div style={{
                          width: 72, height: 72, borderRadius: '50%',
                          background: fileExt === 'csv' ? '#EDE9FE' : '#DCFCE7',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={fileExt === 'csv' ? '#7C3AED' : '#16A34A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="8" y1="13" x2="16" y2="13" />
                            <line x1="8" y1="17" x2="16" y2="17" />
                          </svg>
                        </div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem', color: '#1E293B' }}>
                          {fileName}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.5, maxWidth: 320 }}>
                          Unable to load spreadsheet data.
                          <br />
                          The extracted materials are shown on the right panel.
                        </p>
                      </div>
                    );
                  }

                  // If file content is actually an image (JPEG/PNG), show <img>
                  if (previewUrl && isImage) {
                    return (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '1rem' }}>
                        <img
                          src={previewUrl}
                          alt={fileName || 'Document Preview'}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            borderRadius: '4px',
                            transform: `scale(${zoom / 100})`,
                            transformOrigin: 'center center',
                          }}
                        />
                      </div>
                    );
                  }

                  // Render iframe only for actual PDF content
                  if (previewUrl && isActualPdf) {
                    return (
                      <iframe
                        src={previewUrl}
                        title={currentDoc?.fileName || 'PDF Preview'}
                        style={{
                          flex: 1,
                          width: '100%',
                          minHeight: '600px',
                          border: 'none',
                          borderRadius: '4px',
                          transform: `scale(${zoom / 100})`,
                          transformOrigin: 'top left',
                        }}
                      />
                    );
                  }

                  // If we have a URL but unknown type, try rendering as image first with fallback
                  if (previewUrl) {
                    return (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '1rem' }}>
                        <img
                          src={previewUrl}
                          alt={fileName || 'Document Preview'}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            borderRadius: '4px',
                            transform: `scale(${zoom / 100})`,
                            transformOrigin: 'center center',
                          }}
                          onError={(e) => {
                            // If image load fails, replace with fallback text
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div style="text-align:center;color:#94A3B8;font-size:0.875rem;padding:2rem">Document preview not available.<br/>Review extracted materials on the right.</div>';
                          }}
                        />
                      </div>
                    );
                  }

                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="invoice-preview">
                        <div className="invoice-header">
                          <div className="invoice-info">
                            <h3 className="invoice-company">
                              {currentDoc?.fileName || 'Document Preview'}
                            </h3>
                            <p className="invoice-number">Page {currentPage} of {totalPages}</p>
                          </div>
                        </div>
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>
                          Document preview not available. Review extracted materials on the right.
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ── Right: Smart Extraction Panel ── */}
            <div className="extraction-panel">
              <div className="extraction-header">
                <h2 className="extraction-title">
                  <Sparkles size={24} className="smart-icon" />
                  Smart Extraction
                </h2>
                <div className="header-actions">
                  <button className="add-row-btn" onClick={handleAddRow} disabled={isExtracting}>
                    <Plus size={20} /> Add Row
                  </button>
                </div>
              </div>

              {/* Project Name */}
              <div className="extraction-project">
                <label className="extraction-project-label" htmlFor="project-name">
                  Project Name
                  {projectNameError && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '8px', fontWeight: 400 }}>* Required</span>
                  )}
                </label>
                <input
                  id="project-name"
                  className="extraction-project-input"
                  type="text"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    if (e.target.value.trim()) setProjectNameError(false);
                  }}
                  placeholder="Enter project name"
                  style={projectNameError ? { border: '1.5px solid #ef4444', backgroundColor: '#fff5f5' } : {}}
                />
                {projectNameError && (
                  <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0' }}>
                    ⚠ Please enter a project name before confirming extraction.
                  </p>
                )}
              </div>

              {/* Column Headers */}
              <div className="extraction-grid-header">
                <div className="col-material">Material Name</div>
                <div className="col-qty">Qty</div>
                <div className="col-unit">Unit</div>
                <div className="col-category">Category</div>
                <div className="col-actions">Actions</div>
              </div>

              {/* ── Extraction Items ── */}
              <div className="extraction-items">

                {/* Loading state */}
                {isExtracting && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem', color: '#64748B' }}>
                    <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: '#379C8A' }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>Extracting materials with Gemini Vision...</p>
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>Processing {uploadedDocuments.length} file(s)</p>
                  </div>
                )}

                {/* Error state */}
                {!isExtracting && extractError && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#EF4444', background: '#FEF2F2', borderRadius: '0.5rem', margin: '1rem' }}>
                    <AlertCircle size={24} style={{ marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>{extractError}</p>
                    <button
                      onClick={() => window.location.reload()}
                      style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#EF4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Materials table */}
                {!isExtracting && !extractError && extractionData.map((row) => (
                  <div
                    key={row.id}
                    className={`extraction-item ${!row.isAccurate ? 'warning' : 'accurate'}`}
                  >
                    <div className="extraction-grid">
                      <div className="col-material">
                        {!row.isAccurate && <AlertCircle size={20} className="warning-icon" />}
                        {editingRowId === row.id ? (
                          <input type="text" className="item-input" value={row.materialName}
                            onChange={(e) => handleInputChange(row.id, 'materialName', e.target.value)}
                            placeholder="Enter material name" />
                        ) : (
                          <p className="item-text" title={row.materialName}>{row.materialName}</p>
                        )}
                      </div>
                      <div className="col-qty">
                        {editingRowId === row.id ? (
                          <input type="text" className="item-input" value={row.qty}
                            onChange={(e) => handleInputChange(row.id, 'qty', e.target.value)} placeholder="0" />
                        ) : (
                          <p className="item-text">{row.qty}</p>
                        )}
                      </div>
                      <div className="col-unit">
                        {editingRowId === row.id ? (
                          <select className="item-select" value={row.unit}
                            onChange={(e) => handleInputChange(row.id, 'unit', e.target.value)}>
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        ) : (
                          <p className="item-text">{row.unit}</p>
                        )}
                      </div>
                      <div className="col-category">
                        {editingRowId === row.id ? (
                          <select className="item-select" value={row.category}
                            onChange={(e) => handleInputChange(row.id, 'category', e.target.value)}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <p className="item-text">{row.category}</p>
                        )}
                      </div>
                      <div className="col-actions">
                        {editingRowId === row.id ? (
                          <>
                            <button className="action-btn save" onClick={() => handleSaveRow(row.id)} title="Save"><Save size={18} /></button>
                            <button className="action-btn cancel" onClick={handleCancelEdit} title="Cancel"><X size={18} /></button>
                          </>
                        ) : (
                          <>
                            <button className="action-btn edit" onClick={() => setEditingRowId(row.id)} title="Edit"><Edit size={20} /></button>
                            <button className="action-btn delete" onClick={() => handleDeleteRow(row.id)} title="Delete"><Trash2 size={20} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {!isExtracting && !extractError && extractionData.length === 0 && (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                    <p>No materials extracted yet.</p>
                    <p style={{ fontSize: '0.875rem' }}>Click "Re-Scan Document" or "Add Row" to begin.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="extraction-footer">
                <div className="summary-stats">
                  <div className="stat-item">
                    <p className="stat-label">TOTAL ITEMS</p>
                    <p className="stat-value">{String(extractionData.length).padStart(2, '0')}</p>
                  </div>
                  <div className="stat-item">
                    <p className="stat-label">EST. TOTAL WEIGHT</p>
                    <p className="stat-value">~{getTotalWeight()} Tons</p>
                  </div>
                </div>
                <div className="action-buttons">
                  <button className="save-draft-btn" onClick={handleSaveDraft}>
                    <Save size={16} /> Save Draft
                  </button>
                  <button className="confirm-btn" onClick={handleConfirmExtraction} disabled={isExtracting}>
                    Confirm Extraction <Check size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  );
};

export default CategorizationPage;
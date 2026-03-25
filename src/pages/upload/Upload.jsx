import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import ProgressStepper from '../../components/common/ProgressStepper';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './Upload.css';

import { UploadCloud, ChevronRight, Trash2, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { API_BASE } from '../../lib/api';


const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTS = ['pdf', 'xlsx', 'xls', 'csv'];

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let idx = 0;
    let value = bytes;
    while (value >= 1024 && idx < units.length - 1) {
        value /= 1024;
        idx += 1;
    }
    const digits = idx === 0 ? 0 : 1;
    return `${value.toFixed(digits)} ${units[idx]}`;
}

function getFileExt(name) {
    const lastDot = name.lastIndexOf('.');
    return lastDot === -1 ? '' : name.slice(lastDot + 1).toLowerCase();
}

function isAcceptedFile(file) {
    const ext = getFileExt(file.name || '');
    return ACCEPTED_EXTS.includes(ext);
}

function makeFileKey(file) {
    return `${file.name}::${file.size}::${file.lastModified}`;
}

function nowIso() {
    return new Date().toISOString();
}

function timeAgoShort(iso) {
    const t = new Date(iso).getTime();
    const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (diffSec < 60) return `Added ${diffSec} sec${diffSec === 1 ? '' : 's'} ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Added ${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `Added ${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `Added ${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

// ── UUID validator ──────────────────────────────────────────────────────────
function isValidUUID(id) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(id));
}
// ───────────────────────────────────────────────────────────────────────────

// Custom File Icons
const PdfIcon = memo(function PdfIcon() {
    return (
        <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 1H4C2.9 1 2 1.9 2 3V25C2 26.1 2.9 27 4 27H20C21.1 27 22 26.1 22 25V8L14 1Z" fill="#2563EB" />
            <path d="M14 1V8H22" fill="#1D4ED8" />
            <path d="M7 14H9V20H7V14Z" fill="white" />
            <path d="M11 14H13C14.1 14 15 14.9 15 16V18C15 19.1 14.1 20 13 20H11V14ZM13 18V16H11V18H13Z" fill="white" />
            <path d="M16 14H18L19 20H17L16.5 17.5L16 20H14L16 14Z" fill="white" />
        </svg>
    );
});

const XlsxIcon = memo(function XlsxIcon() {
    return (
        <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 1H4C2.9 1 2 1.9 2 3V25C2 26.1 2.9 27 4 27H20C21.1 27 22 26.1 22 25V8L14 1Z" fill="#16A34A" />
            <path d="M14 1V8H22" fill="#15803D" />
            <path d="M7 12L10 16L7 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 12L17 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 12L11 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
});

const CsvIcon = memo(function CsvIcon() {
    return (
        <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 1H4C2.9 1 2 1.9 2 3V25C2 26.1 2.9 27 4 27H20C21.1 27 22 26.1 22 25V8L14 1Z" fill="#8B5CF6" />
            <path d="M14 1V8H22" fill="#7C3AED" />
            <path d="M7 14C7 13.4 7.4 13 8 13H9C9.6 13 10 13.4 10 14V14.5H8V14H7Z" fill="white" />
            <path d="M11 14C11 13.4 11.4 13 12 13H13C13.6 13 14 13.4 14 14V14.5H12V14H11Z" fill="white" />
            <path d="M15 14C15 13.4 15.4 13 16 13H17C17.6 13 18 13.4 18 14V14.5H16V14H15Z" fill="white" />
            <path d="M6 17H18V18H6V17Z" fill="white" />
            <path d="M6 19H18V20H6V19Z" fill="white" />
        </svg>
    );
});

const FileRow = memo(function FileRow({ item, onRemove }) {
    const ext = getFileExt(item.name);
    let fileIconComponent;
    let fileIconClass;

    if (ext === 'pdf') {
        fileIconComponent = <PdfIcon />;
        fileIconClass = 'qto-file-icon--pdf';
    } else if (ext === 'xlsx' || ext === 'xls') {
        fileIconComponent = <XlsxIcon />;
        fileIconClass = 'qto-file-icon--xlsx';
    } else if (ext === 'csv') {
        fileIconComponent = <CsvIcon />;
        fileIconClass = 'qto-file-icon--csv';
    } else {
        fileIconComponent = <PdfIcon />;
        fileIconClass = 'qto-file-icon--default';
    }

    return (
        <tr className="qto-table-row">
            <td className="qto-table-cell">
                <div className="qto-file-info">
                    <span className={`qto-file-icon ${fileIconClass}`}>
                        {fileIconComponent}
                    </span>
                    <div className="qto-file-meta">
                        <span className="qto-file-name">{item.name}</span>
                        <span className="qto-file-date">{timeAgoShort(item.addedAt)}</span>
                    </div>
                </div>
            </td>
            <td className="qto-table-cell qto-table-cell--muted">{formatBytes(item.size)}</td>
            <td className="qto-table-cell">
                <span className="qto-status-badge">
                    {item.status}
                </span>
            </td>
            <td className="qto-table-cell qto-table-cell--action">
                <div className="qto-action-buttons">
                    <button
                        type="button"
                        className="qto-action-btn"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => onRemove(item.id)}
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </td>
        </tr>
    );
});

function Upload() {
    const navigate = useNavigate();
    const location = useLocation();

    const [files, setFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState('');
    const [isProcessingAll, setIsProcessingAll] = useState(false);
    const [isFromCategorization, setIsFromCategorization] = useState(false);
    const fileInputRef = useRef(null);
    const draftSaveTimerRef = useRef(null);

    const fileCount = useMemo(() => files.length, [files.length]);
    const readyFilesCount = useMemo(() => files.filter(f => f.status === 'Ready for OCR').length, [files]);
    const processingFilesCount = useMemo(() => files.filter(f => f.status === 'Processing...').length, [files]);
    const completedFilesCount = useMemo(() => files.filter(f => f.status === 'Completed').length, [files]);

    useEffect(() => {
        document.title = 'EnviroSync - QTO Upload';
    }, []);

    // Load files from localStorage (especially when coming from categorization)
    useEffect(() => {
        setIsFromCategorization(location.state?.fromCategorization === true);
        
        // First check if coming from draft route
        if (location.state?.fromDraft && location.state?.draftData) {
            const { files: savedFiles } = location.state.draftData;
            if (Array.isArray(savedFiles) && savedFiles.length > 0) {
                setFiles(savedFiles.map(f => ({
                    id: f.id,
                    key: f.id,
                    name: f.name,
                    size: f.size,
                    addedAt: f.addedAt,
                    status: f.status,
                    _file: undefined,
                })));
                return;
            }
        }

        // Otherwise, load from localStorage (e.g., when coming back from categorization)
        try {
            const uploadDraft = localStorage.getItem('envirosync.upload.draft.v1');
            if (uploadDraft) {
                const parsed = JSON.parse(uploadDraft);
                if (parsed?.files && Array.isArray(parsed.files) && parsed.files.length > 0) {
                    setFiles(parsed.files.map(f => ({
                        id: f.id,
                        key: f.key || f.id,
                        name: f.name,
                        size: f.size,
                        addedAt: f.addedAt,
                        status: f.status,
                        _file: undefined,
                    })));
                }
            }
        } catch (err) {
            console.warn('Failed to load upload draft from localStorage:', err);
        }
    }, [location.state]);

    // Debounced autosave
    useEffect(() => {
        if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = setTimeout(() => {
            try {
                const payload = {
                    files: files.map((f) => ({
                        id: f.id,
                        name: f.name,
                        size: f.size,
                        addedAt: f.addedAt,
                        status: f.status,
                        key: f.key,
                    })),
                    savedAt: nowIso(),
                };
                localStorage.setItem('envirosync.upload.draft.v1', JSON.stringify(payload));
            } catch {
                // ignore storage failures
            }
        }, 250);

        return () => {
            if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
        };
    }, [files]);

    // Upload newly added files to backend
    const uploadToServer = useCallback(async (items) => {
        if (!items || items.length === 0) {
            console.log('uploadToServer called with no items');
            return;
        }
        try {
            console.log('uploadToServer called with', items.length, 'items');
            const form = new FormData();
            let appendedCount = 0;
            for (const it of items) {
                console.log('Processing item:', it.name, 'has _file:', !!it._file);
                if (it._file) {
                    form.append('files', it._file);
                    appendedCount++;
                }
            }
            console.log('Appended', appendedCount, 'files to FormData');

            if (appendedCount === 0) {
                console.warn('No files to upload - all items missing _file property');
                return [];
            }

            // ── Add user_id from Supabase session ──
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                form.append('user_id', session.user.id);
            }

            const resp = await fetch(`${API_BASE}/api/upload/`, {
                method: 'POST',
                body: form,
            });

            if (!resp.ok) {
                const body = await resp.json().catch(() => null);
                setError((body && body.detail) || `Upload failed (${resp.status})`);
                return;
            }

            const data = await resp.json();
            const returned = Array.isArray(data?.uploaded_files) ? data.uploaded_files : [];

            // ── SAVE project_id to localStorage so Fira's categorization can use it ──
            if (data?.project_id) {
                try {
                    localStorage.setItem('envirosync.project_id', data.project_id);
                    console.log('Saved project_id to localStorage:', data.project_id);
                } catch {
                    // ignore storage failures
                }
            }
            // ─────────────────────────────────────────────────────────────────────────

            // Map returned metadata to local items by name+size
            setFiles((prev) => {
                const copy = prev.map((f) => {
                    const match = returned.find(
                        (r) => r.file_name === f.name && Number(r.file_size) === Number(f.size)
                    );
                    if (match) {
                        return {
                            ...f,
                            id: match.file_id,   // ← NOW A REAL UUID FROM SUPABASE
                            status: 'Queued',
                            _file: undefined,
                        };
                    }
                    return f;
                });
                return copy;
            });

            return returned; // ← return uploaded file info for callers
        } catch (err) {
            console.error('Upload error:', err);
            setError(String(err?.message || err));
            return [];
        }
    }, []);

    const addIncomingFiles = useCallback((incoming) => {
        try {
            if (!incoming?.length) return;

            const nextItems = [];
            const errors = [];

            for (const file of incoming) {
                if (!file) continue;

                if (!isAcceptedFile(file)) {
                    errors.push(`"${file.name}" is not supported. Supported formats: PDF, XLS, XLSX, CSV.`);
                    continue;
                }

                if (file.size > MAX_FILE_BYTES) {
                    errors.push(`"${file.name}" exceeds 10MB.`);
                    continue;
                }

                const key = makeFileKey(file);
                nextItems.push({
                    id: `${key}::${crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
                    key,
                    name: file.name,
                    size: file.size,
                    addedAt: nowIso(),
                    status: 'Ready for OCR',
                    _file: file,
                });
            }

            setError(errors[0] || '');
            setFiles((prev) => {
                const seen = new Set(prev.map((p) => p.key));
                const deduped = nextItems.filter((n) => !seen.has(n.key));
                return [...deduped, ...prev];
            });
            // Fire-and-forget upload to backend for new items
            if (nextItems.length > 0) {
                uploadToServer(nextItems);
            }
        } catch (err) {
            console.error('Error adding files:', err);
            setError(String(err?.message || err));
        }
    }, [uploadToServer]);

    const handleBrowse = useCallback(() => {
        setError('');
        fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback(
        (e) => {
            const list = Array.from(e.target.files || []);
            addIncomingFiles(list);
            e.target.value = '';
        },
        [addIncomingFiles]
    );

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            setIsDragOver(false);
            const list = Array.from(e.dataTransfer?.files || []);
            addIncomingFiles(list);
        },
        [addIncomingFiles]
    );

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleClear = useCallback(() => {
        setFiles([]);
        setError('');
        try {
            localStorage.removeItem('envirosync.upload.draft.v1');
        } catch {
            // ignore
        }
    }, []);

    const handleRemove = useCallback((id) => {
        const target = files.find(f => f.id === id);
        if (!target) {
            setFiles((prev) => prev.filter((f) => f.id !== id));
            return;
        }

        // Only attempt server delete if ID is a valid UUID
        if (isValidUUID(String(target.id))) {
            (async () => {
                try {
                    const resp = await fetch(`${API_BASE}/api/upload/${target.id}`, { method: 'DELETE' });
                    if (!resp.ok) {
                        const body = await resp.json().catch(() => null);
                        setError((body && body.detail) || `Delete failed (${resp.status})`);
                        return;
                    }
                    setFiles((prev) => prev.filter((f) => f.id !== id));
                } catch (err) {
                    setError(String(err?.message || err));
                }
            })();
        } else {
            // Local file only, just remove from state
            setFiles((prev) => prev.filter((f) => f.id !== id));
        }
    }, [files]);

    const handleProcessAll = useCallback(() => {
        const readyFiles = files.filter(f => f.status === 'Ready for OCR' || f.status === 'Queued');
        if (readyFiles.length === 0) return;

        setIsProcessingAll(true);
        setFiles((prev) => prev.map((f) => (
            f.status === 'Ready for OCR' || f.status === 'Queued' ? { ...f, status: 'Processing...' } : f
        )));

        (async () => {
            try {
                const resp = await fetch(`${API_BASE}/api/upload/process`, { method: 'POST' });
                if (!resp.ok) {
                    const body = await resp.json().catch(() => null);
                    setError((body && body.detail) || `Processing failed (${resp.status})`);
                    setIsProcessingAll(false);
                    setFiles((prev) => prev.map((f) => (
                        f.status === 'Processing...' ? { ...f, status: 'Ready for OCR' } : f
                    )));
                    return;
                }
                const data = await resp.json();
                const processedIds = (data?.details || []).map(d => d.file_id);
                setFiles((prev) => prev.map((f) => processedIds.includes(f.id) ? { ...f, status: 'Completed' } : f));
                setIsProcessingAll(false);
            } catch (err) {
                setError(String(err?.message || err));
                setIsProcessingAll(false);
                setFiles((prev) => prev.map((f) => (
                    f.status === 'Processing...' ? { ...f, status: 'Ready for OCR' } : f
                )));
            }
        })();
    }, [files]);

    const handleSaveDraft = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) {
                setError('Please log in before saving a draft.');
                return;
            }
            const projectId = localStorage.getItem('envirosync.project_id');

            const resp = await fetch(`${API_BASE}/api/drafts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    stage: 'upload',
                    file_name: files[0]?.name || 'Upload Draft',
                    project_id: projectId || null,
                    page_data: {
                        files: files.map((f) => ({
                            id: f.id,
                            name: f.name,
                            size: f.size,
                            status: f.status,
                            addedAt: f.addedAt,
                        })),
                    },
                }),
            });

            if (!resp.ok) {
                const body = await resp.json().catch(() => null);
                throw new Error((body && body.detail) || `Failed to save draft (${resp.status})`);
            }

            navigate('/dashboard/drafts');
        } catch (err) {
            console.error('Save draft failed:', err);
            setError(err?.message || 'Failed to save draft. Please try again.');
        }
    }, [files, navigate]);

    const handleContinue = useCallback(async () => {
        if (files.length === 0) return;

        // Upload any files that still need uploading
        const pendingFiles = files.filter(f => f._file);
        let newlyUploaded = [];
        if (pendingFiles.length > 0) {
            newlyUploaded = (await uploadToServer(pendingFiles)) || [];
        }

        // Collect valid UUIDs from already-uploaded files + freshly-uploaded files
        const existingUUIDs = files
            .filter(f => isValidUUID(String(f.id)))
            .map(f => f.id);
        const freshUUIDs = newlyUploaded
            .map(r => r.file_id)
            .filter(id => isValidUUID(String(id)));
        const validUUIDs = [...new Set([...existingUUIDs, ...freshUUIDs])];

        if (validUUIDs.length === 0) {
            setError('Files are still uploading to server. Please wait a moment and try again.');
            return;
        }

        try {
            const resp = await fetch(`${API_BASE}/api/upload/continue-categorization`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_ids: validUUIDs }),
            });

            if (!resp.ok) {
                const body = await resp.json().catch(() => null);
                setError((body && body.detail) || `Categorization preparation failed (${resp.status})`);
                return;
            }

            const data = await resp.json();

            // ── SAVE project_id from continue-categorization response too ──
            if (data?.project_id) {
                try {
                    localStorage.setItem('envirosync.project_id', data.project_id);
                    console.log('Confirmed project_id:', data.project_id);
                } catch {
                    // ignore
                }
            }
            // ─────────────────────────────────────────────────────────────

            // Navigate to categorization
            navigate('/categorization');
        } catch (err) {
            setError(String(err?.message || err));
        }
    }, [files, navigate, uploadToServer]);

    return (
        <div className="qto-upload-page">
            <Header />
            <main className="qto-upload-main">
                <div className="qto-upload-container">
                    {/* Progress Stepper */}
                    <ProgressStepper
                        currentStage="upload"
                        completedStages={[]}
                        onStageClick={(stageId) => {
                            console.log('Stage clicked:', stageId);
                        }}
                    />

                    <h1 className="qto-heading">QTO Upload</h1>
                    <div className="qto-description-section">
                        <p className="qto-description">
                            Upload your QTO to begin the environmental impact analysis and extraction process.
                            <br />
                            We&apos;ll automatically process the data for your project reports.
                        </p>
                    </div>

                    <div
                        className={`qto-dropzone ${isDragOver ? 'qto-dropzone--drag-over' : ''}`}
                        onClick={handleBrowse}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <UploadCloud size={62} className="qto-upload-icon" />
                        <h3 className="qto-dropzone-title">Drag and drop QTOs</h3>
                        <p className="qto-dropzone-text">
                            Support for PDF, XLSX and CSV formats.
                            <br />
                            Max file size: 10MB.
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.xlsx,.xls,.csv"
                            multiple
                            hidden
                            onChange={handleFileInputChange}
                        />
                        <button
                            type="button"
                            className="qto-browse-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBrowse();
                            }}
                        >
                            Browse Files
                        </button>
                        {error && error !== 'Draft saved.' && (
                            <p className="qto-error-text">{error}</p>
                        )}
                    </div>

                    <div className="qto-table-card">
                        <div className="qto-table-header">
                            <h2 className="qto-table-title">
                                Upload Queue
                                {fileCount > 0 && (
                                    <span className="qto-queue-summary">
                                        {readyFilesCount > 0 && <span className="qto-queue-stat qto-queue-stat--ready">{readyFilesCount} ready</span>}
                                        {processingFilesCount > 0 && <span className="qto-queue-stat qto-queue-stat--processing">{processingFilesCount} processing</span>}
                                        {completedFilesCount > 0 && <span className="qto-queue-stat qto-queue-stat--completed">{completedFilesCount} completed</span>}
                                    </span>
                                )}
                            </h2>
                            <div className="qto-table-header-right">
                                <span className="qto-file-count">{fileCount}</span>
                                <button
                                    type="button"
                                    className="qto-clear-btn"
                                    onClick={handleClear}
                                    disabled={files.length === 0 || processingFilesCount > 0}
                                >
                                    Clear Queue
                                </button>
                            </div>
                        </div>

                        <div className="qto-table-wrapper">
                            <table className="qto-table">
                                <thead>
                                    <tr>
                                        <th className="qto-table-header-cell">File Name</th>
                                        <th className="qto-table-header-cell">Size</th>
                                        <th className="qto-table-header-cell">Status</th>
                                        <th className="qto-table-header-cell qto-table-header-cell--action">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {files.length > 0 ? (
                                        files.map((item) => (
                                            <FileRow
                                                key={item.id}
                                                item={item}
                                                onRemove={handleRemove}
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="qto-table-empty">
                                                No files in queue. Upload files to begin processing.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Info banner when coming from categorization */}
                    {isFromCategorization && (
                        <div style={{
                            margin: '1.5rem 0',
                            padding: '1rem',
                            backgroundColor: '#E0F7F4',
                            border: '1px solid #379C8A',
                            borderRadius: '0.5rem',
                            color: '#0f5a54',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem'
                        }}>
                            <span>📌 Add more files here and they'll be merged with your existing extraction data.</span>
                            <button
                                type="button"
                                onClick={() => navigate('/categorization')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#379C8A',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    fontSize: '0.875rem',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Back to Categorization
                            </button>
                        </div>
                    )}

                    <div className="qto-confirmation-bar">
                        <p className="qto-auto-save-text">All changes are saved automatically</p>
                        <div className="qto-confirmation-buttons">
                            <button type="button" className="qto-save-draft-btn" onClick={handleSaveDraft}>
                                Save Draft
                            </button>
                            {isFromCategorization ? (
                                <button
                                    type="button"
                                    className="qto-continue-btn"
                                    onClick={() => navigate('/categorization')}
                                >
                                    Back to Categorization
                                    <ChevronRight size={18} className="qto-chevron-icon" style={{ transform: 'rotate(180deg)' }} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="qto-continue-btn"
                                    onClick={handleContinue}
                                    disabled={files.length === 0 || processingFilesCount > 0}
                                >
                                    Continue to Categorization
                                    <ChevronRight size={18} className="qto-chevron-icon" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default Upload;
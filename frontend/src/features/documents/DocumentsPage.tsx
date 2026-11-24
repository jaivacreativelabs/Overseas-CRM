import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  FileX,
  ExternalLink,
  Search,
  Download,
  Check,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Clock,
  RefreshCw,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { StudentAvatar } from '../../components/StudentAvatar';
import { DocumentStatus } from '../../types';
import { timeAgo } from '../../utils/timeAgo';

/**
 * The four states a reviewer cares about. The backend stores more raw values (PENDING with or
 * without a file, REQUESTED, APPROVED/SUCCESSFUL, REJECTED/FAILED); this folds them together.
 */
type ReviewState = 'pending' | 'rejected' | 'awaiting' | 'approved';
type Tab = ReviewState | 'all';

const getReviewState = (d: any): ReviewState => {
  const s = d.status as string;
  if (s === DocumentStatus.APPROVED || s === 'SUCCESSFUL') return 'approved';
  if (s === DocumentStatus.REJECTED || s === 'FAILED') return 'rejected';
  // Requested documents are stored as PENDING (or REQUESTED) until a file arrives.
  return d.fileUrl ? 'pending' : 'awaiting';
};

const STATE_INFO: Record<ReviewState, { text: string; dot: string; pill: React.CSSProperties; icon: React.ReactNode }> = {
  pending: {
    text: 'Waiting for review',
    dot: '#D97706',
    pill: { color: '#92400E', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' },
    icon: <Clock size={12} aria-hidden="true" />,
  },
  rejected: {
    text: 'Re-upload requested',
    dot: '#DC2626',
    pill: { color: '#991B1B', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' },
    icon: <RefreshCw size={12} aria-hidden="true" />,
  },
  awaiting: {
    text: 'Not uploaded yet',
    dot: '#9CA3AF',
    pill: { color: '#374151', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB' },
    icon: <Upload size={12} aria-hidden="true" />,
  },
  approved: {
    text: 'Approved',
    dot: '#059669',
    pill: { color: '#065F46', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' },
    icon: <CheckCircle2 size={12} aria-hidden="true" />,
  },
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'To review' },
  { key: 'rejected', label: 'Re-upload requested' },
  { key: 'awaiting', label: 'Not uploaded' },
  { key: 'approved', label: 'Approved' },
  { key: 'all', label: 'All' },
];

const REUPLOAD_REASONS = ['Blurry', 'Cut off', 'Wrong document', 'Expired', 'Missing pages'];

const APPROVAL_CHECKS = ['Name matches the student profile', 'Every page is readable', 'Not expired'];

const MISSING_FILE_REASON = "We couldn't open the file you uploaded. Please upload it again.";

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

const getPreviewKind = (doc: any): 'image' | 'pdf' | 'other' => {
  const name = String(doc?.originalFileName || doc?.fileUrl || '').toLowerCase().split('?')[0];
  const ext = name.includes('.') ? name.split('.').pop() || '' : '';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'other';
};

const toTitle = (s?: string) =>
  (s || 'General')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso)
        .toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
        .replace(/\b(am|pm)\b/, (m) => m.toUpperCase())
    : '';

const fileNameOf = (doc: any) => doc?.originalFileName || String(doc?.fileUrl || '').split('/').pop()?.split('?')[0] || 'Uploaded file';

type FileCheck = 'checking' | 'ok' | 'missing';

/**
 * Asks the server whether a stored file is still there before we try to show it, so a missing file
 * gets a clear message instead of the server's raw "Route not found" JSON inside the preview.
 * Anything other than a definite "not found" (e.g. a cross-origin URL we can't check) counts as ok.
 */
const useFileCheck = (fileUrl?: string, retry = 0): FileCheck => {
  const [result, setResult] = useState<FileCheck>('checking');
  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    setResult('checking');
    fetch(fileUrl, { method: 'HEAD', credentials: 'same-origin', cache: 'no-store' })
      .then((res) => {
        if (cancelled) return;
        const type = res.headers.get('content-type') || '';
        const missing = res.status === 404 || res.status === 410 || (res.ok && type.includes('application/json'));
        setResult(missing ? 'missing' : 'ok');
      })
      .catch(() => {
        if (!cancelled) setResult('ok');
      });
    return () => {
      cancelled = true;
    };
  }, [fileUrl, retry]);
  return result;
};

const StatusDot: React.FC<{ state: ReviewState }> = ({ state }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#4B5563', whiteSpace: 'nowrap' }}>
    <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, backgroundColor: STATE_INFO[state].dot }} />
    {STATE_INFO[state].text}
  </span>
);

const StatusPill: React.FC<{ state: ReviewState }> = ({ state }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12.5px',
      fontWeight: 600,
      borderRadius: '999px',
      padding: '2px 10px',
      ...STATE_INFO[state].pill,
    }}
  >
    {STATE_INFO[state].icon}
    {STATE_INFO[state].text}
  </span>
);

const Chip: React.FC<{ children: React.ReactNode; tone?: 'neutral' | 'required' }> = ({ children, tone = 'neutral' }) => (
  <span
    style={{
      fontSize: '12.5px',
      fontWeight: tone === 'required' ? 600 : 500,
      color: tone === 'required' ? '#9F1239' : '#374151',
      backgroundColor: tone === 'required' ? '#FFF1F2' : '#F3F4F6',
      borderRadius: '999px',
      padding: '2px 10px',
    }}
  >
    {children}
  </span>
);

const iconBtn: React.CSSProperties = {
  width: '36px',
  height: '36px',
  border: 'none',
  borderRadius: '6px',
  background: 'transparent',
  color: '#374151',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const toolbarLink: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--primary)',
  padding: '8px 10px',
  textDecoration: 'none',
};

/** The file itself: images (zoom/rotate) and PDFs inline, anything else as a placeholder. */
const FileView: React.FC<{ doc: any; zoom: number; rotation: number; height: string }> = ({ doc, zoom, rotation, height }) => {
  const kind = getPreviewKind(doc);
  const name = fileNameOf(doc);
  if (kind === 'pdf') {
    return <iframe src={doc.fileUrl} title={name} style={{ width: '100%', height, border: 'none', backgroundColor: '#FFFFFF', display: 'block' }} />;
  }
  if (kind === 'image') {
    return (
      <div style={{ height, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box' }}>
        <img
          src={doc.fileUrl}
          alt={name}
          style={{
            maxWidth: zoom === 1 ? '100%' : 'none',
            maxHeight: zoom === 1 ? '100%' : 'none',
            width: zoom === 1 ? 'auto' : `${zoom * 100}%`,
            objectFit: 'contain',
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.15s ease',
            boxShadow: '0 1px 2px rgba(15,23,42,0.08), 0 8px 24px rgba(15,23,42,0.08)',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>
    );
  }
  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#4B5563', fontSize: '13px', padding: '16px', textAlign: 'center' }}>
      <FileText size={30} style={{ color: '#6B7280' }} aria-hidden="true" />
      <div>This file type can't be previewed here. Download it to check.</div>
    </div>
  );
};

export const DocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 'changing' re-opens the decision on a document that was already reviewed.
  const [panelMode, setPanelMode] = useState<'idle' | 'changing'>('idle');
  const [reasons, setReasons] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [checks, setChecks] = useState<boolean[]>(APPROVAL_CHECKS.map(() => false));
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fileRetry, setFileRetry] = useState(0);

  const noteRef = useRef<HTMLTextAreaElement>(null);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchDocs = useCallback(async () => {
    try {
      const res = await apiClient.get<any[]>('/documents');
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      error(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: docs.length, pending: 0, rejected: 0, awaiting: 0, approved: 0 };
    docs.forEach((d) => {
      c[getReviewState(d)] += 1;
    });
    return c;
  }, [docs]);

  /** Visible documents grouped by student; the review queue is oldest upload first. */
  const groups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = docs.filter((d) => {
      if (tab !== 'all' && getReviewState(d) !== tab) return false;
      if (!q) return true;
      return [d.studentName, d.title, d.category, d.studentCode].some((v) => String(v || '').toLowerCase().includes(q));
    });
    if (tab === 'pending') {
      filtered.sort((a, b) => new Date(a.uploadedAt || a.updatedAt).getTime() - new Date(b.uploadedAt || b.updatedAt).getTime());
    }
    const byStudent = new Map<string, { key: string; name: string; leadId?: string; docs: any[] }>();
    filtered.forEach((d) => {
      const key = d.leadId || d.studentId || d.studentName || 'unknown';
      if (!byStudent.has(key)) byStudent.set(key, { key, name: d.studentName || 'Unknown Student', leadId: d.leadId, docs: [] });
      byStudent.get(key)!.docs.push(d);
    });
    return Array.from(byStudent.values());
  }, [docs, tab, searchQuery]);

  const flatDocs = useMemo(() => groups.flatMap((g) => g.docs), [groups]);

  // Keep the chosen document selected while it is in view; otherwise fall to the first one.
  const selected = flatDocs.find((d) => d._id === selectedId) || flatDocs[0] || null;
  const selectedIndex = selected ? flatDocs.findIndex((d) => d._id === selected._id) : -1;
  const selectedState = selected ? getReviewState(selected) : null;
  const fileCheck = useFileCheck(selected?.fileUrl, fileRetry);
  const fileMissing = !!selected?.fileUrl && fileCheck === 'missing';
  const previewKind = selected ? getPreviewKind(selected) : 'other';

  useEffect(() => {
    setPanelMode('idle');
    setReasons([]);
    setNote('');
    setChecks(APPROVAL_CHECKS.map(() => false));
    setZoom(1);
    setRotation(0);
  }, [selected?._id]);

  const goTo = useCallback(
    (offset: number) => {
      if (selectedIndex < 0) return;
      const next = flatDocs[selectedIndex + offset];
      if (next) setSelectedId(next._id);
    },
    [flatDocs, selectedIndex]
  );

  const showDecision = selectedState === 'pending' || panelMode === 'changing';
  const rejectionText = [reasons.join(', '), note.trim()].filter(Boolean).join(' – ');

  const submitReview = useCallback(
    async (status: DocumentStatus.APPROVED | DocumentStatus.REJECTED, reasonOverride?: string) => {
      if (!selected || submitting) return;
      const reason = reasonOverride ?? rejectionText;
      if (status === DocumentStatus.REJECTED && !reason) {
        error('Pick a reason or add a note so the student knows what to fix.');
        noteRef.current?.focus();
        return;
      }
      // After a decision, move on to the next document in the list (or the previous one at the end).
      const nextDoc = flatDocs[selectedIndex + 1] || flatDocs[selectedIndex - 1] || null;
      setSubmitting(status === DocumentStatus.APPROVED ? 'approve' : 'reject');
      try {
        await apiClient.put(`/documents/${selected._id}/review`, {
          status,
          rejectionReason: status === DocumentStatus.REJECTED ? reason : undefined,
        });
        success(
          status === DocumentStatus.APPROVED
            ? `Approved ${selected.title} for ${selected.studentName || 'the student'}.`
            : `Asked ${selected.studentName || 'the student'} to re-upload ${selected.title}.`
        );
        if (nextDoc) setSelectedId(nextDoc._id);
        await fetchDocs();
      } catch (err: any) {
        error(err.message || 'Review failed');
      } finally {
        setSubmitting(null);
      }
    },
    [selected, submitting, rejectionText, flatDocs, selectedIndex, success, error, fetchDocs]
  );

  const canApprove = showDecision && !!selected?.fileUrl && !fileMissing && fileCheck !== 'checking';

  // Keyboard: J / K move through the list, A approves, R jumps to the re-upload note.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (previewDoc) return;
      const key = e.key.toLowerCase();
      if (key === 'j') {
        e.preventDefault();
        goTo(1);
      } else if (key === 'k') {
        e.preventDefault();
        goTo(-1);
      } else if (key === 'a' && canApprove) {
        e.preventDefault();
        submitReview(DocumentStatus.APPROVED);
      } else if (key === 'r' && showDecision) {
        e.preventDefault();
        noteRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, canApprove, showDecision, submitReview, previewDoc]);

  /** What has happened to the selected document, newest first, from the fields the record keeps. */
  const history = useMemo(() => {
    if (!selected) return [];
    const items: { at: string; dot: string; text: React.ReactNode }[] = [];
    if (selected.createdAt) {
      items.push({
        at: selected.createdAt,
        dot: '#9CA3AF',
        text: <>Requested{selected.requestedByName ? ` by ${selected.requestedByName}` : ''}</>,
      });
    }
    if (selected.fileUrl && selected.uploadedAt) {
      items.push({
        at: selected.uploadedAt,
        dot: '#D97706',
        text: (
          <>
            <strong style={{ color: '#111827', fontWeight: 600 }}>{fileNameOf(selected)}</strong> uploaded
            {selected.studentName ? ` by ${selected.studentName}` : ''}
          </>
        ),
      });
    }
    if (selected.reviewedAt) {
      const st = getReviewState(selected);
      const reviewedBeforeUpload = selected.uploadedAt && new Date(selected.reviewedAt) < new Date(selected.uploadedAt);
      items.push({
        at: selected.reviewedAt,
        dot: st === 'approved' && !reviewedBeforeUpload ? '#059669' : '#DC2626',
        text:
          st === 'approved' && !reviewedBeforeUpload ? (
            <>Approved{selected.reviewedByName ? ` by ${selected.reviewedByName}` : ''}</>
          ) : st === 'rejected' ? (
            <>
              Re-upload requested{selected.reviewedByName ? ` by ${selected.reviewedByName}` : ''}
              {selected.rejectionReason ? ` · “${selected.rejectionReason}”` : ''}
            </>
          ) : (
            <>Reviewed{selected.reviewedByName ? ` by ${selected.reviewedByName}` : ''}; the student has uploaded a new file since</>
          ),
      });
    }
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [selected]);

  const queueLabel =
    tab === 'pending' ? `${flatDocs.length} waiting · oldest first` : `${flatDocs.length} document${flatDocs.length === 1 ? '' : 's'}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Documents</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Review student uploads one at a time. Approve, or ask for a re-upload with a reason.
          </p>
        </div>
        <label style={{ position: 'relative', width: '300px', maxWidth: '100%', display: 'flex' }}>
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search documents</span>
          <Search
            size={15}
            aria-hidden="true"
            style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="search"
            placeholder="Search student or document"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '40px',
              padding: '0 12px 0 34px',
              fontSize: '13.5px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'var(--bg-surface, #FFFFFF)',
              color: 'var(--text-primary)',
              boxSizing: 'border-box',
            }}
          />
        </label>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Document status" style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '44px',
                padding: '0 14px',
                border: 'none',
                borderBottom: `2px solid ${active ? 'var(--primary)' : 'transparent'}`,
                marginBottom: '-1px',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--primary)' : '#4B5563',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                font: 'inherit',
              }}
            >
              <span style={{ fontSize: '14px' }}>{t.label}</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '999px',
                  padding: '1px 8px',
                  color: active ? '#FFFFFF' : '#374151',
                  backgroundColor: active ? 'var(--primary)' : '#F3F4F6',
                }}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' }}>
        {/* Queue */}
        <section
          aria-label="Documents list"
          style={{
            flex: '1 1 320px',
            maxWidth: '420px',
            minWidth: 0,
            backgroundColor: 'var(--bg-surface, #FFFFFF)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '11px 16px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: '#F9FAFB',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{loading ? 'Loading…' : queueLabel}</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>Grouped by student</span>
          </div>

          {loading ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading documents…</div>
          ) : flatDocs.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#4B5563', fontSize: '13px' }}>
              {searchQuery ? 'No documents match your search.' : tab === 'pending' ? 'Nothing to review. You’re all caught up.' : 'No documents here.'}
            </div>
          ) : (
            <div style={{ maxHeight: 'calc(100vh - 290px)', minHeight: '240px', overflowY: 'auto' }}>
              {groups.map((g) => (
                <div key={g.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px 6px' }}>
                    <StudentAvatar name={g.name} />
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.name}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6B7280', flexShrink: 0 }}>
                      · {g.docs.length} document{g.docs.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {g.docs.map((d) => {
                    const isSelected = selected?._id === d._id;
                    const when = timeAgo(d.uploadedAt || d.updatedAt).replace(' ago', '');
                    return (
                      <button
                        key={d._id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedId(d._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          width: '100%',
                          minHeight: '58px',
                          padding: '9px 16px 9px 58px',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          font: 'inherit',
                          boxSizing: 'border-box',
                          backgroundColor: isSelected ? '#EEF4FF' : 'transparent',
                          boxShadow: isSelected ? 'inset 3px 0 0 var(--primary)' : 'none',
                        }}
                      >
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.title}
                            </span>
                            {d.isMandatory && (
                              <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 600, color: '#9F1239', backgroundColor: '#FFF1F2', borderRadius: '4px', padding: '1px 6px' }}>
                                Required
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: '12px', color: '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {toTitle(d.category)}
                            {tab === 'all' ? '' : when ? ` · ${when}` : ''}
                          </span>
                        </span>
                        {tab === 'all' && <StatusDot state={getReviewState(d)} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Review pane */}
        {selected && selectedState && (
          <section
            aria-label="Selected document"
            style={{
              flex: '999 1 520px',
              minWidth: 0,
              backgroundColor: 'var(--bg-surface, #FFFFFF)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Pane header */}
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <StatusPill state={selectedState} />
                  <Chip>{toTitle(selected.category)}</Chip>
                  {selected.isMandatory && <Chip tone="required">Required</Chip>}
                </div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, lineHeight: 1.3, color: 'var(--text-primary)' }}>{selected.title}</h2>
                <div style={{ fontSize: '13px', color: '#4B5563' }}>
                  {selected.leadId ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/students/${selected.leadId}`)}
                      style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {selected.studentName}
                    </button>
                  ) : (
                    selected.studentName
                  )}
                  {selected.studentCode ? ` · ${selected.studentCode}` : selected.studentEmail ? ` · ${selected.studentEmail}` : ''}
                  {selected.fileUrl && selected.uploadedAt ? ` · Uploaded ${timeAgo(selected.uploadedAt)}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <button
                  type="button"
                  aria-label="Previous document"
                  disabled={selectedIndex <= 0}
                  onClick={() => goTo(-1)}
                  style={{ ...iconBtn, width: '40px', height: '40px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', opacity: selectedIndex <= 0 ? 0.45 : 1 }}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next document"
                  disabled={selectedIndex >= flatDocs.length - 1}
                  onClick={() => goTo(1)}
                  style={{
                    ...iconBtn,
                    width: '40px',
                    height: '40px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    opacity: selectedIndex >= flatDocs.length - 1 ? 0.45 : 1,
                  }}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Preview + decision */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
              {/* Preview */}
              <div style={{ flex: '999 1 360px', minWidth: 0, backgroundColor: '#F3F4F6', display: 'flex', flexDirection: 'column' }}>
                {selected.fileUrl && !fileMissing && fileCheck !== 'checking' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '6px 10px',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: '#F9FAFB',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', minWidth: 0 }}>
                      {previewKind === 'image' ? (
                        <>
                          <button type="button" aria-label="Zoom out" style={iconBtn} disabled={zoom <= 0.5} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}>
                            <ZoomOut size={16} aria-hidden="true" />
                          </button>
                          <span style={{ fontSize: '13px', color: '#374151', minWidth: '44px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                          <button type="button" aria-label="Zoom in" style={iconBtn} disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}>
                            <ZoomIn size={16} aria-hidden="true" />
                          </button>
                          <button type="button" aria-label="Rotate" style={iconBtn} onClick={() => setRotation((r) => (r + 90) % 360)}>
                            <RotateCw size={16} aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '12.5px', color: '#374151', padding: '0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fileNameOf(selected)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <button type="button" onClick={() => setPreviewDoc(selected)} style={{ ...toolbarLink, background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: '13px' }}>
                        Full size
                      </button>
                      <a href={selected.fileUrl} target="_blank" rel="noreferrer" style={toolbarLink}>
                        <ExternalLink size={14} aria-hidden="true" /> New tab
                      </a>
                      <a href={selected.fileUrl} download={selected.originalFileName || true} style={toolbarLink}>
                        <Download size={14} aria-hidden="true" /> Download
                      </a>
                    </div>
                  </div>
                )}

                {!selected.fileUrl ? (
                  <div
                    style={{
                      minHeight: '420px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '32px',
                      textAlign: 'center',
                      color: '#4B5563',
                    }}
                  >
                    <Upload size={28} style={{ color: '#6B7280' }} aria-hidden="true" />
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Not uploaded yet</div>
                    <div style={{ fontSize: '13px', maxWidth: '380px', lineHeight: 1.5 }}>
                      {selected.studentName || 'The student'} hasn’t uploaded this document. It will appear in “To review” as soon as they do.
                    </div>
                  </div>
                ) : fileCheck === 'checking' ? (
                  <div style={{ minHeight: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '13px' }}>
                    Loading file…
                  </div>
                ) : fileMissing ? (
                  <div
                    style={{
                      minHeight: '420px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      padding: '32px 40px',
                      textAlign: 'center',
                      backgroundColor: '#F9FAFB',
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6B7280',
                      }}
                    >
                      <FileX size={28} aria-hidden="true" />
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>We couldn’t open this file</div>
                    <p style={{ margin: 0, maxWidth: '440px', fontSize: '13.5px', lineHeight: 1.55, color: '#4B5563' }}>
                      <strong style={{ color: '#374151', fontWeight: 600 }}>{fileNameOf(selected)}</strong> is no longer in storage. It may have been deleted, or the
                      upload never finished.{' '}
                      {selectedState === 'rejected'
                        ? 'The student has already been asked to upload it again.'
                        : 'The student needs to upload it again.'}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                      {selectedState !== 'rejected' && (
                        <Button
                          variant="primary"
                          loading={submitting === 'reject'}
                          disabled={!!submitting}
                          onClick={() => submitReview(DocumentStatus.REJECTED, MISSING_FILE_REASON)}
                        >
                          Ask student to upload again
                        </Button>
                      )}
                      <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={() => setFileRetry((n) => n + 1)}>
                        Try loading again
                      </Button>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>Error detail: file not found (404)</span>
                  </div>
                ) : (
                  <FileView doc={selected} zoom={zoom} rotation={rotation} height="520px" />
                )}
              </div>

              {/* Decision panel */}
              <div
                style={{
                  flex: '1 1 280px',
                  maxWidth: '100%',
                  minWidth: 0,
                  borderLeft: '1px solid var(--border-color)',
                  padding: '18px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {showDecision ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Check before approving</h3>
                      {APPROVAL_CHECKS.map((label, i) => (
                        <label key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#374151', minHeight: '28px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checks[i]}
                            onChange={(e) => setChecks((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                            style={{ width: '17px', height: '17px', margin: '1px 0 0', accentColor: 'var(--primary)', flexShrink: 0 }}
                          />
                          {label}
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => submitReview(DocumentStatus.APPROVED)}
                      disabled={!canApprove || !!submitting}
                      title={!canApprove ? 'There is no file to approve' : undefined}
                      style={{
                        height: '44px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: '#047857',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: canApprove && !submitting ? 'pointer' : 'not-allowed',
                        opacity: canApprove ? 1 : 0.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        font: 'inherit',
                      }}
                    >
                      <Check size={17} aria-hidden="true" />
                      {submitting === 'approve' ? 'Approving…' : flatDocs.length > 1 ? 'Approve & next' : 'Approve'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280', fontSize: '12px' }}>
                      <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
                      or
                      <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
                    </div>

                    <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
                      <legend style={{ fontSize: '14px', fontWeight: 600, padding: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>Ask for a re-upload</legend>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {REUPLOAD_REASONS.map((r) => {
                          const on = reasons.includes(r);
                          return (
                            <button
                              key={r}
                              type="button"
                              aria-pressed={on}
                              onClick={() => setReasons((prev) => (on ? prev.filter((x) => x !== r) : [...prev, r]))}
                              style={{
                                height: '32px',
                                padding: '0 12px',
                                borderRadius: '999px',
                                border: `1px solid ${on ? 'var(--primary)' : '#D1D5DB'}`,
                                backgroundColor: on ? '#EEF4FF' : '#FFFFFF',
                                color: on ? '#0044C2' : '#374151',
                                fontSize: '12.5px',
                                fontWeight: on ? 600 : 500,
                                cursor: 'pointer',
                                font: 'inherit',
                              }}
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                      <label htmlFor="reupload-note" style={{ fontSize: '12.5px', color: '#4B5563' }}>
                        Note to the student
                      </label>
                      <textarea
                        id="reupload-note"
                        ref={noteRef}
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. The scores on page 2 are hard to read. Please scan it again in good light."
                        style={{
                          font: 'inherit',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          padding: '9px 11px',
                          resize: 'vertical',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => submitReview(DocumentStatus.REJECTED)}
                        disabled={!!submitting}
                        style={{
                          height: '44px',
                          borderRadius: '8px',
                          border: '1px solid #B91C1C',
                          backgroundColor: '#FFFFFF',
                          color: '#B91C1C',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          font: 'inherit',
                        }}
                      >
                        {submitting === 'reject' ? 'Sending…' : 'Request re-upload'}
                      </button>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>The student sees your reason and note in their portal.</span>
                      {panelMode === 'changing' && (
                        <button
                          type="button"
                          onClick={() => setPanelMode('idle')}
                          style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', alignSelf: 'flex-start' }}
                        >
                          Keep the current decision
                        </button>
                      )}
                    </fieldset>
                  </>
                ) : selectedState === 'awaiting' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Waiting on the student</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#4B5563', lineHeight: 1.5 }}>
                      Requested {timeAgo(selected.createdAt) || ''}
                      {selected.requestedByName ? ` by ${selected.requestedByName}` : ''}. Nothing to review until a file arrives.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                      {selectedState === 'approved' ? 'Approved' : 'Waiting on the student'}
                    </h3>
                    <div
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '13px',
                        color: '#4B5563',
                      }}
                    >
                      <span>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selected.reviewedByName || 'A reviewer'}</strong>{' '}
                        {selectedState === 'approved' ? 'approved this' : 'asked for a re-upload'}
                        {selected.reviewedAt ? ` · ${formatDate(selected.reviewedAt)}` : ''}
                      </span>
                      {selectedState === 'rejected' && selected.rejectionReason && (
                        <span style={{ color: '#374151', lineHeight: 1.5 }}>“{selected.rejectionReason}”</span>
                      )}
                    </div>
                    {selected.fileUrl && !fileMissing && (
                      <Button variant="secondary" onClick={() => setPanelMode('changing')}>
                        Change decision
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', padding: '14px 22px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#374151' }}>History</h3>
                <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#4B5563' }}>
                  {history.map((h, i) => (
                    <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '999px', backgroundColor: h.dot, flexShrink: 0 }} />
                      <span>
                        {h.text} · <span title={formatDate(h.at)}>{timeAgo(h.at)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Full-size preview */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc ? fileNameOf(previewDoc) : 'Document Preview'}
        maxWidth="960px"
        footer={
          <>
            <a href={previewDoc?.fileUrl} download={previewDoc?.originalFileName || true} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <Download size={14} /> Download
            </a>
            <a href={previewDoc?.fileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <ExternalLink size={14} /> Open in New Tab
            </a>
            <Button variant="primary" onClick={() => setPreviewDoc(null)}>
              Close
            </Button>
          </>
        }
      >
        {previewDoc?.fileUrl && (
          <div style={{ borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
            <FileView doc={previewDoc} zoom={1} rotation={0} height="70vh" />
          </div>
        )}
      </Modal>
    </div>
  );
};

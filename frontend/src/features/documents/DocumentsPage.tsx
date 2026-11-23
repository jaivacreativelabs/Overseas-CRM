import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ExternalLink, Search, Download } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Textarea } from '../../components/Form';
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

const STATE_INFO: Record<ReviewState, { text: string; dot: string }> = {
  pending: { text: 'Pending review', dot: '#D97706' },
  approved: { text: 'Approved', dot: '#059669' },
  rejected: { text: 'Re-upload needed', dot: '#DC2626' },
  awaiting: { text: 'Awaiting upload', dot: '#9CA3AF' },
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'To review' },
  { key: 'rejected', label: 'Re-upload' },
  { key: 'awaiting', label: 'Not uploaded' },
  { key: 'approved', label: 'Approved' },
  { key: 'all', label: 'All' },
];

const REJECT_PRESETS = ['Blurry scan', 'Expired document', 'Missing signature', 'Incorrect format'];

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

const StatusLabel: React.FC<{ state: ReviewState }> = ({ state }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 500, color: '#374151' }}>
    <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, backgroundColor: STATE_INFO[state].dot }} />
    {STATE_INFO[state].text}
  </span>
);

/** The file shown inside the detail panel: images and PDFs inline, anything else as a placeholder. */
const InlinePreview: React.FC<{ doc: any; height: string }> = ({ doc, height }) => {
  const kind = getPreviewKind(doc);
  const name = doc.originalFileName || doc.title || 'Document';
  return (
    <div
      style={{
        height,
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-subtle)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {kind === 'image' ? (
        <img src={doc.fileUrl} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      ) : kind === 'pdf' ? (
        <iframe src={doc.fileUrl} title={name} style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#FFFFFF' }} />
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12.5px', padding: '16px' }}>
          <FileText size={28} style={{ color: 'var(--text-muted)', marginBottom: '6px' }} />
          <div>This file type can't be previewed here.</div>
        </div>
      )}
    </div>
  );
};

export const DocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Panel action mode: 'rejecting' shows the reason box; 'changing' re-opens a reviewed document's decision.
  const [panelMode, setPanelMode] = useState<'idle' | 'rejecting' | 'changing'>('idle');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchDocs = async () => {
    try {
      const res = await apiClient.get<any[]>('/documents');
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      error(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: docs.length, pending: 0, rejected: 0, awaiting: 0, approved: 0 };
    docs.forEach((d) => {
      c[getReviewState(d)] += 1;
    });
    return c;
  }, [docs]);

  const visibleDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return docs.filter((d) => {
      if (tab !== 'all' && getReviewState(d) !== tab) return false;
      if (!q) return true;
      return [d.studentName, d.title, d.category, d.studentCode].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [docs, tab, searchQuery]);

  // Keep the chosen document selected while it is in view; otherwise fall to the first one, so
  // approving the top item in "To review" moves straight on to the next.
  const selected = visibleDocs.find((d) => d._id === selectedId) || visibleDocs[0] || null;

  useEffect(() => {
    setPanelMode('idle');
    setReason('');
  }, [selected?._id]);

  const submitReview = async (status: DocumentStatus.APPROVED | DocumentStatus.REJECTED) => {
    if (!selected) return;
    if (status === DocumentStatus.REJECTED && !reason.trim()) {
      error('Add a reason so the student knows what to fix.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.put(`/documents/${selected._id}/review`, {
        status,
        rejectionReason: status === DocumentStatus.REJECTED ? reason.trim() : undefined,
      });
      success(
        status === DocumentStatus.APPROVED
          ? `Approved ${selected.title} for ${selected.studentName || 'the student'}.`
          : `Asked ${selected.studentName || 'the student'} to re-upload ${selected.title}.`
      );
      await fetchDocs();
    } catch (err: any) {
      error(err.message || 'Review failed');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedState = selected ? getReviewState(selected) : null;
  const showDecisionButtons = selectedState === 'pending' || panelMode === 'changing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '100%' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Documents</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Review student uploads one at a time.</p>
      </div>

      {/* Tabs + search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div className="tabs-header" role="tablist" aria-label="Document status" style={{ marginBottom: '-1px', borderBottom: 'none' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`tab-btn ${tab === t.key ? 'active' : ''}`}
              style={{ fontSize: '14px' }}
              onClick={() => setTab(t.key)}
            >
              {t.label} <span style={{ fontSize: '12px', fontWeight: 600, marginLeft: '4px' }}>{counts[t.key]}</span>
            </button>
          ))}
        </div>

        <label style={{ position: 'relative', width: '260px', marginBottom: '8px', display: 'flex' }}>
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search documents</span>
          <Search
            size={14}
            aria-hidden="true"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="search"
            placeholder="Search student or document"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 30px',
              fontSize: '13px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' }}>
        {/* Document list */}
        <div
          style={{
            flex: '999 1 520px',
            minWidth: 0,
            backgroundColor: 'var(--bg-surface, #FFFFFF)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading documents…</div>
          ) : visibleDocs.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No documents here.
            </div>
          ) : (
            visibleDocs.map((d) => {
              const isSelected = selected?._id === d._id;
              return (
                <button
                  key={d._id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(d._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    width: '100%',
                    minHeight: '62px',
                    padding: '11px 18px',
                    border: 'none',
                    borderBottom: '1px solid var(--border-light, #F1F2F4)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    font: 'inherit',
                    backgroundColor: isSelected ? '#F0F5FF' : 'transparent',
                    boxShadow: isSelected ? 'inset 3px 0 0 var(--primary)' : 'none',
                  }}
                >
                  <StudentAvatar name={d.studentName} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {d.title}
                      </span>
                      {d.isMandatory && <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 600, color: '#9F1239' }}>Required</span>}
                    </span>
                    <span style={{ fontSize: '12px', color: '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.studentName} · {toTitle(d.category)}
                    </span>
                  </span>
                  <span style={{ flexShrink: 0, width: '140px' }}>
                    <StatusLabel state={getReviewState(d)} />
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        {selected && selectedState && (
          <aside
            aria-label="Selected document"
            style={{
              flex: '1 1 360px',
              minWidth: 0,
              backgroundColor: 'var(--bg-surface, #FFFFFF)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <StatusLabel state={selectedState} />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, lineHeight: 1.3, color: 'var(--text-primary)' }}>{selected.title}</h2>
              <span style={{ fontSize: '13px', color: '#4B5563' }}>
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
              </span>
            </div>

            {selected.fileUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <InlinePreview doc={selected} height="300px" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected.originalFileName || 'Uploaded file'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(selected)}
                    style={{ flexShrink: 0, background: 'none', border: 'none', padding: 0, font: 'inherit', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                  >
                    Open full size
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  height: '110px',
                  borderRadius: '10px',
                  border: '1px dashed var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  color: '#4B5563',
                }}
              >
                The student hasn't uploaded this yet.
              </div>
            )}

            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: '9px', columnGap: '12px', fontSize: '13px' }}>
              <dt style={{ color: '#4B5563' }}>Category</dt>
              <dd style={{ margin: 0 }}>{toTitle(selected.category)}</dd>
              <dt style={{ color: '#4B5563' }}>Required</dt>
              <dd style={{ margin: 0 }}>{selected.isMandatory ? 'Yes' : 'No'}</dd>
              {selected.fileUrl ? (
                <>
                  <dt style={{ color: '#4B5563' }}>Uploaded</dt>
                  <dd style={{ margin: 0 }}>{timeAgo(selected.uploadedAt || selected.updatedAt) || '—'}</dd>
                </>
              ) : (
                <>
                  <dt style={{ color: '#4B5563' }}>Requested</dt>
                  <dd style={{ margin: 0 }}>
                    {timeAgo(selected.createdAt) || '—'}
                    {selected.requestedByName ? ` by ${selected.requestedByName}` : ''}
                  </dd>
                </>
              )}
              {selected.reviewedByName && (selectedState === 'approved' || selectedState === 'rejected') && (
                <>
                  <dt style={{ color: '#4B5563' }}>Reviewed by</dt>
                  <dd style={{ margin: 0 }}>
                    {selected.reviewedByName}
                    {selected.reviewedAt ? `, ${timeAgo(selected.reviewedAt)}` : ''}
                  </dd>
                </>
              )}
            </dl>

            {selectedState === 'rejected' && selected.rejectionReason && (
              <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#7F1D1D', backgroundColor: '#FEF2F2', borderRadius: '10px', padding: '12px 14px' }}>
                {selected.rejectionReason}
              </div>
            )}

            {/* Actions */}
            <div style={{ borderTop: '1px solid var(--border-light, #F1F2F4)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {panelMode === 'rejecting' ? (
                <>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#4B5563' }}>Quick reasons:</span>
                    {REJECT_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setReason(preset)}
                        style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: reason === preset ? '#EEF4FF' : 'var(--bg-surface)',
                          cursor: 'pointer',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    label="What should the student fix?"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. The scan is blurry. Please upload a clearer copy where all four corners are visible."
                    rows={3}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button variant="secondary" style={{ flex: 1 }} onClick={() => setPanelMode('idle')} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      style={{ flex: 1 }}
                      onClick={() => submitReview(DocumentStatus.REJECTED)}
                      loading={submitting}
                    >
                      Send back to student
                    </Button>
                  </div>
                </>
              ) : showDecisionButtons ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" style={{ flex: 1, color: '#B91C1C' }} onClick={() => setPanelMode('rejecting')} disabled={submitting}>
                    Ask to re-upload
                  </Button>
                  <Button variant="primary" style={{ flex: 1 }} onClick={() => submitReview(DocumentStatus.APPROVED)} loading={submitting}>
                    Approve
                  </Button>
                </div>
              ) : selectedState === 'awaiting' ? (
                <span style={{ fontSize: '13px', color: '#4B5563' }}>Waiting for the student to upload this document.</span>
              ) : (
                <Button variant="secondary" onClick={() => setPanelMode('changing')}>
                  Change decision
                </Button>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Full-size preview */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.originalFileName || previewDoc?.title || 'Document Preview'}
        maxWidth="960px"
        footer={
          <>
            <a
              href={previewDoc?.fileUrl}
              download={previewDoc?.originalFileName || true}
              className="btn btn-secondary"
              style={{ textDecoration: 'none' }}
            >
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
        {previewDoc?.fileUrl && <InlinePreview doc={previewDoc} height="70vh" />}
      </Modal>
    </div>
  );
};

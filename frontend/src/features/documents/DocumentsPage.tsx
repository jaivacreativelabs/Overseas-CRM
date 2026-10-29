import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ExternalLink,
  Check,
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Filter,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge, Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Select, Textarea } from '../../components/Form';
import { DocumentStatus } from '../../types';
import { PinButton } from '../../components/PinButton';

export const DocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [decision, setDecision] = useState<DocumentStatus.APPROVED | DocumentStatus.REJECTED>(DocumentStatus.APPROVED);
  const [reason, setReason] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'mandatory'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchDocs = async () => {
    setLoading(true);
    try {
      // Try fast single endpoint first
      const res = await apiClient.get<any[]>('/documents');
      if (Array.isArray(res.data)) {
        setDocs(res.data);
      } else {
        // Fallback to leads loop if needed
        const leadsRes = await apiClient.get<any[]>('/leads', { limit: 50 });
        const allDocs: any[] = [];
        for (const lead of leadsRes.data || []) {
          const leadDocs = await apiClient.get<any[]>(`/documents/lead/${lead._id}`).catch(() => ({ data: [] }));
          (leadDocs.data || []).forEach((d) => {
            allDocs.push({ ...d, studentName: lead.name, leadId: lead._id });
          });
        }
        setDocs(allDocs);
      }
    } catch (err: any) {
      // If /documents fails, fallback
      try {
        const leadsRes = await apiClient.get<any[]>('/leads', { limit: 50 });
        const allDocs: any[] = [];
        for (const lead of leadsRes.data || []) {
          const leadDocs = await apiClient.get<any[]>(`/documents/lead/${lead._id}`).catch(() => ({ data: [] }));
          (leadDocs.data || []).forEach((d) => {
            allDocs.push({ ...d, studentName: lead.name, leadId: lead._id });
          });
        }
        setDocs(allDocs);
      } catch (fallbackErr: any) {
        error(fallbackErr.message || 'Failed to load documents');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setSubmittingReview(true);
    try {
      await apiClient.put(`/documents/${selectedDoc._id}/review`, {
        status: decision,
        rejectionReason: decision === DocumentStatus.REJECTED ? reason : undefined,
      });
      success(`Document marked as ${decision}.`);
      setIsReviewOpen(false);
      fetchDocs();
    } catch (err: any) {
      error(err.message || 'Review failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleQuickApprove = async (doc: any) => {
    try {
      await apiClient.put(`/documents/${doc._id}/review`, {
        status: DocumentStatus.APPROVED,
      });
      success(`Approved ${doc.title} for ${doc.studentName || 'student'}.`);
      fetchDocs();
    } catch (err: any) {
      error(err.message || 'Approval failed');
    }
  };

  // Stats
  const stats = useMemo(() => {
    const pending = docs.filter(
      (d) => d.status === DocumentStatus.PENDING || d.status === DocumentStatus.REQUESTED
    ).length;
    const approved = docs.filter((d) => d.status === DocumentStatus.APPROVED || d.status === DocumentStatus.SUCCESSFUL).length;
    const rejected = docs.filter((d) => d.status === DocumentStatus.REJECTED || d.status === DocumentStatus.FAILED).length;
    const mandatory = docs.filter((d) => d.isMandatory).length;
    return {
      total: docs.length,
      pending,
      approved,
      rejected,
      mandatory,
    };
  }, [docs]);

  // Filtered Docs
  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      // Search query
      const matchesSearch =
        !searchQuery ||
        d.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filter tab
      if (activeFilter === 'pending') {
        return (
          d.status === DocumentStatus.PENDING ||
          d.status === DocumentStatus.REQUESTED
        );
      }
      if (activeFilter === 'approved') {
        return d.status === DocumentStatus.APPROVED || d.status === DocumentStatus.SUCCESSFUL;
      }
      if (activeFilter === 'rejected') {
        return d.status === DocumentStatus.REJECTED || d.status === DocumentStatus.FAILED;
      }
      if (activeFilter === 'mandatory') {
        return d.isMandatory;
      }
      return true;
    });
  }, [docs, searchQuery, activeFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Header Row */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Document Verification Hub
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Audit student dossier submissions, verify mandatory credentials, and resolve rejection notices.
        </p>
      </div>

      {/* KPI Stats Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          width: '100%',
        }}
      >
        <div
          className="card"
          onClick={() => setActiveFilter('all')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            borderColor: activeFilter === 'all' ? '#0057F8' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Documents
            </span>
            <FileText size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Across all student dossiers
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveFilter('pending')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            borderColor: activeFilter === 'pending' ? '#D97706' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Pending Review
            </span>
            <Clock size={16} color="#D97706" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#D97706' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Needs advisor verification
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveFilter('approved')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            borderColor: activeFilter === 'approved' ? '#059669' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Approved
            </span>
            <CheckCircle2 size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669' }}>
            {stats.approved}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Verified credentials
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveFilter('rejected')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            borderColor: activeFilter === 'rejected' ? '#DC2626' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Rejected / Re-upload
            </span>
            <AlertCircle size={16} color="#DC2626" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#DC2626' }}>
            {stats.rejected}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Pending student corrections
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div className="view-mode-toggle">
          <button
            className={`view-mode-toggle-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({stats.total})
          </button>
          <button
            className={`view-mode-toggle-btn ${activeFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveFilter('pending')}
          >
            Pending ({stats.pending})
          </button>
          <button
            className={`view-mode-toggle-btn ${activeFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveFilter('approved')}
          >
            Approved ({stats.approved})
          </button>
          <button
            className={`view-mode-toggle-btn ${activeFilter === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveFilter('rejected')}
          >
            Rejected ({stats.rejected})
          </button>
          <button
            className={`view-mode-toggle-btn ${activeFilter === 'mandatory' ? 'active' : ''}`}
            onClick={() => setActiveFilter('mandatory')}
          >
            Mandatory ({stats.mandatory})
          </button>
        </div>

        <div style={{ position: 'relative', width: '240px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search student or doc title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              fontSize: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Document Table */}
      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (d) => (
              <div>
                <strong
                  style={{ color: 'var(--primary)', cursor: 'pointer' }}
                  onClick={() => navigate(`/students/${d.leadId}`)}
                >
                  {d.studentName}
                </strong>
                {d.targetCountry && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📍 {d.targetCountry}</div>
                )}
              </div>
            ),
          },
          {
            header: 'DOCUMENT TITLE',
            render: (d) => (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <strong>{d.title}</strong>
                  {d.isMandatory && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      REQUIRED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {d.category || 'General'}
                </div>
              </div>
            ),
          },
          {
            header: 'ATTACHMENT',
            render: (d) =>
              d.fileUrl ? (
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: 'var(--primary)',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                  }}
                >
                  <FileText size={14} />
                  <span>{d.originalFileName || 'View Document'}</span>
                  <ExternalLink size={12} />
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not Uploaded</span>
              ),
          },
          {
            header: 'STATUS',
            render: (d) => <StatusBadge status={d.status} />,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (d) => (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <PinButton
                  item={{
                    id: d._id,
                    category: 'document',
                    title: `Document: ${d.title}`,
                    subtitle: `${d.studentName} • ${d.category}`,
                    path: `/leads/${d.leadId}`,
                    pinnedAt: new Date().toISOString(),
                  }}
                />
                {d.fileUrl && d.status !== DocumentStatus.APPROVED && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Check size={12} />}
                    onClick={() => handleQuickApprove(d)}
                    title="Quick Approve"
                  >
                    Approve
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedDoc(d);
                    setDecision(DocumentStatus.APPROVED);
                    setReason(d.rejectionReason || '');
                    setIsReviewOpen(true);
                  }}
                >
                  Review
                </Button>
              </div>
            ),
          },
        ]}
        data={filteredDocs}
        loading={loading}
        emptyMessage="No documents found matching the filter."
      />

      {/* Review Modal */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title={`Review Document: ${selectedDoc?.title}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReviewOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReview} disabled={submittingReview}>
              {submittingReview ? 'Submitting...' : 'Submit Verification'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Student:</span>
              <strong>{selectedDoc?.studentName || 'Student'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
              <span>{selectedDoc?.category || 'General'}</span>
            </div>
            {selectedDoc?.fileUrl && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Uploaded File:</span>
                <a
                  href={selectedDoc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <FileText size={13} /> {selectedDoc.originalFileName || 'Open File'} <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          <Select
            label="Verification Decision *"
            value={decision}
            onChange={(e) => setDecision(e.target.value as any)}
            options={[
              { value: DocumentStatus.APPROVED, label: 'Approve Document (Verified)' },
              { value: DocumentStatus.REJECTED, label: 'Reject Document (Requires Reason)' },
            ]}
          />

          {decision === DocumentStatus.REJECTED && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Quick reason presets:</span>
                {['Blurry scan', 'Expired document', 'Missing signature', 'Incorrect format'].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setReason(preset)}
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Textarea
                label="Rejection Reason *"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State clearly why this document was rejected so the student can rectify it..."
                required
              />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

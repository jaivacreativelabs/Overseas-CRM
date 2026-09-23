import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ExternalLink, Check, X } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge, Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Select, Textarea } from '../../components/Form';
import { DocumentStatus } from '../../types';

export const DocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [decision, setDecision] = useState<DocumentStatus.APPROVED | DocumentStatus.REJECTED>(DocumentStatus.APPROVED);
  const [reason, setReason] = useState('');
  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/leads', { limit: 50 });
      const allDocs: any[] = [];
      for (const lead of res.data || []) {
        const leadDocs = await apiClient.get<any[]>(`/documents/lead/${lead._id}`).catch(() => ({ data: [] }));
        (leadDocs.data || []).forEach((d) => {
          allDocs.push({ ...d, studentName: lead.name, leadId: lead._id });
        });
      }
      setDocs(allDocs);
    } catch (err: any) {
      error(err.message || 'Failed to load documents');
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
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Document Verification Hub
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Review student uploads, approve mandatory credentials, or reject with specific feedback reasons.
        </p>
      </div>

      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (d) => (
              <div
                style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                onClick={() => navigate(`/students/${d.leadId}`)}
              >
                {d.studentName}
              </div>
            ),
          },
          {
            header: 'DOCUMENT TITLE',
            render: (d) => (
              <div>
                <strong>{d.title}</strong>
                {d.isMandatory && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.category}</div>
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
                  style={{ color: 'var(--primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <FileText size={14} /> {d.originalFileName || 'View File'} <ExternalLink size={12} />
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Not Uploaded</span>
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedDoc(d);
                  setDecision(DocumentStatus.APPROVED);
                  setIsReviewOpen(true);
                }}
              >
                Review
              </Button>
            ),
          },
        ]}
        data={docs}
        loading={loading}
        emptyMessage="No document requests found across active leads."
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
            <Button variant="primary" onClick={handleReview}>
              Submit Verification
            </Button>
          </>
        }
      >
        <form onSubmit={handleReview}>
          <Select
            label="Verification Decision *"
            value={decision}
            onChange={(e) => setDecision(e.target.value as any)}
            options={[
              { value: DocumentStatus.APPROVED, label: 'Approve Document' },
              { value: DocumentStatus.REJECTED, label: 'Reject Document (Requires Reason)' },
            ]}
          />
          {decision === DocumentStatus.REJECTED && (
            <Textarea
              label="Rejection Reason *"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State exactly why this document cannot be accepted..."
              required
            />
          )}
        </form>
      </Modal>
    </div>
  );
};

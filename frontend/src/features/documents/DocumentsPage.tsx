import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ExternalLink, Check, X } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge, Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Select, Textarea, Input } from '../../components/Form';
import { DocumentStatus } from '../../types';

export const DocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [decision, setDecision] = useState<DocumentStatus.SUCCESSFUL | DocumentStatus.FAILED>(DocumentStatus.SUCCESSFUL);
  const [reason, setReason] = useState('');
  
  const [isDemandOpen, setIsDemandOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [demandDocs, setDemandDocs] = useState([{ title: '', description: '' }]);

  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/leads', { limit: 50 });
      setStudents(res.data || []);
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
        rejectionReason: decision === DocumentStatus.FAILED ? reason : undefined,
      });
      success(`Document marked as ${decision}.`);
      setIsReviewOpen(false);
      fetchDocs();
    } catch (err: any) {
      error(err.message || 'Review failed');
    }
  };

  const handleDemandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || demandDocs.length === 0) return;
    try {
      await Promise.all(demandDocs.map(doc => 
        apiClient.post(`/documents/lead/${selectedStudent}/request`, {
          title: doc.title,
          description: doc.description,
          isMandatory: true,
          category: 'OTHER'
        })
      ));
      success('Document(s) requested successfully.');
      setIsDemandOpen(false);
      setDemandDocs([{ title: '', description: '' }]);
      setSelectedStudent('');
      fetchDocs();
    } catch (err: any) {
      error(err.message || 'Failed to request documents');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Document Verification Hub
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Review student uploads, approve mandatory credentials, or request documents.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsDemandOpen(true)}>
          Demand Document
        </Button>
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
                  setDecision(DocumentStatus.SUCCESSFUL);
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
              { value: DocumentStatus.SUCCESSFUL, label: 'Verify Document' },
              { value: DocumentStatus.FAILED, label: 'Mark as Failed (Requires Reason)' },
            ]}
          />
          {decision === DocumentStatus.FAILED && (
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

      {/* Demand Document Modal */}
      <Modal
        isOpen={isDemandOpen}
        onClose={() => setIsDemandOpen(false)}
        title="Demand Document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDemandOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDemandSubmit}>
              Send Request
            </Button>
          </>
        }
      >
        <form onSubmit={handleDemandSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Select Student *"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            options={[
              { value: '', label: 'Select a student' },
              ...students.map(s => ({ value: s._id, label: s.name }))
            ]}
            required
          />
          
          <div style={{ fontWeight: 600, marginTop: '8px' }}>Required Documents</div>
          
          {demandDocs.map((doc, index) => (
            <div key={index} style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Document {index + 1}</span>
                {demandDocs.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    const newDocs = [...demandDocs];
                    newDocs.splice(index, 1);
                    setDemandDocs(newDocs);
                  }}>
                    <X size={14} /> Remove
                  </Button>
                )}
              </div>
              <Input
                label="Document Title (e.g. Passport) *"
                value={doc.title}
                onChange={(e) => {
                  const newDocs = [...demandDocs];
                  newDocs[index].title = e.target.value;
                  setDemandDocs(newDocs);
                }}
                required
              />
              <Textarea
                label="Description / Instructions (optional)"
                value={doc.description}
                onChange={(e) => {
                  const newDocs = [...demandDocs];
                  newDocs[index].description = e.target.value;
                  setDemandDocs(newDocs);
                }}
                rows={2}
              />
            </div>
          ))}

          <Button type="button" variant="secondary" onClick={() => {
            setDemandDocs([...demandDocs, { title: '', description: '' }]);
          }}>
            + Add another document
          </Button>
        </form>
      </Modal>
    </div>
  );
};

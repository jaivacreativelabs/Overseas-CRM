import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Eye, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge, Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Select, Textarea } from '../../components/Form';
import { ApplicationStatus } from '../../types';
import { PinButton } from '../../components/PinButton';

export const ApplicationsPage: React.FC = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Status update modal state
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<ApplicationStatus>(ApplicationStatus.UNDER_REVIEW);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  // University Specs Modal
  const [selectedUnivApp, setSelectedUnivApp] = useState<any | null>(null);
  const [isUnivModalOpen, setIsUnivModalOpen] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/leads', { limit: 100 });
      const allApps: any[] = [];
      for (const lead of res.data || []) {
        const leadApps = await apiClient.get<any[]>(`/applications/lead/${lead._id}`).catch(() => ({ data: [] }));
        (leadApps.data || []).forEach((a) => {
          allApps.push({ ...a, studentName: lead.name, leadId: lead._id, studentEmail: lead.email });
        });
      }
      setApps(allApps);
    } catch (err: any) {
      error(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (updateStatus === ApplicationStatus.REJECTED && !rejectionReason.trim()) {
      error('Rejection reason is mandatory when marking an application as Rejected.');
      return;
    }
    try {
      await apiClient.put(`/applications/${selectedApp._id}/status`, {
        status: updateStatus,
        rejectionReason: updateStatus === ApplicationStatus.REJECTED ? rejectionReason : undefined,
        notes,
      });
      success(`Application status updated to ${updateStatus}. Rejection history preserved.`);
      setIsStatusModalOpen(false);
      fetchApplications();
    } catch (err: any) {
      error(err.message || 'Failed to update application');
    }
  };

  const filteredApps = apps.filter((a) => {
    if (filterStatus === 'ALL') return true;
    return a.status === filterStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            University Application Lifecycle & Audit History
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track application pipeline (Submitted → Under Review → Offer Received / Rejected). Rejected records are permanently archived.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Status Filter:</span>
          <select
            className="form-select"
            style={{ width: '180px', padding: '6px 12px', fontSize: '13px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Applications ({apps.length})</option>
            <option value={ApplicationStatus.SUBMITTED}>Submitted</option>
            <option value={ApplicationStatus.UNDER_REVIEW}>Under Review</option>
            <option value={ApplicationStatus.OFFER_RECEIVED}>Offer Received</option>
            <option value={ApplicationStatus.REJECTED}>Rejected (History)</option>
          </select>
        </div>
      </div>

      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (a) => (
              <div>
                <strong
                  style={{ color: 'var(--primary)', cursor: 'pointer' }}
                  onClick={() => navigate(`/leads/${a.leadId}`)}
                >
                  {a.studentName}
                </strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.studentEmail}</div>
              </div>
            ),
          },
          {
            header: 'UNIVERSITY & DETAILS',
            render: (a) => (
              <div>
                <strong>{a.universityName}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {a.country} •{' '}
                  <button
                    onClick={() => {
                      setSelectedUnivApp(a);
                      setIsUnivModalOpen(true);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    View Specs
                  </button>
                </div>
              </div>
            ),
          },
          { header: 'COURSE TITLE', accessor: 'courseTitle' },
          { header: 'APP REF NO', accessor: 'applicationNumber' },
          {
            header: 'SUBMISSION DATE',
            render: (a) => new Date(a.submissionDate).toLocaleDateString(),
          },
          {
            header: 'STATUS',
            render: (a) => <StatusBadge status={a.status} />,
          },
          {
            header: 'REJECTION REASON / REMARKS',
            render: (a) =>
              a.status === ApplicationStatus.REJECTED ? (
                <span style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 600 }}>
                  ❌ {a.rejectionReason}
                </span>
              ) : (
                a.notes || '—'
              ),
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (a) => (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <PinButton
                  item={{
                    id: a._id,
                    category: 'application',
                    title: `Application: ${a.universityName}`,
                    subtitle: `${a.studentName} • ${a.courseTitle || ''}`,
                    path: `/leads/${a.leadId}`,
                    pinnedAt: new Date().toISOString(),
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedApp(a);
                    setUpdateStatus(a.status);
                    setRejectionReason(a.rejectionReason || '');
                    setNotes(a.notes || '');
                    setIsStatusModalOpen(true);
                  }}
                >
                  Update Status
                </Button>
              </div>
            ),
          },
        ]}
        data={filteredApps}
        loading={loading}
        emptyMessage="No applications found matching the selected filter."
      />

      {/* Update Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={`Update Status: ${selectedApp?.studentName} — ${selectedApp?.universityName}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveStatus}>
              Save Status Update
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveStatus}>
          <Select
            label="Application Lifecycle Status *"
            value={updateStatus}
            onChange={(e) => setUpdateStatus(e.target.value as ApplicationStatus)}
            options={[
              { value: ApplicationStatus.SUBMITTED, label: 'Submitted to University' },
              { value: ApplicationStatus.UNDER_REVIEW, label: 'Under Review by Admissions' },
              { value: ApplicationStatus.OFFER_RECEIVED, label: 'Offer Received (Unlocks Offer Letter)' },
              { value: ApplicationStatus.REJECTED, label: 'Rejected (Retained Permanently in History)' },
            ]}
          />
          {updateStatus === ApplicationStatus.REJECTED && (
            <Textarea
              label="Mandatory Rejection Reason *"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain official rejection reasons from university admissions office..."
              required
            />
          )}
          <Textarea
            label="Application Notes / Portal Reference"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any internal remarks or login references..."
          />
        </form>
      </Modal>

      {/* University Specifications Inline Modal */}
      <Modal
        isOpen={isUnivModalOpen}
        onClose={() => setIsUnivModalOpen(false)}
        title={`University Specifications: ${selectedUnivApp?.universityName}`}
        footer={
          <Button variant="secondary" onClick={() => setIsUnivModalOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedUnivApp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>{selectedUnivApp.universityName}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Country: <strong>{selectedUnivApp.country}</strong> • Location: <strong>{(selectedUnivApp.universityId as any)?.city || selectedUnivApp.country}</strong>
              </div>
              {(selectedUnivApp.universityId as any)?.website && (
                <a href={(selectedUnivApp.universityId as any).website} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px', display: 'inline-block' }}>
                  Visit Official Website <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Program: {selectedUnivApp.courseTitle}</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginTop: '8px' }}>
                <div>Intake: <strong>{selectedUnivApp.intake}</strong></div>
                <div>Duration: <strong>{(selectedUnivApp.courseId as any)?.durationMonths || 12} Months</strong></div>
                <div>Tuition Fee: <strong>{(selectedUnivApp.courseId as any)?.currency || '$'} {(selectedUnivApp.courseId as any)?.annualFee?.toLocaleString() || 'N/A'}</strong></div>
                <div>Application Fee: <strong>{(selectedUnivApp.courseId as any)?.applicationFee ? `${(selectedUnivApp.courseId as any).currency || '$'} ${(selectedUnivApp.courseId as any).applicationFee}` : 'Waived'}</strong></div>
              </div>
            </div>

            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <strong>Academic Requirements:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  {(selectedUnivApp.courseId as any)?.academicRequirements || 'Minimum 60% or 3.0 GPA in relevant Bachelor degree.'}
                </p>
              </div>
              <div>
                <strong>English Proficiency Requirements:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  {(selectedUnivApp.courseId as any)?.englishRequirements || 'IELTS 6.5 Overall (min 6.0 in each band) or equivalent PTE.'}
                </p>
              </div>
              <div>
                <strong>Scholarships & Accommodation:</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  {(selectedUnivApp.courseId as any)?.scholarshipInfo || 'International Merit Scholarships & guaranteed 1st year university dormitories available.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
  Building2,
  Calendar,
  AlertCircle,
  User,
  FileCheck,
} from 'lucide-react';
import { applicationService } from './services/applicationService';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge, Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal, Drawer } from '../../components/Modal';
import { Input, Textarea } from '../../components/Form';
import { Application, ApplicationStatus } from '../../types';

export const ApplicationsPage: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApplicationStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedAppForReject, setSelectedAppForReject] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionDecisionDate, setRejectionDecisionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRejecting, setIsRejecting] = useState(false);

  // Application details drawer state
  const [selectedAppForDetails, setSelectedAppForDetails] = useState<Application | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showPortalPassword, setShowPortalPassword] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await applicationService.getAllApplications(
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setApps(data);
    } catch (err: any) {
      error(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleUpdateStatus = async (appId: string, status: ApplicationStatus) => {
    try {
      await applicationService.updateApplicationStatus(appId, {
        status,
        decisionDate: status === ApplicationStatus.OFFER_RECEIVED ? new Date() : undefined,
      });
      success(`Application status updated to ${status.replace(/_/g, ' ')}.`);
      fetchApplications();
      if (selectedAppForDetails?._id === appId) {
        setIsDetailsOpen(false);
      }
    } catch (err: any) {
      error(err.message || 'Failed to update application');
    }
  };

  const handleOpenRejectModal = (app: Application) => {
    setSelectedAppForReject(app);
    setRejectionReason('');
    setRejectionDecisionDate(new Date().toISOString().split('T')[0]);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForReject) return;
    if (!rejectionReason.trim()) {
      error('A rejection reason is mandatory.');
      return;
    }

    setIsRejecting(true);
    try {
      await applicationService.updateApplicationStatus(selectedAppForReject._id, {
        status: ApplicationStatus.REJECTED,
        rejectionReason: rejectionReason.trim(),
        decisionDate: rejectionDecisionDate ? new Date(rejectionDecisionDate) : new Date(),
      });
      success('Application marked as Rejected with decision recorded.');
      setIsRejectModalOpen(false);
      fetchApplications();
      if (selectedAppForDetails?._id === selectedAppForReject._id) {
        setIsDetailsOpen(false);
      }
    } catch (err: any) {
      error(err.message || 'Failed to reject application');
    } finally {
      setIsRejecting(false);
    }
  };

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return apps;
    const q = searchQuery.toLowerCase();
    return apps.filter((a) => {
      const studentName = typeof a.leadId === 'object' ? a.leadId?.name : '';
      const studentEmail = typeof a.leadId === 'object' ? a.leadId?.email : '';
      return (
        studentName?.toLowerCase().includes(q) ||
        studentEmail?.toLowerCase().includes(q) ||
        a.universityName?.toLowerCase().includes(q) ||
        a.courseTitle?.toLowerCase().includes(q) ||
        a.applicationNumber?.toLowerCase().includes(q) ||
        a.country?.toLowerCase().includes(q)
      );
    });
  }, [apps, searchQuery]);

  const getLeadId = (app: Application): string => {
    if (typeof app.leadId === 'object' && app.leadId?._id) {
      return app.leadId._id;
    }
    return String(app.leadId || '');
  };

  const getLeadName = (app: Application): string => {
    if (typeof app.leadId === 'object' && app.leadId?.name) {
      return app.leadId.name;
    }
    return 'Student';
  };

  const getLeadEmail = (app: Application): string => {
    if (typeof app.leadId === 'object' && app.leadId?.email) {
      return app.leadId.email;
    }
    return '';
  };

  const counts = useMemo(() => {
    const res: Record<string, number> = {
      ALL: apps.length,
      [ApplicationStatus.SUBMITTED]: 0,
      [ApplicationStatus.UNDER_REVIEW]: 0,
      [ApplicationStatus.OFFER_RECEIVED]: 0,
      [ApplicationStatus.REJECTED]: 0,
    };
    apps.forEach((a) => {
      if (res[a.status] !== undefined) {
        res[a.status]++;
      }
    });
    return res;
  }, [apps]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          University Application Tracker
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Monitor active university submissions, track admissions review, record rejection reasons, and advance offer decisions.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Applications' },
            { key: ApplicationStatus.SUBMITTED, label: 'Submitted' },
            { key: ApplicationStatus.UNDER_REVIEW, label: 'Under Review' },
            { key: ApplicationStatus.OFFER_RECEIVED, label: 'Offer Received' },
            { key: ApplicationStatus.REJECTED, label: 'Rejected' },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 600 : 500,
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  backgroundColor: isActive ? 'var(--primary-light)' : '#FFFFFF',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                {statusFilter === 'ALL' && counts[tab.key] !== undefined && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                    }}
                  >
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search student, university, app no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Applications Table */}
      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (a: Application) => {
              const leadId = getLeadId(a);
              const name = getLeadName(a);
              const email = getLeadEmail(a);
              return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                    onClick={() => leadId && navigate(`/students/${leadId}?section=applications`)}
                    title="View Student Profile"
                  >
                    {name}
                  </div>
                  {email && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{email}</span>}
                </div>
              );
            },
          },
          {
            header: 'UNIVERSITY & COUNTRY',
            render: (a: Application) => (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.universityName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.country}</div>
              </div>
            ),
          },
          {
            header: 'COURSE & INTAKE',
            render: (a: Application) => (
              <div>
                <div style={{ color: 'var(--text-primary)' }}>{a.courseTitle}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.intake}</div>
              </div>
            ),
          },
          {
            header: 'APP NUMBER',
            render: (a: Application) =>
              a.applicationNumber ? (
                <code
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  {a.applicationNumber}
                </code>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>—</span>
              ),
          },
          {
            header: 'SUBMITTED',
            render: (a: Application) => (
              <span style={{ fontSize: '12px' }}>
                {a.submissionDate ? new Date(a.submissionDate).toLocaleDateString() : '—'}
              </span>
            ),
          },
          {
            header: 'STATUS',
            render: (a: Application) => <StatusBadge status={a.status} />,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (a: Application) => (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Eye size={14} />}
                  onClick={() => {
                    setSelectedAppForDetails(a);
                    setIsDetailsOpen(true);
                  }}
                  title="View Application Details"
                >
                  Details
                </Button>

                {a.status === ApplicationStatus.SUBMITTED && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Clock size={13} />}
                      onClick={() => handleUpdateStatus(a._id, ApplicationStatus.UNDER_REVIEW)}
                      title="Move to Under Review"
                    >
                      Under Review
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 size={13} />}
                      onClick={() => handleUpdateStatus(a._id, ApplicationStatus.OFFER_RECEIVED)}
                      title="Mark Offer Received"
                    >
                      Offer Received
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<XCircle size={13} />}
                      onClick={() => handleOpenRejectModal(a)}
                      title="Mark Rejected"
                    >
                      Reject
                    </Button>
                  </>
                )}

                {a.status === ApplicationStatus.UNDER_REVIEW && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 size={13} />}
                      onClick={() => handleUpdateStatus(a._id, ApplicationStatus.OFFER_RECEIVED)}
                      title="Mark Offer Received"
                    >
                      Offer Received
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<XCircle size={13} />}
                      onClick={() => handleOpenRejectModal(a)}
                      title="Mark Rejected"
                    >
                      Reject
                    </Button>
                  </>
                )}

                {a.status === ApplicationStatus.OFFER_RECEIVED && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const leadId = getLeadId(a);
                      if (leadId) navigate(`/students/${leadId}?section=offers`);
                    }}
                  >
                    Manage Offer →
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        data={filteredApps}
        loading={loading}
        emptyMessage="No applications found matching the selected filter."
      />

      {/* --- Reject Application Modal --- */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Record University Rejection Decision"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={<XCircle size={14} />}
              loading={isRejecting}
              onClick={handleConfirmReject}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <form onSubmit={handleConfirmReject}>
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '12.5px',
              color: 'var(--danger-text)',
            }}
          >
            <strong>Note:</strong> Marking an application as Rejected moves it into the student's historical archive. The student will be allowed to select another university choice from their shortlist to submit a new application.
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              University & Course
            </label>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedAppForReject?.universityName} — {selectedAppForReject?.courseTitle}
            </div>
          </div>

          <Input
            label="Decision Date *"
            type="date"
            value={rejectionDecisionDate}
            onChange={(e) => setRejectionDecisionDate(e.target.value)}
            required
          />

          <Textarea
            label="Mandatory Rejection Reason *"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. GPA requirement not met, course capacity filled, missing academic prerequisites..."
            rows={4}
            required
            helperText="Provide specific feedback so the student and counsellor understand the university decision."
          />
        </form>
      </Modal>

      {/* --- Application Details Drawer --- */}
      <Drawer
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Application Details"
      >
        {selectedAppForDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Status Header Card */}
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Application Status
                </span>
                <div style={{ marginTop: '4px' }}>
                  <StatusBadge status={selectedAppForDetails.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Submitted On
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {new Date(selectedAppForDetails.submissionDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Rejection Alert Banner if rejected */}
            {selectedAppForDetails.status === ApplicationStatus.REJECTED && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 600, fontSize: '13px' }}>
                  <AlertCircle size={16} /> Rejection Reason
                </div>
                <div style={{ fontSize: '13px', color: 'var(--danger-text)', lineHeight: 1.4 }}>
                  {selectedAppForDetails.rejectionReason || 'No reason recorded'}
                </div>
                {selectedAppForDetails.decisionDate && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Decision Date: {new Date(selectedAppForDetails.decisionDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* Student & Target Details */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Student & Program Info
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Applicant</span>
                  <strong>{getLeadName(selectedAppForDetails)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Email</span>
                  <span>{getLeadEmail(selectedAppForDetails) || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>University</span>
                  <strong>{selectedAppForDetails.universityName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Country</span>
                  <span>{selectedAppForDetails.country}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Course Title</span>
                  <strong>{selectedAppForDetails.courseTitle}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Target Intake</span>
                  <span>{selectedAppForDetails.intake}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Application Number</span>
                  <strong>{selectedAppForDetails.applicationNumber || 'Pending / Not Assigned'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Staff Representative</span>
                  <span>{selectedAppForDetails.createdByName}</span>
                </div>
              </div>
            </div>

            {/* University Portal Credentials */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  University Portal Credentials
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPortalPassword(!showPortalPassword)}
                >
                  {showPortalPassword ? 'Hide' : 'Reveal'}
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Portal Username</span>
                  <code>{selectedAppForDetails.portalUsername || 'Not provided'}</code>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Portal Password</span>
                  <code>
                    {selectedAppForDetails.portalPassword
                      ? showPortalPassword
                        ? selectedAppForDetails.portalPassword
                        : '••••••••••••'
                      : 'Not provided'}
                  </code>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedAppForDetails.notes && (
              <div className="card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Submission Notes
                </h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {selectedAppForDetails.notes}
                </p>
              </div>
            )}

            {/* Bottom Actions inside drawer */}
            <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  const leadId = getLeadId(selectedAppForDetails);
                  if (leadId) navigate(`/students/${leadId}?section=applications`);
                }}
              >
                Go to Student Profile
              </Button>
              {selectedAppForDetails.status === ApplicationStatus.SUBMITTED && (
                <Button
                  variant="primary"
                  onClick={() => handleUpdateStatus(selectedAppForDetails._id, ApplicationStatus.UNDER_REVIEW)}
                >
                  Move to Under Review
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

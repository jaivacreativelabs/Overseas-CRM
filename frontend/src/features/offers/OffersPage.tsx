import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  ExternalLink,
  Check,
  X,
  Search,
  Eye,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  FileCheck,
} from 'lucide-react';
import { offerService } from './services/offerService';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge, Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal, Drawer } from '../../components/Modal';
import { Textarea } from '../../components/Form';
import { Offer, OfferStatus } from '../../types';

export const OffersPage: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OfferStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Rejection modal state for signed offer
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedOfferForReject, setSelectedOfferForReject] = useState<Offer | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Offer details drawer state
  const [selectedOfferForDetails, setSelectedOfferForDetails] = useState<Offer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await offerService.getAllOffers(
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setOffers(data);
    } catch (err: any) {
      error(err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [statusFilter]);

  const handleAccept = async (offerId: string) => {
    try {
      await offerService.reviewSignedOffer(offerId, {
        status: OfferStatus.ACCEPTED,
        notes: 'Signed offer verified and approved by counsellor.',
      });
      success('Signed offer accepted! Student fee payment stage unlocked.');
      fetchOffers();
      if (selectedOfferForDetails?._id === offerId) {
        setIsDetailsOpen(false);
      }
    } catch (err: any) {
      error(err.message || 'Acceptance failed');
    }
  };

  const handleOpenRejectModal = (offer: Offer) => {
    setSelectedOfferForReject(offer);
    setRejectNotes('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferForReject) return;
    if (!rejectNotes.trim()) {
      error('A reason/note is mandatory when rejecting a signed offer.');
      return;
    }

    setIsRejecting(true);
    try {
      await offerService.reviewSignedOffer(selectedOfferForReject._id, {
        status: OfferStatus.REJECTED,
        notes: rejectNotes.trim(),
        rejectionReason: rejectNotes.trim(),
      });
      success('Signed offer rejected. Feedback recorded and student notified to re-upload.');
      setIsRejectModalOpen(false);
      fetchOffers();
      if (selectedOfferForDetails?._id === selectedOfferForReject._id) {
        setIsDetailsOpen(false);
      }
    } catch (err: any) {
      error(err.message || 'Failed to reject offer');
    } finally {
      setIsRejecting(false);
    }
  };

  const getLeadId = (offer: Offer): string => {
    if (typeof offer.leadId === 'object' && offer.leadId?._id) {
      return offer.leadId._id;
    }
    return String(offer.leadId || '');
  };

  const getLeadName = (offer: Offer): string => {
    if (typeof offer.leadId === 'object' && offer.leadId?.name) {
      return offer.leadId.name;
    }
    return 'Student';
  };

  const getLeadEmail = (offer: Offer): string => {
    if (typeof offer.leadId === 'object' && offer.leadId?.email) {
      return offer.leadId.email;
    }
    return '';
  };

  const filteredOffers = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    const q = searchQuery.toLowerCase();
    return offers.filter((o) => {
      const studentName = typeof o.leadId === 'object' ? o.leadId?.name : '';
      const studentEmail = typeof o.leadId === 'object' ? o.leadId?.email : '';
      return (
        studentName?.toLowerCase().includes(q) ||
        studentEmail?.toLowerCase().includes(q) ||
        o.universityName?.toLowerCase().includes(q) ||
        o.courseTitle?.toLowerCase().includes(q)
      );
    });
  }, [offers, searchQuery]);

  const counts = useMemo(() => {
    const res: Record<string, number> = {
      ALL: offers.length,
      [OfferStatus.ISSUED]: 0,
      [OfferStatus.SIGNED_UPLOADED]: 0,
      [OfferStatus.ACCEPTED]: 0,
      [OfferStatus.REJECTED]: 0,
    };
    offers.forEach((o) => {
      if (res[o.status] !== undefined) {
        res[o.status]++;
      }
    });
    return res;
  }, [offers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Offer Letter Management
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Manage issued offer letters, review signed student acceptance agreements, and unlock tuition fee deposit processing.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Offers' },
            { key: OfferStatus.ISSUED, label: 'Issued (Pending Signature)' },
            { key: OfferStatus.SIGNED_UPLOADED, label: 'Signed Copy Uploaded' },
            { key: OfferStatus.ACCEPTED, label: 'Accepted' },
            { key: OfferStatus.REJECTED, label: 'Rejected' },
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
            placeholder="Search student, university, course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Offers Table */}
      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (o: Offer) => {
              const leadId = getLeadId(o);
              const name = getLeadName(o);
              const email = getLeadEmail(o);
              return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                    onClick={() => leadId && navigate(`/students/${leadId}?section=offers`)}
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
            header: 'UNIVERSITY & COURSE',
            render: (o: Offer) => (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.universityName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{o.courseTitle}</div>
              </div>
            ),
          },
          {
            header: 'OFFER TYPE',
            render: (o: Offer) => (
              <Badge variant={o.offerType === 'UNCONDITIONAL' ? 'success' : 'neutral'}>
                {o.offerType}
              </Badge>
            ),
          },
          {
            header: 'TUITION / DEPOSIT',
            render: (o: Offer) => (
              <div>
                <strong>
                  {o.currency} {o.depositAmount.toLocaleString()}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                  Tuition: {o.currency} {o.tuitionFee.toLocaleString()}
                </span>
              </div>
            ),
          },
          {
            header: 'OFFICIAL OFFER',
            render: (o: Offer) => (
              <a
                href={o.originalOfferUrl}
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
                <Award size={13} /> {o.originalOfferFileName || 'View Letter'} <ExternalLink size={11} />
              </a>
            ),
          },
          {
            header: 'SIGNED COPY',
            render: (o: Offer) =>
              o.signedOfferUrl ? (
                <a
                  href={o.signedOfferUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: 'var(--success)',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                  }}
                >
                  <FileCheck size={13} /> View Signed Copy <ExternalLink size={11} />
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Pending Upload</span>
              ),
          },
          {
            header: 'STATUS',
            render: (o: Offer) => <StatusBadge status={o.status} />,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (o: Offer) => (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Eye size={14} />}
                  onClick={() => {
                    setSelectedOfferForDetails(o);
                    setIsDetailsOpen(true);
                  }}
                  title="View Offer Details"
                >
                  Details
                </Button>

                {o.status === OfferStatus.SIGNED_UPLOADED && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Check size={13} />}
                      onClick={() => handleAccept(o._id)}
                      title="Accept Signed Offer"
                    >
                      Accept
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<X size={13} />}
                      onClick={() => handleOpenRejectModal(o)}
                      title="Reject Signed Offer"
                    >
                      Reject
                    </Button>
                  </>
                )}

                {o.status === OfferStatus.ACCEPTED && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const leadId = getLeadId(o);
                      if (leadId) navigate(`/students/${leadId}?section=payments`);
                    }}
                  >
                    Fee Payments →
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        data={filteredOffers}
        loading={loading}
        emptyMessage="No offer records found matching current filter."
      />

      {/* --- Reject Signed Offer Modal --- */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Signed Acceptance Copy"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={<X size={14} />}
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
            <strong>Attention:</strong> If the student uploaded an incomplete, illegible, or unsigned acceptance form, record feedback below. The student will be prompted in their portal to re-upload the signed declaration.
          </div>

          <Textarea
            label="Mandatory Rejection Feedback / Reason *"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="e.g. Signature missing on page 3, incorrect declaration date, illegible scan..."
            rows={4}
            required
            helperText="The student will see this note on their portal to correct their submission."
          />
        </form>
      </Modal>

      {/* --- Offer Details Drawer --- */}
      <Drawer
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Offer Letter & Acceptance Details"
      >
        {selectedOfferForDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Status Header */}
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
                  Offer Status
                </span>
                <div style={{ marginTop: '4px' }}>
                  <StatusBadge status={selectedOfferForDetails.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Offer Type
                </span>
                <div style={{ marginTop: '4px' }}>
                  <Badge variant={selectedOfferForDetails.offerType === 'UNCONDITIONAL' ? 'success' : 'neutral'}>
                    {selectedOfferForDetails.offerType}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Rejection Alert if rejected */}
            {selectedOfferForDetails.status === OfferStatus.REJECTED && (
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
                  <AlertCircle size={16} /> Signed Acceptance Rejected
                </div>
                <div style={{ fontSize: '13px', color: 'var(--danger-text)', lineHeight: 1.4 }}>
                  {selectedOfferForDetails.rejectionReason || selectedOfferForDetails.reviewNotes || 'Signed acceptance rejected by counsellor.'}
                </div>
              </div>
            )}

            {/* University & Program Info */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Program & Institution
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Student</span>
                  <strong>{getLeadName(selectedOfferForDetails)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Email</span>
                  <span>{getLeadEmail(selectedOfferForDetails) || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>University</span>
                  <strong>{selectedOfferForDetails.universityName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Course Title</span>
                  <strong>{selectedOfferForDetails.courseTitle}</strong>
                </div>
              </div>
            </div>

            {/* Financial Requirements */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Financial & Deposit Breakdown
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Tuition Fee</span>
                  <strong>{selectedOfferForDetails.currency} {selectedOfferForDetails.tuitionFee.toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Required Deposit</span>
                  <strong style={{ color: 'var(--primary)' }}>
                    {selectedOfferForDetails.currency} {selectedOfferForDetails.depositAmount.toLocaleString()}
                  </strong>
                </div>
                {selectedOfferForDetails.deadlineDate && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Acceptance Deadline</span>
                    <span>{new Date(selectedOfferForDetails.deadlineDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Issued By</span>
                  <span>{selectedOfferForDetails.uploadedByName}</span>
                </div>
              </div>
            </div>

            {/* Conditions / Contingencies */}
            {selectedOfferForDetails.conditions && (
              <div className="card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Offer Conditions & Requirements
                </h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {selectedOfferForDetails.conditions}
                </p>
              </div>
            )}

            {/* Documents Links */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Offer Documents
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Official University Letter:</span>
                  <a
                    href={selectedOfferForDetails.originalOfferUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    Download <ExternalLink size={12} />
                  </a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Signed Student Copy:</span>
                  {selectedOfferForDetails.signedOfferUrl ? (
                    <a
                      href={selectedOfferForDetails.signedOfferUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--success)', fontWeight: 500, fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      View Signed File <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Pending Upload</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions inside Drawer */}
            <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  const leadId = getLeadId(selectedOfferForDetails);
                  if (leadId) navigate(`/students/${leadId}?section=offers`);
                }}
              >
                Go to Student Profile
              </Button>
              {selectedOfferForDetails.status === OfferStatus.SIGNED_UPLOADED && (
                <>
                  <Button
                    variant="primary"
                    icon={<Check size={14} />}
                    onClick={() => handleAccept(selectedOfferForDetails._id)}
                  >
                    Accept Signed Offer
                  </Button>
                  <Button
                    variant="danger"
                    icon={<X size={14} />}
                    onClick={() => handleOpenRejectModal(selectedOfferForDetails)}
                  >
                    Reject Signed Copy
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

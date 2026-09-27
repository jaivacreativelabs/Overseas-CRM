import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ExternalLink, Check, FileText, CheckCircle2, Eye, Download, Upload } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge, Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { OfferStatus } from '../../types';

export const OffersPage: React.FC = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/leads', { limit: 100 });
      const allOffers: any[] = [];
      for (const lead of res.data || []) {
        const leadOffers = await apiClient.get<any[]>(`/offers/lead/${lead._id}`).catch(() => ({ data: [] }));
        (leadOffers.data || []).forEach((o) => {
          allOffers.push({ ...o, studentName: lead.name, leadId: lead._id, studentEmail: lead.email });
        });
      }
      setOffers(allOffers);
    } catch (err: any) {
      error(err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleUploadSignedOffer = async (offerId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post(`/offers/${offerId}/signed`, formData);
      success('Signed Offer Letter uploaded successfully!');
      fetchOffers();
    } catch (err: any) {
      error(err.message || 'Failed to upload signed offer letter');
    }
  };

  const handleAccept = async (offerId: string) => {
    try {
      await apiClient.put(`/offers/${offerId}/review`, { status: OfferStatus.ACCEPTED });
      success('Signed offer accepted. Fee payment stage unlocked.');
      fetchOffers();
    } catch (err: any) {
      error(err.message || 'Acceptance failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Official Offer Letter Management
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Independent record keeping for Original Issued Offers and Signed Acceptance Copies with upload timestamps.
        </p>
      </div>

      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (o) => (
              <div>
                <strong
                  style={{ color: 'var(--primary)', cursor: 'pointer' }}
                  onClick={() => navigate(`/leads/${o.leadId}`)}
                >
                  {o.studentName}
                </strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.studentEmail}</div>
              </div>
            ),
          },
          { header: 'UNIVERSITY & COURSE', render: (o) => <div><strong>{o.universityName}</strong><div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{o.courseTitle} ({o.offerType})</div></div> },
          {
            header: 'DEPOSIT REQUIRED',
            render: (o) => `${o.currency} ${o.depositAmount.toLocaleString()}`,
          },
          {
            header: '1. ORIGINAL OFFER LETTER',
            render: (o) => (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                  {o.originalOfferFileName || 'Original Offer'}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <a
                    href={o.originalOfferUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    <Eye size={12} /> View
                  </a>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download size={12} />}
                    onClick={() => window.open(`http://localhost:5000/api/v1/offers/${o._id}/download/original`, '_blank')}
                  >
                    Download
                  </Button>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Issued: {new Date(o.createdAt).toLocaleDateString()}
                </div>
              </div>
            ),
          },
          {
            header: '2. SIGNED ACCEPTANCE COPY',
            render: (o) =>
              o.signedOfferUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> Signed Offer Letter
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {o.signedOfferFileName || 'signed_offer.pdf'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <a
                      href={o.signedOfferUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        color: 'var(--success)',
                        textDecoration: 'none',
                        fontWeight: 600,
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    >
                      <Eye size={12} /> View
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download size={12} />}
                      onClick={() => window.open(`http://localhost:5000/api/v1/offers/${o._id}/download/signed`, '_blank')}
                    >
                      Download
                    </Button>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Uploaded: {o.signedUploadedAt ? new Date(o.signedUploadedAt).toLocaleString() : new Date(o.updatedAt).toLocaleString()}
                  </div>
                  <input
                    type="file"
                    id={`upload-signed-${o._id}`}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleUploadSignedOffer(o._id, e.target.files[0]);
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '11px',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                      marginTop: '2px',
                    }}
                    onClick={() => document.getElementById(`upload-signed-${o._id}`)?.click()}
                  >
                    Re-upload Signed Offer
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', fontWeight: 500 }}>
                    Signed Offer Letter Not Available
                  </span>
                  <input
                    type="file"
                    id={`upload-signed-${o._id}`}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleUploadSignedOffer(o._id, e.target.files[0]);
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Upload size={12} />}
                    onClick={() => document.getElementById(`upload-signed-${o._id}`)?.click()}
                  >
                    Upload Signed Offer Letter
                  </Button>
                </div>
              ),
          },
          {
            header: 'STATUS',
            render: (o) => <StatusBadge status={o.status} />,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (o) =>
              o.status === OfferStatus.SIGNED_UPLOADED && (
                <Button variant="primary" size="sm" icon={<Check size={14} />} onClick={() => handleAccept(o._id)}>
                  Accept Signed Offer
                </Button>
              ),
          },
        ]}
        data={offers}
        loading={loading}
        emptyMessage="No offer letters issued yet."
      />
    </div>
  );
};

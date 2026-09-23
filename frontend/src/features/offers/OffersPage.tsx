import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ExternalLink, Check } from 'lucide-react';
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
      const res = await apiClient.get<any[]>('/leads', { limit: 50 });
      const allOffers: any[] = [];
      for (const lead of res.data || []) {
        const leadOffers = await apiClient.get<any[]>(`/offers/lead/${lead._id}`).catch(() => ({ data: [] }));
        (leadOffers.data || []).forEach((o) => {
          allOffers.push({ ...o, studentName: lead.name, leadId: lead._id });
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
          Offer Letter Management
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Manage issued offer letters, review signed student acceptances, and unlock tuition fee deposit processing.
        </p>
      </div>

      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (o) => (
              <div
                style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                onClick={() => navigate(`/students/${o.leadId}`)}
              >
                {o.studentName}
              </div>
            ),
          },
          { header: 'UNIVERSITY', accessor: 'universityName' },
          { header: 'COURSE', accessor: 'courseTitle' },
          {
            header: 'DEPOSIT REQUIRED',
            render: (o) => `${o.currency} ${o.depositAmount.toLocaleString()}`,
          },
          {
            header: 'SIGNED OFFER PROOF',
            render: (o) =>
              o.signedOfferUrl ? (
                <a
                  href={o.signedOfferUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--success)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Award size={14} /> View Signed Offer <ExternalLink size={12} />
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Pending Signature</span>
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
                  Accept Offer
                </Button>
              ),
          },
        ]}
        data={offers}
        loading={loading}
        emptyMessage="No offer letters found."
      />
    </div>
  );
};

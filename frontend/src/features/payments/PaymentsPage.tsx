import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ExternalLink, Check } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PaymentStatus } from '../../types';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/leads', { limit: 50 });
      const allPayments: any[] = [];
      for (const lead of res.data || []) {
        const leadPayments = await apiClient.get<any[]>(`/payments/lead/${lead._id}`).catch(() => ({ data: [] }));
        (leadPayments.data || []).forEach((p) => {
          allPayments.push({ ...p, studentName: lead.name, leadId: lead._id });
        });
      }
      setPayments(allPayments);
    } catch (err: any) {
      error(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleVerify = async (paymentId: string) => {
    try {
      await apiClient.put(`/payments/${paymentId}/verify`, { status: PaymentStatus.VERIFIED });
      success('Payment officially verified! Visa stage unlocked.');
      fetchPayments();
    } catch (err: any) {
      error(err.message || 'Verification failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Fee Payment & Receipts
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Track tuition deposit requests, verify student transaction receipts, and maintain financial reconciliation.
        </p>
      </div>

      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (p) => (
              <div
                style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                onClick={() => navigate(`/students/${p.leadId}`)}
              >
                {p.studentName}
              </div>
            ),
          },
          { header: 'PURPOSE', accessor: 'title' },
          {
            header: 'AMOUNT',
            render: (p) => <strong>{p.currency} {p.amount.toLocaleString()}</strong>,
          },
          { header: 'REFERENCE NO', accessor: 'transactionReference' },
          {
            header: 'PROOF RECEIPT',
            render: (p) =>
              p.proofUrl ? (
                <a
                  href={p.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <CreditCard size={14} /> View Receipt <ExternalLink size={12} />
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Pending Proof</span>
              ),
          },
          {
            header: 'STATUS',
            render: (p) => <StatusBadge status={p.status} />,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (p) =>
              p.status === PaymentStatus.PROOF_SUBMITTED && (
                <Button variant="primary" size="sm" icon={<Check size={14} />} onClick={() => handleVerify(p._id)}>
                  Verify Payment
                </Button>
              ),
          },
        ]}
        data={payments}
        loading={loading}
        emptyMessage="No fee payment requests found."
      />
    </div>
  );
};

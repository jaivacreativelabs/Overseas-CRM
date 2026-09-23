import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stamp, Check } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { VisaStatus } from '../../types';

export const VisaPage: React.FC = () => {
  const [visas, setVisas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchVisas = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/leads', { limit: 50 });
      const allVisas: any[] = [];
      for (const lead of res.data || []) {
        const visaData = await apiClient.get<any>(`/visa/lead/${lead._id}`).catch(() => ({ data: null }));
        if (visaData.data) {
          allVisas.push({ ...visaData.data, studentName: lead.name, leadId: lead._id });
        }
      }
      setVisas(allVisas);
    } catch (err: any) {
      error(err.message || 'Failed to load visa records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisas();
  }, []);

  const handleApprove = async (leadId: string) => {
    try {
      await apiClient.put(`/visa/lead/${leadId}`, {
        status: VisaStatus.APPROVED,
        visaNumber: `V-${Math.floor(100000 + Math.random() * 900000)}`,
        decisionDate: new Date(),
      });
      success('Visa approved! Pre-departure unlocked.');
      fetchVisas();
    } catch (err: any) {
      error(err.message || 'Failed to approve visa');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Student Visa Tracking
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Track visa appointments, biometric schedules, and official embassy grant decisions.
        </p>
      </div>

      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (v) => (
              <div
                style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                onClick={() => navigate(`/students/${v.leadId}`)}
              >
                {v.studentName}
              </div>
            ),
          },
          { header: 'DESTINATION COUNTRY', accessor: 'country' },
          { header: 'VISA TYPE', accessor: 'visaType' },
          { header: 'GRANT NUMBER', accessor: 'visaNumber' },
          {
            header: 'STATUS',
            render: (v) => <StatusBadge status={v.status} />,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (v) =>
              v.status !== VisaStatus.APPROVED && (
                <Button variant="primary" size="sm" icon={<Check size={14} />} onClick={() => handleApprove(v.leadId)}>
                  Record Approval
                </Button>
              ),
          },
        ]}
        data={visas}
        loading={loading}
        emptyMessage="No active visa records in progress."
      />
    </div>
  );
};

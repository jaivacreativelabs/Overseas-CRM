import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge, Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ApplicationStatus } from '../../types';

export const ApplicationsPage: React.FC = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/leads', { limit: 50 });
      const allApps: any[] = [];
      for (const lead of res.data || []) {
        const leadApps = await apiClient.get<any[]>(`/applications/lead/${lead._id}`).catch(() => ({ data: [] }));
        (leadApps.data || []).forEach((a) => {
          allApps.push({ ...a, studentName: lead.name, leadId: lead._id });
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

  const handleUpdateStatus = async (appId: string, status: ApplicationStatus) => {
    try {
      await apiClient.put(`/applications/${appId}/status`, { status });
      success(`Application status updated to ${status}.`);
      fetchApplications();
    } catch (err: any) {
      error(err.message || 'Failed to update application');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          University Application Tracker
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Monitor active university submissions and record offer decisions or rejections.
        </p>
      </div>

      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (a) => (
              <div
                style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                onClick={() => navigate(`/students/${a.leadId}`)}
              >
                {a.studentName}
              </div>
            ),
          },
          { header: 'UNIVERSITY', accessor: 'universityName' },
          { header: 'COURSE', accessor: 'courseTitle' },
          { header: 'APP NO', accessor: 'applicationNumber' },
          {
            header: 'SUBMISSION DATE',
            render: (a) => new Date(a.submissionDate).toLocaleDateString(),
          },
          {
            header: 'STATUS',
            render: (a) => <StatusBadge status={a.status} />,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (a) =>
              a.status !== ApplicationStatus.OFFER_RECEIVED && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUpdateStatus(a._id, ApplicationStatus.OFFER_RECEIVED)}
                >
                  Mark Offer Received
                </Button>
              ),
          },
        ]}
        data={apps}
        loading={loading}
        emptyMessage="No active applications currently in pipeline."
      />
    </div>
  );
};

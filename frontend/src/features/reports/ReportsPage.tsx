import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Award } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { Table } from '../../components/Table';
import { Badge } from '../../components/Badge';

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await apiClient.get('/reports/dashboard');
        setData(res.data);
      } catch (err) {}
      finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Generating operational reports...</div>;

  const kpis = data?.kpis || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Operational Reports & Analytics
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Comprehensive conversion funnels, source acquisition performance, and financial revenue tracking.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL REVENUE VERIFIED</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
            ${(kpis.verifiedRevenue || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--success)' }}>Confirmed Tuition Deposits</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>STUDENT CONVERSION RATE</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {kpis.totalLeads > 0 ? Math.round((kpis.activeStudents / kpis.totalLeads) * 100) : 0}%
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Leads marked as Interested</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '16px' }}>Lead Journey Conversion Funnel Analysis</h3>
        <Table
          columns={[
            {
              header: 'LIFECYCLE STAGE',
              render: (f: any) => <strong>{f.stage.replace(/_/g, ' ')}</strong>,
            },
            {
              header: 'ACTIVE STUDENTS IN STAGE',
              render: (f: any) => <Badge variant="primary">{f.count} Students</Badge>,
            },
            {
              header: 'PERCENTAGE OF TOTAL PIPELINE',
              render: (f: any) =>
                `${kpis.totalLeads > 0 ? Math.round((f.count / kpis.totalLeads) * 100) : 0}%`,
            },
          ]}
          data={data?.funnelStages || []}
        />
      </div>
    </div>
  );
};

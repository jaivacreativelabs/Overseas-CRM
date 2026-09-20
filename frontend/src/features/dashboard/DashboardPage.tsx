import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  FileCheck,
  CheckSquare,
  Stamp,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  UserPlus,
  Calendar,
  CreditCard,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useAuth } from '../../context/AuthContext';
import { Table } from '../../components/Table';
import { Badge, StatusBadge } from '../../components/Badge';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get('/reports/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Error loading dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading operational CRM metrics...
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #154D96 0%, #0057F8 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 14px rgba(0, 87, 248, 0.2)',
        }}
      >
        <div>
          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
            IIEC Overseas Consultancy Platform
          </span>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0 6px', color: '#FFFFFF' }}>
            Welcome back, {user?.name || 'Team'}! 👋
          </h1>
          <p style={{ fontSize: '13px', opacity: 0.85, margin: 0, maxWidth: '600px' }}>
            Monitor your student journeys from inquiry to university arrival. You currently have{' '}
            <strong>{kpis.activeStudents || 0} active students</strong> progressing through the 14-stage lifecycle.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/leads')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#FFFFFF',
              color: '#0057F8',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          >
            <UserPlus size={16} />
            <span>Manage Leads</span>
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          onClick={() => navigate('/counselling')}
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ padding: '8px', backgroundColor: '#EFF6FF', borderRadius: '8px', color: 'var(--primary)' }}>
            <Calendar size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Counselling Sessions</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Schedule & log meet calls</div>
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
        </div>

        <div
          onClick={() => navigate('/documents')}
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ padding: '8px', backgroundColor: '#ECFDF5', borderRadius: '8px', color: 'var(--success)' }}>
            <FileCheck size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Document Reviews</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Approve student files</div>
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
        </div>

        <div
          onClick={() => navigate('/payments')}
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ padding: '8px', backgroundColor: '#FFFBEB', borderRadius: '8px', color: 'var(--warning)' }}>
            <CreditCard size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Fee Payments</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Verify wire receipts</div>
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
        </div>

        <div
          onClick={() => navigate('/tasks')}
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ padding: '8px', backgroundColor: '#FEF2F2', borderRadius: '8px', color: 'var(--danger)' }}>
            <CheckSquare size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Follow-up Tasks</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{kpis.pendingTasks || 0} pending items</div>
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL LEADS</span>
            <Users size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpis.totalLeads || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px' }}>
            Active CRM Pipeline
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ACTIVE STUDENTS</span>
            <GraduationCap size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpis.activeStudents || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Interested & Processing
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>APPLICATIONS UNDERWAY</span>
            <FileCheck size={18} color="var(--info)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpis.activeApplications || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Submitted & Under Review
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>PENDING TASKS</span>
            <CheckSquare size={18} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpis.pendingTasks || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px' }}>
            Action items requiring attention
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>VISAS APPROVED</span>
            <Stamp size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpis.approvedVisas || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px' }}>
            Ready for Departure
          </div>
        </div>
      </div>

      {/* Middle Row: Funnel & Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Stage Funnel */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Student Lifecycle Pipeline Funnel</h3>
            <Badge variant="primary">12 Stages</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(data?.funnelStages || []).map((fs: any) => (
              <div key={fs.stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {fs.stage.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{fs.count}</span>
                </div>
                <div
                  style={{
                    height: '6px',
                    backgroundColor: 'var(--bg-hover)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (fs.count / Math.max(1, kpis.totalLeads)) * 100)}%`,
                      backgroundColor: 'var(--primary)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leads by Source */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Leads by Acquisition Source</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(data?.leadsBySource || []).map((s: any) => (
              <div
                key={s.source}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {s.source.replace(/_/g, ' ')}
                  </span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {s.count} Leads
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Counsellor Workload Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Counsellor Workload & Performance</h3>
        </div>
        <Table
          columns={[
            { header: 'COUNSELLOR NAME', accessor: 'name' },
            { header: 'EMAIL', accessor: 'email' },
            {
              header: 'ASSIGNED LEADS',
              render: (c: any) => <strong>{c.assignedLeads}</strong>,
            },
            {
              header: 'PENDING TASKS',
              render: (c: any) => (
                <Badge variant={c.pendingTasks > 3 ? 'warning' : 'neutral'}>
                  {c.pendingTasks} Pending
                </Badge>
              ),
            },
          ]}
          data={data?.counsellorStats || []}
        />
      </div>
    </div>
  );
};

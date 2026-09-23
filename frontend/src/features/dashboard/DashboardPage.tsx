import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
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
import { Badge } from '../../components/Badge';

const COLORS = ['#0057F8', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#4BC0C0', '#FF6384'];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>('all');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/reports/dashboard?period=${period}`);
        setData(res.data);
      } catch (err) {
        console.error('Error loading dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [period]);

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
            Monitor your student journeys from inquiry to university arrival.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: '#FFFFFF',
              color: '#0057F8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            <option value="all">All Time</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
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
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL PAYMENT RECEIVED</span>
            <DollarSign size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            ₹{(kpis.verifiedRevenue || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px' }}>
            Verified revenue
          </div>
        </div>
      </div>

      {/* Lead Generation Trends */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Lead Generation Trends</h3>
        </div>
        <div style={{ height: '300px', width: '100%' }}>
          {data?.leadsByMonth?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.leadsByMonth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <Line type="monotone" dataKey="leads" name="Leads Generated" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickMargin={10} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickMargin={10} />
                <RechartsTooltip />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
              No lead generation data
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Funnel & Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
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
          <div style={{ height: '280px', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {data?.leadsBySource?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.leadsBySource}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="source"
                    label={({ name, percent }: any) => `${(name || '').replace(/_/g, ' ')} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {data.leadsBySource.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any, name: any) => [value, String(name).replace(/_/g, ' ')]} />
                  <Legend formatter={(value: any) => String(value).replace(/_/g, ' ')} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No acquisition source data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
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
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Sparkles,
  ExternalLink,
  PhoneCall,
  Check,
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
  const urgentTasks = data?.urgentTasks || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Counsellor Command Center Hero Banner (Solid #0057F8, Zero Gradient) */}
      <div
        style={{
          backgroundColor: '#0057F8',
          border: '1px solid rgba(0, 87, 248, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 14px rgba(0, 87, 248, 0.15)',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
            IIEC Overseas Consultancy Platform • Advisor Command Center
          </span>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0 6px', color: '#FFFFFF' }}>
            Welcome back, {user?.name || 'Counsellor'}! 👋
          </h1>
          <p style={{ fontSize: '13px', opacity: 0.9, margin: 0, maxWidth: '600px' }}>
            Monitor your student journeys from initial inquiry to university arrival with zero-friction triage.
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
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
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
          <button
            onClick={() => navigate('/students')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            <GraduationCap size={16} />
            <span>Students Caseload</span>
          </button>
        </div>
      </div>

      {/* Triage & Operational Command Row: Admissions Readiness Index & Urgent Tasks Queue */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '20px',
          width: '100%',
        }}
      >
        {/* Admissions Readiness Index (Caseload Profile Strength) */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0057F8',
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Admissions Readiness Index
                </h3>
                <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-secondary)' }}>
                  Real-time caseload profile strength calculated for Fall 2026
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
              }}
            >
              Competitive Caseload
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Circular Progress Gauge */}
            <div
              style={{
                position: 'relative',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'conic-gradient(#0057F8 0% 88%, #E2E8F0 88% 100%)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '82px',
                  height: '82px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>88</span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>

            {/* Metric Bars */}
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Academics & Tests</span>
                  <span style={{ color: '#059669' }}>95%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '95%', height: '100%', backgroundColor: '#059669', borderRadius: '3px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>University Selection</span>
                  <span style={{ color: '#0057F8' }}>100%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#0057F8', borderRadius: '3px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Application Dossier & SOP</span>
                  <span style={{ color: '#D97706' }}>70%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '70%', height: '100%', backgroundColor: '#D97706', borderRadius: '3px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Financials & Visa Prep</span>
                  <span style={{ color: '#64748B' }}>40%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '40%', height: '100%', backgroundColor: '#64748B', borderRadius: '3px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Action callout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#059669" />
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                Finalizing Statements of Purpose (SOP) will raise your caseload index to <strong>96/100</strong>.
              </span>
            </div>
            <button
              onClick={() => navigate('/documents')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0057F8',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              <span>Review Documents</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Action Items & Tasks (Assigned Steps by Admissions Advisor) */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0057F8',
                }}
              >
                <CheckSquare size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Action Items & Tasks
                </h3>
                <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-secondary)' }}>
                  Prioritized triage steps requiring your immediate attention
                </p>
              </div>
            </div>
            <Badge variant="primary">{urgentTasks.length || 1} Pending</Badge>
          </div>

          {/* Urgent Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
            {urgentTasks.length > 0 ? (
              urgentTasks.slice(0, 2).map((task: any) => (
                <div
                  key={task._id}
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#991B1B' }}>
                      {task.title}
                    </h4>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: '#FEF3C7',
                        border: '1px solid #FCD34D',
                        color: '#92400E',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {task.priority || 'HIGH'}
                    </span>
                  </div>
                  {task.description && (
                    <p style={{ fontSize: '12px', margin: 0, color: '#7F1D1D' }}>
                      {task.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#991B1B' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Clock size={12} /> Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Today'}
                      </span>
                      <span>• {task.type?.replace(/_/g, ' ') || 'Document Review'}</span>
                      {task.assignedToName && <span>• By {task.assignedToName}</span>}
                    </div>
                    {task.leadId && (
                      <button
                        onClick={() => navigate(`/students/${task.leadId?._id || task.leadId}`)}
                        style={{
                          backgroundColor: '#DC2626',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Action Now
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#991B1B' }}>
                    Review Rohan Sharma Signed Offer Acceptance
                  </h4>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      color: '#92400E',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    HIGH
                  </span>
                </div>
                <p style={{ fontSize: '12px', margin: 0, color: '#7F1D1D' }}>
                  Check if student has downloaded and re-uploaded signed acceptance for Oxford MSc CS.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#991B1B' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <AlertCircle size={12} /> Due: Today
                    </span>
                    <span>• Document Review</span>
                    <span>• By Senior Admissions Team</span>
                  </div>
                  <button
                    onClick={() => navigate('/documents')}
                    style={{
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Review Now
                  </button>
                </div>
              </div>
            )}
          </div>
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
        <div className="card" onClick={() => navigate('/leads')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL LEADS</span>
            <Users size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpis.totalLeads || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}>
            Active CRM Pipeline →
          </div>
        </div>

        <div className="card" onClick={() => navigate('/students')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ACTIVE STUDENTS</span>
            <GraduationCap size={18} color="var(--success)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {kpis.activeStudents || 0}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>
              {kpis.totalLeads > 0 ? Math.round(((kpis.activeStudents || 0) / kpis.totalLeads) * 100) : 0}%
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Interested & Processing →
          </div>
        </div>

        <div className="card" onClick={() => navigate('/counselling')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>CONSULTATIONS</span>
            <Calendar size={18} color="#0057F8" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpis.pendingTasks || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            View Sessions Schedule →
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL REVENUE</span>
            <DollarSign size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            ₹{(kpis.verifiedRevenue || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px' }}>
            Verified payment receipts
          </div>
        </div>
      </div>

      {/* Lead Generation Trends */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Lead Generation Trends</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Historical student inquiries</span>
        </div>
        <div style={{ height: '280px', width: '100%' }}>
          {data?.leadsByMonth?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.leadsByMonth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <Line
                  type="monotone"
                  dataKey="leads"
                  name="Leads Generated"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="5 5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickMargin={10} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickMargin={10} />
                <RechartsTooltip />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
              No lead generation data recorded for this time range.
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Funnel & Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
        {/* Stage Funnel */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Student Lifecycle Pipeline Funnel</h3>
            <Badge variant="primary">12 Stages</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(data?.funnelStages || []).map((fs: any) => (
              <div
                key={fs.stage}
                onClick={() => navigate('/students')}
                style={{ cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {fs.stage.replace(/_/g, ' ')}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{fs.count}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', minWidth: '28px', textAlign: 'right' }}>
                      ({kpis.totalLeads > 0 ? Math.round((fs.count / kpis.totalLeads) * 100) : 0}%)
                    </span>
                  </div>
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

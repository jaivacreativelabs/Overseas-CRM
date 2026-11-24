import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Users, GraduationCap, FileCheck, Stamp, ListTodo, IndianRupee } from 'lucide-react';
import { apiClient } from '../../services/api-client';

type Period = 'all' | 'weekly' | 'monthly' | 'yearly';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'weekly', label: 'Last 7 days' },
  { value: 'monthly', label: 'Last 30 days' },
  { value: 'yearly', label: 'Last 12 months' },
];

const BRAND = '#0057F8';

const prettify = (s: string) =>
  (s || 'Unknown')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  padding: '14px',
  backgroundColor: '#FFFFFF',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: 0,
};

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  minHeight: '120px',
  fontSize: '12.5px',
  color: 'var(--text-muted)',
  textAlign: 'center',
};

/**
 * Branch-scoped analytics for the Owner Admin's branch view.
 * Reuses /reports/dashboard, which already scopes every metric to the given branch.
 */
export const BranchAnalytics: React.FC<{ branchId: string }> = ({ branchId }) => {
  const [period, setPeriod] = useState<Period>('all');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    apiClient
      .get<any>('/reports/dashboard', { period, branchId })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err: any) => {
        if (!cancelled) setLoadError(err?.message || 'Failed to load branch analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, period]);

  const kpis = data?.kpis || {};
  const totalLeads: number = kpis.totalLeads || 0;
  const activeStudents: number = kpis.activeStudents || 0;
  const conversion = totalLeads > 0 ? Math.round((activeStudents / totalLeads) * 100) : 0;

  const sources: { source: string; count: number }[] = (data?.leadsBySource || []).map((s: any) => ({
    source: prettify(s.source),
    count: s.count,
  }));
  const stages: { stage: string; count: number }[] = (data?.funnelStages || []).filter((s: any) => s.count > 0);
  const maxStage = Math.max(1, ...stages.map((s) => s.count));
  const trend: { name: string; leads: number }[] = data?.leadsByMonth || [];

  const kpiTiles = [
    { label: 'Total leads', value: totalLeads.toLocaleString(), icon: <Users size={16} color={BRAND} /> },
    {
      label: 'Active students',
      value: activeStudents.toLocaleString(),
      hint: `${conversion}% of leads`,
      icon: <GraduationCap size={16} color="#059669" />,
    },
    { label: 'Active applications', value: (kpis.activeApplications || 0).toLocaleString(), icon: <FileCheck size={16} color={BRAND} /> },
    { label: 'Visas approved', value: (kpis.approvedVisas || 0).toLocaleString(), icon: <Stamp size={16} color={BRAND} /> },
    { label: 'Pending tasks', value: (kpis.pendingTasks || 0).toLocaleString(), icon: <ListTodo size={16} color={BRAND} /> },
    {
      label: 'Verified revenue',
      value: `₹${(kpis.verifiedRevenue || 0).toLocaleString('en-IN')}`,
      icon: <IndianRupee size={16} color="#059669" />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Performance of leads and students assigned to this branch.
        </div>
        <select
          className="form-select"
          aria-label="Analytics time range"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          style={{ width: '160px' }}
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {loadError ? (
        <div style={{ ...cardStyle, color: '#DC2626', fontSize: '13px' }}>{loadError}</div>
      ) : loading && !data ? (
        <div style={{ ...emptyStyle, minHeight: '240px' }}>Loading branch analytics…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }}>
          {/* KPI tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {kpiTiles.map((k) => (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    {k.label}
                  </span>
                  {k.icon}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px', lineHeight: 1.1 }}>
                  {k.value}
                </div>
                {k.hint && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{k.hint}</div>}
              </div>
            ))}
          </div>

          {/* Lead trend */}
          <div style={cardStyle}>
            <h4 style={sectionTitle}>New leads over time</h4>
            <div style={{ height: '200px', marginTop: '10px' }}>
              {trend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="branchLeadsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#EEF2F7" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ stroke: '#94A3B8', strokeDasharray: '3 3' }}
                      formatter={(v: any) => [v, 'New leads']}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      stroke={BRAND}
                      strokeWidth={2}
                      fill="url(#branchLeadsFill)"
                      dot={trend.length <= 12 ? { r: 3, fill: BRAND, stroke: '#FFFFFF', strokeWidth: 2 } : false}
                      activeDot={{ r: 5, fill: BRAND, stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={emptyStyle}>No leads in this time range.</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '14px' }}>
            {/* Leads by source */}
            <div style={cardStyle}>
              <h4 style={sectionTitle}>Leads by source</h4>
              <div style={{ height: `${Math.max(120, sources.length * 34 + 10)}px`, marginTop: '10px' }}>
                {sources.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sources} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }} barCategoryGap={8}>
                      <XAxis type="number" hide allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="source"
                        width={110}
                        tick={{ fontSize: 11.5, fill: '#374151' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0, 87, 248, 0.06)' }}
                        formatter={(v: any) => [v, 'Leads']}
                        contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                      />
                      <Bar
                        dataKey="count"
                        fill={BRAND}
                        radius={[0, 4, 4, 0]}
                        maxBarSize={18}
                        label={{ position: 'right', fontSize: 11.5, fill: '#374151' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={emptyStyle}>No leads in this time range.</div>
                )}
              </div>
            </div>

            {/* Pipeline stages */}
            <div style={cardStyle}>
              <h4 style={sectionTitle}>Pipeline by stage</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '12px' }}>
                {stages.length ? (
                  stages.map((s) => (
                    <div key={s.stage} title={`${prettify(s.stage)}: ${s.count}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: '#374151' }}>{prettify(s.stage)}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {s.count}
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                            {totalLeads > 0 ? Math.round((s.count / totalLeads) * 100) : 0}%
                          </span>
                        </span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#EEF2F7', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(s.count / maxStage) * 100}%`,
                            backgroundColor: BRAND,
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={emptyStyle}>No leads in this time range.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

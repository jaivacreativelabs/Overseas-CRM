import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Globe,
  Calendar,
  Clock,
  User,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Lead, LeadSource, LeadStatus, StudentStage, User as UserType } from '../../types';
import { Table, Pagination, SearchInput } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge, StatusBadge } from '../../components/Badge';
import { Drawer } from '../../components/Modal';
import { Input, Select, Textarea } from '../../components/Form';
import { timeAgo } from '../../utils/timeAgo';
import { StudentAvatar } from '../../components/StudentAvatar';


// Same rule the backend uses for the Students list: Interested, or a student portal account exists.
const isConvertedLead = (l: Lead) => !!l.studentUserId || l.status === LeadStatus.INTERESTED;

type Journey = 'lead' | 'converted' | 'closed';

// Mirrors JOURNEY_CONDITIONS in the backend lead service.
const getJourney = (l: Lead): Journey => {
  if (isConvertedLead(l)) return 'converted';
  if (l.status === LeadStatus.CLOSED_LOST || l.status === LeadStatus.NOT_INTERESTED) return 'closed';
  return 'lead';
};

const JOURNEY_STYLES: Record<Journey, { text: string; fg: string; bg: string; dot: string; bar: string }> = {
  lead: { text: 'Still a lead', fg: '#92400E', bg: '#FFF7E6', dot: '#D97706', bar: '#D97706' },
  converted: { text: 'Converted to student', fg: '#065F46', bg: '#E7F8F0', dot: '#059669', bar: '#059669' },
  closed: { text: 'Closed', fg: '#991B1B', bg: '#FDECEC', dot: '#DC2626', bar: '#9CA3AF' },
};

const STAGE_ORDER = Object.values(StudentStage);

const toTitle = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

/** Lead Logs "Journey" cell: journey pill, status, stage name and a stage progress bar. */
const JourneyCell: React.FC<{ lead: Lead }> = ({ lead }) => {
  const journey = getJourney(lead);
  const s = JOURNEY_STYLES[journey];
  const stepIndex = STAGE_ORDER.indexOf(lead.stage);
  const step = stepIndex >= 0 ? stepIndex + 1 : 1;
  const pct = Math.round((step / STAGE_ORDER.length) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '2px 9px',
            borderRadius: '999px',
            backgroundColor: s.bg,
            color: s.fg,
            whiteSpace: 'nowrap',
          }}
        >
          {s.text}
        </span>
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: '#4B5563',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '1px 6px',
            whiteSpace: 'nowrap',
          }}
        >
          {(lead.status || '').replace(/_/g, ' ')}
        </span>
      </div>
      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{toTitle(lead.stage)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          role="progressbar"
          aria-label="Pipeline progress"
          aria-valuemin={1}
          aria-valuemax={STAGE_ORDER.length}
          aria-valuenow={step}
          style={{ flex: 1, maxWidth: '140px', height: '6px', backgroundColor: '#EEF0F3', borderRadius: '999px', overflow: 'hidden' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: s.bar, borderRadius: '999px' }} />
        </div>
        <span style={{ fontSize: '11px', color: '#4B5563', whiteSpace: 'nowrap' }}>
          Stage {step} of {STAGE_ORDER.length}
        </span>
      </div>
      {journey === 'closed' && lead.closedLostReason && (
        <span style={{ fontSize: '11px', color: '#4B5563' }}>Reason: {lead.closedLostReason}</span>
      )}
    </div>
  );
};

/** Lead Logs "Latest activity" cell: what happened, who did it and when. */
const ActivityCell: React.FC<{ lead: Lead }> = ({ lead }) => {
  const a = lead.latestActivity;
  if (!a) return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No activity yet</span>;
  return (
    <div style={{ minWidth: 0, maxWidth: '280px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.title}</span>
        {a.description && (
          <span
            title={a.description}
            style={{ fontSize: '11.5px', color: '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {a.description}
          </span>
        )}
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {a.actorName ? `${a.actorName} · ` : ''}
          {timeAgo(a.createdAt)}
        </span>
      </div>
    </div>
  );
};


export const LeadsPage: React.FC<{ isStudentOnly?: boolean }> = ({ isStudentOnly = false }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1, limit: 20 });

  // Filters
  // searchInput follows every keystroke; search (which triggers the API call) waits 300ms after typing stops.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  // Leads page tabs: 'new' (New Leads) shows only untouched leads (status NEW); 'logs' (Lead Logs) shows every lead.
  const [leadTab, setLeadTab] = useState<'new' | 'logs'>('new');
  const showNewOnly = !isStudentOnly && leadTab === 'new';
  const showLogs = !isStudentOnly && leadTab === 'logs';
  // Lead Logs summary cards: which journey is selected, and how many leads are in each.
  const [journeyFilter, setJourneyFilter] = useState<'all' | Journey>('all');
  const [journeyCounts, setJourneyCounts] = useState<Record<'all' | Journey, number> | null>(null);

  // Drawers & Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    targetCountry: '',
    targetCourse: '',
    targetIntake: '',
    budget: '',
    source: LeadSource.WEBSITE,
    branchId: '',
    notes: '',
  });
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof typeof createForm, string>>>({});

  // Update one create-form field and clear its error as soon as the user edits it.
  const setCreateField = <K extends keyof typeof createForm>(field: K, value: (typeof createForm)[K]) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setCreateErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const { success, error } = useToast();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Lead[]>('/leads', {
        page,
        limit: 20,
        search,
        status: showNewOnly ? LeadStatus.NEW : statusFilter,
        source: sourceFilter,
        stage: stageFilter,
        branchId: branchFilter || undefined,
        // Students page: converted only. New Leads: not converted. Lead Logs: every lead, converted or not.
        isStudent: isStudentOnly ? true : showLogs ? undefined : false,
        withLatestActivity: isStudentOnly ? undefined : true,
        journey: showLogs && journeyFilter !== 'all' ? journeyFilter : undefined,
        withJourneyCounts: showLogs ? true : undefined,
      });
      setLeads(res.data || []);
      if (res.meta) {
        setMeta(res.meta);
        setJourneyCounts((res.meta as any).journeyCounts || null);
      }
    } catch (err: any) {
      error(err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sourceFilter, stageFilter, branchFilter, isStudentOnly, showNewOnly, showLogs, journeyFilter, error]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        // /branches/options works for every staff role; /branches itself is Owner Admin only.
        const bRes = await apiClient.get<any>('/branches/options');
        setBranches(Array.isArray(bRes.data) ? bRes.data : bRes.data?.branches || []);
      } catch (err) {}
    };
    fetchBranches();
  }, []);

  const CREATE_FIELD_LABELS: Record<string, string> = {
    name: 'Full Name',
    email: 'Email Address',
    phone: 'Phone Number',
    source: 'Lead Source',
    branchId: 'Dedicated Branch',
  };

  // Mirrors the backend createLeadSchema so mistakes are flagged before the request is sent.
  const validateCreateForm = () => {
    const errs: Partial<Record<keyof typeof createForm, string>> = {};
    if (createForm.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(createForm.email.trim())) errs.email = 'Enter a valid email address';
    if (createForm.phone.trim().length < 6) errs.phone = 'Phone number must be at least 6 digits';
    return errs;
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();

    const clientErrors = validateCreateForm();
    if (Object.keys(clientErrors).length > 0) {
      setCreateErrors(clientErrors);
      const first = Object.entries(clientErrors)[0];
      error(`${CREATE_FIELD_LABELS[first[0]] || first[0]}: ${first[1]}`);
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.post('/leads', createForm);
      success('Lead created successfully!');
      setCreateErrors({});
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        city: '',
        targetCountry: '',
        targetCourse: '',
        targetIntake: 'Fall 2026',
        budget: '',
        source: LeadSource.WEBSITE,
        branchId: '',
        notes: '',
      });
      fetchLeads();
    } catch (err: any) {
      // Server validation returns [{ field, message }]; show them on the fields and name them in the toast.
      const fieldErrors: { field?: string; message?: string }[] = Array.isArray(err?.errors) ? err.errors : [];
      if (fieldErrors.length > 0) {
        const mapped: Partial<Record<keyof typeof createForm, string>> = {};
        fieldErrors.forEach((fe) => {
          if (fe.field && fe.field in createForm) mapped[fe.field as keyof typeof createForm] = fe.message || 'Invalid value';
        });
        setCreateErrors(mapped);
        error(
          fieldErrors
            .map((fe) => `${CREATE_FIELD_LABELS[fe.field || ''] || fe.field}: ${fe.message}`)
            .join(' • ')
        );
      } else {
        error(err.message || 'Failed to create lead');
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isStudentOnly ? 'Enrolled Students' : 'Lead Management'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {isStudentOnly
              ? 'View and manage active student journeys, profile evaluations, and applications.'
              : 'Track inquiries, record contact attempts, schedule counselling, and qualify students.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isStudentOnly && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
              Create Lead
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search by name, email, phone, city..." />

          <select
            className="form-select"
            style={{ width: '160px' }}
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* The New Leads tab is always status NEW, so the status filter only applies on Lead Logs. */}
          {!showNewOnly && (
            <select
              className="form-select"
              style={{ width: '150px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.values(LeadStatus).map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          )}

          <select
            className="form-select"
            style={{ width: '150px' }}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">All Sources</option>
            {Object.values(LeadSource).map((src) => (
              <option key={src} value={src}>
                {src.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {(searchInput || branchFilter || (!showNewOnly && statusFilter) || sourceFilter || stageFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setBranchFilter('');
                setStatusFilter('');
                setSourceFilter('');
                setStageFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {!isStudentOnly && (
        <div className="tabs-header" role="tablist" aria-label="Lead views" style={{ marginBottom: 0 }}>
          {(
            [
              { key: 'new', label: 'New Leads' },
              { key: 'logs', label: 'Lead Logs' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={leadTab === tab.key}
              className={`tab-btn ${leadTab === tab.key ? 'active' : ''}`}
              style={{ fontSize: '14px' }}
              onClick={() => {
                setLeadTab(tab.key);
                setPage(1);
              }}
            >
              {tab.label}
              {leadTab === tab.key && !loading ? ` (${meta.total ?? 0})` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Lead Logs summary cards: click one to filter the table to that journey. */}
      {showLogs && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {(
            [
              { key: 'all', label: 'All leads', hint: 'Everyone who has enquired', dot: '#6B7280' },
              { key: 'lead', label: 'Still a lead', hint: 'Not converted yet', dot: JOURNEY_STYLES.lead.dot },
              { key: 'converted', label: 'Converted', hint: 'Became students', dot: JOURNEY_STYLES.converted.dot },
              { key: 'closed', label: 'Closed', hint: 'Lost or not interested', dot: JOURNEY_STYLES.closed.dot },
            ] as const
          ).map((card) => {
            const selected = journeyFilter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setJourneyFilter(card.key);
                  setPage(1);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                  textAlign: 'left',
                  padding: selected ? '15px 17px' : '16px 18px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  font: 'inherit',
                  backgroundColor: 'var(--bg-surface, #FFFFFF)',
                  border: selected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#4B5563',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '999px', backgroundColor: card.dot }} />
                  {card.label}
                </span>
                <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {journeyCounts ? journeyCounts[card.key] : '–'}
                </span>
                <span style={{ fontSize: '12px', color: '#4B5563' }}>{card.hint}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Leads / students table */}
        <Table
          columns={[
            {
              header: isStudentOnly ? 'STUDENT NAME' : 'LEAD',
              render: (l) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StudentAvatar name={l.name} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <div
                    style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
                    onClick={() => navigate(isStudentOnly || isConvertedLead(l) ? `/students/${l._id}` : `/leads/${l._id}`)}
                  >
                    <span>{l.name}</span>
                    {l.studentId && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          color: '#0057F8',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        {l.studentId}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.email}</div>
                  {l.phone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.phone}</div>}
                </div>
                </div>
              ),
            },
            {
              header: isStudentOnly ? 'TARGET COUNTRY / COURSE' : 'INTEREST',
              render: (l) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{l.targetCountry || 'Any Country'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{l.targetCourse || 'Undecided'}</div>
                </div>
              ),
            },
            {
              header: 'BRANCH',
              render: (l) => {
                const b =
                  typeof l.branchId === 'object' && l.branchId
                    ? l.branchId
                    : branches.find((br) => br._id === l.branchId);

                return (
                  <div>
                    {b ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#1E40AF',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        <MapPin size={12} aria-hidden="true" /> {b.name}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                    {l.source === 'Meta Ads' && (
                      <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
                        ⚡ Meta: {l.metaFormName || 'Instant Form'}
                      </div>
                    )}
                  </div>
                );
              },
            },
            // Students page keeps Status + Current Stage; the Leads page merges them into Journey
            // and adds the latest activity, as in the Lead Logs design.
            ...(isStudentOnly
              ? [
                  {
                    header: 'STATUS',
                    render: (l: Lead) => <StatusBadge status={l.status} />,
                  },
                  {
                    header: 'CURRENT STAGE',
                    render: (l: Lead) => <Badge variant="primary">{l.stage.replace(/_/g, ' ')}</Badge>,
                  },
                ]
              : [
                  {
                    header: 'JOURNEY',
                    render: (l: Lead) => <JourneyCell lead={l} />,
                  },
                  {
                    header: 'LATEST ACTIVITY',
                    render: (l: Lead) => <ActivityCell lead={l} />,
                  },
                ]),
            {
              header: isStudentOnly ? 'ACTIONS' : 'ACTION',
              align: 'right',
              render: (l) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Eye size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(isStudentOnly || isConvertedLead(l) ? `/students/${l._id}` : `/leads/${l._id}`);
                    }}
                  >
                    {isStudentOnly ? 'View Lead' : 'View'}
                  </Button>
                </div>
              ),
            },
          ]}
          data={leads}
          loading={loading}
        />

        <Pagination
          currentPage={page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          pageSize={20}
          onPageChange={setPage}
        />

      {/* --- Create Lead Drawer --- */}
      <Drawer
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateErrors({});
        }}
        title="Create New Lead"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateLead} loading={actionLoading}>
              Save & Create Lead
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateLead}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Full Name *"
              value={createForm.name}

              error={createErrors.name}
              onChange={(e) => setCreateField('name', e.target.value)}
              required
            />
            <Input
              label="Email Address *"
              type="email"
              value={createForm.email}

              error={createErrors.email}
              onChange={(e) => setCreateField('email', e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Phone Number *"
              value={createForm.phone}

              error={createErrors.phone}
              onChange={(e) => setCreateField('phone', e.target.value)}
              required
            />
            <Input
              label="City"
              value={createForm.city}

              error={createErrors.city}
              onChange={(e) => setCreateField('city', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Lead Source *"
              value={createForm.source}

              error={createErrors.source}
              onChange={(e) => setCreateField('source', e.target.value as LeadSource)}
              options={Object.values(LeadSource).map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
            />
            <Input
              label="Target Country"
              value={createForm.targetCountry}

              error={createErrors.targetCountry}
              onChange={(e) => setCreateField('targetCountry', e.target.value)}
              placeholder="e.g. United Kingdom"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Target Course"
              value={createForm.targetCourse}

              error={createErrors.targetCourse}
              onChange={(e) => setCreateField('targetCourse', e.target.value)}
              placeholder="e.g. MSc Data Science"
            />
            <Input
              label="Target Intake"
              value={createForm.targetIntake}

              error={createErrors.targetIntake}
              onChange={(e) => setCreateField('targetIntake', e.target.value)}
              placeholder="e.g. Fall 2026 / Spring 2027"
            />
          </div>

          <Input
            label="Estimated Budget"
            value={createForm.budget}

            error={createErrors.budget}
            onChange={(e) => setCreateField('budget', e.target.value)}
            placeholder="e.g. £30,000 / $40,000"
          />

          <Select
            label="Dedicated Branch"
            value={createForm.branchId}

            error={createErrors.branchId}
            onChange={(e) => setCreateField('branchId', e.target.value)}
            options={[
              { value: '', label: '-- None (Assign Later) --' },
              ...branches.map((b) => ({ value: b._id, label: `${b.name} (${b.city || ''})` })),
            ]}
          />

          <Textarea
            label="Internal Notes"
            value={createForm.notes}

            error={createErrors.notes}
            onChange={(e) => setCreateField('notes', e.target.value)}
            placeholder="Preliminary notes from initial inquiry..."
          />
        </form>
      </Drawer>
    </div>
  );
};

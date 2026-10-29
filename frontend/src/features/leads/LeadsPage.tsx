import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  LayoutGrid,
  Table as TableIcon,
  Globe,
  Calendar,
  Clock,
  User,
  ArrowRight,
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
import { PinButton } from '../../components/PinButton';

export const LeadsPage: React.FC<{ isStudentOnly?: boolean }> = ({ isStudentOnly = false }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1, limit: 20 });
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState<any[]>([]);

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
        status: statusFilter,
        source: sourceFilter,
        stage: stageFilter,
        branchId: branchFilter || undefined,
        isStudent: isStudentOnly ? true : isStudentOnly === false ? false : undefined,
      });
      setLeads(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err: any) {
      error(err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sourceFilter, stageFilter, branchFilter, isStudentOnly, error]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const bRes = await apiClient.get<any>('/branches');
        setBranches(bRes.data?.branches || (Array.isArray(bRes.data) ? bRes.data : []));
      } catch (err) {}
    };
    fetchBranches();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await apiClient.post('/leads', createForm);
      success('Lead created successfully!');
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
      error(err.message || 'Failed to create lead');
    } finally {
      setActionLoading(false);
    }
  };

  const kanbanColumns = useMemo(() => {
    if (isStudentOnly) {
      return [
        {
          id: 'eval',
          title: 'Profile Evaluation',
          leads: leads.filter(
            (l) =>
              l.stage === StudentStage.PROFILE_EVALUATION ||
              l.stage === StudentStage.LEAD_CAPTURED ||
              l.stage === StudentStage.PRELIMINARY_COUNSELLING
          ),
        },
        {
          id: 'shortlist',
          title: 'Shortlisting',
          leads: leads.filter((l) => l.stage === StudentStage.UNIVERSITY_SHORTLISTING),
        },
        {
          id: 'docs',
          title: 'Document Prep',
          leads: leads.filter((l) => l.stage === StudentStage.DOCUMENT_COLLECTION),
        },
        {
          id: 'apps',
          title: 'Applications Lodged',
          leads: leads.filter((l) => l.stage === StudentStage.APPLICATION_SUBMISSION),
        },
        {
          id: 'offers_visa',
          title: 'Offers & Visa',
          leads: leads.filter(
            (l) =>
              l.stage === StudentStage.OFFER_MANAGEMENT ||
              l.stage === StudentStage.FEE_PAYMENT ||
              l.stage === StudentStage.VISA_PROCESSING ||
              l.stage === StudentStage.PRE_DEPARTURE ||
              l.stage === StudentStage.DEPARTURE ||
              l.stage === StudentStage.ARRIVAL_CONFIRMED
          ),
        },
      ];
    }

    return [
      {
        id: 'new',
        title: 'New Inquiries',
        leads: leads.filter((l) => l.status === LeadStatus.NEW && l.stage === StudentStage.LEAD_CAPTURED),
      },
      {
        id: 'contacted',
        title: 'In Contact & Follow-up',
        leads: leads.filter(
          (l) => l.status === LeadStatus.CONTACTED && l.stage === StudentStage.LEAD_CAPTURED
        ),
      },
      {
        id: 'counselling',
        title: 'Counselling Scheduled',
        leads: leads.filter(
          (l) =>
            l.stage === StudentStage.PRELIMINARY_COUNSELLING ||
            l.status === LeadStatus.COUNSELLING_SCHEDULED ||
            l.status === LeadStatus.COUNSELLING_COMPLETED
        ),
      },
      {
        id: 'qualified',
        title: 'Qualified for Evaluation',
        leads: leads.filter(
          (l) => l.stage === StudentStage.PROFILE_EVALUATION || l.status === LeadStatus.INTERESTED
        ),
      },
      {
        id: 'lost',
        title: 'Closed Lost',
        leads: leads.filter((l) => l.status === LeadStatus.CLOSED_LOST),
      },
    ];
  }, [leads, isStudentOnly]);

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
          {/* Dual View Toggle */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <TableIcon size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`view-mode-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Pipeline Kanban View"
            >
              <LayoutGrid size={14} />
              <span>Pipeline</span>
            </button>
          </div>

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
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, phone, city..." />

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

          {(search || branchFilter || statusFilter || sourceFilter || stageFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
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

      {/* View Content: Table vs Kanban Board */}
      {viewMode === 'table' ? (
        <>
          <Table
            columns={[
              {
                header: 'STUDENT NAME',
                render: (l) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div
                      style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                      onClick={() => navigate(isStudentOnly ? `/students/${l._id}` : `/leads/${l._id}`)}
                    >
                      {l.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.email}</div>
                    {l.phone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.phone}</div>}
                  </div>
                ),
              },
              {
                header: 'TARGET COUNTRY / COURSE',
                render: (l) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{l.targetCountry || 'Any Country'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{l.targetCourse || 'Undecided'}</div>
                  </div>
                ),
              },
              {
                header: 'ASSIGNED BRANCH',
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
                          📍 {b.name}
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
              {
                header: 'STATUS',
                render: (l) => <StatusBadge status={l.status} />,
              },
              {
                header: 'CURRENT STAGE',
                render: (l) => <Badge variant="primary">{l.stage.replace(/_/g, ' ')}</Badge>,
              },
              {
                header: 'ACTIONS',
                align: 'right',
                render: (l) => (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                    <PinButton
                      item={{
                        id: l._id,
                        category: 'student',
                        title: l.name,
                        subtitle: `${l.email} • ${l.targetCountry || 'Student'}`,
                        path: isStudentOnly ? `/students/${l._id}` : `/leads/${l._id}`,
                        pinnedAt: new Date().toISOString(),
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(isStudentOnly ? `/students/${l._id}` : `/leads/${l._id}`);
                      }}
                    >
                      View Lead
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
        </>
      ) : (
        <div className="kanban-board-container">
          {kanbanColumns.map((col) => (
            <div key={col.id} className="kanban-column">
              <div className="kanban-column-header">
                <span className="kanban-column-title">{col.title}</span>
                <span className="kanban-column-badge">{col.leads.length}</span>
              </div>
              <div className="kanban-column-cards">
                {col.leads.length === 0 ? (
                  <div style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No records in this stage
                  </div>
                ) : (
                  col.leads.map((l) => (
                    <div
                      key={l._id}
                      className="kanban-card"
                      onClick={() => navigate(isStudentOnly ? `/students/${l._id}` : `/leads/${l._id}`)}
                    >
                      <div className="kanban-card-title">
                        <span style={{ fontWeight: 600 }}>{l.name}</span>
                        <StatusBadge status={l.status} />
                      </div>
                      <div className="kanban-card-meta">
                        <span className="kanban-card-tag">
                          <Globe size={11} color="var(--primary)" />
                          {l.targetCountry || 'Any Country'}
                        </span>
                        <span className="kanban-card-tag">
                          <Calendar size={11} />
                          {l.targetIntake || 'Fall 2026'}
                        </span>
                      </div>
                      {l.targetCourse && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          🎓 {l.targetCourse}
                        </div>
                      )}
                      <div className="kanban-card-footer">
                        <span>
                          {l.source ? String(l.source).replace(/_/g, ' ') : 'Inquiry'}
                        </span>
                        <span>
                          {l.createdAt ? new Date(l.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- Create Lead Drawer --- */}
      <Drawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
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
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
            />
            <Input
              label="Email Address *"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Phone Number *"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              required
            />
            <Input
              label="City"
              value={createForm.city}
              onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Lead Source *"
              value={createForm.source}
              onChange={(e) => setCreateForm({ ...createForm, source: e.target.value as LeadSource })}
              options={Object.values(LeadSource).map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
            />
            <Input
              label="Target Country"
              value={createForm.targetCountry}
              onChange={(e) => setCreateForm({ ...createForm, targetCountry: e.target.value })}
              placeholder="e.g. United Kingdom"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Target Course"
              value={createForm.targetCourse}
              onChange={(e) => setCreateForm({ ...createForm, targetCourse: e.target.value })}
              placeholder="e.g. MSc Data Science"
            />
            <Input
              label="Target Intake"
              value={createForm.targetIntake}
              onChange={(e) => setCreateForm({ ...createForm, targetIntake: e.target.value })}
              placeholder="e.g. Fall 2026 / Spring 2027"
            />
          </div>

          <Input
            label="Estimated Budget"
            value={createForm.budget}
            onChange={(e) => setCreateForm({ ...createForm, budget: e.target.value })}
            placeholder="e.g. £30,000 / $40,000"
          />

          <Select
            label="Dedicated Branch"
            value={createForm.branchId}
            onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
            options={[
              { value: '', label: '-- None (Assign Later) --' },
              ...branches.map((b) => ({ value: b._id, label: `${b.name} (${b.city || ''})` })),
            ]}
          />

          <Textarea
            label="Internal Notes"
            value={createForm.notes}
            onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            placeholder="Preliminary notes from initial inquiry..."
          />
        </form>
      </Drawer>
    </div>
  );
};

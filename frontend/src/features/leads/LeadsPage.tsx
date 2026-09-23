import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Lead, LeadSource, LeadStatus, StudentStage, User } from '../../types';
import { Table, Pagination, SearchInput } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge, StatusBadge } from '../../components/Badge';
import { Drawer } from '../../components/Modal';
import { Input, Select, Textarea } from '../../components/Form';

export const LeadsPage: React.FC<{ isStudentOnly?: boolean }> = ({ isStudentOnly = false }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1, limit: 20 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [counsellorFilter, setCounsellorFilter] = useState('');
  const [counsellors, setCounsellors] = useState<User[]>([]);

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
    counsellorId: '',
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
        counsellorId: counsellorFilter,
        isStudent: isStudentOnly ? true : isStudentOnly === false ? false : undefined,
      });
      setLeads(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err: any) {
      error(err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sourceFilter, stageFilter, counsellorFilter, isStudentOnly, error]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const fetchCounsellors = async () => {
      try {
        const res = await apiClient.get<User[]>('/users/counsellors');
        setCounsellors(res.data || []);
      } catch (err) {}
    };
    fetchCounsellors();
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
        counsellorId: '',
        notes: '',
      });
      fetchLeads();
    } catch (err: any) {
      error(err.message || 'Failed to create lead');
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
        {!isStudentOnly && (
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
            Create Lead
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, phone, city..." />

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

          {(search || statusFilter || sourceFilter || stageFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setSourceFilter('');
                setCounsellorFilter('');
                setStageFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Leads Table */}
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
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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

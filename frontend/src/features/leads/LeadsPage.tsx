import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  PhoneCall,
  MessageSquare,
  RefreshCw,
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

  // Real-time sync & polling state
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

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

  const fetchLeads = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
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
      setLastSyncedAt(new Date());
      setSecondsAgo(0);
    } catch (err: any) {
      if (!isSilent) error(err.message || 'Failed to fetch leads');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [page, search, statusFilter, sourceFilter, stageFilter, counsellorFilter, isStudentOnly, error]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Timer for seconds ago calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSyncedAt]);

  // Auto-refresh polling every 30s + window focus refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeads(true);
    }, 30000);

    const handleFocus = () => {
      fetchLeads(true);
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
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

  const renderSourceBadge = (l: Lead) => {
    const source = l.source;
    const isMeta = source === LeadSource.META_ADS;
    const isLanding = source === LeadSource.LANDING_PAGE;

    if (isMeta) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#1877F215',
              color: '#1877F2',
              border: '1px solid #1877F240',
              width: 'fit-content',
            }}
          >
            Meta Ads
          </span>
          {l.campaignName && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l.campaignName}</span>
          )}
        </div>
      );
    }

    if (isLanding) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#7C3AED15',
              color: '#7C3AED',
              border: '1px solid #7C3AED40',
              width: 'fit-content',
            }}
          >
            Landing Page
          </span>
          {l.campaignName && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l.campaignName}</span>
          )}
        </div>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 500,
          backgroundColor: '#f1f5f9',
          color: '#475569',
          border: '1px solid #cbd5e1',
          width: 'fit-content',
        }}
      >
        {source ? source.replace(/_/g, ' ') : 'Website'}
      </span>
    );
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Last synced: {secondsAgo < 5 ? 'Just now' : `${secondsAgo}s ago`}</span>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={() => fetchLeads()}
              title="Sync now"
            >
              Sync Now
            </Button>
          </div>
          {!isStudentOnly && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
              Create Lead
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-toolbar" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="filter-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
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

          {counsellors.length > 0 && (
            <select
              className="form-select"
              style={{ width: '160px' }}
              value={counsellorFilter}
              onChange={(e) => setCounsellorFilter(e.target.value)}
            >
              <option value="">All Counsellors</option>
              {counsellors.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <select
            className="form-select"
            style={{ width: '140px' }}
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

          {(search || statusFilter || sourceFilter || stageFilter || counsellorFilter) && (
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
            header: 'LEAD / CONTACT',
            render: (l) => {
              const initials = (l.name || 'L')
                .split(' ')
                .map((n: string) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              const cleanPhone = (l.phone || '').replace(/[^0-9+]/g, '');
              const waNumber = cleanPhone.replace(/^\+/, '');

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid rgba(0, 87, 248, 0.2)',
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div
                      style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13.5px' }}
                      onClick={() => navigate(isStudentOnly ? `/students/${l._id}` : `/leads/${l._id}`)}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--primary)')}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--text-primary)')}
                    >
                      {l.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{l.phone || 'No phone'}</span>
                      {cleanPhone && (
                        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          <a
                            href={`https://wa.me/${waNumber}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Chat on WhatsApp"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: '#25D366',
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(37, 211, 102, 0.1)',
                            }}
                          >
                            <MessageSquare size={12} />
                          </a>
                          <a
                            href={`tel:${cleanPhone}`}
                            title="Call Lead"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: 'var(--primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--primary-light)',
                            }}
                          >
                            <PhoneCall size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{l.email}</div>
                  </div>
                </div>
              );
            },
          },
          {
            header: 'TARGET COUNTRY & INTEREST',
            render: (l) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                  {l.targetCountry || 'Undecided'}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {l.targetCourse || 'General Inquiry'}
                  {l.targetIntake ? ` • ${l.targetIntake}` : ''}
                </div>
              </div>
            ),
          },
          {
            header: 'SOURCE',
            render: (l) => renderSourceBadge(l),
          },
          {
            header: 'STATUS',
            render: (l) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {l.status === 'NEW' && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      boxShadow: '0 0 6px #22c55e',
                    }}
                    title="New Lead"
                  />
                )}
                <StatusBadge status={l.status} />
              </div>
            ),
          },
          {
            header: 'ASSIGNED COUNSELLOR',
            render: (l) => (
              <div>
                {l.counsellorId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#E2E8F0',
                        color: '#475569',
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {(l.counsellorId.name || 'C')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {l.counsellorId.name}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Unassigned
                  </span>
                )}
              </div>
            ),
          },
          {
            header: 'DATE ADDED',
            render: (l) => {
              const d = l.createdAt ? new Date(l.createdAt) : null;
              return (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </div>
              );
            },
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (l) => (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
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

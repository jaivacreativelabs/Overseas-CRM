import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  PhoneCall,
  Calendar,
  CheckCircle,
  XCircle,
  RotateCcw,
  MoreVertical,
  Filter,
  Eye,
  Trash2,
  Archive,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Lead, LeadSource, LeadStatus, StudentStage, User } from '../../types';
import { Table, Pagination, SearchInput } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge, StatusBadge } from '../../components/Badge';
import { Drawer, Modal, ConfirmDialog } from '../../components/Modal';
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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isCounsellingModalOpen, setIsCounsellingModalOpen] = useState(false);
  const [isClosedLostModalOpen, setIsClosedLostModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
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

  const [contactForm, setContactForm] = useState<{
    method: 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON';
    outcome: 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'SWITCHED_OFF' | 'CALLBACK_REQUESTED' | 'INVALID_NUMBER' | 'WRONG_NUMBER';
    notes: string;
    callbackDate: string;
    callbackTime: string;
  }>({
    method: 'PHONE',
    outcome: 'CONNECTED',
    notes: '',
    callbackDate: '',
    callbackTime: '11:00',
  });

  const [counsellingForm, setCounsellingForm] = useState({
    scheduledDate: '',
    scheduledTime: '15:00',
    googleMeetLink: 'https://meet.google.com/new',
    notes: '',
    counsellorId: '',
  });

  const [closedLostReason, setClosedLostReason] = useState('Budget Constraints / Financial Limitations');

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

  const handleRecordContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/leads/${selectedLead._id}/contact-attempts`, contactForm);
      success('Contact attempt recorded.');
      setIsContactModalOpen(false);
      fetchLeads();
    } catch (err: any) {
      error(err.message || 'Failed to record contact attempt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleCounselling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/leads/${selectedLead._id}/counselling`, counsellingForm);
      success('Preliminary counselling scheduled.');
      setIsCounsellingModalOpen(false);
      fetchLeads();
    } catch (err: any) {
      error(err.message || 'Failed to schedule counselling');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToInterested = async (lead: Lead) => {
    try {
      await apiClient.post(`/leads/${lead._id}/convert-interested`);
      success(`Converted ${lead.name} to Student! Student Portal account provisioned.`);
      fetchLeads();
    } catch (err: any) {
      error(err.message || 'Conversion failed. Please ensure counselling session took place.');
    }
  };

  const handleMarkClosedLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/leads/${selectedLead._id}/closed-lost`, { reason: closedLostReason });
      success('Lead marked as Closed Lost.');
      setIsClosedLostModalOpen(false);
      fetchLeads();
    } catch (err: any) {
      error(err.message || 'Failed to update lead');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async (lead: Lead) => {
    try {
      await apiClient.post(`/leads/${lead._id}/reopen`);
      success('Closed Lost lead reopened successfully.');
      fetchLeads();
    } catch (err: any) {
      error(err.message || 'Failed to reopen lead');
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    setActionLoading(true);
    try {
      await apiClient.delete(`/leads/${selectedLead._id}`);
      success('Lead permanently deleted.');
      setIsDeleteConfirmOpen(false);
      fetchLeads();
    } catch (err: any) {
      error(err.message || 'Failed to delete lead');
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

          {(search || statusFilter || sourceFilter || counsellorFilter || stageFilter) && (
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
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate(`/leads/${l._id}`)}>
                  {l.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.email}</div>
              </div>
            ),
          },
          { header: 'PHONE', accessor: 'phone' },
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
            header: 'SOURCE',
            render: (l) => <Badge variant="neutral">{l.source.replace(/_/g, ' ')}</Badge>,
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
            header: 'COUNSELLOR',
            render: (l) => l.counsellorId?.name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (l) => (
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  title="View Student 360 Detail"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/leads/${l._id}`);
                  }}
                  icon={<Eye size={14} />}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  title="Record Contact Attempt"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLead(l);
                    setIsContactModalOpen(true);
                  }}
                  icon={<PhoneCall size={14} />}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  title="Schedule Preliminary Counselling"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLead(l);
                    setCounsellingForm((prev) => ({
                      ...prev,
                      counsellorId: l.counsellorId?._id || user?._id || '',
                    }));
                    setIsCounsellingModalOpen(true);
                  }}
                  icon={<Calendar size={14} />}
                />
                {l.status !== LeadStatus.INTERESTED && l.status !== LeadStatus.CLOSED_LOST && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Mark Interested (Converts to Student)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConvertToInterested(l);
                    }}
                    icon={<CheckCircle size={14} color="var(--success)" />}
                  />
                )}
                {l.status !== LeadStatus.CLOSED_LOST ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Mark Closed Lost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLead(l);
                      setIsClosedLostModalOpen(true);
                    }}
                    icon={<XCircle size={14} color="var(--danger)" />}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Reopen Closed Lost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReopen(l);
                    }}
                    icon={<RotateCcw size={14} color="var(--primary)" />}
                  />
                )}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete Lead"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLead(l);
                      setIsDeleteConfirmOpen(true);
                    }}
                    icon={<Trash2 size={14} color="var(--danger)" />}
                  />
                )}
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
            <Select
              label="Assign Counsellor"
              value={createForm.counsellorId}
              onChange={(e) => setCreateForm({ ...createForm, counsellorId: e.target.value })}
              placeholder="Select Counsellor..."
              options={counsellors.map((c) => ({ value: c._id, label: c.name }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Target Country"
              value={createForm.targetCountry}
              onChange={(e) => setCreateForm({ ...createForm, targetCountry: e.target.value })}
              placeholder="e.g. United Kingdom"
            />
            <Input
              label="Target Course"
              value={createForm.targetCourse}
              onChange={(e) => setCreateForm({ ...createForm, targetCourse: e.target.value })}
              placeholder="e.g. MSc Data Science"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Target Intake"
              value={createForm.targetIntake}
              onChange={(e) => setCreateForm({ ...createForm, targetIntake: e.target.value })}
            />
            <Input
              label="Estimated Budget"
              value={createForm.budget}
              onChange={(e) => setCreateForm({ ...createForm, budget: e.target.value })}
              placeholder="e.g. £30,000 / $40,000"
            />
          </div>

          <Textarea
            label="Internal Notes"
            value={createForm.notes}
            onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            placeholder="Preliminary notes from initial inquiry..."
          />
        </form>
      </Drawer>

      {/* --- Record Contact Attempt Modal --- */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={`Record Contact Attempt: ${selectedLead?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsContactModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRecordContact} loading={actionLoading}>
              Save Attempt (Immutable)
            </Button>
          </>
        }
      >
        <form onSubmit={handleRecordContact}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Contact Method"
              value={contactForm.method}
              onChange={(e) => setContactForm({ ...contactForm, method: e.target.value as any })}
              options={[
                { value: 'PHONE', label: 'Phone Call' },
                { value: 'WHATSAPP', label: 'WhatsApp' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'IN_PERSON', label: 'In-Person Branch Meeting' },
              ]}
            />
            <Select
              label="Call / Meeting Outcome"
              value={contactForm.outcome}
              onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value as any })}
              options={[
                { value: 'CONNECTED', label: 'Connected / Spoke with Student' },
                { value: 'CALLBACK_REQUESTED', label: 'Call Back Requested (Auto Task)' },
                { value: 'NO_ANSWER', label: 'No Answer / Ringing' },
                { value: 'BUSY', label: 'Line Busy' },
                { value: 'SWITCHED_OFF', label: 'Switched Off' },
                { value: 'INVALID_NUMBER', label: 'Invalid / Disconnected Number' },
              ]}
            />
          </div>

          {contactForm.outcome === 'CALLBACK_REQUESTED' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <Input
                label="Callback Date *"
                type="date"
                value={contactForm.callbackDate}
                onChange={(e) => setContactForm({ ...contactForm, callbackDate: e.target.value })}
                required
              />
              <Input
                label="Callback Time"
                type="time"
                value={contactForm.callbackTime}
                onChange={(e) => setContactForm({ ...contactForm, callbackTime: e.target.value })}
              />
            </div>
          )}

          <Textarea
            label="Call Notes & Discussion Details"
            value={contactForm.notes}
            onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
            placeholder="Summary of student response..."
          />
        </form>
      </Modal>

      {/* --- Schedule Counselling Modal --- */}
      <Modal
        isOpen={isCounsellingModalOpen}
        onClose={() => setIsCounsellingModalOpen(false)}
        title={`Schedule Preliminary Counselling: ${selectedLead?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCounsellingModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleScheduleCounselling} loading={actionLoading}>
              Schedule Session
            </Button>
          </>
        }
      >
        <form onSubmit={handleScheduleCounselling}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Session Date *"
              type="date"
              value={counsellingForm.scheduledDate}
              onChange={(e) => setCounsellingForm({ ...counsellingForm, scheduledDate: e.target.value })}
              required
            />
            <Input
              label="Session Time *"
              type="time"
              value={counsellingForm.scheduledTime}
              onChange={(e) => setCounsellingForm({ ...counsellingForm, scheduledTime: e.target.value })}
              required
            />
          </div>

          <Input
            label="Google Meet / Video Conference Link"
            value={counsellingForm.googleMeetLink}
            onChange={(e) => setCounsellingForm({ ...counsellingForm, googleMeetLink: e.target.value })}
            placeholder="https://meet.google.com/..."
          />

          <Select
            label="Assigned Counsellor"
            value={counsellingForm.counsellorId}
            onChange={(e) => setCounsellingForm({ ...counsellingForm, counsellorId: e.target.value })}
            options={counsellors.map((c) => ({ value: c._id, label: c.name }))}
          />

          <Textarea
            label="Agenda / Notes"
            value={counsellingForm.notes}
            onChange={(e) => setCounsellingForm({ ...counsellingForm, notes: e.target.value })}
            placeholder="Topics to cover during the 1-on-1 preliminary session..."
          />
        </form>
      </Modal>

      {/* --- Closed Lost Modal --- */}
      <Modal
        isOpen={isClosedLostModalOpen}
        onClose={() => setIsClosedLostModalOpen(false)}
        title={`Mark Closed Lost: ${selectedLead?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsClosedLostModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleMarkClosedLost} loading={actionLoading}>
              Mark Closed Lost
            </Button>
          </>
        }
      >
        <form onSubmit={handleMarkClosedLost}>
          <Select
            label="Reason for Closed Lost *"
            value={closedLostReason}
            onChange={(e) => setClosedLostReason(e.target.value)}
            options={[
              { value: 'Budget Constraints / Financial Limitations', label: 'Budget Constraints / Financial Limitations' },
              { value: 'Chose Competitor Agency', label: 'Chose Competitor Agency' },
              { value: 'Postponed / Decided Not to Study Abroad', label: 'Postponed / Decided Not to Study Abroad' },
              { value: 'Visa Ineligible / Low Test Scores', label: 'Visa Ineligible / Low Test Scores' },
              { value: 'Unresponsive After Multiple Follow-ups', label: 'Unresponsive After Multiple Follow-ups' },
              { value: 'Personal / Family Emergency', label: 'Personal / Family Emergency' },
            ]}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Note: You can reopen this record at any time to restore the previous stage and status.
          </div>
        </form>
      </Modal>

      {/* --- Delete Confirmation Dialog --- */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteLead}
        title="Permanently Delete Lead"
        message={`Are you sure you want to permanently delete ${selectedLead?.name}? This action is irreversible and recorded in the audit log.`}
        isDanger
        confirmText="Delete Permanently"
        loading={actionLoading}
      />
    </div>
  );
};

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stamp,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit3,
  Calendar,
  FileText,
  Upload,
  Globe,
  Building,
  User,
  Filter,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Table, Pagination, SearchInput } from '../../components/Table';
import { StatusBadge, Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal, Drawer, ConfirmDialog } from '../../components/Modal';
import { Input, Select, Textarea } from '../../components/Form';
import { PinButton } from '../../components/PinButton';
import {
  VisaRecord,
  VisaStatus,
  VisaStats,
  VisaListResponse,
  VisaStatusHistoryItem,
  UserRole,
} from '../../types';

export const VisaPage: React.FC = () => {
  const { user, isStaff } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  // Data & Pagination state
  const [visas, setVisas] = useState<VisaRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VisaStats>({
    total: 0,
    underProcessing: 0,
    approved: 0,
    rejected: 0,
    actionRequired: 0,
    notStarted: 0,
    documentsPending: 0,
    submitted: 0,
    withdrawn: 0,
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedCounsellor, setSelectedCounsellor] = useState<string>('ALL');
  const [counsellorList, setCounsellorList] = useState<{ id: string; name: string }[]>([]);
  const [countryList, setCountryList] = useState<string[]>([]);

  // Drawer & Modal states
  const [selectedVisa, setSelectedVisa] = useState<VisaRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Status Update Modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusFormData, setStatusFormData] = useState({
    status: VisaStatus.UNDER_PROCESSING,
    remarks: '',
    internalRemarks: '',
    studentInstructions: '',
    appointmentDate: '',
    vfsCenterLocation: '',
    additionalInfoRequired: '',
    visaNumber: '',
    decisionDate: '',
  });
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Decision Modal state
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionFormData, setDecisionFormData] = useState({
    decision: 'APPROVED' as 'APPROVED' | 'REJECTED',
    decisionDate: new Date().toISOString().split('T')[0],
    remarks: '',
    studentInstructions: '',
    internalRemarks: '',
    visaNumber: '',
    decisionDocumentUrl: '',
    decisionDocumentName: '',
  });
  const [decisionUploading, setDecisionUploading] = useState(false);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  // High-Impact Status Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDanger: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDanger: false,
    onConfirm: () => {},
  });

  // Fetch Master Data (Counsellors & Countries)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [counsellorRes, countryRes] = await Promise.all([
          apiClient.get<any[]>('/users', { role: UserRole.COUNSELLOR, limit: 50 }).catch(() => ({ data: [] })),
          apiClient.get<any[]>('/universities/countries').catch(() => ({ data: [] })),
        ]);
        if (counsellorRes.data) {
          setCounsellorList(counsellorRes.data.map((c: any) => ({ id: c._id, name: c.name })));
        }
        if (countryRes.data && Array.isArray(countryRes.data)) {
          setCountryList(countryRes.data.map((c: any) => c.name || c));
        } else {
          setCountryList(['United Kingdom', 'Canada', 'Australia', 'United States', 'Germany', 'Ireland']);
        }
      } catch {
        // Fallback default country list
        setCountryList(['United Kingdom', 'Canada', 'Australia', 'United States', 'Germany', 'Ireland']);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch Visa Records from Backend API
  const fetchVisaRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedCountry !== 'ALL') params.country = selectedCountry;
      if (selectedCounsellor !== 'ALL') params.counsellorId = selectedCounsellor;

      const res = await apiClient.get<VisaListResponse>('/visa', params);

      if (res.data) {
        setVisas(res.data.items || []);
        setTotalItems(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to load visa records');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, selectedStatus, selectedCountry, selectedCounsellor, error]);

  useEffect(() => {
    fetchVisaRecords();
  }, [fetchVisaRecords]);

  // Open Details Drawer
  const handleOpenDetails = async (visa: VisaRecord) => {
    setSelectedVisa(visa);
    setIsDrawerOpen(true);
    // Refresh single record to fetch full statusHistory
    try {
      const res = await apiClient.get<VisaRecord>(`/visa/${visa._id}`);
      if (res.data) {
        setSelectedVisa(res.data);
      }
    } catch {
      // Keep existing record
    }
  };

  // Open Status Update Modal
  const handleOpenStatusModal = (visa: VisaRecord) => {
    setSelectedVisa(visa);
    setStatusFormData({
      status: visa.status || VisaStatus.UNDER_PROCESSING,
      remarks: visa.counsellorRemarks || '',
      internalRemarks: visa.internalRemarks || '',
      studentInstructions: visa.studentInstructions || '',
      appointmentDate: visa.appointmentDate ? new Date(visa.appointmentDate).toISOString().split('T')[0] : '',
      vfsCenterLocation: visa.vfsCenterLocation || '',
      additionalInfoRequired: visa.additionalInfoRequired || '',
      visaNumber: visa.visaNumber || '',
      decisionDate: visa.decisionDate ? new Date(visa.decisionDate).toISOString().split('T')[0] : '',
    });
    setIsStatusModalOpen(true);
  };

  // Open Decision Modal
  const handleOpenDecisionModal = (visa: VisaRecord) => {
    setSelectedVisa(visa);
    setDecisionFormData({
      decision: visa.decision || 'APPROVED',
      decisionDate: visa.decisionDate
        ? new Date(visa.decisionDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      remarks: visa.counsellorRemarks || '',
      studentInstructions: visa.studentInstructions || '',
      internalRemarks: visa.internalRemarks || '',
      visaNumber: visa.visaNumber || '',
      decisionDocumentUrl: visa.decisionDocumentUrl || '',
      decisionDocumentName: visa.decisionDocumentName || '',
    });
    setIsDecisionModalOpen(true);
  };

  // Handle Status Update Submit with Confirmation
  const submitStatusUpdate = async () => {
    if (!selectedVisa) return;
    setStatusSubmitting(true);
    try {
      await apiClient.put(`/visa/${selectedVisa._id}/status`, {
        status: statusFormData.status,
        remarks: statusFormData.remarks,
        internalRemarks: statusFormData.internalRemarks,
        studentInstructions: statusFormData.studentInstructions,
        appointmentDate: statusFormData.appointmentDate || undefined,
        vfsCenterLocation: statusFormData.vfsCenterLocation || undefined,
        additionalInfoRequired: statusFormData.additionalInfoRequired || undefined,
        visaNumber: statusFormData.visaNumber || undefined,
        decisionDate: statusFormData.decisionDate || undefined,
      });

      success(`Visa status successfully updated to ${statusFormData.status.replace(/_/g, ' ')}!`);
      setIsStatusModalOpen(false);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      fetchVisaRecords();

      // Refresh drawer if open
      if (isDrawerOpen && selectedVisa) {
        const refreshed = await apiClient.get<VisaRecord>(`/visa/${selectedVisa._id}`);
        if (refreshed.data) setSelectedVisa(refreshed.data);
      }
    } catch (err: any) {
      error(err.message || 'Failed to update visa status');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleStatusSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisa) return;

    // Validation checks
    if (statusFormData.status === VisaStatus.REJECTED && !statusFormData.remarks.trim()) {
      error('A refusal reason is mandatory when marking status as Rejected.');
      return;
    }
    if (statusFormData.status === VisaStatus.WITHDRAWN && !statusFormData.remarks.trim()) {
      error('A withdrawal reason is mandatory when withdrawing an application.');
      return;
    }
    if (
      statusFormData.status === VisaStatus.ADDITIONAL_INFO_REQUIRED &&
      !statusFormData.remarks.trim() &&
      !statusFormData.studentInstructions.trim() &&
      !statusFormData.additionalInfoRequired.trim()
    ) {
      error('Please provide specific instructions for the additional information required.');
      return;
    }

    // Require confirmation for high-impact status changes
    if (statusFormData.status === VisaStatus.APPROVED) {
      setConfirmDialog({
        isOpen: true,
        title: 'Confirm Official Visa Approval',
        message: `Are you sure you want to approve the visa application for ${selectedVisa.studentName}? This will record the official approval, unlock pre-departure operations, and notify the student account.`,
        isDanger: false,
        onConfirm: submitStatusUpdate,
      });
      return;
    }

    if (statusFormData.status === VisaStatus.REJECTED) {
      setConfirmDialog({
        isOpen: true,
        title: 'Confirm Visa Refusal / Rejection',
        message: `Are you sure you want to record an official refusal/rejection for ${selectedVisa.studentName}? The refusal details will be archived in the audit history.`,
        isDanger: true,
        onConfirm: submitStatusUpdate,
      });
      return;
    }

    if (statusFormData.status === VisaStatus.WITHDRAWN) {
      setConfirmDialog({
        isOpen: true,
        title: 'Confirm Visa Application Withdrawal',
        message: `Are you sure you want to mark this visa application as Withdrawn?`,
        isDanger: true,
        onConfirm: submitStatusUpdate,
      });
      return;
    }

    // Standard statuses submit immediately
    submitStatusUpdate();
  };

  // Handle Decision Document File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setDecisionUploading(true);
    try {
      const res = await apiClient.post<any>('/visa/upload-document', formData);
      if (res.data?.fileUrl) {
        setDecisionFormData((prev) => ({
          ...prev,
          decisionDocumentUrl: res.data.fileUrl,
          decisionDocumentName: res.data.fileName || file.name,
        }));
        success('Supporting decision document uploaded successfully!');
      }
    } catch (err: any) {
      error(err.message || 'Failed to upload document');
    } finally {
      setDecisionUploading(false);
    }
  };

  // Submit Official Decision
  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisa) return;

    if (!decisionFormData.decisionDate) {
      error('Decision date is mandatory.');
      return;
    }
    if (!decisionFormData.remarks.trim()) {
      error('Remarks are mandatory when recording an official decision.');
      return;
    }

    setDecisionSubmitting(true);
    try {
      await apiClient.put(`/visa/${selectedVisa._id}/decision`, {
        decision: decisionFormData.decision,
        decisionDate: decisionFormData.decisionDate,
        remarks: decisionFormData.remarks,
        studentInstructions: decisionFormData.studentInstructions,
        internalRemarks: decisionFormData.internalRemarks,
        decisionDocumentUrl: decisionFormData.decisionDocumentUrl || undefined,
        decisionDocumentName: decisionFormData.decisionDocumentName || undefined,
        visaNumber: decisionFormData.visaNumber || undefined,
      });

      success(`Official visa decision (${decisionFormData.decision}) saved and recorded in audit history!`);
      setIsDecisionModalOpen(false);
      fetchVisaRecords();

      if (isDrawerOpen) {
        const refreshed = await apiClient.get<VisaRecord>(`/visa/${selectedVisa._id}`);
        if (refreshed.data) setSelectedVisa(refreshed.data);
      }
    } catch (err: any) {
      error(err.message || 'Failed to record visa decision');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedCountry('ALL');
    setSelectedCounsellor('ALL');
    setCurrentPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Stamp size={22} color="var(--primary)" />
            Student Visa Tracking & Decision Register
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Manage visa filings, consular appointments, status transitions, and official embassy grant decisions with complete audit history.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchVisaRecords}
            icon={<RotateCcw size={14} className={loading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* SUMMARY STATS STRIP (Integrated inside existing Reports Tab) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          onClick={() => { setSelectedStatus('ALL'); setCurrentPage(1); }}
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: selectedStatus === 'ALL' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Applications
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Active student pipeline
          </div>
        </div>

        <div
          onClick={() => { setSelectedStatus(VisaStatus.UNDER_PROCESSING); setCurrentPage(1); }}
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: selectedStatus === VisaStatus.UNDER_PROCESSING ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#0284C7', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} /> Under Processing
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0284C7', marginTop: '4px' }}>
            {stats.underProcessing}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Embassy review in progress
          </div>
        </div>

        <div
          onClick={() => { setSelectedStatus(VisaStatus.ADDITIONAL_INFO_REQUIRED); setCurrentPage(1); }}
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: selectedStatus === VisaStatus.ADDITIONAL_INFO_REQUIRED ? '2px solid var(--warning)' : '1px solid var(--border-color)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#D97706', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> Action Required
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>
            {stats.actionRequired}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Pending docs / interview
          </div>
        </div>

        <div
          onClick={() => { setSelectedStatus(VisaStatus.APPROVED); setCurrentPage(1); }}
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: selectedStatus === VisaStatus.APPROVED ? '2px solid var(--success)' : '1px solid var(--border-color)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} /> Visa Approved
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16A34A', marginTop: '4px' }}>
            {stats.approved}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Embassy grant confirmed
          </div>
        </div>

        <div
          onClick={() => { setSelectedStatus(VisaStatus.REJECTED); setCurrentPage(1); }}
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: selectedStatus === VisaStatus.REJECTED ? '2px solid var(--danger)' : '1px solid var(--border-color)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <XCircle size={14} /> Refused / Rejected
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>
            {stats.rejected}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Refusal notice documented
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 16px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ flex: '1 1 300px', maxWidth: '420px' }}>
          <SearchInput
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            placeholder="Search by student name, ID, or application ID..."
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
            <select
              className="form-select"
              style={{ width: '175px', padding: '6px 10px', fontSize: '12.5px' }}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Statuses ({stats.total})</option>
              <option value={VisaStatus.NOT_STARTED}>Not Started</option>
              <option value={VisaStatus.DOCUMENTS_PENDING}>Documents Pending</option>
              <option value={VisaStatus.APPLICATION_SUBMITTED}>Application Submitted</option>
              <option value={VisaStatus.UNDER_PROCESSING}>Under Processing</option>
              <option value={VisaStatus.ADDITIONAL_INFO_REQUIRED}>Additional Info Required</option>
              <option value={VisaStatus.INTERVIEW_SCHEDULED}>Interview Scheduled</option>
              <option value={VisaStatus.APPROVED}>Approved</option>
              <option value={VisaStatus.REJECTED}>Rejected</option>
              <option value={VisaStatus.WITHDRAWN}>Withdrawn</option>
            </select>
          </div>

          {/* Country Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Country:</span>
            <select
              className="form-select"
              style={{ width: '160px', padding: '6px 10px', fontSize: '12.5px' }}
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Countries</option>
              {countryList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Counsellor Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Counsellor:</span>
            <select
              className="form-select"
              style={{ width: '175px', padding: '6px 10px', fontSize: '12.5px' }}
              value={selectedCounsellor}
              onChange={(e) => {
                setSelectedCounsellor(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Counsellors</option>
              {user?.role === UserRole.COUNSELLOR && (
                <option value="MY_ASSIGNED">My Assigned Students</option>
              )}
              {counsellorList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedStatus !== 'ALL' || selectedCountry !== 'ALL' || selectedCounsellor !== 'ALL') && (
            <Button variant="secondary" size="sm" onClick={handleResetFilters} icon={<RotateCcw size={13} />}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* DATA TABLE */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <Table
          columns={[
            {
              header: 'STUDENT NAME & ID',
              render: (v: VisaRecord) => (
                <div>
                  <div
                    style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => navigate(`/students/${v.leadId}`)}
                    title="Click to view student journey"
                  >
                    {v.studentName || 'Student Record'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v.studentCustomId || 'STU-ID'}</span>
                    {v.studentEmail && <span>• {v.studentEmail}</span>}
                  </div>
                </div>
              ),
            },
            {
              header: 'APPLICATION ID',
              render: (v: VisaRecord) => (
                <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {v.applicationId || '—'}
                </div>
              ),
            },
            {
              header: 'DESTINATION & UNIVERSITY',
              render: (v: VisaRecord) => (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Globe size={13} color="var(--primary)" />
                    {v.country || v.destinationCountry || 'International'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {v.universityName || 'Pending Shortlist'}
                  </div>
                </div>
              ),
            },
            {
              header: 'VISA TYPE',
              render: (v: VisaRecord) => (
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {v.visaType || 'Student Visa'}
                </div>
              ),
            },
            {
              header: 'SUBMISSION DATE',
              render: (v: VisaRecord) => (
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {v.submissionDate
                    ? new Date(v.submissionDate).toLocaleDateString()
                    : v.applicationDate
                    ? new Date(v.applicationDate).toLocaleDateString()
                    : '—'}
                </div>
              ),
            },
            {
              header: 'CURRENT STATUS',
              render: (v: VisaRecord) => <StatusBadge status={v.status} />,
            },
            {
              header: 'DECISION / DATE',
              render: (v: VisaRecord) => {
                if (v.decision === 'APPROVED' || v.status === VisaStatus.APPROVED) {
                  return (
                    <div>
                      <Badge variant="success">✓ Approved</Badge>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {v.decisionDate ? new Date(v.decisionDate).toLocaleDateString() : 'Confirmed'}
                      </div>
                    </div>
                  );
                }
                if (v.decision === 'REJECTED' || v.status === VisaStatus.REJECTED) {
                  return (
                    <div>
                      <Badge variant="danger">✕ Refused</Badge>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {v.decisionDate ? new Date(v.decisionDate).toLocaleDateString() : 'Refused'}
                      </div>
                    </div>
                  );
                }
                return (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Under Review</span>
                );
              },
            },
            {
              header: 'COUNSELLOR REMARKS',
              render: (v: VisaRecord) => (
                <div
                  style={{
                    maxWidth: '180px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}
                  title={v.counsellorRemarks || v.notes || 'No remarks recorded'}
                >
                  {v.counsellorRemarks || v.notes || '—'}
                </div>
              ),
            },
            {
              header: 'LAST UPDATED',
              render: (v: VisaRecord) => (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {v.updatedAt ? new Date(v.updatedAt).toLocaleDateString() : '—'}
                </div>
              ),
            },
            {
              header: 'ACTIONS',
              align: 'right',
              render: (v: VisaRecord) => (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <PinButton
                    item={{
                      id: v._id,
                      category: 'visa',
                      title: `Visa: ${v.studentName || 'Student'}`,
                      subtitle: `${v.country} • ${v.status.replace(/_/g, ' ')}`,
                      path: `/reports?tab=visa`,
                      pinnedAt: new Date().toISOString(),
                    }}
                  />

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Eye size={13} />}
                    onClick={() => handleOpenDetails(v)}
                    title="View Complete Visa Details & History"
                  >
                    View
                  </Button>

                  {isStaff && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Edit3 size={13} />}
                      onClick={() => handleOpenStatusModal(v)}
                      title="Update Application Status"
                    >
                      Update
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          data={visas}
          loading={loading}
          emptyMessage="No visa tracking records found matching your filters."
        />

        {/* PAGINATION */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* =========================================================================
         VIEW DETAILS DRAWER (Full Record, Audit History, Decision & Instructions)
         ========================================================================= */}
      {selectedVisa && (
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title={`Visa Application: ${selectedVisa.studentName || 'Student'}`}
          maxWidth="640px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Application ID: <strong>{selectedVisa.applicationId}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isStaff && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Stamp size={14} />}
                      onClick={() => {
                        setIsDrawerOpen(false);
                        handleOpenDecisionModal(selectedVisa);
                      }}
                    >
                      Record Decision
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Edit3 size={14} />}
                      onClick={() => {
                        setIsDrawerOpen(false);
                        handleOpenStatusModal(selectedVisa);
                      }}
                    >
                      Update Status
                    </Button>
                  </>
                )}
                <Button variant="secondary" size="sm" onClick={() => setIsDrawerOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Identity Banner */}
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--workspace-bg, #FAFAFB)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedVisa.studentName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedVisa.studentCustomId}</span> • {selectedVisa.studentEmail}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <StatusBadge status={selectedVisa.status} />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Last updated: {new Date(selectedVisa.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Section 1: Application Summary */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={15} color="var(--primary)" /> Filing & University Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Destination Country:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedVisa.country}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>University:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedVisa.universityName || 'Pending Shortlist'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Visa Type:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedVisa.visaType || 'Student Visa'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Counsellor:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedVisa.counsellorName || 'Unassigned'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Submission Date:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedVisa.submissionDate ? new Date(selectedVisa.submissionDate).toLocaleDateString() : 'Not submitted yet'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Application Reference #:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {selectedVisa.applicationId}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Consular / Interview Details */}
            {(selectedVisa.appointmentDate || selectedVisa.vfsCenterLocation || selectedVisa.additionalInfoRequired) && (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} color="#0284C7" /> Consular & Interview Schedule
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  {selectedVisa.appointmentDate && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Interview / Biometric Date:</span>
                      <div style={{ fontWeight: 600, color: '#0284C7' }}>
                        {new Date(selectedVisa.appointmentDate).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {selectedVisa.vfsCenterLocation && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>VFS / Embassy Center:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedVisa.vfsCenterLocation}</div>
                    </div>
                  )}
                  {selectedVisa.additionalInfoRequired && (
                    <div style={{ gridColumn: 'span 2', backgroundColor: 'rgba(217, 119, 6, 0.08)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: '#D97706', fontWeight: 600 }}>Action Required by Embassy:</span>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '3px' }}>
                        {selectedVisa.additionalInfoRequired}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Official Decision & Grant Details */}
            {selectedVisa.decision && (
              <div
                style={{
                  border: selectedVisa.decision === 'APPROVED' ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid rgba(220, 38, 38, 0.3)',
                  backgroundColor: selectedVisa.decision === 'APPROVED' ? 'rgba(22, 163, 74, 0.03)' : 'rgba(220, 38, 38, 0.03)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                }}
              >
                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', color: selectedVisa.decision === 'APPROVED' ? '#16A34A' : '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedVisa.decision === 'APPROVED' ? <CheckCircle2 size={16} color="#16A34A" /> : <XCircle size={16} color="#DC2626" />}
                  Official Embassy Decision: {selectedVisa.decision}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Decision Date:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedVisa.decisionDate ? new Date(selectedVisa.decisionDate).toLocaleDateString() : 'Confirmed'}
                    </div>
                  </div>
                  {selectedVisa.visaNumber && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Visa Grant / Vignette #:</span>
                      <div style={{ fontWeight: 700, color: '#16A34A', fontFamily: 'monospace' }}>
                        {selectedVisa.visaNumber}
                      </div>
                    </div>
                  )}
                  {selectedVisa.decisionDocumentUrl && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Supporting Decision Document:</span>
                      <div style={{ marginTop: '4px' }}>
                        <a
                          href={selectedVisa.decisionDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--primary)',
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontSize: '12.5px',
                            backgroundColor: '#FFFFFF',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <FileText size={15} />
                          {selectedVisa.decisionDocumentName || 'View Decision Letter (PDF)'}
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedVisa.studentInstructions && (
                    <div style={{ gridColumn: 'span 2', backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Instructions Shared with Student:</span>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '4px' }}>
                        {selectedVisa.studentInstructions}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 4: Remarks */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} color="var(--primary)" /> Counsellor Remarks & Audit Notes
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Public / Operational Remarks:</span>
                  <div style={{ color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.5 }}>
                    {selectedVisa.counsellorRemarks || 'No remarks recorded.'}
                  </div>
                </div>
                {isStaff && selectedVisa.internalRemarks && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <span style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldAlert size={14} /> Confidential Internal Counsellor Notes (Hidden from Student):
                    </span>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '3px' }}>
                      {selectedVisa.internalRemarks}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Complete Audit Trail & Status History Timeline */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 14px 0', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} color="var(--primary)" /> Complete Status History & Audit Trail
              </h4>

              {(!selectedVisa.statusHistory || selectedVisa.statusHistory.length === 0) ? (
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                  No historical status changes recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                  {selectedVisa.statusHistory.slice().reverse().map((item: VisaStatusHistoryItem, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        fontSize: '12.5px',
                        paddingBottom: '12px',
                        borderBottom: idx !== selectedVisa.statusHistory!.length - 1 ? '1px dashed var(--border-color)' : 'none',
                      }}
                    >
                      <div style={{ marginTop: '2px' }}>
                        <StatusBadge status={item.status} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            Updated by {item.changedByName || 'Staff'}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                            {new Date(item.changedAt).toLocaleString()}
                          </span>
                        </div>
                        {item.remarks && (
                          <div style={{ color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                            {item.remarks}
                          </div>
                        )}
                        {item.studentInstructions && (
                          <div style={{ color: 'var(--primary)', fontSize: '11.5px', marginTop: '3px' }}>
                            👉 Student instructions: {item.studentInstructions}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Drawer>
      )}

      {/* =========================================================================
         STATUS UPDATE MODAL
         ========================================================================= */}
      {selectedVisa && (
        <Modal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          title={`Update Visa Status: ${selectedVisa.studentName}`}
          maxWidth="560px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)} disabled={statusSubmitting}>
                Cancel
              </Button>
              <Button
                variant={statusFormData.status === VisaStatus.REJECTED || statusFormData.status === VisaStatus.WITHDRAWN ? 'danger' : 'primary'}
                onClick={handleStatusSubmitClick}
                loading={statusSubmitting}
              >
                Save Status Update
              </Button>
            </div>
          }
        >
          <form onSubmit={handleStatusSubmitClick} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Updating status will immediately record a historical audit entry and dispatch an in-app notification to <strong>{selectedVisa.studentName}</strong>.
            </div>

            {/* Status Select */}
            <Select
              label="Select New Visa Status *"
              value={statusFormData.status}
              onChange={(e) => setStatusFormData({ ...statusFormData, status: e.target.value as VisaStatus })}
              options={[
                { value: VisaStatus.NOT_STARTED, label: '1. Not Started' },
                { value: VisaStatus.DOCUMENTS_PENDING, label: '2. Documents Pending' },
                { value: VisaStatus.APPLICATION_SUBMITTED, label: '3. Application Submitted' },
                { value: VisaStatus.UNDER_PROCESSING, label: '4. Under Processing' },
                { value: VisaStatus.ADDITIONAL_INFO_REQUIRED, label: '5. Additional Information Required' },
                { value: VisaStatus.INTERVIEW_SCHEDULED, label: '6. Interview Scheduled' },
                { value: VisaStatus.APPROVED, label: '7. Approved' },
                { value: VisaStatus.REJECTED, label: '8. Rejected' },
                { value: VisaStatus.WITHDRAWN, label: '9. Withdrawn' },
              ]}
            />

            {/* Context-Specific Fields */}
            {statusFormData.status === VisaStatus.INTERVIEW_SCHEDULED && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input
                  label="Appointment / Interview Date *"
                  type="datetime-local"
                  value={statusFormData.appointmentDate}
                  onChange={(e) => setStatusFormData({ ...statusFormData, appointmentDate: e.target.value })}
                  required
                />
                <Input
                  label="VFS / Embassy Location"
                  placeholder="e.g. VFS Global Connaught Place, New Delhi"
                  value={statusFormData.vfsCenterLocation}
                  onChange={(e) => setStatusFormData({ ...statusFormData, vfsCenterLocation: e.target.value })}
                />
              </div>
            )}

            {statusFormData.status === VisaStatus.ADDITIONAL_INFO_REQUIRED && (
              <Textarea
                label="Required Documents or Information *"
                placeholder="Specify the exact documentation required (e.g. updated 28-day financial proof, sponsor affidavit)..."
                value={statusFormData.additionalInfoRequired}
                onChange={(e) => setStatusFormData({ ...statusFormData, additionalInfoRequired: e.target.value })}
                required
              />
            )}

            {statusFormData.status === VisaStatus.APPROVED && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input
                  label="Visa Grant Number"
                  placeholder="e.g. V-782910"
                  value={statusFormData.visaNumber}
                  onChange={(e) => setStatusFormData({ ...statusFormData, visaNumber: e.target.value })}
                />
                <Input
                  label="Decision Date"
                  type="date"
                  value={statusFormData.decisionDate}
                  onChange={(e) => setStatusFormData({ ...statusFormData, decisionDate: e.target.value })}
                />
              </div>
            )}

            {/* Counsellor Remarks (Mandatory for Rejection/Withdrawal) */}
            <Textarea
              label={`Counsellor Remarks ${statusFormData.status === VisaStatus.REJECTED || statusFormData.status === VisaStatus.WITHDRAWN ? '*' : ''}`}
              placeholder={
                statusFormData.status === VisaStatus.REJECTED
                  ? 'Mandatory: Enter the official refusal reason as stated in the embassy notice...'
                  : statusFormData.status === VisaStatus.WITHDRAWN
                  ? 'Mandatory: Specify why the visa application is being withdrawn...'
                  : 'Add notes about this status transition...'
              }
              value={statusFormData.remarks}
              onChange={(e) => setStatusFormData({ ...statusFormData, remarks: e.target.value })}
              required={statusFormData.status === VisaStatus.REJECTED || statusFormData.status === VisaStatus.WITHDRAWN}
            />

            {/* Student Instructions */}
            <Textarea
              label="Student Instructions (Notified to student)"
              placeholder="Instructions or action items for the student to see in their portal..."
              value={statusFormData.studentInstructions}
              onChange={(e) => setStatusFormData({ ...statusFormData, studentInstructions: e.target.value })}
              helperText="This message is visible to the student in their portal."
            />

            {/* Confidential Internal Remarks */}
            <Textarea
              label="Confidential Internal Remarks (Staff Only)"
              placeholder="Private verification notes, financial audits, or internal remarks (never exposed to student)..."
              value={statusFormData.internalRemarks}
              onChange={(e) => setStatusFormData({ ...statusFormData, internalRemarks: e.target.value })}
              helperText="Strictly confidential to counsellors & admins."
            />
          </form>
        </Modal>
      )}

      {/* =========================================================================
         RECORD DECISION MODAL (Approval or Rejection with Document Upload)
         ========================================================================= */}
      {selectedVisa && (
        <Modal
          isOpen={isDecisionModalOpen}
          onClose={() => setIsDecisionModalOpen(false)}
          title={`Record Verified Visa Decision: ${selectedVisa.studentName}`}
          maxWidth="560px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsDecisionModalOpen(false)} disabled={decisionSubmitting}>
                Cancel
              </Button>
              <Button
                variant={decisionFormData.decision === 'APPROVED' ? 'primary' : 'danger'}
                onClick={handleDecisionSubmit}
                loading={decisionSubmitting}
              >
                Record Verified Decision
              </Button>
            </div>
          }
        >
          <form onSubmit={handleDecisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Authorized counsellors must enter the verified embassy decision. Decisions are saved permanently and logged in the audit trail.
            </div>

            <Select
              label="Final Official Decision *"
              value={decisionFormData.decision}
              onChange={(e) => setDecisionFormData({ ...decisionFormData, decision: e.target.value as 'APPROVED' | 'REJECTED' })}
              options={[
                { value: 'APPROVED', label: '✓ Visa Approved / Granted' },
                { value: 'REJECTED', label: '✕ Visa Refused / Rejected' },
              ]}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="Official Decision Date *"
                type="date"
                value={decisionFormData.decisionDate}
                onChange={(e) => setDecisionFormData({ ...decisionFormData, decisionDate: e.target.value })}
                required
              />
              {decisionFormData.decision === 'APPROVED' && (
                <Input
                  label="Visa Grant / Number"
                  placeholder="e.g. V-889104"
                  value={decisionFormData.visaNumber}
                  onChange={(e) => setDecisionFormData({ ...decisionFormData, visaNumber: e.target.value })}
                />
              )}
            </div>

            <Textarea
              label="Decision Remarks / Reason *"
              placeholder={
                decisionFormData.decision === 'APPROVED'
                  ? 'Details of visa grant, validity dates, study work condition...'
                  : 'Mandatory: Enter the refusal reason provided by the embassy...'
              }
              value={decisionFormData.remarks}
              onChange={(e) => setDecisionFormData({ ...decisionFormData, remarks: e.target.value })}
              required
            />

            {/* Supporting Document Upload */}
            <div className="form-group">
              <label className="form-label">Supporting Decision Document (PDF / Image)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="file"
                  id="decision-doc-upload"
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={decisionUploading}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Upload size={14} className={decisionUploading ? 'animate-spin' : ''} />}
                  onClick={() => document.getElementById('decision-doc-upload')?.click()}
                  loading={decisionUploading}
                >
                  {decisionFormData.decisionDocumentUrl ? 'Replace File' : 'Upload Decision Letter'}
                </Button>
                {decisionFormData.decisionDocumentName && (
                  <span style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> {decisionFormData.decisionDocumentName}
                  </span>
                )}
              </div>
            </div>

            <Textarea
              label="Additional Instructions for Student"
              placeholder="Next steps, ticket booking guidance, orientation attendance..."
              value={decisionFormData.studentInstructions}
              onChange={(e) => setDecisionFormData({ ...decisionFormData, studentInstructions: e.target.value })}
              helperText="This instruction will be presented in the student portal."
            />

            <Textarea
              label="Internal Confidential Notes (Staff Only)"
              placeholder="Internal administrative remarks..."
              value={decisionFormData.internalRemarks}
              onChange={(e) => setDecisionFormData({ ...decisionFormData, internalRemarks: e.target.value })}
              helperText="Never shared with student."
            />
          </form>
        </Modal>
      )}

      {/* =========================================================================
         CONFIRMATION DIALOG FOR HIGH-IMPACT STATUSES
         ========================================================================= */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDanger={confirmDialog.isDanger}
        confirmText="Yes, Confirm Update"
        loading={statusSubmitting}
      />
    </div>
  );
};

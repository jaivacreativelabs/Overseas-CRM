import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  MapPin,
  X,
  UserCheck,
  Download,
  Phone,
  Mail,
  User,
  Calendar,
  FileText,
  Activity,
  BarChart3,
  UserPlus,
  Zap,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useAuth } from '../../context/AuthContext';
import { UserRole, AdminType, Branch, Lead, Application, IntegrationLog, User as UserType } from '../../types';

const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export interface ExtendedBranchSummary {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  statesCovered: number;
  totalCapacity: number;
  totalAssignedStudents: number;
  availableSeats: number;
}

export const BranchesPage: React.FC = () => {
  const { user } = useAuth();
  const isOwnerAdmin =
    user?.role === UserRole.ADMIN &&
    (user?.adminType === AdminType.OWNER_ADMIN || !user?.adminType);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [summary, setSummary] = useState<ExtendedBranchSummary>({
    totalBranches: 0,
    activeBranches: 0,
    inactiveBranches: 0,
    statesCovered: 0,
    totalCapacity: 0,
    totalAssignedStudents: 0,
    availableSeats: 0,
  });
  const [stateSummaries, setStateSummaries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedBranchDetails, setSelectedBranchDetails] = useState<{
    branch: Branch;
    assignedStudents: Lead[];
  } | null>(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'overview' | 'students' | 'staff' | 'applications' | 'reports' | 'history'>('overview');
  const [branchApplications, setBranchApplications] = useState<Application[]>([]);
  const [branchLogs, setBranchLogs] = useState<IntegrationLog[]>([]);
  const [isLoadingTabContent, setIsLoadingTabContent] = useState(false);

  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [assignStudentModal, setAssignStudentModal] = useState<Branch | null>(null);
  const [assignStaffModal, setAssignStaffModal] = useState<Branch | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    state: 'Karnataka',
    city: '',
    address: '',
    pinCode: '',
    contactNumber: '',
    email: '',
    managerName: '',
    managerEmail: '',
    capacity: 100,
    openingDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Student & Staff assignment state
  const [unassignedStudents, setUnassignedStudents] = useState<Lead[]>([]);
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState('');
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [selectedStaffUserIds, setSelectedStaffUserIds] = useState<string[]>([]);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const fetchBranches = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<any>('/branches', {
        search: searchQuery,
        state: selectedState,
        city: selectedCity,
        status: selectedStatus,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 20,
      });

      setBranches(res.data.branches || []);
      setSummary(
        res.data.summary || {
          totalBranches: 0,
          activeBranches: 0,
          inactiveBranches: 0,
          statesCovered: 0,
          totalCapacity: 0,
          totalAssignedStudents: 0,
          availableSeats: 0,
        }
      );
      setStateSummaries(res.data.stateSummaries || []);
      setTotalPages(res.data.pagination?.pages || 1);

      // Auto expand state accordions
      const expMap: Record<string, boolean> = {};
      (res.data.stateSummaries || []).forEach((st: any) => {
        expMap[st.state.toUpperCase()] = true;
      });
      setExpandedStates(expMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load branch records');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [searchQuery, selectedState, selectedCity, selectedStatus, sortBy, sortOrder, currentPage]);

  const handleOpenCreateModal = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      state: 'Karnataka',
      city: '',
      address: '',
      pinCode: '',
      contactNumber: '',
      email: '',
      managerName: '',
      managerEmail: '',
      capacity: 100,
      openingDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      notes: '',
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      state: branch.state,
      city: branch.city,
      address: branch.address,
      pinCode: branch.pinCode || '',
      contactNumber: branch.contactNumber || '',
      email: branch.email || '',
      managerName: branch.managerName || '',
      managerEmail: branch.managerEmail || '',
      capacity: branch.capacity,
      openingDate: branch.openingDate ? new Date(branch.openingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: branch.status,
      notes: branch.notes || '',
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Branch name is mandatory';
    if (!formData.state.trim()) errs.state = 'State is mandatory';
    if (!formData.city.trim()) errs.city = 'City is mandatory';
    if (!formData.address.trim()) errs.address = 'Full address is mandatory';
    if (!formData.capacity || Number(formData.capacity) < 1) errs.capacity = 'Capacity must be at least 1 student';

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Invalid email address format';
    }
    if (formData.managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.managerEmail.trim())) {
      errs.managerEmail = 'Invalid manager email address format';
    }
    if (formData.pinCode && !/^\d{6}$/.test(formData.pinCode.trim())) {
      errs.pinCode = 'PIN Code must be a 6-digit number';
    }

    if (editingBranch && formData.capacity < editingBranch.assignedStudentsCount) {
      errs.capacity = `Cannot reduce capacity below currently assigned students (${editingBranch.assignedStudentsCount})`;
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingBranch) {
        await apiClient.put(`/branches/${editingBranch._id}`, formData);
        setSuccessMsg(`Branch '${formData.name}' updated successfully.`);
      } else {
        await apiClient.post('/branches', formData);
        setSuccessMsg(`Branch '${formData.name}' created successfully.`);
      }
      setShowCreateModal(false);
      fetchBranches();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Operation failed' });
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    const nextStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiClient.patch(`/branches/${branch._id}/status`, { status: nextStatus });
      setSuccessMsg(`Branch '${branch.name}' is now ${nextStatus}.`);
      fetchBranches();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranch) return;
    try {
      await apiClient.delete(`/branches/${deletingBranch._id}`);
      setSuccessMsg(`Branch '${deletingBranch.name}' deleted successfully.`);
      setDeletingBranch(null);
      fetchBranches();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete branch');
    }
  };

  const handleViewDetails = async (branch: Branch) => {
    try {
      const res = await apiClient.get<any>(`/branches/${branch._id}`);
      setSelectedBranchDetails(res.data);
      setDrawerActiveTab('overview');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch branch details');
    }
  };

  const handleTabChange = async (tab: 'overview' | 'students' | 'staff' | 'applications' | 'reports' | 'history') => {
    setDrawerActiveTab(tab);
    if (!selectedBranchDetails) return;

    if (tab === 'applications' && branchApplications.length === 0) {
      setIsLoadingTabContent(true);
      try {
        const res = await apiClient.get<any>(`/branches/${selectedBranchDetails.branch._id}/applications`);
        setBranchApplications(res.data || []);
      } catch (err) { }
      setIsLoadingTabContent(false);
    } else if (tab === 'history' && branchLogs.length === 0) {
      setIsLoadingTabContent(true);
      try {
        const res = await apiClient.get<any>(`/branches/${selectedBranchDetails.branch._id}/logs`);
        setBranchLogs(res.data || []);
      } catch (err) { }
      setIsLoadingTabContent(false);
    }
  };

  const handleOpenAssignModal = async (branch: Branch) => {
    setAssignStudentModal(branch);
    setSelectedStudentToAssign('');
    try {
      const res = await apiClient.get<Lead[]>('/leads', { isStudent: true, limit: 100 });
      setUnassignedStudents(res.data || []);
    } catch (err) { }
  };

  const handleAssignStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentModal || !selectedStudentToAssign) return;

    setIsSubmittingAssign(true);
    try {
      await apiClient.post('/branches/assign-student', {
        studentLeadId: selectedStudentToAssign,
        branchId: assignStudentModal._id,
      });
      setSuccessMsg(`Student assigned to ${assignStudentModal.name} successfully.`);
      setAssignStudentModal(null);
      fetchBranches();
      if (selectedBranchDetails) {
        handleViewDetails(selectedBranchDetails.branch);
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to assign student');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleOpenStaffModal = async (branch: Branch) => {
    setAssignStaffModal(branch);
    setSelectedStaffUserIds((branch as any).assignedStaffIds?.map((s: any) => s._id || s) || []);
    try {
      const res = await apiClient.get<UserType[]>('/users');
      setAllUsers(res.data || []);
    } catch (err) { }
  };

  const handleAssignStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStaffModal) return;

    setIsSubmittingAssign(true);
    try {
      await apiClient.post('/branches/assign-staff', {
        branchId: assignStaffModal._id,
        staffUserIds: selectedStaffUserIds,
      });
      setSuccessMsg(`Staff assignments updated for ${assignStaffModal.name}.`);
      setAssignStaffModal(null);
      fetchBranches();
      if (selectedBranchDetails) {
        handleViewDetails(selectedBranchDetails.branch);
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update staff assignments');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const toggleStateGroup = (stName: string) => {
    const key = stName.toUpperCase();
    setExpandedStates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <GitFork size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Branch Management
              </h1>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Manage branches, state-wise operations, student capacity, staff, and performance.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href="/api/v1/branches/export"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => fetchBranches(true)}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>

          {isOwnerAdmin && (
            <button
              onClick={handleOpenCreateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8.5px 16px',
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,87,248,0.2)',
              }}
            >
              <Plus size={18} />
              <span>Create Branch</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-md)',
            color: '#065F46',
            fontSize: '13.5px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            color: '#991B1B',
            fontSize: '13.5px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL BRANCHES</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{summary.totalBranches}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>State Network</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ACTIVE BRANCHES</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{summary.activeBranches}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Operational Intake</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>INACTIVE BRANCHES</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>{summary.inactiveBranches}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Paused Operations</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ASSIGNED STUDENTS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>{summary.totalAssignedStudents}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Enrolled Capacity</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL CAPACITY</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>{summary.totalCapacity}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Max Intake Limit</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AVAILABLE SEATS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>{summary.availableSeats}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Open Vacancies</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>STATES COVERED</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#7C3AED', marginTop: '4px' }}>{summary.statesCovered}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Indian Regions</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1, minWidth: '280px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by Branch Name, ID, Manager, State, or City..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8.5px 12px 8.5px 38px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>

          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            style={{
              padding: '8.5px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '13.5px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="ALL">All States</option>
            {INDIAN_STATES_AND_UTS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '8.5px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '13.5px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('grouped')}
              style={{
                padding: '7px 12px',
                backgroundColor: viewMode === 'grouped' ? 'var(--primary-light)' : '#FFFFFF',
                color: viewMode === 'grouped' ? 'var(--primary)' : 'var(--text-secondary)',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              State-Wise Grouped
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '7px 12px',
                backgroundColor: viewMode === 'list' ? 'var(--primary-light)' : '#FFFFFF',
                color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-secondary)',
                border: 'none',
                borderLeft: '1px solid var(--border-color)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Data Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Content List / Accordion */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <RefreshCw size={28} className="spin-animation" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading branch management data...</div>
        </div>
      ) : branches.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
          }}
        >
          <GitFork size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No branches found</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '400px', margin: '4px auto 16px' }}>
            {searchQuery || selectedState !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No branch matching your filter criteria. Try clearing search filters.'
              : 'Start by creating your first centralized branch.'}
          </p>
          {isOwnerAdmin && (
            <button
              onClick={handleOpenCreateModal}
              style={{
                padding: '8.5px 16px',
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Create First Branch
            </button>
          )}
        </div>
      ) : viewMode === 'grouped' ? (
        /* State-Wise Accordion Grouping */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {stateSummaries.map((st) => {
            const stateBranches = branches.filter((b) => b.state.toUpperCase() === st.state.toUpperCase());
            const isExpanded = expandedStates[st.state.toUpperCase()] !== false;

            if (stateBranches.length === 0 && (searchQuery || selectedState !== 'ALL')) {
              return null;
            }

            return (
              <div
                key={st.state}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleStateGroup(st.state)}
                  style={{
                    padding: '16px 20px',
                    backgroundColor: 'var(--bg-subtle, #F9FAFB)',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {st.state.toUpperCase()}
                      </span>
                      <span
                        style={{
                          marginLeft: '10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        {st.branchCount} Branch{st.branchCount > 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Capacity: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{st.totalCapacity}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Assigned: </span>
                      <strong style={{ color: '#D97706' }}>{st.assignedStudents}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Available: </span>
                      <strong style={{ color: '#059669' }}>{st.availableSeats}</strong>
                    </div>
                  </div>
                </div>

                {/* State Branches Content */}
                {isExpanded && (
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {stateBranches.map((b) => (
                      <div
                        key={b._id}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          backgroundColor: '#FFFFFF',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: 'var(--primary)',
                                  backgroundColor: 'var(--primary-light)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {b.branchId}
                              </span>
                              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                                {b.name}
                              </h4>
                            </div>

                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '12px',
                                backgroundColor: b.status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2',
                                color: b.status === 'ACTIVE' ? '#065F46' : '#991B1B',
                              }}
                            >
                              {b.status}
                            </span>
                          </div>

                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <span>
                              {b.address}, {b.city}, {b.state} {b.pinCode ? `- ${b.pinCode}` : ''}
                            </span>
                          </div>

                          {b.managerName && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                              Manager: <strong style={{ color: 'var(--text-primary)' }}>{b.managerName}</strong>
                            </div>
                          )}

                          {/* Capacity Progress Bar */}
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Capacity Utilization:</span>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {b.assignedStudentsCount} / {b.capacity} ({b.utilizationPercentage || 0}%)
                              </span>
                            </div>
                            <div
                              style={{
                                height: '8px',
                                width: '100%',
                                backgroundColor: '#E5E7EB',
                                borderRadius: '4px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${Math.min(100, b.utilizationPercentage || 0)}%`,
                                  backgroundColor:
                                    (b.utilizationPercentage || 0) >= 90 ? '#EF4444' : (b.utilizationPercentage || 0) >= 70 ? '#F59E0B' : '#3B82F6',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                          <button
                            onClick={() => handleViewDetails(b)}
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--primary)',
                              backgroundColor: 'var(--primary-light)',
                              border: '1px solid var(--primary)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenAssignModal(b)}
                              style={{
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#059669',
                                backgroundColor: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Assign student to this branch"
                            >
                              <UserCheck size={14} />
                              <span>Assign Student</span>
                            </button>

                            {isOwnerAdmin && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(b)}
                                  style={{
                                    padding: '5px 8px',
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    background: 'none',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                  }}
                                  title="Edit Branch"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(b)}
                                  style={{
                                    padding: '5px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: b.status === 'ACTIVE' ? '#991B1B' : '#065F46',
                                    background: 'none',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                  }}
                                  title={b.status === 'ACTIVE' ? 'Deactivate Branch' : 'Activate Branch'}
                                >
                                  {b.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => setDeletingBranch(b)}
                                  style={{
                                    padding: '5px 8px',
                                    fontSize: '12px',
                                    color: '#DC2626',
                                    background: 'none',
                                    border: '1px solid #FECACA',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                  }}
                                  title="Delete Branch"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Data Table View */
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle, #F9FAFB)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Branch ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Branch Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>State</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>City</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Branch Manager</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Assigned</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Capacity</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Available Seats</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Utilization %</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }}>{b.branchId}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{b.state}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{b.city}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{b.managerName || '-'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#D97706' }}>{b.assignedStudentsCount}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{b.capacity}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#059669' }}>{b.availableSeats}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{b.utilizationPercentage || 0}%</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: b.status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2',
                        color: b.status === 'ACTIVE' ? '#065F46' : '#991B1B',
                      }}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => handleViewDetails(b)}
                        style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--primary)', background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleOpenAssignModal(b)}
                        style={{ padding: '4px 8px', fontSize: '12px', color: '#059669', background: 'none', border: '1px solid #A7F3D0', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Assign
                      </button>
                      {isOwnerAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(b)}
                            style={{ padding: '4px 6px', color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingBranch(b)}
                            style={{ padding: '4px 6px', color: '#DC2626', background: 'none', border: '1px solid #FECACA', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- CREATE / EDIT BRANCH MODAL --- */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-subtle, #F9FAFB)',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Create New Branch'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} style={{ padding: '20px', overflowY: 'auto' }}>
              {formErrors.submit && (
                <div style={{ padding: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
                  {formErrors.submit}
                </div>
              )}

              {/* Branch ID Readonly Preview */}
              <div style={{ marginBottom: '16px', backgroundColor: '#F3F4F6', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  AUTOMATIC UNIQUE BRANCH ID
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                  {editingBranch ? editingBranch.branchId : '[Server Generated e.g. KA-BLR-A81F2C]'}
                </div>
              </div>

              {/* Basic Information Section */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                Basic Information
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Branch Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore Indiranagar Branch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: formErrors.name ? '1px solid #EF4444' : '1px solid var(--border-color)',
                    fontSize: '13.5px',
                  }}
                />
                {formErrors.name && <span style={{ fontSize: '11.5px', color: '#EF4444' }}>{formErrors.name}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    State *
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.state ? '1px solid #EF4444' : '1px solid var(--border-color)',
                      fontSize: '13.5px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {INDIAN_STATES_AND_UTS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    City *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.city ? '1px solid #EF4444' : '1px solid var(--border-color)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Full Address *
                  </label>
                  <input
                    type="text"
                    placeholder="Street address, building..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.address ? '1px solid #EF4444' : '1px solid var(--border-color)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    PIN Code
                  </label>
                  <input
                    type="text"
                    placeholder="560038"
                    value={formData.pinCode}
                    onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.pinCode ? '1px solid #EF4444' : '1px solid var(--border-color)',
                      fontSize: '13.5px',
                    }}
                  />
                  {formErrors.pinCode && <span style={{ fontSize: '11.5px', color: '#EF4444' }}>{formErrors.pinCode}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Branch Contact Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 80 1234 5678"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Branch Email
                  </label>
                  <input
                    type="email"
                    placeholder="bangalore@ii-ec.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.email ? '1px solid #EF4444' : '1px solid var(--border-color)',
                      fontSize: '13.5px',
                    }}
                  />
                  {formErrors.email && <span style={{ fontSize: '11.5px', color: '#EF4444' }}>{formErrors.email}</span>}
                </div>
              </div>

              {/* Management Information Section */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                Management & Capacity Settings
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Branch Manager Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Branch Manager Email
                  </label>
                  <input
                    type="email"
                    placeholder="rajesh.manager@ii-ec.com"
                    value={formData.managerEmail}
                    onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.managerEmail ? '1px solid #EF4444' : '1px solid var(--border-color)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Max Student Capacity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.capacity ? '1px solid #EF4444' : '1px solid var(--border-color)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Opening Date
                  </label>
                  <input
                    type="date"
                    value={formData.openingDate}
                    onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Branch Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13.5px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    backgroundColor: 'var(--primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- BRANCH DETAILS 6-TAB DRAWER --- */}
      {selectedBranchDetails && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1200,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              width: '640px',
              maxWidth: '100vw',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-subtle, #F9FAFB)',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px' }}>
                  {selectedBranchDetails.branch.branchId}
                </span>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                  {selectedBranchDetails.branch.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBranchDetails(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 6 Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: '#FFFFFF', overflowX: 'auto' }}>
              {(['overview', 'students', 'staff', 'applications', 'reports', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontWeight: drawerActiveTab === tab ? 700 : 500,
                    color: drawerActiveTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                    borderBottom: drawerActiveTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Drawer Tab Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {drawerActiveTab === 'overview' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', backgroundColor: '#F9FAFB', padding: '14px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Capacity</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedBranchDetails.branch.capacity}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#D97706' }}>{selectedBranchDetails.branch.assignedStudentsCount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Available Seats</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>{selectedBranchDetails.branch.availableSeats}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
                    <div><strong style={{ color: 'var(--text-muted)' }}>State & City: </strong>{selectedBranchDetails.branch.city}, {selectedBranchDetails.branch.state}</div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Full Address: </strong>{selectedBranchDetails.branch.address} {selectedBranchDetails.branch.pinCode ? `- ${selectedBranchDetails.branch.pinCode}` : ''}</div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Contact Number: </strong>{selectedBranchDetails.branch.contactNumber || 'N/A'}</div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Branch Email: </strong>{selectedBranchDetails.branch.email || 'N/A'}</div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Branch Manager: </strong>{selectedBranchDetails.branch.managerName || 'Unassigned'} {selectedBranchDetails.branch.managerEmail ? `(${selectedBranchDetails.branch.managerEmail})` : ''}</div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Opening Date: </strong>{selectedBranchDetails.branch.openingDate ? new Date(selectedBranchDetails.branch.openingDate).toLocaleDateString() : 'N/A'}</div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Utilization Rate: </strong>{selectedBranchDetails.branch.utilizationPercentage || 0}%</div>
                  </div>
                </div>
              )}

              {drawerActiveTab === 'students' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      Assigned Students ({selectedBranchDetails.assignedStudents.length})
                    </h4>
                    <button
                      onClick={() => handleOpenAssignModal(selectedBranchDetails.branch)}
                      style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      + Assign Student
                    </button>
                  </div>

                  {selectedBranchDetails.assignedStudents.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '8px', color: 'var(--text-muted)' }}>
                      No students currently assigned to this branch.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedBranchDetails.assignedStudents.map((st) => (
                        <div key={st._id} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{st.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{st.email} • {st.phone}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>
                            {st.stage}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {drawerActiveTab === 'staff' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      Branch Staff & Employees ({(selectedBranchDetails.branch as any).assignedStaffIds?.length || 0})
                    </h4>
                    {isOwnerAdmin && (
                      <button
                        onClick={() => handleOpenStaffModal(selectedBranchDetails.branch)}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        + Assign Staff
                      </button>
                    )}
                  </div>

                  {(selectedBranchDetails.branch as any).assignedStaffIds?.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '8px', color: 'var(--text-muted)' }}>
                      No staff assigned yet to this branch.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {((selectedBranchDetails.branch as any).assignedStaffIds || []).map((staff: any) => (
                        <div key={staff._id || staff} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{staff.name || 'Staff User'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{staff.email}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#F3F4F6', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: '4px' }}>
                            {staff.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {drawerActiveTab === 'applications' && (
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Branch Student Applications</h4>
                  {isLoadingTabContent ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>Loading applications...</div>
                  ) : branchApplications.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '8px', color: 'var(--text-muted)' }}>
                      No applications recorded for students assigned to this branch.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {branchApplications.map((app) => (
                        <div key={app._id} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{(app.leadId as any)?.name || 'Student'} - {app.universityName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{app.courseTitle} ({app.country})</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px' }}>
                            {app.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {drawerActiveTab === 'reports' && (
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Branch Performance Summary</h4>
                  <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <div style={{ marginBottom: '8px' }}>Capacity Utilization: <strong>{selectedBranchDetails.branch.utilizationPercentage || 0}%</strong></div>
                    <div style={{ marginBottom: '8px' }}>Assigned Students: <strong>{selectedBranchDetails.branch.assignedStudentsCount}</strong></div>
                    <div style={{ marginBottom: '8px' }}>Available Vacancies: <strong>{selectedBranchDetails.branch.availableSeats}</strong></div>
                    <div>Status: <strong>{selectedBranchDetails.branch.status}</strong></div>
                  </div>
                </div>
              )}

              {drawerActiveTab === 'history' && (
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Branch Activity Audit History</h4>
                  {isLoadingTabContent ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>Loading activity logs...</div>
                  ) : branchLogs.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '8px', color: 'var(--text-muted)' }}>
                      No audit log records for this branch yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {branchLogs.map((log) => (
                        <div key={log._id} style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '12.5px' }}>
                          <div style={{ fontWeight: 600 }}>{log.operation}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(log.createdAt).toLocaleString()} by {(log.triggeredBy as any)?.name || 'Owner Admin'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ASSIGN STAFF MODAL --- */}
      {assignStaffModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Assign Staff to Branch</h3>
              <button onClick={() => setAssignStaffModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignStaffSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Select Staff Members</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px' }}>
                  {allUsers.filter((u) => u.role !== 'STUDENT').map((u) => (
                    <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={selectedStaffUserIds.includes(u._id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStaffUserIds([...selectedStaffUserIds, u._id]);
                          else setSelectedStaffUserIds(selectedStaffUserIds.filter((id) => id !== u._id));
                        }}
                      />
                      <span>{u.name} ({u.role}) - {u.email}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setAssignStaffModal(null)} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '6px', background: '#FFF' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmittingAssign} style={{ padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  Save Staff Assignments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- STUDENT ASSIGNMENT MODAL --- */}
      {assignStudentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Assign Student to Branch</h3>
              <button onClick={() => setAssignStudentModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Assigning student to <strong>{assignStudentModal.name}</strong> ({assignStudentModal.availableSeats} available seats).
            </p>

            <form onSubmit={handleAssignStudentSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Select Student *</label>
                <select
                  value={selectedStudentToAssign}
                  onChange={(e) => setSelectedStudentToAssign(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFFFFF', fontSize: '13.5px' }}
                >
                  <option value="">-- Choose Student --</option>
                  {unassignedStudents.map((st) => (
                    <option key={st._id} value={st._id}>
                      {st.name} ({st.email}) - {st.targetCountry || 'Abroad'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setAssignStudentModal(null)} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '6px', background: '#FFF' }}>
                  Cancel
                </button>
                <button type="submit" disabled={!selectedStudentToAssign || isSubmittingAssign} style={{ padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  {isSubmittingAssign ? 'Assigning...' : 'Assign Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SAFE DELETION BLOCK CONFIRMATION DIALOG --- */}
      {deletingBranch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-lg)', maxWidth: '460px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: '#DC2626' }}>
              <ShieldAlert size={28} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Delete Branch Confirmation</h3>
            </div>

            {deletingBranch.assignedStudentsCount > 0 ? (
              <div>
                <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '16px' }}>
                  <strong>Cannot Delete Branch:</strong> '{deletingBranch.name}' currently has <strong style={{ color: '#DC2626' }}>{deletingBranch.assignedStudentsCount} student(s)</strong> assigned to it.
                </p>
                <div style={{ padding: '12px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '6px', fontSize: '12.5px', color: '#92400E', marginBottom: '20px' }}>
                  To maintain database integrity, reassign all students before deleting. You can deactivate the branch instead.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setDeletingBranch(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF' }}>Close</button>
                  <button onClick={() => { handleToggleStatus(deletingBranch); setDeletingBranch(null); }} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#D97706', color: '#FFF', border: 'none', fontWeight: 600 }}>Deactivate Instead</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                  Are you sure you want to delete branch <strong>{deletingBranch.name}</strong> ({deletingBranch.branchId})? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setDeletingBranch(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF' }}>Cancel</button>
                  <button onClick={handleDeleteBranch} style={{ padding: '8px 18px', borderRadius: '6px', backgroundColor: '#DC2626', color: '#FFF', border: 'none', fontWeight: 600 }}>Delete Branch</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

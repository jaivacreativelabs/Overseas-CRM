import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  MapPin,
  X,
  UserCheck,
  MoreHorizontal,
  Power,
  Landmark,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useAuth } from '../../context/AuthContext';
import { UserRole, AdminType, Branch, Lead, Application, IntegrationLog, User as UserType, MetaFormMapping } from '../../types';

// Meta Facebook SVG Icon
const FacebookColorIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      fill="#1877F2"
    />
  </svg>
);

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

type BankDetailsForm = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  bankBranch: string;
  accountType: '' | 'SAVINGS' | 'CURRENT';
  upiId: string;
};

const EMPTY_BANK_DETAILS: BankDetailsForm = {
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  bankBranch: '',
  accountType: '',
  upiId: '',
};

const toBankDetailsForm = (branch: Branch): BankDetailsForm => ({
  accountHolderName: branch.bankDetails?.accountHolderName || '',
  bankName: branch.bankDetails?.bankName || '',
  accountNumber: branch.bankDetails?.accountNumber || '',
  ifscCode: branch.bankDetails?.ifscCode || '',
  bankBranch: branch.bankDetails?.bankBranch || '',
  accountType: branch.bankDetails?.accountType || '',
  upiId: branch.bankDetails?.upiId || '',
});

const hasBankDetails = (bank: BankDetailsForm) => Object.values(bank).some((v) => v.trim() !== '');

const maskAccountNumber = (accountNumber: string) =>
  accountNumber.length <= 4 ? accountNumber : `${'•'.repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`;

export interface ExtendedBranchSummary {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  statesCovered: number;
  totalAssignedStudents: number;
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
    totalAssignedStudents: 0,
  });
  const [stateSummaries, setStateSummaries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedBranchDetails, setSelectedBranchDetails] = useState<{
    branch: Branch;
    assignedStudents: Lead[];
  } | null>(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'overview' | 'students' | 'staff' | 'applications' | 'history'>('overview');
  const [branchApplications, setBranchApplications] = useState<Application[]>([]);
  const [branchLogs, setBranchLogs] = useState<IntegrationLog[]>([]);
  const [isLoadingTabContent, setIsLoadingTabContent] = useState(false);

  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [assignStudentModal, setAssignStudentModal] = useState<Branch | null>(null);
  const [assignStaffModal, setAssignStaffModal] = useState<Branch | null>(null);

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
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    notes: '',
    bankDetails: EMPTY_BANK_DETAILS,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const setBankField = (field: keyof BankDetailsForm, value: string) =>
    setFormData((prev) => ({ ...prev, bankDetails: { ...prev.bankDetails, [field]: value } }));

  const [unassignedStudents, setUnassignedStudents] = useState<Lead[]>([]);
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState('');
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [selectedStaffUserIds, setSelectedStaffUserIds] = useState<string[]>([]);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Branch card "⋯" menu (Edit / Deactivate / Delete)
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  useEffect(() => {
    if (!openCardMenuId) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest?.('[data-branch-card-menu]')) setOpenCardMenuId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCardMenuId(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [openCardMenuId]);

  // Meta Lead Form Connection State
  const [metaForms, setMetaForms] = useState<MetaFormMapping[]>([]);
  const [connectingBranchId, setConnectingBranchId] = useState<string | null>(null);
  const [showAddCustomFormModal, setShowAddCustomFormModal] = useState<string | null>(null);
  const [customFormInput, setCustomFormInput] = useState({
    formId: '',
    formName: '',
    campaignName: '',
  });

  const DEFAULT_KNOWN_FORMS = [
    { formId: 'meta_form_uk_blr', formName: 'UK Masters FastTrack Form (South India)', campaignName: 'UK Admissions 2026' },
    { formId: 'meta_form_uk_pune', formName: 'UK STEM & Business Form (West India)', campaignName: 'UK Admissions 2026' },
    { formId: 'meta_form_can_pune', formName: 'Canada SDS & Express Visa Form', campaignName: 'Canada Visa Express' },
    { formId: 'meta_form_aus_che', formName: 'Australia GTE & Scholarship Form', campaignName: 'Australia Direct 2027' },
  ];

  const allKnownForms = [
    ...DEFAULT_KNOWN_FORMS,
    ...metaForms.map((m) => ({
      formId: m.formId,
      formName: m.formName,
      campaignName: m.campaignName,
    })),
  ].filter(
    (form, index, self) =>
      index === self.findIndex((f) => f.formId === form.formId)
  );

  const fetchMetaForms = async () => {
    try {
      const res = await apiClient.get<any>('/integrations/meta-ads/mappings');
      setMetaForms(res.data || []);
    } catch {
      // silently fallback
    }
  };

  useEffect(() => {
    fetchMetaForms();
  }, []);

  const handleConnectFormToBranch = async (branchId: string, formId: string) => {
    if (!formId) return;
    setConnectingBranchId(branchId);
    const formObj = allKnownForms.find((f) => f.formId === formId);
    const branchObj = branches.find((b) => b._id === branchId);

    try {
      await apiClient.post('/integrations/meta-ads/mappings', {
        formId,
        formName: formObj?.formName || formId,
        campaignName: formObj?.campaignName || 'General Meta Ad',
        branchId,
        isActive: true,
      });

      setSuccessMsg(`Meta Lead Form "${formObj?.formName || formId}" connected to ${branchObj?.name || 'branch'}! Any incoming leads will auto-assign here.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchMetaForms();
    } catch (err: any) {
      setError(err.message || 'Failed to connect Meta form');
    } finally {
      setConnectingBranchId(null);
    }
  };

  const handleDisconnectForm = async (mappingId: string, formName: string) => {
    if (!window.confirm(`Disconnect Meta form "${formName}" from this branch?`)) return;

    try {
      await apiClient.delete(`/integrations/meta-ads/mappings/${mappingId}`);
      setSuccessMsg(`Disconnected Meta form "${formName}".`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchMetaForms();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect Meta form');
    }
  };

  const handleSaveCustomForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddCustomFormModal || !customFormInput.formId.trim() || !customFormInput.formName.trim()) {
      setError('Form ID and Form Name are required.');
      return;
    }

    const branchId = showAddCustomFormModal;
    const branchObj = branches.find((b) => b._id === branchId);

    try {
      await apiClient.post('/integrations/meta-ads/mappings', {
        formId: customFormInput.formId.trim(),
        formName: customFormInput.formName.trim(),
        campaignName: customFormInput.campaignName.trim() || 'General Meta Ad',
        branchId,
        isActive: true,
      });

      setSuccessMsg(`New Meta Form "${customFormInput.formName}" connected to ${branchObj?.name || 'branch'}!`);
      setShowAddCustomFormModal(null);
      setCustomFormInput({ formId: '', formName: '', campaignName: '' });
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchMetaForms();
    } catch (err: any) {
      setError(err.message || 'Failed to register custom form');
    }
  };

  const fetchBranches = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<any>('/branches', {
        search: searchQuery,
        state: selectedState,
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
          totalAssignedStudents: 0,
        }
      );
      setStateSummaries(res.data.stateSummaries || []);
      setTotalPages(res.data.pagination?.pages || 1);

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
  }, [searchQuery, selectedState, selectedStatus, sortBy, sortOrder, currentPage]);

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
      status: 'ACTIVE',
      notes: '',
      bankDetails: EMPTY_BANK_DETAILS,
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
      status: branch.status,
      notes: branch.notes || '',
      bankDetails: toBankDetailsForm(branch),
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
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Invalid email address format';
    }
    if (formData.managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.managerEmail.trim())) {
      errs.managerEmail = 'Invalid manager email address format';
    }
    if (formData.pinCode && !/^\d{6}$/.test(formData.pinCode.trim())) {
      errs.pinCode = 'PIN Code must be a 6-digit number';
    }
    const bank = formData.bankDetails;
    if (hasBankDetails(bank)) {
      if (!bank.accountHolderName.trim()) errs.bankAccountHolderName = 'Account holder name is required';
      if (!bank.bankName.trim()) errs.bankName = 'Bank name is required';
      const accountNumber = bank.accountNumber.replace(/\s+/g, '');
      if (!accountNumber) errs.bankAccountNumber = 'Account number is required';
      else if (!/^\d{9,18}$/.test(accountNumber)) errs.bankAccountNumber = 'Account number must be 9 to 18 digits';
      const ifsc = bank.ifscCode.trim().toUpperCase();
      if (!ifsc) errs.bankIfscCode = 'IFSC code is required';
      else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) errs.bankIfscCode = 'IFSC must be 11 characters, e.g. HDFC0001234';
      if (bank.upiId.trim() && !/^[\w.-]{2,}@[a-zA-Z][a-zA-Z0-9.-]+$/.test(bank.upiId.trim())) {
        errs.bankUpiId = 'UPI ID must look like name@bank';
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // All-blank bank fields are sent as null so the branch is saved with no bank details.
    const payload = {
      ...formData,
      bankDetails: hasBankDetails(formData.bankDetails) ? formData.bankDetails : null,
    };

    try {
      if (editingBranch) {
        await apiClient.put(`/branches/${editingBranch._id}`, payload);
        setSuccessMsg(`Branch '${formData.name}' updated successfully.`);
        // Keep the details drawer in sync when the branch was edited from inside it.
        if (selectedBranchDetails?.branch._id === editingBranch._id) {
          const res = await apiClient.get<any>(`/branches/${editingBranch._id}`).catch(() => null);
          if (res) setSelectedBranchDetails(res.data);
        }
      } else {
        await apiClient.post('/branches', payload);
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
      setShowAccountNumber(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch branch details');
    }
  };

  const handleTabChange = async (tab: 'overview' | 'students' | 'staff' | 'applications' | 'history') => {
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
      setSuccessMsg(`Student added to ${assignStudentModal.name}.`);
      setAssignStudentModal(null);
      fetchBranches();
      if (selectedBranchDetails) {
        handleViewDetails(selectedBranchDetails.branch);
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to add student');
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
                Manage branches, add students and staff, and track performance.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL BRANCHES</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{summary.totalBranches}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>All Locations</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ACTIVE BRANCHES</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{summary.activeBranches}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Currently Operational</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ASSIGNED STUDENTS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>{summary.totalAssignedStudents}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Across All Branches</div>
        </div>
      </div>

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

      </div>

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
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '16px' }}>
          {branches.map((b) => (
            <div
              key={b._id}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                backgroundColor: '#FFFFFF',
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

                {(() => {
                  const formCount = metaForms.filter(
                    (m) => ((m.branchId as any)?._id || (m.branchId as any)) === b._id
                  ).length;
                  return (
                    <dl className="branch-card-stats">
                      <div>
                        <dt>Students</dt>
                        <dd>{b.assignedStudentsCount || 0}</dd>
                      </div>
                      <div>
                        <dt>Manager</dt>
                        <dd className={b.managerName ? 'is-text' : 'is-empty'} title={b.managerName || undefined}>
                          {b.managerName || 'Not set'}
                        </dd>
                      </div>
                      <div>
                        <dt>Lead forms</dt>
                        <dd>{formCount}</dd>
                      </div>
                    </dl>
                  );
                })()}
              </div>

              {/* Everything else (students, assign, Meta lead forms, applications, history) lives in the View branch popup */}
              <div className="branch-card-footer">
                <button type="button" className="branch-view-btn" onClick={() => handleViewDetails(b)}>
                  <Eye size={16} />
                  <span>View branch</span>
                </button>

                {isOwnerAdmin && (
                  <div className="branch-card-menu-wrap" data-branch-card-menu>
                    <button
                      type="button"
                      className={`branch-card-more ${openCardMenuId === b._id ? 'is-open' : ''}`}
                      aria-label={`More actions for ${b.name}`}
                      aria-haspopup="menu"
                      aria-expanded={openCardMenuId === b._id}
                      onClick={() => setOpenCardMenuId((cur) => (cur === b._id ? null : b._id))}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {openCardMenuId === b._id && (
                      <div className="branch-card-menu" role="menu" aria-label={`Actions for ${b.name}`}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenCardMenuId(null);
                            handleOpenEditModal(b);
                          }}
                        >
                          <Edit size={15} /> Edit branch
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenCardMenuId(null);
                            handleToggleStatus(b);
                          }}
                        >
                          <Power size={15} /> {b.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <div className="branch-card-menu-divider" aria-hidden="true" />
                        <button
                          type="button"
                          role="menuitem"
                          className="is-danger"
                          onClick={() => {
                            setOpenCardMenuId(null);
                            setDeletingBranch(b);
                          }}
                        >
                          <Trash2 size={15} /> Delete branch
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
            // Above the branch details drawer (1200), since Edit can be opened from inside it.
            zIndex: 1250,
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

              <div style={{ marginBottom: '16px', backgroundColor: '#F3F4F6', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  AUTOMATIC UNIQUE BRANCH ID
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                  {editingBranch ? editingBranch.branchId : '[Server Generated e.g. KA-BLR-A81F2C]'}
                </div>
              </div>

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

              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                Management Information
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

              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.04em' }}>
                Bank Account Details
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Optional. Leave all fields blank if this branch has no bank account on file.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                {(
                  [
                    { field: 'accountHolderName', errKey: 'bankAccountHolderName', label: 'Account Holder Name', placeholder: 'e.g. IIEC Overseas Pvt Ltd' },
                    { field: 'bankName', errKey: 'bankName', label: 'Bank Name', placeholder: 'e.g. HDFC Bank' },
                    { field: 'accountNumber', errKey: 'bankAccountNumber', label: 'Account Number', placeholder: '9 to 18 digits', inputMode: 'numeric' },
                    { field: 'ifscCode', errKey: 'bankIfscCode', label: 'IFSC Code', placeholder: 'e.g. HDFC0001234', uppercase: true },
                    { field: 'bankBranch', errKey: 'bankBranch', label: 'Bank Branch', placeholder: 'e.g. MG Road, Bangalore' },
                  ] as const
                ).map((f) => (
                  <div key={f.field}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {f.label}
                    </label>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      inputMode={'inputMode' in f ? f.inputMode : undefined}
                      autoComplete="off"
                      value={formData.bankDetails[f.field]}
                      onChange={(e) =>
                        setBankField(f.field, 'uppercase' in f ? e.target.value.toUpperCase() : e.target.value)
                      }
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: formErrors[f.errKey] ? '1px solid #EF4444' : '1px solid var(--border-color)',
                        fontSize: '13.5px',
                      }}
                    />
                    {formErrors[f.errKey] && <span style={{ fontSize: '11.5px', color: '#EF4444' }}>{formErrors[f.errKey]}</span>}
                  </div>
                ))}

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Account Type
                  </label>
                  <select
                    value={formData.bankDetails.accountType}
                    onChange={(e) => setBankField('accountType', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13.5px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="">Select type</option>
                    <option value="CURRENT">Current</option>
                    <option value="SAVINGS">Savings</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    UPI ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. iiecbangalore@hdfcbank"
                    autoComplete="off"
                    value={formData.bankDetails.upiId}
                    onChange={(e) => setBankField('upiId', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.bankUpiId ? '1px solid #EF4444' : '1px solid var(--border-color)',
                      fontSize: '13.5px',
                    }}
                  />
                  {formErrors.bankUpiId && <span style={{ fontSize: '11.5px', color: '#EF4444' }}>{formErrors.bankUpiId}</span>}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
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

      {selectedBranchDetails && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px',
            zIndex: 1200,
          }}
          onMouseDown={(e) => {
            // Click on the dimmed backdrop closes the popup
            if (e.target === e.currentTarget) setSelectedBranchDetails(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Branch: ${selectedBranchDetails.branch.name}`}
            style={{
              backgroundColor: '#FFFFFF',
              width: '760px',
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 32px)',
              borderRadius: '14px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.35)',
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
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px' }}>
                  {selectedBranchDetails.branch.branchId}
                </span>
                <h3 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 2px' }}>
                  {selectedBranchDetails.branch.name}
                </h3>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} style={{ flexShrink: 0 }} />
                  {selectedBranchDetails.branch.city}, {selectedBranchDetails.branch.state}
                  {selectedBranchDetails.branch.managerName ? ` · Manager: ${selectedBranchDetails.branch.managerName}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  type="button"
                  className="branch-view-btn"
                  style={{ height: '38px', padding: '0 14px' }}
                  onClick={() => handleOpenAssignModal(selectedBranchDetails.branch)}
                >
                  <UserCheck size={16} />
                  <span>Add student</span>
                </button>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setSelectedBranchDetails(null)}
                  style={{ width: '38px', height: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: '#FFFFFF', overflowX: 'auto' }}>
              {(['overview', 'students', 'staff', 'applications', 'history'] as const).map((tab) => (
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {drawerActiveTab === 'overview' && (
                <div>
                  <div style={{ display: 'flex', gap: '10px', backgroundColor: '#F9FAFB', padding: '14px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>State & City</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedBranchDetails.branch.city}, {selectedBranchDetails.branch.state}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Students Assigned</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#D97706' }}>{selectedBranchDetails.branch.assignedStudentsCount}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: selectedBranchDetails.branch.status === 'ACTIVE' ? '#059669' : '#DC2626', marginTop: '2px' }}>{selectedBranchDetails.branch.status}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Full Address: </strong>{selectedBranchDetails.branch.address} {selectedBranchDetails.branch.pinCode ? `- ${selectedBranchDetails.branch.pinCode}` : ''}</div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Contact Number: </strong>{selectedBranchDetails.branch.contactNumber || 'N/A'}</div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Branch Email: </strong>{selectedBranchDetails.branch.email || 'N/A'}</div>
                    <div><strong style={{ color: 'var(--text-muted)' }}>Branch Manager: </strong>{selectedBranchDetails.branch.managerName || 'Unassigned'} {selectedBranchDetails.branch.managerEmail ? `(${selectedBranchDetails.branch.managerEmail})` : ''}</div>
                  </div>

                  {/* Bank Account Details */}
                  {(() => {
                    const bank = selectedBranchDetails.branch.bankDetails;
                    return (
                      <div style={{ marginTop: '20px', padding: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Landmark size={15} color="var(--primary)" />
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Bank Account Details</strong>
                          </div>
                          <button
                            onClick={() => handleOpenEditModal(selectedBranchDetails.branch)}
                            style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--primary)', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            {bank?.accountNumber ? 'Edit' : '+ Add Bank Details'}
                          </button>
                        </div>
                        {bank?.accountNumber ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                            <div><strong style={{ color: 'var(--text-muted)' }}>Account Holder: </strong>{bank.accountHolderName}</div>
                            <div><strong style={{ color: 'var(--text-muted)' }}>Bank: </strong>{bank.bankName}{bank.bankBranch ? `, ${bank.bankBranch}` : ''}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>
                                <strong style={{ color: 'var(--text-muted)' }}>Account Number: </strong>
                                <span style={{ fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                                  {showAccountNumber ? bank.accountNumber : maskAccountNumber(bank.accountNumber)}
                                </span>
                              </span>
                              <button
                                onClick={() => setShowAccountNumber((v) => !v)}
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: '11.5px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                              >
                                {showAccountNumber ? 'Hide' : 'Show'}
                              </button>
                            </div>
                            <div><strong style={{ color: 'var(--text-muted)' }}>IFSC Code: </strong><span style={{ fontFamily: 'monospace' }}>{bank.ifscCode}</span></div>
                            {bank.accountType && (
                              <div><strong style={{ color: 'var(--text-muted)' }}>Account Type: </strong>{bank.accountType === 'CURRENT' ? 'Current' : 'Savings'}</div>
                            )}
                            {bank.upiId && <div><strong style={{ color: 'var(--text-muted)' }}>UPI ID: </strong>{bank.upiId}</div>}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No bank account added for this branch yet.</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Connected Meta Lead Forms in Drawer */}
                  <div style={{ marginTop: '20px', padding: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FacebookColorIcon size={16} />
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Connected Meta Lead Forms</strong>
                      </div>
                      <button
                        onClick={() => setShowAddCustomFormModal(selectedBranchDetails.branch._id)}
                        style={{ padding: '4px 8px', fontSize: '11px', color: '#1877F2', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        + Add Custom Form ID
                      </button>
                    </div>

                    {(() => {
                      const bForms = metaForms.filter(
                        (m) => ((m.branchId as any)?._id || (m.branchId as any)) === selectedBranchDetails.branch._id
                      );

                      const branchIdForForms = selectedBranchDetails.branch._id;
                      const unconnectedForms = allKnownForms.filter(
                        (kf) => !bForms.some((bf) => bf.formId === kf.formId)
                      );
                      const connectPicker = (
                        <select
                          value=""
                          aria-label="Connect a Meta lead form to this branch"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            if (val === '__custom__') {
                              setShowAddCustomFormModal(branchIdForForms);
                            } else {
                              handleConnectFormToBranch(branchIdForForms, val);
                            }
                          }}
                          disabled={connectingBranchId === branchIdForForms}
                          style={{
                            width: '100%',
                            height: '40px',
                            marginTop: '10px',
                            padding: '0 12px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            border: '1px dashed #94A3B8',
                            backgroundColor: '#FFFFFF',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="">
                            {connectingBranchId === branchIdForForms ? 'Connecting…' : '+ Connect a Meta lead form…'}
                          </option>
                          {unconnectedForms.map((f) => (
                            <option key={f.formId} value={f.formId}>
                              {f.formName}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter custom form ID…</option>
                        </select>
                      );

                      if (bForms.length === 0) {
                        return (
                          <div>
                            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                              No Meta lead form is connected to this branch yet. New leads from a connected form are routed to this branch automatically.
                            </div>
                            {connectPicker}
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {bForms.map((m) => (
                            <div
                              key={m._id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {m.formName}
                                </div>
                                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                  Form ID: <code style={{ backgroundColor: '#F1F5F9', padding: '1px 4px', borderRadius: '3px' }}>{m.formId}</code> • Campaign: {m.campaignName || 'General'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '10px' }}>
                                  {m.totalLeadsRouted || 0} Leads Routed
                                </span>
                                <button
                                  onClick={() => handleDisconnectForm(m._id, m.formName)}
                                  style={{ padding: '3px 8px', fontSize: '11px', color: '#DC2626', background: 'none', border: '1px solid #FECACA', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  Disconnect
                                </button>
                              </div>
                            </div>
                          ))}
                          {connectPicker}
                        </div>
                      );
                    })()}
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
                      + Add Student
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

      {assignStudentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Add Student to Branch</h3>
              <button onClick={() => setAssignStudentModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Adding a student to <strong>{assignStudentModal.name}</strong>.
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
                  {isSubmittingAssign ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Modal to Register Custom Meta Lead Form ID */}
      {showAddCustomFormModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FacebookColorIcon size={20} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Connect Meta Instant Lead Form
                </h3>
              </div>
              <button
                onClick={() => { setShowAddCustomFormModal(null); setCustomFormInput({ formId: '', formName: '', campaignName: '' }); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Enter the Lead Gen Form details from your Meta Ads Manager to automatically route all leads generated from this form to <strong>{branches.find((b) => b._id === showAddCustomFormModal)?.name}</strong>.
            </p>

            <form onSubmit={handleSaveCustomForm}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Meta Lead Form ID <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 109823485729103 or meta_form_custom_1"
                  value={customFormInput.formId}
                  onChange={(e) => setCustomFormInput({ ...customFormInput, formId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13.5px' }}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                  Found under Meta Ads Manager → Instant Forms → Form ID
                </span>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Form Display Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fall 2026 Masters Campaign Form"
                  value={customFormInput.formName}
                  onChange={(e) => setCustomFormInput({ ...customFormInput, formName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13.5px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Campaign Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Global Masters Lead Gen 2026"
                  value={customFormInput.campaignName}
                  onChange={(e) => setCustomFormInput({ ...customFormInput, campaignName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddCustomFormModal(null); setCustomFormInput({ formId: '', formName: '', campaignName: '' }); }}
                  style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '6px', background: '#FFF' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', backgroundColor: '#1877F2', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Connect Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

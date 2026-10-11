import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Check,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Link2,
  Copy,
  Building2,
  Send,
  Zap,
  Info,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Branch, MetaFormMapping } from '../../types';

// Meta Facebook SVG Icon
const FacebookColorIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      fill="#1877F2"
    />
  </svg>
);

const FacebookWhiteIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const IntegrationsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  // Connection & Server Config State
  const [metaStatus, setMetaStatus] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formMappings, setFormMappings] = useState<MetaFormMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal: Add New Form Mapping
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [newForm, setNewForm] = useState({
    formId: '',
    formName: '',
    campaignName: '',
    branchId: '',
    notes: '',
  });

  // Modal: Test / Simulate Meta Lead
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLead, setSimLead] = useState({
    formId: '',
    formName: '',
    campaignName: '',
    name: 'Priya Sharma',
    email: 'priya.sharma@meta-test.com',
    phone: '9876543210',
    preferredCountry: 'United Kingdom',
    targetCourse: 'MSc Data Science',
  });

  // Fetch all data: Meta status, branches, and form mappings
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, branchesRes, mappingsRes] = await Promise.all([
        apiClient.get<any>('/integrations/meta-ads/status'),
        apiClient.get<any>('/branches'),
        apiClient.get<any>('/integrations/meta-ads/mappings'),
      ]);

      setMetaStatus(statusRes.data || null);

      const bList = Array.isArray(branchesRes.data)
        ? branchesRes.data
        : branchesRes.data?.branches || [];
      setBranches(bList);

      setFormMappings(mappingsRes.data || []);

      // Pre-select first branch for new form modal if empty
      if (bList.length > 0 && !newForm.branchId) {
        setNewForm((prev) => ({ ...prev, branchId: bList[0]._id }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Meta integration data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick Branch Change via DROPDOWN
  const handleQuickChangeBranch = async (mapping: MetaFormMapping, newBranchId: string) => {
    setIsUpdatingId(mapping._id);
    const selectedBranch = branches.find((b) => b._id === newBranchId);

    try {
      await apiClient.post('/integrations/meta-ads/mappings', {
        formId: mapping.formId,
        formName: mapping.formName,
        campaignName: mapping.campaignName || 'General Meta Ad',
        branchId: newBranchId,
        isActive: mapping.isActive,
      });

      // Update local state immediately
      setFormMappings((prev) =>
        prev.map((m) =>
          m._id === mapping._id
            ? {
                ...m,
                branchId: newBranchId,
                branchName: selectedBranch?.name || m.branchName,
              }
            : m
        )
      );

      setSuccessMsg(`Form "${mapping.formName}" is now assigned to ${selectedBranch?.name || 'selected branch'}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update branch assignment');
    } finally {
      setIsUpdatingId(null);
    }
  };

  // Toggle Active/Inactive status for form mapping
  const handleToggleActive = async (mapping: MetaFormMapping) => {
    const branchIdStr =
      typeof mapping.branchId === 'object' && mapping.branchId?._id
        ? mapping.branchId._id
        : String(mapping.branchId);

    try {
      await apiClient.post('/integrations/meta-ads/mappings', {
        formId: mapping.formId,
        formName: mapping.formName,
        campaignName: mapping.campaignName || 'General Meta Ad',
        branchId: branchIdStr,
        isActive: !mapping.isActive,
      });

      setFormMappings((prev) =>
        prev.map((m) =>
          m._id === mapping._id ? { ...m, isActive: !m.isActive } : m
        )
      );

      setSuccessMsg(`Form routing is now ${!mapping.isActive ? 'Active' : 'Paused'}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle status');
    }
  };

  // Delete Form Mapping
  const handleDeleteMapping = async (id: string, formName: string) => {
    if (!window.confirm(`Remove branch assignment for "${formName}"?`)) return;

    try {
      await apiClient.delete(`/integrations/meta-ads/mappings/${id}`);
      setFormMappings((prev) => prev.filter((m) => m._id !== id));
      setSuccessMsg(`Form assignment for "${formName}" removed.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete form mapping');
    }
  };

  // Save New Form Mapping from Modal
  const handleSaveNewForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.formId.trim() || !newForm.formName.trim() || !newForm.branchId) {
      setErrorMsg('Please enter Form ID, Form Name, and select a Branch.');
      return;
    }

    setIsSavingForm(true);
    try {
      await apiClient.post('/integrations/meta-ads/mappings', {
        formId: newForm.formId.trim(),
        formName: newForm.formName.trim(),
        campaignName: newForm.campaignName.trim() || 'General Meta Ad',
        branchId: newForm.branchId,
        notes: newForm.notes.trim(),
        isActive: true,
      });

      setSuccessMsg(`Form "${newForm.formName}" mapped to branch successfully!`);
      setShowAddModal(false);
      setNewForm({
        formId: '',
        formName: '',
        campaignName: '',
        branchId: branches[0]?._id || '',
        notes: '',
      });
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create form mapping');
    } finally {
      setIsSavingForm(false);
    }
  };

  // Simulate / Test Lead Routing
  const handleSimulateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const res = await apiClient.post<any>('/integrations/meta-ads/simulate-lead', simLead);
      const assignedBranchName =
        res.data?.assignedBranch?.name || 'Target Branch';
      setSuccessMsg(
        `Test lead for "${simLead.name}" ingested successfully and assigned to ${assignedBranchName}!`
      );
      setShowSimulateModal(false);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to simulate test lead');
    } finally {
      setIsSimulating(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Filtered Mappings
  const filteredMappings = formMappings.filter((m) => {
    const q = searchQuery.toLowerCase();
    const branchName =
      typeof m.branchId === 'object' && m.branchId?.name
        ? m.branchId.name
        : m.branchName || '';
    return (
      m.formName.toLowerCase().includes(q) ||
      m.formId.toLowerCase().includes(q) ||
      m.campaignName.toLowerCase().includes(q) ||
      branchName.toLowerCase().includes(q)
    );
  });

  const webhookUrl =
    metaStatus?.webhook?.callbackUrl ||
    `${window.location.origin.replace(':5173', ':5000')}/api/v1/leads/webhook/meta`;
  const verifyToken = metaStatus?.webhook?.verifyToken || 'jaiva_meta_token_2026';
  const isDirectConnected = metaStatus?.isConnected === true;
  const configuredAccountNo =
    metaStatus?.configuredAccountNo || metaStatus?.account?.id || 'Pending in .env / code';
  const configuredAppId = metaStatus?.configuredAppId || 'Configured';

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}>
      {/* Top Header: Meta Direct Integration & Branch Assignment */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '14px',
          paddingBottom: '18px',
          borderBottom: '1px solid #E4E6EB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              backgroundColor: '#1877F2',
              borderRadius: '10px',
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(24, 119, 242, 0.3)',
            }}
          >
            <FacebookWhiteIcon size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1C1E21', margin: 0 }}>
                Meta Lead Gen &amp; Branch Assignment
              </h1>
              {isDirectConnected ? (
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#065F46',
                    backgroundColor: '#D1FAE5',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#059669' }} />
                  VERIFIED &amp; CONNECTED (DIRECT CONFIG)
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#92400E',
                    backgroundColor: '#FEF3C7',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#D97706' }} />
                  DIRECT CONFIG WAITING (SET IN CODE / .ENV)
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#65676B', marginTop: '3px' }}>
              Assign incoming leads from running Facebook &amp; Instagram Lead Ads directly to target branches via dropdown.
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchData}
            disabled={isLoading}
            title="Refresh connection status & mappings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              color: '#1C1E21',
              border: '1px solid #CED0D4',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              if (formMappings.length > 0) {
                setSimLead((prev) => ({
                  ...prev,
                  formId: formMappings[0].formId,
                  formName: formMappings[0].formName,
                  campaignName: formMappings[0].campaignName,
                }));
              }
              setShowSimulateModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#F0F2F5',
              color: '#1877F2',
              border: '1px solid #D8DADF',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Zap size={14} />
            <span>Test / Simulate Lead</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              backgroundColor: '#1877F2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(24, 119, 242, 0.3)',
            }}
          >
            <Plus size={16} />
            <span>+ Add Lead Form</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '8px',
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

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
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
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* --- CARD 1: DIRECT META VERIFIED CONNECTION & WEBHOOK GATEWAY --- */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #CED0D4',
          borderRadius: '10px',
          padding: '22px 24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E7F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1C1E21' }}>
                Direct Verified Meta Connection (Set Once in Code)
              </div>
              <div style={{ fontSize: '12px', color: '#65676B' }}>
                Server-side connection verified with Meta Graph API v19.0. No manual logins required.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: '#1C1E21' }}>
            <div>
              <span style={{ color: '#65676B' }}>Ads Account: </span>
              <strong>{configuredAccountNo}</strong>
            </div>
            <div>
              <span style={{ color: '#65676B' }}>App ID: </span>
              <strong>{configuredAppId}</strong>
            </div>
          </div>
        </div>

        {/* Webhook Endpoint Banner */}
        <div
          style={{
            backgroundColor: '#F7F8FA',
            border: '1px solid #E4E6EB',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '16px',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#65676B', textTransform: 'uppercase', marginBottom: '4px' }}>
              Meta Lead Gen Webhook Callback URL
            </div>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #CED0D4', borderRadius: '6px', overflow: 'hidden' }}>
              <input
                type="text"
                readOnly
                value={webhookUrl}
                style={{ flex: 1, padding: '7px 10px', border: 'none', backgroundColor: 'transparent', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, 'url')}
                style={{ padding: '7px 12px', border: 'none', backgroundColor: '#F0F2F5', borderLeft: '1px solid #CED0D4', cursor: 'pointer', color: copiedField === 'url' ? '#059669' : '#1877F2', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
              >
                {copiedField === 'url' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedField === 'url' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#65676B', textTransform: 'uppercase', marginBottom: '4px' }}>
              Verify Token
            </div>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #CED0D4', borderRadius: '6px', overflow: 'hidden' }}>
              <input
                type="text"
                readOnly
                value={verifyToken}
                style={{ flex: 1, padding: '7px 10px', border: 'none', backgroundColor: 'transparent', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}
              />
              <button
                onClick={() => copyToClipboard(verifyToken, 'token')}
                style={{ padding: '7px 12px', border: 'none', backgroundColor: '#F0F2F5', borderLeft: '1px solid #CED0D4', cursor: 'pointer', color: copiedField === 'token' ? '#059669' : '#1877F2', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
              >
                {copiedField === 'token' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedField === 'token' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- CARD 2: RUNNING ADS LEAD FORMS -> BRANCH ASSIGNMENT (WITH DROPDOWN) --- */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #CED0D4',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Table Toolbar */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#F7F8FA',
            borderBottom: '1px solid #E4E6EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1C1E21' }}>
              Running Ads Lead Forms ({formMappings.length})
            </span>
            <span style={{ fontSize: '12px', color: '#65676B' }}>
              • Choose the branch in the dropdown to assign all incoming leads from that form
            </span>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#8A8D91' }} />
            <input
              type="text"
              placeholder="Search forms or branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CED0D4',
                borderRadius: '6px',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Form to Branch Routing Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#F0F2F5',
                  color: '#65676B',
                  fontWeight: 600,
                  borderBottom: '1px solid #CED0D4',
                  whiteSpace: 'nowrap',
                }}
              >
                <th style={{ padding: '12px 18px', minWidth: '280px' }}>
                  Meta Lead Form &amp; ID
                </th>
                <th style={{ padding: '12px 18px', minWidth: '320px' }}>
                  Assigned Branch (Select in Dropdown)
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '130px' }}>
                  Leads Routed
                </th>
                <th style={{ padding: '12px 16px', width: '150px' }}>
                  Last Lead Received
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '100px' }}>
                  Status
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'right', width: '160px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px 20px', color: '#65676B' }}>
                    <div style={{ maxWidth: '440px', margin: '0 auto' }}>
                      <Building2 size={36} style={{ color: '#8A8D91', marginBottom: '12px' }} />
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1C1E21', marginBottom: '6px' }}>
                        No Form Mappings Found
                      </div>
                      <div style={{ fontSize: '13px', color: '#65676B', marginBottom: '18px' }}>
                        {formMappings.length === 0
                          ? 'Click "+ Add Lead Form" to register your running Meta Lead Ads forms and map them to branches.'
                          : 'No forms match your search filter.'}
                      </div>
                      <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                          padding: '8px 18px',
                          backgroundColor: '#1877F2',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Add Lead Form
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMappings.map((m) => {
                  const currentBranchId =
                    typeof m.branchId === 'object' && m.branchId?._id
                      ? m.branchId._id
                      : String(m.branchId);

                  const isRowUpdating = isUpdatingId === m._id;

                  return (
                    <tr
                      key={m._id}
                      style={{
                        borderBottom: '1px solid #E4E6EB',
                        backgroundColor: '#FFFFFF',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F7F8FA';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      {/* Meta Lead Form Name & ID */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#1C1E21', fontSize: '13.5px' }}>
                          {m.formName}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#65676B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ backgroundColor: '#F0F2F5', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            ID: {m.formId}
                          </span>
                          <span>•</span>
                          <span>{m.campaignName || 'Meta Ad Campaign'}</span>
                        </div>
                      </td>

                      {/* ASSIGNED BRANCH (THE DROPDOWN!) */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                            <select
                              value={currentBranchId}
                              disabled={isRowUpdating}
                              onChange={(e) => handleQuickChangeBranch(m, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1.5px solid #1877F2',
                                backgroundColor: '#F0F7FF',
                                color: '#1C1E21',
                                fontSize: '13px',
                                fontWeight: 600,
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {branches.map((b) => (
                                <option key={b._id} value={b._id}>
                                  {b.name} ({b.city || 'Main'})
                                </option>
                              ))}
                            </select>
                          </div>
                          {isRowUpdating && (
                            <RefreshCw size={14} className="spin-animation" style={{ color: '#1877F2' }} />
                          )}
                        </div>
                      </td>

                      {/* Total Leads Routed */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: '#E7F3FF',
                            color: '#1877F2',
                            fontWeight: 700,
                            fontSize: '12.5px',
                          }}
                        >
                          {m.totalLeadsRouted || 0} Leads
                        </span>
                      </td>

                      {/* Last Lead Received */}
                      <td style={{ padding: '14px 16px', color: '#65676B', fontSize: '12.5px' }}>
                        {m.lastLeadAt ? new Date(m.lastLeadAt).toLocaleDateString() : 'No leads yet'}
                      </td>

                      {/* Active Status Toggle */}
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleActive(m)}
                          title={m.isActive ? 'Active (Click to Pause)' : 'Paused (Click to Activate)'}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: m.isActive ? '#D1FAE5' : '#F3F4F6',
                            color: m.isActive ? '#065F46' : '#6B7280',
                          }}
                        >
                          {m.isActive ? 'Active' : 'Paused'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setSimLead({
                                formId: m.formId,
                                formName: m.formName,
                                campaignName: m.campaignName,
                                name: 'Test Lead',
                                email: `test_${m.formId.slice(-4)}@example.com`,
                                phone: '9876543210',
                                preferredCountry: 'UK',
                                targetCourse: 'Masters',
                              });
                              setShowSimulateModal(true);
                            }}
                            title="Simulate test lead for this form"
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#F0F2F5',
                              border: '1px solid #CED0D4',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#1877F2',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Send size={12} />
                            <span>Test</span>
                          </button>

                          <button
                            onClick={() => handleDeleteMapping(m._id, m.formName)}
                            title="Remove form assignment"
                            style={{
                              padding: '5px 8px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: ADD NEW FORM MAPPING --- */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #CED0D4',
            }}
          >
            <div
              style={{
                backgroundColor: '#1877F2',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FacebookWhiteIcon size={20} />
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Map Meta Lead Form to Branch</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewForm} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1C1E21', marginBottom: '4px' }}>
                  Meta Instant Form ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1029384756 or meta_form_study_uk"
                  value={newForm.formId}
                  onChange={(e) => setNewForm({ ...newForm, formId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CED0D4', fontSize: '13px' }}
                />
                <div style={{ fontSize: '11px', color: '#8A8D91', marginTop: '3px' }}>
                  Find this in Meta Ads Manager &gt; All Tools &gt; Instant Forms.
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1C1E21', marginBottom: '4px' }}>
                  Form Name (Descriptive Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UK Masters FastTrack Intake 2026"
                  value={newForm.formName}
                  onChange={(e) => setNewForm({ ...newForm, formName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CED0D4', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1C1E21', marginBottom: '4px' }}>
                  Campaign Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UK Autumn Admissions Campaign"
                  value={newForm.campaignName}
                  onChange={(e) => setNewForm({ ...newForm, campaignName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CED0D4', fontSize: '13px' }}
                />
              </div>

              {/* BRANCH SELECTION DROPDOWN */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1C1E21', marginBottom: '4px' }}>
                  Assign to Branch (Dropdown) *
                </label>
                <select
                  required
                  value={newForm.branchId}
                  onChange={(e) => setNewForm({ ...newForm, branchId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #1877F2',
                    backgroundColor: '#F0F7FF',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.city || 'Main'})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: '#65676B', marginTop: '3px' }}>
                  All leads submitted on this Meta form will be immediately assigned to this branch.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '9px 18px', backgroundColor: '#E4E6EB', color: '#1C1E21', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingForm}
                  style={{ padding: '9px 24px', backgroundColor: '#1877F2', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer' }}
                >
                  {isSavingForm ? 'Saving...' : 'Save Form Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SIMULATE / TEST META LEAD --- */}
      {showSimulateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #CED0D4',
            }}
          >
            <div
              style={{
                backgroundColor: '#1877F2',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} />
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Simulate Incoming Meta Lead</span>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSimulateLead} style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: '#65676B', margin: '0 0 16px', lineHeight: 1.5 }}>
                Simulate a live Facebook/Instagram Lead Ad submission. The webhook will route the lead directly to the branch you configured.
              </p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1C1E21', marginBottom: '4px' }}>
                  Target Meta Form *
                </label>
                <select
                  value={simLead.formId}
                  onChange={(e) => {
                    const sel = formMappings.find((m) => m.formId === e.target.value);
                    setSimLead({
                      ...simLead,
                      formId: e.target.value,
                      formName: sel?.formName || '',
                      campaignName: sel?.campaignName || '',
                    });
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CED0D4', fontSize: '13px' }}
                >
                  {formMappings.map((m) => (
                    <option key={m.formId} value={m.formId}>
                      {m.formName} ({m.formId})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1C1E21', marginBottom: '4px' }}>
                    Student Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={simLead.name}
                    onChange={(e) => setSimLead({ ...simLead, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CED0D4', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1C1E21', marginBottom: '4px' }}>
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={simLead.phone}
                    onChange={(e) => setSimLead({ ...simLead, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CED0D4', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1C1E21', marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={simLead.email}
                  onChange={(e) => setSimLead({ ...simLead, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CED0D4', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1C1E21', marginBottom: '4px' }}>
                    Preferred Country
                  </label>
                  <input
                    type="text"
                    value={simLead.preferredCountry}
                    onChange={(e) => setSimLead({ ...simLead, preferredCountry: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CED0D4', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1C1E21', marginBottom: '4px' }}>
                    Target Course
                  </label>
                  <input
                    type="text"
                    value={simLead.targetCourse}
                    onChange={(e) => setSimLead({ ...simLead, targetCourse: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CED0D4', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  style={{ padding: '9px 18px', backgroundColor: '#E4E6EB', color: '#1C1E21', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSimulating}
                  style={{ padding: '9px 24px', backgroundColor: '#1877F2', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer' }}
                >
                  {isSimulating ? 'Sending...' : 'Send Test Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

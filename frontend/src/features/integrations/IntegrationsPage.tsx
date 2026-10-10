import React, { useState, useEffect } from 'react';
import {
  Plug,
  Workflow,
  Activity,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  PhoneCall,
  Calendar,
  GraduationCap,
  HardDrive,
  CreditCard,
  Sparkles,
  Webhook,
  Megaphone,
  Copy,
  MapPin,
  TrendingUp,
  Users,
  DollarSign,
  MousePointer,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Play,
  RotateCcw,
  X,
  Search,
  Check,
  Zap,
  Download,
  Upload,
  Settings,
  Shield,
  Layers,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useAuth } from '../../context/AuthContext';
import {
  UserRole,
  IntegrationConfig,
  IntegrationLog,
  AutomationWorkflow,
  MetaCampaign,
  MetaFormMapping,
} from '../../types';

const ICON_MAP: Record<string, any> = {
  Mail: Mail,
  MessageSquare: MessageSquare,
  PhoneCall: PhoneCall,
  Calendar: Calendar,
  GraduationCap: GraduationCap,
  HardDrive: HardDrive,
  CreditCard: CreditCard,
  FileSpreadsheet: FileSpreadsheet,
  Sparkles: Sparkles,
  Webhook: Webhook,
  Megaphone: Megaphone,
};

const CATEGORY_NAMES: Record<string, string> = {
  COMMUNICATION: 'Category 1: Communication',
  STUDENT_JOURNEY: 'Category 2: Student Journey',
  PAYMENTS_DATA: 'Category 3: Payments and Data',
  AUTOMATION_INTELLIGENCE: 'Category 4: Automation and Intelligence',
};

export const IntegrationsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [activeTab, setActiveTab] = useState<'catalog' | 'meta_ads' | 'workflows' | 'logs' | 'csv'>('catalog');

  // Catalog state
  const [providers, setProviders] = useState<IntegrationConfig[]>([]);
  const [catalogSummary, setCatalogSummary] = useState({
    totalIntegrations: 0,
    connectedIntegrations: 0,
    disconnectedIntegrations: 0,
    failedIntegrations: 0,
  });
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  // Workflows state
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logProviderFilter, setLogProviderFilter] = useState('ALL');
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals & Setup
  const [connectModalProvider, setConnectModalProvider] = useState<IntegrationConfig | null>(null);
  const [credentialsForm, setCredentialsForm] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Workflow Modal
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [newWorkflowData, setNewWorkflowData] = useState({
    name: '',
    description: '',
    trigger: 'application.submitted',
    actionType: 'SEND_EMAIL',
    providerId: 'email_smtp',
    emailSubject: 'Application Received Confirmation',
  });

  // CSV Studio state
  const [csvText, setCsvText] = useState('');
  const [csvResult, setCsvResult] = useState<any | null>(null);
  const [isImportingCSV, setIsImportingCSV] = useState(false);

  // AI Assistant state
  const [aiDraftPrompt, setAiDraftPrompt] = useState({ purpose: 'welcome' as const, customPrompt: '' });
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Meta Ads & Form Routing state
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [metaMappings, setMetaMappings] = useState<MetaFormMapping[]>([]);
  const [metaAnalytics, setMetaAnalytics] = useState<any>(null);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isSyncingCampaigns, setIsSyncingCampaigns] = useState(false);

  // Form Mapping Modal
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<MetaFormMapping | null>(null);
  const [mappingFormData, setMappingFormData] = useState({
    formId: '',
    formName: '',
    campaignName: '',
    branchId: '',
    notes: '',
    isActive: true,
  });

  // Simulator state
  const [simulatorFormData, setSimulatorFormData] = useState({
    formId: '',
    formName: '',
    campaignName: '',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@gmail.com',
    phone: '+91 98450 12345',
    preferredCountry: 'United Kingdom',
    targetCourse: 'MSc Data Science',
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchCatalog = async () => {
    setIsLoadingProviders(true);
    try {
      const res = await apiClient.get<any>('/integrations');
      setProviders(res.data.providers || []);
      setCatalogSummary(
        res.data.summary || {
          totalIntegrations: 0,
          connectedIntegrations: 0,
          disconnectedIntegrations: 0,
          failedIntegrations: 0,
        }
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load integrations catalog');
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const fetchMetaAdsData = async () => {
    setIsLoadingMeta(true);
    try {
      const [cRes, mRes, aRes, bRes] = await Promise.all([
        apiClient.get<any>('/integrations/meta-ads/campaigns'),
        apiClient.get<any>('/integrations/meta-ads/mappings'),
        apiClient.get<any>('/integrations/meta-ads/analytics'),
        apiClient.get<any>('/branches'),
      ]);
      setMetaCampaigns(cRes.data || []);
      setMetaMappings(mRes.data || []);
      setMetaAnalytics(aRes.data || null);
      const branchesData = bRes.data?.branches || (Array.isArray(bRes.data) ? bRes.data : []);
      setBranchesList(branchesData);
      if (branchesData.length > 0 && !mappingFormData.branchId) {
        setMappingFormData((prev) => ({ ...prev, branchId: branchesData[0]._id }));
      }
      if (mRes.data && mRes.data.length > 0 && !simulatorFormData.formId) {
        setSimulatorFormData((prev) => ({
          ...prev,
          formId: mRes.data[0].formId,
          formName: mRes.data[0].formName,
          campaignName: mRes.data[0].campaignName,
        }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Meta Ads data');
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const fetchWorkflows = async () => {
    setIsLoadingWorkflows(true);
    try {
      const res = await apiClient.get<any>('/integrations/workflows');
      setWorkflows(res.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load automation workflows');
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await apiClient.get<any>('/integrations/logs', {
        providerId: logProviderFilter,
        status: logStatusFilter,
        search: logSearchQuery,
      });
      setLogs(res.data.logs || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load integration logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalog') fetchCatalog();
    if (activeTab === 'meta_ads') fetchMetaAdsData();
    if (activeTab === 'workflows') fetchWorkflows();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, logProviderFilter, logStatusFilter]);

  const handleOpenConnectModal = (provider: IntegrationConfig) => {
    setConnectModalProvider(provider);
    setCredentialsForm({});
    setTestResult(null);
  };

  const handleSaveConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectModalProvider) return;

    try {
      await apiClient.post(`/integrations/${connectModalProvider.providerId}/connect`, {
        credentials: credentialsForm,
      });
      setSuccessMsg(`Provider '${connectModalProvider.name}' connected successfully.`);
      setConnectModalProvider(null);
      fetchCatalog();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect provider');
    }
  };

  const handleRunTestConnection = async (providerId: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.post<any>(`/integrations/${providerId}/test`);
      setTestResult(res.data);
      fetchCatalog();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    if (!window.confirm('Are you sure you want to disconnect this integration provider?')) return;
    try {
      await apiClient.post(`/integrations/${providerId}/disconnect`);
      setSuccessMsg(`Provider disconnected successfully.`);
      fetchCatalog();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect');
    }
  };

  const handleToggleWorkflow = async (id: string) => {
    try {
      await apiClient.patch(`/integrations/workflows/${id}/toggle`);
      fetchWorkflows();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle workflow');
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/integrations/workflows', {
        name: newWorkflowData.name,
        description: newWorkflowData.description,
        trigger: newWorkflowData.trigger,
        actions: [
          {
            actionType: newWorkflowData.actionType,
            providerId: newWorkflowData.providerId,
            config: { subject: newWorkflowData.emailSubject },
          },
        ],
      });
      setSuccessMsg('Automation workflow created successfully.');
      setShowCreateWorkflowModal(false);
      fetchWorkflows();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create workflow');
    }
  };

  const handleRetryLog = async (logId: string) => {
    try {
      await apiClient.post(`/integrations/logs/${logId}/retry`);
      setSuccessMsg('Log operation retried.');
      fetchLogs();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Retry failed');
    }
  };

  const handleImportCSV = async () => {
    if (!csvText.trim()) {
      setErrorMsg('Please paste CSV text or content to import.');
      return;
    }
    setIsImportingCSV(true);
    setCsvResult(null);
    try {
      const res = await apiClient.post<any>('/integrations/csv/import', { csvText });
      setCsvResult(res.data);
      setSuccessMsg(`CSV processed: ${res.data.successfulRows} row(s) imported.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'CSV Import failed');
    } finally {
      setIsImportingCSV(false);
    }
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    setAiResult(null);
    try {
      const res = await apiClient.post<any>('/integrations/ai/generate', aiDraftPrompt);
      setAiResult(res.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Generation failed');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSyncCampaigns = async () => {
    setIsSyncingCampaigns(true);
    try {
      const res = await apiClient.post<any>('/integrations/meta-ads/campaigns/sync');
      setSuccessMsg(`Meta Ads synced successfully: ${res.data.updatedCount || 0} campaigns refreshed.`);
      fetchMetaAdsData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sync Meta campaigns');
    } finally {
      setIsSyncingCampaigns(false);
    }
  };

  const handleOpenCreateMapping = () => {
    setEditingMapping(null);
    setMappingFormData({
      formId: '',
      formName: '',
      campaignName: metaCampaigns[0]?.name || 'UK Admissions Campaign',
      branchId: branchesList[0]?._id || '',
      notes: '',
      isActive: true,
    });
    setShowMappingModal(true);
  };

  const handleOpenEditMapping = (m: MetaFormMapping) => {
    setEditingMapping(m);
    setMappingFormData({
      formId: m.formId,
      formName: m.formName,
      campaignName: m.campaignName,
      branchId: typeof m.branchId === 'object' ? (m.branchId as any)._id : m.branchId,
      notes: m.notes || '',
      isActive: m.isActive,
    });
    setShowMappingModal(true);
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingFormData.formId.trim() || !mappingFormData.formName.trim() || !mappingFormData.branchId) {
      setErrorMsg('Form ID, Form Name, and Target Dedicated Branch are required.');
      return;
    }
    try {
      await apiClient.post('/integrations/meta-ads/mappings', mappingFormData);
      setSuccessMsg(editingMapping ? 'Form routing rule updated.' : 'New Form-to-Branch mapping established.');
      setShowMappingModal(false);
      fetchMetaAdsData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save form mapping');
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!window.confirm('Delete this form-to-branch routing rule?')) return;
    try {
      await apiClient.delete(`/integrations/meta-ads/mappings/${id}`);
      setSuccessMsg('Form routing rule deleted.');
      fetchMetaAdsData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete rule');
    }
  };

  const handleSimulateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatorFormData.name || !simulatorFormData.email || !simulatorFormData.phone) {
      setErrorMsg('Name, email, and phone are required to simulate a Meta Lead response.');
      return;
    }
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const res = await apiClient.post<any>('/integrations/meta-ads/simulate-lead', simulatorFormData);
      setSimulationResult(res.data);
      setSuccessMsg('Simulated Meta Lead captured and routed to dedicated branch!');
      fetchMetaAdsData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to simulate lead response');
    } finally {
      setIsSimulating(false);
    }
  };

  const renderCategoryCards = (categoryKey: string) => {
    const categoryProviders = providers.filter((p) => p.category === categoryKey);
    if (categoryProviders.length === 0) return null;

    return (
      <div key={categoryKey} style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {CATEGORY_NAMES[categoryKey] || categoryKey}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {categoryProviders.map((p) => {
            const IconComp = ICON_MAP[p.icon] || Plug;
            const isConnected = p.status === 'CONNECTED' || p.status === 'CONFIGURED';
            const isFailed = p.status === 'FAILED';

            return (
              <div
                key={p._id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: isConnected ? '#ECFDF5' : isFailed ? '#FEF2F2' : '#F3F4F6',
                          color: isConnected ? '#059669' : isFailed ? '#DC2626' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <IconComp size={22} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {p.name}
                        </h4>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isConnected ? '#065F46' : isFailed ? '#991B1B' : '#6B7280',
                            backgroundColor: isConnected ? '#D1FAE5' : isFailed ? '#FEE2E2' : '#E5E7EB',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            display: 'inline-block',
                            marginTop: '2px',
                          }}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 16px' }}>
                    {p.description}
                  </p>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                  <button
                    onClick={() => handleRunTestConnection(p.providerId)}
                    disabled={isTesting}
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
                    <RefreshCw size={13} className={isTesting ? 'spin-animation' : ''} />
                    <span>Test Connection</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isAdmin && (
                      <>
                        {p.providerId === 'meta_ads' && (
                          <button
                            onClick={() => setActiveTab('meta_ads')}
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#FFFFFF',
                              backgroundColor: 'var(--primary)',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Megaphone size={12} />
                            <span>Campaigns</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenConnectModal(p)}
                          style={{
                            padding: '5px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                          }}
                        >
                          {isConnected ? 'Configure' : 'Connect'}
                        </button>

                        {isConnected && p.status !== 'CONFIGURED' && (
                          <button
                            onClick={() => handleDisconnect(p.providerId)}
                            style={{
                              padding: '5px 8px',
                              fontSize: '11px',
                              color: '#DC2626',
                              background: 'none',
                              border: '1px solid #FECACA',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                            }}
                          >
                            Disconnect
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
            <Plug size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Integrations Management
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Connect external services, configure automated communication channels, webhooks, and AI engine
            </p>
          </div>
        </div>

        {/* Tab Switcher Navigation */}
        <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
          <button
            onClick={() => setActiveTab('catalog')}
            style={{
              padding: '8.5px 14px',
              backgroundColor: activeTab === 'catalog' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'catalog' ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plug size={15} />
            <span>Catalog ({providers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('meta_ads')}
            style={{
              padding: '8.5px 14px',
              backgroundColor: activeTab === 'meta_ads' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'meta_ads' ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              borderLeft: '1px solid var(--border-color)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Megaphone size={15} />
            <span>Meta Ads & Campaigns</span>
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            style={{
              padding: '8.5px 14px',
              backgroundColor: activeTab === 'workflows' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'workflows' ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              borderLeft: '1px solid var(--border-color)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Workflow size={15} />
            <span>Workflows</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '8.5px 14px',
              backgroundColor: activeTab === 'logs' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'logs' ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              borderLeft: '1px solid var(--border-color)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={15} />
            <span>Logs & Retries</span>
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            style={{
              padding: '8.5px 14px',
              backgroundColor: activeTab === 'csv' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'csv' ? 'var(--primary)' : 'var(--text-secondary)',
              border: 'none',
              borderLeft: '1px solid var(--border-color)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Data Exchange & AI</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', color: '#065F46', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', color: '#991B1B', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Test Connection Live Result Toast */}
      {testResult && (
        <div style={{ padding: '14px 18px', backgroundColor: testResult.success ? '#EFF6FF' : '#FEF2F2', border: testResult.success ? '1px solid #BFDBFE' : '1px solid #FECACA', borderRadius: '8px', color: testResult.success ? '#1E40AF' : '#991B1B', marginBottom: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>
            {testResult.success ? '✓ Health Check Passed' : '✕ Health Check Failed'}
          </div>
          <div style={{ fontSize: '13px' }}>{testResult.message}</div>
          {testResult.details && (
            <pre style={{ fontSize: '11px', marginTop: '6px', backgroundColor: 'rgba(255,255,255,0.7)', padding: '6px 10px', borderRadius: '4px', overflowX: 'auto' }}>
              {JSON.stringify(testResult.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* --- TAB 1: INTEGRATIONS CATALOG --- */}
      {activeTab === 'catalog' && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL INTEGRATIONS</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{catalogSummary.totalIntegrations}</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CONNECTED</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{catalogSummary.connectedIntegrations}</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DISCONNECTED</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>{catalogSummary.disconnectedIntegrations}</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>FAILED / ERRORS</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>{catalogSummary.failedIntegrations}</div>
            </div>
          </div>

          {isLoadingProviders ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <RefreshCw size={28} className="spin-animation" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <div>Loading integration configurations...</div>
            </div>
          ) : (
            <div>
              {renderCategoryCards('COMMUNICATION')}
              {renderCategoryCards('STUDENT_JOURNEY')}
              {renderCategoryCards('PAYMENTS_DATA')}
              {renderCategoryCards('AUTOMATION_INTELLIGENCE')}
            </div>
          )}
        </div>
      )}

      {/* --- TAB: META ADS & CAMPAIGNS FORM ROUTING --- */}
      {activeTab === 'meta_ads' && (
        <div>
          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={20} style={{ color: 'var(--primary)' }} />
                <span>Meta Ads Multi-Campaign Tracking & Form Routing</span>
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Monitor campaign spend & engagement metrics, track Instant Form responses, and route leads to dedicated branches.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleSyncCampaigns}
                disabled={isSyncingCampaigns}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--primary)',
                  border: '1px solid var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} className={isSyncingCampaigns ? 'spin-animation' : ''} />
                <span>{isSyncingCampaigns ? 'Syncing...' : 'Sync with Meta API'}</span>
              </button>

              {isAdmin && (
                <button
                  onClick={handleOpenCreateMapping}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--primary)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} />
                  <span>Map Form to Branch</span>
                </button>
              )}
            </div>
          </div>

          {/* Setup Guide Accordion / Card */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '6px', borderRadius: '6px' }}>
                <Zap size={16} />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Meta Ads API & Webhook Configuration Guide
              </h4>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 16px', lineHeight: 1.5 }}>
              Follow these simple steps in the Meta App Dashboard to connect your Facebook / Instagram Lead Gen campaigns directly to this CRM:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                  STEP 1: Meta Developer App
                </div>
                <div style={{ fontSize: '12.5px', color: '#334155' }}>
                  Create a Business App on developers.facebook.com and add the <strong>Marketing API</strong> & <strong>Webhooks</strong> products.
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                    STEP 2: Webhook Callback URL
                  </div>
                  <button
                    onClick={() => handleCopy(`${window.location.origin}/api/v1/leads/webhook/meta`, 'webhookUrl')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Copy size={12} />
                    <span>{copiedField === 'webhookUrl' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <code style={{ display: 'block', fontSize: '11.5px', padding: '4px 6px', backgroundColor: '#F1F5F9', borderRadius: '4px', color: '#0F172A', wordBreak: 'break-all' }}>
                  {`${window.location.origin}/api/v1/leads/webhook/meta`}
                </code>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                    STEP 3: Verify Token
                  </div>
                  <button
                    onClick={() => handleCopy('jaiva_meta_token_2026', 'verifyToken')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Copy size={12} />
                    <span>{copiedField === 'verifyToken' ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <code style={{ display: 'block', fontSize: '11.5px', padding: '4px 6px', backgroundColor: '#F1F5F9', borderRadius: '4px', color: '#0F172A' }}>
                  jaiva_meta_token_2026
                </code>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                  STEP 4: Field Subscription & Routing
                </div>
                <div style={{ fontSize: '12.5px', color: '#334155' }}>
                  Subscribe to the <strong>leadgen</strong> field. Map each Meta Lead Form below to its dedicated branch for automated counselor routing.
                </div>
              </div>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL AD SPEND</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                ₹{(metaAnalytics?.totalSpend || 98300).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Across all active campaigns</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>INGESTED RESPONSES</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                {metaAnalytics?.totalMetaLeads || 194} Leads
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Real-time Instant Form leads</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AVERAGE CTR</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>
                {metaAnalytics?.avgCtr || '5.56'}%
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Click-through engagement rate</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AVG COST PER LEAD</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>
                ₹{metaAnalytics?.avgCpl || 507}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Effective acquisition cost</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ACTIVE FORM RULES</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                {metaAnalytics?.activeRoutingRulesCount || metaMappings.length || 4} Mapped
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Dedicated branch destinations</div>
            </div>
          </div>

          {/* Section: Running Campaigns & Engagement */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Active Meta Campaigns & Engagement Metrics
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Live breakdown of ad spend, impressions, clicks, and response volume per campaign.
                </p>
              </div>
            </div>

            {isLoadingMeta ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                <div>Loading Meta campaigns...</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                {metaCampaigns.map((camp) => (
                  <div
                    key={camp._id || camp.campaignId}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div>
                      {/* Campaign Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: camp.status === 'ACTIVE' ? '#D1FAE5' : '#FEF3C7',
                                color: camp.status === 'ACTIVE' ? '#065F46' : '#92400E',
                              }}
                            >
                              {camp.status}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {camp.campaignId}</span>
                          </div>
                          <h5 style={{ fontSize: '15px', fontWeight: 700, margin: '6px 0 2px', color: 'var(--text-primary)' }}>
                            {camp.name}
                          </h5>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            Objective: {camp.objective} • Currency: {camp.currency || 'INR'}
                          </span>
                        </div>
                      </div>

                      {/* Engagement Metrics Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '10px',
                          padding: '12px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          marginBottom: '16px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SPEND</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            ₹{camp.spend?.toLocaleString('en-IN') || 0}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>IMPRESSIONS</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {camp.impressions?.toLocaleString() || 0}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CLICKS</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {camp.clicks?.toLocaleString() || 0}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CTR</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563EB' }}>
                            {camp.ctr}%
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>RESPONSES</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                            {camp.leadsCount || 0} leads
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>COST / LEAD</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#D97706' }}>
                            ₹{camp.costPerLead || (camp.leadsCount ? Math.round(camp.spend / camp.leadsCount) : 0)}
                          </div>
                        </div>
                      </div>

                      {/* Attached Instant Forms & Assigned Branches */}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                          Attached Lead Forms & Branch Mappings:
                        </div>
                        {camp.forms && camp.forms.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {camp.forms.map((f, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 10px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                }}
                              >
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                  {f.formName || f.formId}
                                </span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: '#EFF6FF',
                                    color: '#1E40AF',
                                    border: '1px solid #BFDBFE',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                  }}
                                >
                                  📍 {f.branchName || 'Auto Routed'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No forms explicitly attached. Using default branch routing.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Form-to-Branch Routing Rules Table */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Form-to-Branch Routing Rules & Isolation
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Assign different Meta Lead Forms to different branches. Responses submitted via a form will only appear in that dedicated branch.
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={handleOpenCreateMapping}
                  style={{
                    padding: '7px 12px',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary)',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} />
                  <span>Map New Form</span>
                </button>
              )}
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>META FORM ID & NAME</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>CAMPAIGN NAME</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>ASSIGNED DEDICATED BRANCH</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>LEADS ROUTED</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metaMappings.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No Form-to-Branch routing rules configured yet. Click "+ Map Form to Branch" to create one.
                        </td>
                      </tr>
                    ) : (
                      metaMappings.map((m) => {
                        const targetBranchName = typeof m.branchId === 'object' && m.branchId ? (m.branchId as any).name : m.branchName;
                        const targetBranchCity = typeof m.branchId === 'object' && m.branchId ? (m.branchId as any).city : '';

                        return (
                          <tr key={m._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.formName}</div>
                              <code style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '4px' }}>
                                {m.formId}
                              </code>
                            </td>
                            <td style={{ padding: '14px 16px', color: '#334155' }}>
                              {m.campaignName}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#1E40AF',
                                  backgroundColor: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  padding: '3px 10px',
                                  borderRadius: '16px',
                                }}
                              >
                                📍 {targetBranchName} {targetBranchCity ? `(${targetBranchCity})` : ''}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontWeight: 700, color: '#059669' }}>
                                {m.totalLeadsRouted || 0} leads
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: m.isActive ? '#065F46' : '#6B7280',
                                  backgroundColor: m.isActive ? '#D1FAE5' : '#E5E7EB',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                }}
                              >
                                {m.isActive ? 'ACTIVE' : 'PAUSED'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  onClick={() => handleOpenEditMapping(m)}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: 'var(--primary)',
                                    background: 'none',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Edit
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteMapping(m._id)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '12px',
                                      color: '#DC2626',
                                      background: 'none',
                                      border: '1px solid #FECACA',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
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
          </div>

          {/* Section: Branch Routing Distribution & Lead Isolation */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {/* Distribution Card */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <MapPin size={18} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Which Lead Should Be Assigned to Which Branch?
                </h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                Lead responses automatically inherit the <strong>branchId</strong> mapped to their originating Meta Form. Counselors assigned to a branch will only see the leads assigned to their dedicated branch.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {metaAnalytics?.branchBreakdown && metaAnalytics.branchBreakdown.length > 0 ? (
                  metaAnalytics.branchBreakdown.map((b: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>🏢</span>
                        <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
                          {b.branchName}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#059669', fontSize: '13px' }}>
                        {b.count} leads routed
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    No branch routing distribution recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Live Response Simulator Card */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Play size={18} style={{ color: '#059669' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Test Form-to-Branch Live Lead Response Simulator
                </h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Test end-to-end ingestion and branch routing by simulating an instant form response right now:
              </p>

              <form onSubmit={handleSimulateLead}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Select Meta Form *</label>
                  <select
                    value={simulatorFormData.formId}
                    onChange={(e) => {
                      const selected = metaMappings.find((m) => m.formId === e.target.value);
                      setSimulatorFormData({
                        ...simulatorFormData,
                        formId: e.target.value,
                        formName: selected?.formName || '',
                        campaignName: selected?.campaignName || '',
                      });
                    }}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12.5px', backgroundColor: '#FFF' }}
                  >
                    {metaMappings.map((m) => (
                      <option key={m.formId} value={m.formId}>
                        {m.formName} ➔ {typeof m.branchId === 'object' ? (m.branchId as any).name : m.branchName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Student Name *</label>
                    <input
                      type="text"
                      value={simulatorFormData.name}
                      onChange={(e) => setSimulatorFormData({ ...simulatorFormData, name: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12.5px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Email Address *</label>
                    <input
                      type="email"
                      value={simulatorFormData.email}
                      onChange={(e) => setSimulatorFormData({ ...simulatorFormData, email: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12.5px' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Phone Number *</label>
                    <input
                      type="text"
                      value={simulatorFormData.phone}
                      onChange={(e) => setSimulatorFormData({ ...simulatorFormData, phone: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12.5px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>Target Country</label>
                    <input
                      type="text"
                      value={simulatorFormData.preferredCountry}
                      onChange={(e) => setSimulatorFormData({ ...simulatorFormData, preferredCountry: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSimulating}
                  style={{
                    width: '100%',
                    padding: '8.5px',
                    backgroundColor: '#059669',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Play size={14} />
                  <span>{isSimulating ? 'Simulating Ingestion...' : 'Simulate Incoming Lead Response'}</span>
                </button>
              </form>

              {/* Simulation Result Box */}
              {simulationResult && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#065F46', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                    <CheckCircle2 size={16} />
                    <span>Lead Successfully Captured & Routed!</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857' }}>
                    <strong>Student:</strong> {simulationResult.lead?.name} ({simulationResult.lead?.email})
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                    <strong>Assigned Dedicated Branch:</strong>{' '}
                    <span style={{ fontWeight: 700, textDecoration: 'underline' }}>
                      {simulationResult.assignedBranch?.name || 'Assigned Branch'}
                    </span>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={`/leads/${simulationResult.lead?._id}`}
                      style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--primary)', textDecoration: 'underline' }}
                    >
                      View in Leads Module ➔
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: AUTOMATION WORKFLOWS --- */}
      {activeTab === 'workflows' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Configurable Automation Workflows</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Automate notifications, follow-up task creation, and outgoing webhooks on CRM events.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowCreateWorkflowModal(true)}
                style={{ padding: '8.5px 16px', backgroundColor: 'var(--primary)', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} />
                <span>Create Workflow</span>
              </button>
            )}
          </div>

          {isLoadingWorkflows ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading workflows...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {workflows.map((wf) => (
                <div key={wf._id} style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px' }}>
                        WHEN: {wf.trigger}
                      </span>

                      <button
                        onClick={() => handleToggleWorkflow(wf._id)}
                        disabled={!isAdmin}
                        style={{
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '12px',
                          border: 'none',
                          cursor: isAdmin ? 'pointer' : 'default',
                          backgroundColor: wf.isActive ? '#ECFDF5' : '#FEF2F2',
                          color: wf.isActive ? '#065F46' : '#991B1B',
                        }}
                      >
                        {wf.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </button>
                    </div>

                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>{wf.name}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.4 }}>{wf.description}</p>

                    {/* Actions List */}
                    <div style={{ backgroundColor: '#F9FAFB', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>THEN ACTIONS:</div>
                      {wf.actions.map((act, i) => (
                        <div key={i} style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <Zap size={13} style={{ color: 'var(--primary)' }} />
                          <span>{act.actionType} ({act.providerId || 'System'})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                    <span>Executions: {wf.executionCount}</span>
                    <span>Last: {wf.lastExecutedAt ? new Date(wf.lastExecutedAt).toLocaleDateString() : 'Never'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: ACTIVITY LOGS --- */}
      {activeTab === 'logs' && (
        <div>
          {/* Logs Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select
              value={logProviderFilter}
              onChange={(e) => setLogProviderFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF' }}
            >
              <option value="ALL">All Providers</option>
              {providers.map((p) => (
                <option key={p.providerId} value={p.providerId}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={logStatusFilter}
              onChange={(e) => setLogStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILED">Failed Only</option>
            </select>
          </div>

          {/* Logs Table */}
          {isLoadingLogs ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading integration activity logs...</div>
          ) : (
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle, #F9FAFB)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px' }}>Provider</th>
                    <th style={{ padding: '12px 16px' }}>Operation</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Duration</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((lg) => (
                    <tr key={lg._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {new Date(lg.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{lg.providerId}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div>{lg.operation}</div>
                        {lg.errorMessage && <div style={{ fontSize: '11.5px', color: '#DC2626' }}>{lg.errorMessage}</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: lg.status === 'SUCCESS' ? '#ECFDF5' : '#FEF2F2',
                            color: lg.status === 'SUCCESS' ? '#065F46' : '#991B1B',
                          }}
                        >
                          {lg.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{lg.durationMs ? `${lg.durationMs} ms` : '-'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {lg.status === 'FAILED' && isAdmin && (
                          <button
                            onClick={() => handleRetryLog(lg._id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: 'var(--primary)',
                              backgroundColor: 'var(--primary-light)',
                              border: '1px solid var(--primary)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: DATA EXCHANGE & AI STUDIO --- */}
      {activeTab === 'csv' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* CSV Import Panel */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>Bulk CSV / Excel Data Import</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              Paste raw CSV text with headers (Name, Email, Phone, City, State, Target Country).
            </p>

            <textarea
              rows={8}
              placeholder="Name, Email, Phone, City, State, Target Country&#10;Amit Verma, amit.verma@example.com, +919876543210, Delhi, Delhi, UK"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '12.5px', fontFamily: 'monospace', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '14px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a
                href="/api/v1/integrations/csv/export"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Download size={15} />
                <span>Export CRM Leads CSV</span>
              </a>

              <button
                onClick={handleImportCSV}
                disabled={isImportingCSV}
                style={{ padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={16} />
                <span>{isImportingCSV ? 'Importing...' : 'Process Import'}</span>
              </button>
            </div>

            {csvResult && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12.5px' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Import Summary:</strong>
                <div>Total Rows: {csvResult.totalRows} | Successful: {csvResult.successfulRows} | Failed: {csvResult.failedRows}</div>
                {csvResult.errors?.length > 0 && (
                  <div style={{ marginTop: '8px', color: '#DC2626' }}>
                    <strong>Row Errors:</strong>
                    {csvResult.errors.map((e: any, idx: number) => (
                      <div key={idx}>Row {e.rowNumber}: {e.reason}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Communication Draft Generator */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={18} style={{ color: 'var(--primary)' }} />
              <span>AI Communication Assistant</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              Generate tailored student communication drafts powered by integrated AI provider.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Select Purpose</label>
              <select
                value={aiDraftPrompt.purpose}
                onChange={(e) => setAiDraftPrompt({ ...aiDraftPrompt, purpose: e.target.value as any })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF' }}
              >
                <option value="welcome">Welcome & Counselling Invitation</option>
                <option value="document_reminder">Pending Document Reminder</option>
                <option value="application_update">Application Submitted Update</option>
                <option value="offer_congratulations">University Offer Letter Notification</option>
                <option value="payment_reminder">Tuition / Registration Fee Reminder</option>
              </select>
            </div>

            <button
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
              style={{ width: '100%', padding: '9px', backgroundColor: 'var(--primary)', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}
            >
              {isGeneratingAI ? 'Generating Draft...' : 'Generate AI Draft'}
            </button>

            {aiResult && (
              <div style={{ padding: '14px', backgroundColor: '#F3F4F6', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>Subject: {aiResult.subject}</div>
                <div style={{ fontSize: '12.5px', whiteSpace: 'pre-line', color: 'var(--text-primary)', lineHeight: 1.4 }}>{aiResult.body}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PROVIDER SETUP/CONNECT MODAL --- */}
      {connectModalProvider && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-lg)', maxWidth: '520px', width: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Configure {connectModalProvider.name}</h3>
              <button onClick={() => setConnectModalProvider(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConnect}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Enter secure API credentials or configuration keys. Credentials are encrypted on the backend server.
              </p>

              {connectModalProvider.providerId === 'email_smtp' && (
                <>
                  <input
                    type="text"
                    placeholder="SMTP Host (e.g. smtp.gmail.com)"
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, smtpHost: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', marginBottom: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                  />
                  <input
                    type="text"
                    placeholder="SMTP Username / Email"
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, smtpUser: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', marginBottom: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                  />
                  <input
                    type="password"
                    placeholder="SMTP App Password"
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, smtpPass: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', marginBottom: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                  />
                </>
              )}

              {connectModalProvider.providerId !== 'email_smtp' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>API Key / Access Token</label>
                  <input
                    type="password"
                    placeholder="Enter API Key or OAuth Secret Token..."
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, apiKey: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setConnectModalProvider(null)} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '6px', background: '#FFF' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE WORKFLOW MODAL --- */}
      {showCreateWorkflowModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-lg)', maxWidth: '520px', width: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Create Automation Workflow</h3>
              <button onClick={() => setShowCreateWorkflowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Workflow Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Offer Letter Congratulations Alert"
                  value={newWorkflowData.name}
                  onChange={(e) => setNewWorkflowData({ ...newWorkflowData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>CRM Event Trigger *</label>
                <select
                  value={newWorkflowData.trigger}
                  onChange={(e) => setNewWorkflowData({ ...newWorkflowData, trigger: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF' }}
                >
                  <option value="lead.created">Lead Created</option>
                  <option value="student.created">Student Registered</option>
                  <option value="application.submitted">Application Submitted</option>
                  <option value="offer.received">Offer Received</option>
                  <option value="payment.success">Payment Verified</option>
                  <option value="branch.created">Branch Created</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Action Type *</label>
                <select
                  value={newWorkflowData.actionType}
                  onChange={(e) => setNewWorkflowData({ ...newWorkflowData, actionType: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF' }}
                >
                  <option value="SEND_EMAIL">Send Email</option>
                  <option value="SEND_WHATSAPP">Send WhatsApp Message</option>
                  <option value="SEND_SMS">Send SMS</option>
                  <option value="CREATE_TASK">Create Follow-up Task</option>
                  <option value="OUTGOING_WEBHOOK">Send Outgoing Webhook</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateWorkflowModal(false)} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '6px', background: '#FFF' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  Create & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: MAP FORM TO BRANCH --- */}
      {showMappingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-lg)', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {editingMapping ? 'Edit Form-to-Branch Routing Rule' : 'Map Meta Form to Dedicated Branch'}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Incoming leads submitted via this form will be strictly assigned to the selected branch.
                </p>
              </div>
              <button onClick={() => setShowMappingModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMapping}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Meta Lead Gen Form ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. meta_form_uk_blr or 109823471829"
                  value={mappingFormData.formId}
                  onChange={(e) => setMappingFormData({ ...mappingFormData, formId: e.target.value })}
                  disabled={!!editingMapping}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', backgroundColor: editingMapping ? '#F1F5F9' : '#FFF' }}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>The exact Form ID defined in Meta Ads Manager.</span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Form Display Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. UK Masters FastTrack Form (South India)"
                  value={mappingFormData.formName}
                  onChange={(e) => setMappingFormData({ ...mappingFormData, formName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Associated Campaign Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. UK September 2026 Admissions Campaign"
                  value={mappingFormData.campaignName}
                  onChange={(e) => setMappingFormData({ ...mappingFormData, campaignName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Assign to Dedicated Target Branch *
                </label>
                <select
                  value={mappingFormData.branchId}
                  onChange={(e) => setMappingFormData({ ...mappingFormData, branchId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', backgroundColor: '#FFF' }}
                  required
                >
                  <option value="">-- Choose Branch --</option>
                  {branchesList.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.city || ''}, {b.state || ''})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 500, display: 'block', marginTop: '2px' }}>
                  ✓ Ingested responses will only be visible to counselors in this branch.
                </span>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Routing Notes & Rules (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dedicated South India fast-track counseling team"
                  value={mappingFormData.notes}
                  onChange={(e) => setMappingFormData({ ...mappingFormData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowMappingModal(false)}
                  style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '6px', background: '#FFF', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  {editingMapping ? 'Update Mapping' : 'Save & Activate Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

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

  const [activeTab, setActiveTab] = useState<'catalog' | 'workflows' | 'logs' | 'csv'>('catalog');

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
    </div>
  );
};

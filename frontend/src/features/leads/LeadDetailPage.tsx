import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Building2,
  CreditCard,
  Stamp,
  Plane,
  Plus,
  Send,
  MessageSquare,
  Lock,
  ExternalLink,
  Upload,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Lead,
  StudentStage,
  LeadStatus,
  ProfileEvaluation,
  Shortlist,
  DocumentItem,
  Application,
  Offer,
  Payment,
  VisaRecord,
  TravelSupport,
  Message,
  Activity,
  UserRole,
  DocumentStatus,
  ApplicationStatus,
  OfferStatus,
  PaymentStatus,
  VisaStatus,
  TravelItemStatus,
} from '../../types';
import { StageStepper } from '../../components/StageStepper';
import { Button } from '../../components/Button';
import { Badge, StatusBadge } from '../../components/Badge';
import { Table } from '../../components/Table';
import { Modal, Drawer } from '../../components/Modal';
import { Input, Select, Textarea } from '../../components/Form';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { user, isStaff } = useAuth();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'universities' | 'documents' | 'applications' | 'offers' | 'payments' | 'visa_travel' | 'messages' | 'activity'>('overview');
  const [loading, setLoading] = useState(true);

  // Tab Data States
  const [profile, setProfile] = useState<ProfileEvaluation | null>(null);
  const [shortlist, setShortlist] = useState<Shortlist[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [visa, setVisa] = useState<VisaRecord | null>(null);
  const [travel, setTravel] = useState<TravelSupport | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Sub-modals
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<'ACADEMIC' | 'IDENTITY' | 'FINANCIAL' | 'LANGUAGE_TEST' | 'EXPERIENCE' | 'OTHER'>('ACADEMIC');
  const [docMandatory, setDocMandatory] = useState(true);

  const [isReviewDocOpen, setIsReviewDocOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docReviewStatus, setDocReviewStatus] = useState<DocumentStatus.APPROVED | DocumentStatus.REJECTED>(DocumentStatus.APPROVED);
  const [docRejectionReason, setDocRejectionReason] = useState('');

  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({
    applicationId: '',
    offerType: 'CONDITIONAL' as const,
    tuitionFee: 30000,
    depositAmount: 3000,
    currency: 'USD',
    conditions: '',
    originalOfferUrl: '/uploads/sample-offer.pdf',
    originalOfferFileName: 'University_Offer_Letter.pdf',
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    title: 'Tuition Deposit Payment',
    purpose: 'TUITION_DEPOSIT' as const,
    amount: 3000,
    currency: 'USD',
    bankDetails: 'Bank: Barclays UK\nIBAN: GB29BARC20000012345678\nSwift: BARCGB22',
  });

  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const fetchLeadDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient.get<Lead>(`/leads/${id}`);
      setLead(res.data);

      // Concurrently fetch tab details
      const [profRes, shortRes, docRes, appRes, offRes, payRes, visRes, travRes, msgRes, actRes] = await Promise.all([
        apiClient.get<ProfileEvaluation>(`/profile-evaluations/${id}`).catch(() => ({ data: null })),
        apiClient.get<Shortlist[]>(`/universities/shortlists/${id}`).catch(() => ({ data: [] })),
        apiClient.get<DocumentItem[]>(`/documents/lead/${id}`).catch(() => ({ data: [] })),
        apiClient.get<Application[]>(`/applications/lead/${id}`).catch(() => ({ data: [] })),
        apiClient.get<Offer[]>(`/offers/lead/${id}`).catch(() => ({ data: [] })),
        apiClient.get<Payment[]>(`/payments/lead/${id}`).catch(() => ({ data: [] })),
        apiClient.get<VisaRecord>(`/visa/lead/${id}`).catch(() => ({ data: null })),
        apiClient.get<TravelSupport>(`/travel/lead/${id}`).catch(() => ({ data: null })),
        apiClient.get<Message[]>(`/messages/lead/${id}`).catch(() => ({ data: [] })),
        apiClient.get<Activity[]>(`/activities/${id}`).catch(() => ({ data: [] })),
      ]);

      setProfile(profRes.data);
      setShortlist(shortRes.data || []);
      setDocuments(docRes.data || []);
      setApplications(appRes.data || []);
      setOffers(offRes.data || []);
      setPayments(payRes.data || []);
      setVisa(visRes.data);
      setTravel(travRes.data);
      setMessages(msgRes.data || []);
      setActivities(actRes.data || []);
    } catch (err: any) {
      error(err.message || 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  }, [id, error]);

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  // Profile evaluation submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !profile) return;
    try {
      const res = await apiClient.put<ProfileEvaluation>(`/profile-evaluations/${id}`, profile);
      setProfile(res.data);
      success('Profile evaluation saved.');
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to update profile evaluation');
    }
  };

  // Request document
  const handleRequestDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !docTitle) return;
    try {
      await apiClient.post(`/documents/lead/${id}/request`, {
        title: docTitle,
        category: docCategory,
        isMandatory: docMandatory,
      });
      success('Document requested from student.');
      setIsDocModalOpen(false);
      setDocTitle('');
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to request document');
    }
  };

  // Review document
  const handleReviewDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      await apiClient.put(`/documents/${selectedDoc._id}/review`, {
        status: docReviewStatus,
        rejectionReason: docReviewStatus === DocumentStatus.REJECTED ? docRejectionReason : undefined,
      });
      success(`Document marked as ${docReviewStatus}.`);
      setIsReviewDocOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to review document');
    }
  };

  // Create offer
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !offerForm.applicationId) {
      error('Please select an application');
      return;
    }
    try {
      await apiClient.post(`/offers/lead/${id}/original`, offerForm);
      success('Offer letter uploaded & issued to student.');
      setIsOfferModalOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to upload offer');
    }
  };

  // Accept signed offer
  const handleAcceptSignedOffer = async (offerId: string) => {
    try {
      await apiClient.put(`/offers/${offerId}/review`, { status: OfferStatus.ACCEPTED });
      success('Signed offer accepted! Fee Payment stage is now unlocked.');
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to review offer');
    }
  };

  // Create payment request
  const handleCreatePaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await apiClient.post(`/payments/lead/${id}/request`, paymentForm);
      success('Payment request generated.');
      setIsPaymentModalOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to generate payment request');
    }
  };

  // Verify payment proof
  const handleVerifyPayment = async (paymentId: string) => {
    try {
      await apiClient.put(`/payments/${paymentId}/verify`, { status: PaymentStatus.VERIFIED });
      success('Payment verified! Visa Filing stage is now unlocked.');
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to verify payment');
    }
  };

  // Send message or internal note
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;
    try {
      await apiClient.post('/messages', {
        leadId: id,
        content: newMessage,
        isInternalNote,
      });
      setNewMessage('');
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to send message');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading 360° student record...</div>;
  }

  if (!lead) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Student / Lead record not found.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Back button & Student Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/leads')}>
            Back
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{lead.name}</h1>
              <StatusBadge status={lead.status} />
              <Badge variant="primary">{lead.stage.replace(/_/g, ' ')}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              <span><Mail size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{lead.email}</span>
              <span><Phone size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{lead.phone}</span>
              <span><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{lead.city || 'India'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {lead.status !== LeadStatus.INTERESTED && (
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle2 size={14} />}
              onClick={async () => {
                try {
                  await apiClient.post(`/leads/${lead._id}/convert-interested`);
                  success(`Converted ${lead.name} to Student! Student Portal account provisioned.`);
                  fetchLeadDetails();
                } catch (err: any) {
                  error(err.message || 'Counselling required before conversion.');
                }
              }}
            >
              Convert to Student
            </Button>
          )}
        </div>
      </div>

      {/* 12-Stage Student Journey Stepper */}
      <StageStepper currentStage={lead.stage} />

      {/* Navigation Tabs Header */}
      <div className="tabs-header">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview & Counselling
        </button>
        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          Profile Evaluation {profile?.isComplete ? '✓' : '(Pending)'}
        </button>
        <button className={`tab-btn ${activeTab === 'universities' ? 'active' : ''}`} onClick={() => setActiveTab('universities')}>
          Shortlisted Universities ({shortlist.length})
        </button>
        <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          Documents ({documents.length})
        </button>
        <button className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
          Applications ({applications.length})
        </button>
        <button className={`tab-btn ${activeTab === 'offers' ? 'active' : ''}`} onClick={() => setActiveTab('offers')}>
          Offers ({offers.length})
        </button>
        <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
          Fee Payments ({payments.length})
        </button>
        <button className={`tab-btn ${activeTab === 'visa_travel' ? 'active' : ''}`} onClick={() => setActiveTab('visa_travel')}>
          Visa & Travel
        </button>
        <button className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
          Messages & Notes ({messages.length})
        </button>
        <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
          Activity History
        </button>
      </div>

      {/* --- TAB CONTENT --- */}

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '14px' }}>Lead Details & Preferences</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Target Country:</span> <strong>{lead.targetCountry || 'Undecided'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Target Course:</span> <strong>{lead.targetCourse || 'Undecided'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Intake:</span> <strong>{lead.targetIntake || 'Fall 2026'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Budget:</span> <strong>{lead.budget || 'N/A'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Acquisition Source:</span> <Badge variant="neutral">{lead.source}</Badge></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Assigned Counsellor:</span> <strong>{lead.counsellorId?.name || 'Unassigned'}</strong></div>
            </div>
            {lead.notes && (
              <div style={{ marginTop: '16px', padding: '10px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>INITIAL INQUIRY NOTES:</span>
                <p style={{ fontSize: '12px', marginTop: '2px' }}>{lead.notes}</p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '14px' }}>Contact Attempts (Immutable History)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {((lead as any).contactAttempts || []).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No contact attempts logged yet.</div>
              ) : (
                ((lead as any).contactAttempts || []).map((ca: any) => (
                  <div key={ca._id} style={{ padding: '8px 12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{ca.method} — {ca.outcome}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(ca.attemptDate).toLocaleString()}</span>
                    </div>
                    {ca.notes && <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{ca.notes}</div>}
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Logged by: {ca.recordedByName}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Profile Evaluation */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Profile Evaluation & Eligibility Check</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                All mandatory fields must be verified complete to advance to University Shortlisting.
              </p>
            </div>
            {profile?.isComplete ? (
              <Badge variant="success">✓ Profile Evaluation Complete</Badge>
            ) : (
              <Badge variant="warning">Missing: {profile?.missingFields?.join(', ')}</Badge>
            )}
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input
                label="Highest Qualification *"
                value={profile?.highestQualification || ''}
                onChange={(e) => setProfile(profile ? { ...profile, highestQualification: e.target.value } : null)}
                placeholder="e.g. B.Tech Computer Science"
                required
              />
              <Input
                label="Institution / University *"
                value={profile?.institution || ''}
                onChange={(e) => setProfile(profile ? { ...profile, institution: e.target.value } : null)}
                placeholder="e.g. Delhi University"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <Input
                label="Percentage / GPA *"
                value={profile?.percentageGpa || ''}
                onChange={(e) => setProfile(profile ? { ...profile, percentageGpa: e.target.value } : null)}
                placeholder="e.g. 78% or 3.6 GPA"
                required
              />
              <Input
                label="Year of Passing *"
                type="number"
                value={profile?.yearOfPassing || ''}
                onChange={(e) => setProfile(profile ? { ...profile, yearOfPassing: parseInt(e.target.value, 10) } : null)}
                placeholder="e.g. 2025"
                required
              />
              <Input
                label="Backlogs Count"
                type="number"
                value={profile?.backlogsCount || 0}
                onChange={(e) => setProfile(profile ? { ...profile, backlogsCount: parseInt(e.target.value, 10) } : null)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <Select
                label="English Test Type"
                value={profile?.testScore?.testType || 'NONE'}
                onChange={(e) => setProfile(profile ? { ...profile, testScore: { ...(profile.testScore as any), testType: e.target.value as any } } : null)}
                options={[
                  { value: 'IELTS', label: 'IELTS Academic' },
                  { value: 'PTE', label: 'PTE Academic' },
                  { value: 'TOEFL', label: 'TOEFL iBT' },
                  { value: 'DUOLINGO', label: 'Duolingo English Test' },
                  { value: 'NONE', label: 'None / Waiver Expected' },
                ]}
              />
              <Input
                label="Overall Test Score"
                type="number"
                step="0.5"
                value={profile?.testScore?.overall || ''}
                onChange={(e) => setProfile(profile ? { ...profile, testScore: { ...(profile.testScore as any), overall: parseFloat(e.target.value) } } : null)}
                placeholder="e.g. 7.5"
              />
              <Input
                label="GRE / GMAT Score (if any)"
                value={profile?.greGmatScore || ''}
                onChange={(e) => setProfile(profile ? { ...profile, greGmatScore: e.target.value } : null)}
                placeholder="e.g. 320"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input
                label="Preferred Country *"
                value={profile?.preferredCountries?.[0] || ''}
                onChange={(e) => setProfile(profile ? { ...profile, preferredCountries: [e.target.value] } : null)}
                placeholder="e.g. United Kingdom"
                required
              />
              <Input
                label="Estimated Budget *"
                value={profile?.budget || ''}
                onChange={(e) => setProfile(profile ? { ...profile, budget: e.target.value } : null)}
                placeholder="e.g. £30,000 / Year"
                required
              />
            </div>

            <Textarea
              label="Counsellor Evaluation Remarks"
              value={profile?.counsellorRemarks || ''}
              onChange={(e) => setProfile(profile ? { ...profile, counsellorRemarks: e.target.value } : null)}
              placeholder="Detailed profile assessment and eligible tier 1/tier 2 university recommendations..."
            />

            <Button type="submit" variant="primary" style={{ alignSelf: 'flex-start' }}>
              Save Profile Evaluation
            </Button>
          </form>
        </div>
      )}

      {/* Tab 3: Universities & Shortlist */}
      {activeTab === 'universities' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Curated University Shortlist</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Student selects 1 approved choice to unlock document submission.
            </span>
          </div>

          <Table
            columns={[
              { header: 'UNIVERSITY', accessor: 'universityName' },
              { header: 'COURSE TITLE', accessor: 'courseTitle' },
              { header: 'COUNTRY', accessor: 'country' },
              { header: 'INTAKE', accessor: 'intake' },
              {
                header: 'ANNUAL FEE',
                render: (s) => (s.annualFee ? `${s.currency || '$'} ${s.annualFee}` : '—'),
              },
              {
                header: 'VISIBILITY',
                render: (s) => (
                  <Badge variant={s.isVisibleToStudent ? 'success' : 'neutral'}>
                    {s.isVisibleToStudent ? 'Visible to Student' : 'Hidden'}
                  </Badge>
                ),
              },
              {
                header: 'STATUS',
                render: (s) => <StatusBadge status={s.status} />,
              },
            ]}
            data={shortlist}
            emptyMessage="No universities shortlisted yet."
          />
        </div>
      )}

      {/* Tab 4: Documents Hub */}
      {activeTab === 'documents' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Required Documents & Verification</h3>
            {isStaff && (
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsDocModalOpen(true)}>
                Request Document
              </Button>
            )}
          </div>

          <Table
            columns={[
              {
                header: 'DOCUMENT TITLE',
                render: (d) => (
                  <div>
                    <strong>{d.title}</strong>
                    {d.isMandatory && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.category}</div>
                  </div>
                ),
              },
              {
                header: 'STATUS',
                render: (d) => <StatusBadge status={d.status} />,
              },
              {
                header: 'FILE ATTACHMENT',
                render: (d) =>
                  d.fileUrl ? (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FileText size={14} /> {d.originalFileName || 'View File'} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Not Uploaded</span>
                  ),
              },
              {
                header: 'ACTIONS',
                align: 'right',
                render: (d) =>
                  isStaff && (
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedDoc(d);
                          setDocReviewStatus(DocumentStatus.APPROVED);
                          setIsReviewDocOpen(true);
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  ),
              },
            ]}
            data={documents}
            emptyMessage="No documents requested yet."
          />
        </div>
      )}

      {/* Tab 5: Applications */}
      {activeTab === 'applications' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">University Applications</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Rule: Exactly 1 active application permitted at a time.
              </p>
            </div>
          </div>

          <Table
            columns={[
              { header: 'UNIVERSITY', accessor: 'universityName' },
              { header: 'COURSE', accessor: 'courseTitle' },
              { header: 'APP NUMBER', accessor: 'applicationNumber' },
              {
                header: 'SUBMITTED DATE',
                render: (a) => new Date(a.submissionDate).toLocaleDateString(),
              },
              {
                header: 'STATUS',
                render: (a) => <StatusBadge status={a.status} />,
              },
              {
                header: 'ACTIONS',
                align: 'right',
                render: (a) =>
                  isStaff &&
                  a.status !== ApplicationStatus.OFFER_RECEIVED && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          await apiClient.put(`/applications/${a._id}/status`, {
                            status: ApplicationStatus.OFFER_RECEIVED,
                          });
                          success('Application marked as Offer Received!');
                          fetchLeadDetails();
                        } catch (err: any) {
                          error(err.message);
                        }
                      }}
                    >
                      Mark Offer Received
                    </Button>
                  ),
              },
            ]}
            data={applications}
            emptyMessage="No applications submitted yet."
          />
        </div>
      )}

      {/* Tab 6: Offers */}
      {activeTab === 'offers' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Official Offer Letters & Acceptance</h3>
            {isStaff && applications.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={<Upload size={14} />}
                onClick={() => {
                  setOfferForm((prev) => ({ ...prev, applicationId: applications[0]._id }));
                  setIsOfferModalOpen(true);
                }}
              >
                Upload Offer Letter
              </Button>
            )}
          </div>

          <Table
            columns={[
              { header: 'UNIVERSITY', accessor: 'universityName' },
              { header: 'COURSE', accessor: 'courseTitle' },
              { header: 'TYPE', accessor: 'offerType' },
              {
                header: 'TUITION / DEPOSIT',
                render: (o) => `${o.currency} ${o.tuitionFee} (Deposit: ${o.depositAmount})`,
              },
              {
                header: 'ORIGINAL OFFER',
                render: (o) => (
                  <a href={o.originalOfferUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                    {o.originalOfferFileName}
                  </a>
                ),
              },
              {
                header: 'SIGNED OFFER',
                render: (o) =>
                  o.signedOfferUrl ? (
                    <a href={o.signedOfferUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--success)' }}>
                      {o.signedOfferFileName || 'Signed Offer'}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Pending Signature</span>
                  ),
              },
              {
                header: 'STATUS',
                render: (o) => <StatusBadge status={o.status} />,
              },
              {
                header: 'ACTIONS',
                align: 'right',
                render: (o) =>
                  isStaff &&
                  o.status === OfferStatus.SIGNED_UPLOADED && (
                    <Button variant="primary" size="sm" onClick={() => handleAcceptSignedOffer(o._id)}>
                      Accept Signed Offer
                    </Button>
                  ),
              },
            ]}
            data={offers}
            emptyMessage="No offer letters issued yet."
          />
        </div>
      )}

      {/* Tab 7: Fee Payments */}
      {activeTab === 'payments' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tuition & Fee Payment Requests</h3>
            {isStaff && (
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsPaymentModalOpen(true)}>
                Generate Payment Request
              </Button>
            )}
          </div>

          <Table
            columns={[
              { header: 'PURPOSE / TITLE', accessor: 'title' },
              {
                header: 'AMOUNT',
                render: (p) => <strong>{p.currency} {p.amount}</strong>,
              },
              { header: 'REF NO', accessor: 'transactionReference' },
              {
                header: 'PROOF RECEIPT',
                render: (p) =>
                  p.proofUrl ? (
                    <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                      View Receipt
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Pending Proof</span>
                  ),
              },
              {
                header: 'STATUS',
                render: (p) => <StatusBadge status={p.status} />,
              },
              {
                header: 'ACTIONS',
                align: 'right',
                render: (p) =>
                  isStaff &&
                  p.status === PaymentStatus.PROOF_SUBMITTED && (
                    <Button variant="primary" size="sm" onClick={() => handleVerifyPayment(p._id)}>
                      Verify Payment
                    </Button>
                  ),
              },
            ]}
            data={payments}
            emptyMessage="No fee payment requests generated yet."
          />
        </div>
      )}

      {/* Tab 8: Visa & Travel */}
      {activeTab === 'visa_travel' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Visa Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Visa Filing & Status</h3>
              <StatusBadge status={visa?.status || 'PENDING'} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Country:</span> <strong>{visa?.country || lead.targetCountry}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Visa Grant Number:</span> <strong>{visa?.visaNumber || 'Pending'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>VFS Center Location:</span> <strong>{visa?.vfsCenterLocation || 'New Delhi'}</strong></div>
              {isStaff && visa?.status !== VisaStatus.APPROVED && (
                <Button
                  variant="primary"
                  size="sm"
                  style={{ marginTop: '10px', alignSelf: 'flex-start' }}
                  onClick={async () => {
                    try {
                      await apiClient.put(`/visa/lead/${id}`, {
                        status: VisaStatus.APPROVED,
                        visaNumber: `V-${Math.floor(100000 + Math.random() * 900000)}`,
                        decisionDate: new Date(),
                      });
                      success('Visa approved! Pre-departure stage unlocked.');
                      fetchLeadDetails();
                    } catch (err: any) {
                      error(err.message);
                    }
                  }}
                >
                  Record Visa Approval
                </Button>
              )}
            </div>
          </div>

          {/* Travel & Pre-departure */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Pre-Departure & Travel Checklist</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>1. Accommodation Booking</span>
                <Badge variant={travel?.accommodationStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                  {travel?.accommodationStatus || 'PENDING'}
                </Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>2. Flight Ticket</span>
                <Badge variant={travel?.flightStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                  {travel?.flightStatus || 'PENDING'}
                </Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>3. Health & Travel Insurance</span>
                <Badge variant={travel?.insuranceStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                  {travel?.insuranceStatus || 'PENDING'}
                </Badge>
              </div>

              {isStaff && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        await apiClient.put(`/travel/lead/${id}`, {
                          accommodationStatus: 'COMPLETED',
                          flightStatus: 'COMPLETED',
                          insuranceStatus: 'COMPLETED',
                        });
                        success('All travel requirements marked Completed.');
                        fetchLeadDetails();
                      } catch (err: any) {
                        error(err.message);
                      }
                    }}
                  >
                    Complete All 3
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      try {
                        await apiClient.post(`/travel/lead/${id}/departure`, {
                          departureDate: new Date().toISOString(),
                        });
                        success('Student departure recorded!');
                        fetchLeadDetails();
                      } catch (err: any) {
                        error(err.message);
                      }
                    }}
                  >
                    Record Departure
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 9: Messages & Internal Notes */}
      {activeTab === 'messages' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Student Communications & Private Notes</h3>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '380px',
              overflowY: 'auto',
              padding: '12px',
              backgroundColor: 'var(--bg-app)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>
                No messages exchanged yet.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m._id}
                  style={{
                    alignSelf: m.senderRole === UserRole.STUDENT ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: m.isInternalNote ? '#FFFBEB' : m.senderRole === UserRole.STUDENT ? '#FFFFFF' : 'var(--primary-light)',
                    border: `1px solid ${m.isInternalNote ? 'var(--warning-border)' : 'var(--border-color)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '11px', color: m.isInternalNote ? 'var(--warning-text)' : 'var(--text-primary)' }}>
                      {m.senderName} ({m.senderRole}) {m.isInternalNote && '🔒 [INTERNAL NOTE]'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{m.content}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message to the student or enter internal notes..."
              rows={2}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                />
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Mark as Internal Note (Visible to Staff only)
                </span>
              </label>

              <Button type="submit" variant="primary" size="sm" icon={<Send size={14} />}>
                Send
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 10: Activity History */}
      {activeTab === 'activity' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Student Journey Activity Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No recorded activities yet.</div>
            ) : (
              activities.map((act) => (
                <div key={act._id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                      marginTop: '6px',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{act.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{act.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(act.createdAt).toLocaleString()} • {act.actorName || 'System'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- Request Document Modal --- */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Request Document from Student"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRequestDoc}>
              Send Request
            </Button>
          </>
        }
      >
        <form onSubmit={handleRequestDoc}>
          <Input
            label="Document Title *"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="e.g. Passport Copy, Degree Transcripts, IELTS Scorecard"
            required
          />
          <Select
            label="Category"
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value as any)}
            options={[
              { value: 'ACADEMIC', label: 'Academic Certificates' },
              { value: 'IDENTITY', label: 'Identity / Passport' },
              { value: 'FINANCIAL', label: 'Financial Statements / Affidavit' },
              { value: 'LANGUAGE_TEST', label: 'Language Proficiency Test' },
              { value: 'EXPERIENCE', label: 'Work Experience Letter' },
              { value: 'OTHER', label: 'Other Document' },
            ]}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '10px' }}>
            <input
              type="checkbox"
              checked={docMandatory}
              onChange={(e) => setDocMandatory(e.target.checked)}
            />
            Mandatory for stage progression
          </label>
        </form>
      </Modal>

      {/* --- Review Document Modal --- */}
      <Modal
        isOpen={isReviewDocOpen}
        onClose={() => setIsReviewDocOpen(false)}
        title={`Review Document: ${selectedDoc?.title}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReviewDocOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReviewDoc}>
              Submit Review
            </Button>
          </>
        }
      >
        <form onSubmit={handleReviewDoc}>
          <Select
            label="Decision *"
            value={docReviewStatus}
            onChange={(e) => setDocReviewStatus(e.target.value as any)}
            options={[
              { value: DocumentStatus.APPROVED, label: 'Approve Document' },
              { value: DocumentStatus.REJECTED, label: 'Reject Document (Requires Reason)' },
            ]}
          />
          {docReviewStatus === DocumentStatus.REJECTED && (
            <Textarea
              label="Rejection Reason *"
              value={docRejectionReason}
              onChange={(e) => setDocRejectionReason(e.target.value)}
              placeholder="Explain what is missing or incorrect in the uploaded file..."
              required
            />
          )}
        </form>
      </Modal>

      {/* --- Upload Offer Modal --- */}
      <Modal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        title="Upload University Offer Letter"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOfferModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateOffer}>
              Issue Offer
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateOffer}>
          <Select
            label="Related Application *"
            value={offerForm.applicationId}
            onChange={(e) => setOfferForm({ ...offerForm, applicationId: e.target.value })}
            options={applications.map((a) => ({ value: a._id, label: `${a.courseTitle} — ${a.universityName}` }))}
            placeholder="Select application..."
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Offer Type"
              value={offerForm.offerType}
              onChange={(e) => setOfferForm({ ...offerForm, offerType: e.target.value as any })}
              options={[
                { value: 'CONDITIONAL', label: 'Conditional Offer' },
                { value: 'UNCONDITIONAL', label: 'Unconditional Offer' },
              ]}
            />
            <Input
              label="Tuition Fee"
              type="number"
              value={offerForm.tuitionFee}
              onChange={(e) => setOfferForm({ ...offerForm, tuitionFee: parseFloat(e.target.value) })}
            />
          </div>
          <Input
            label="Required Deposit Amount"
            type="number"
            value={offerForm.depositAmount}
            onChange={(e) => setOfferForm({ ...offerForm, depositAmount: parseFloat(e.target.value) })}
          />
          <Textarea
            label="Conditions / Notes"
            value={offerForm.conditions}
            onChange={(e) => setOfferForm({ ...offerForm, conditions: e.target.value })}
            placeholder="e.g. Submit final degree certificate and passport scan..."
          />
        </form>
      </Modal>

      {/* --- Generate Payment Request Modal --- */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Generate Fee Payment Request"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreatePaymentRequest}>
              Send Payment Request
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreatePaymentRequest}>
          <Input
            label="Payment Title *"
            value={paymentForm.title}
            onChange={(e) => setPaymentForm({ ...paymentForm, title: e.target.value })}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Amount *"
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
              required
            />
            <Input
              label="Currency"
              value={paymentForm.currency}
              onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
            />
          </div>
          <Textarea
            label="Bank Account Details & Wire Instructions"
            value={paymentForm.bankDetails}
            onChange={(e) => setPaymentForm({ ...paymentForm, bankDetails: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
};

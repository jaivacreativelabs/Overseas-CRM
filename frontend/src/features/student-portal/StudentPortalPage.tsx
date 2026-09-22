import React, { useState, useEffect, useCallback } from 'react';
import './student-portal.css';
import {
  GraduationCap,
  FileText,
  Award,
  CreditCard,
  Stamp,
  Plane,
  MessageSquare,
  Upload,
  CheckCircle2,
  ExternalLink,
  Send,
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Lead,
  StudentStage,
  DocumentItem,
  Shortlist,
  Offer,
  Payment,
  VisaRecord,
  TravelSupport,
  Message,
  DocumentStatus,
  OfferStatus,
  PaymentStatus,
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
} from '../../types';
import { PendingTasksCard } from './components/PendingTasksCard';
import { CounsellorCard } from './components/CounsellorCard';
import { StageStepper, STAGES_CONFIG } from '../../components/StageStepper';
import { Button } from '../../components/Button';
import { Badge, StatusBadge } from '../../components/Badge';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { Input, Textarea } from '../../components/Form';

export const StudentPortalPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'journey' | 'universities' | 'documents' | 'offers' | 'payments' | 'visa_travel' | 'messages' | 'help'>('journey');
  const [isJourneyExpanded, setIsJourneyExpanded] = useState(false);

  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [visa, setVisa] = useState<VisaRecord | null>(null);
  const [travel, setTravel] = useState<TravelSupport | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Modals for student upload actions
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docFileUrl, setDocFileUrl] = useState('');

  const [isSignOfferOpen, setIsSignOfferOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [signedOfferUrl, setSignedOfferUrl] = useState('');

  const [isSubmitPaymentOpen, setIsSubmitPaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [payRef, setPayRef] = useState('');
  const [payProofUrl, setPayProofUrl] = useState('');

  const fetchStudentData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch lead corresponding to current student
      const res = await apiClient.get<Lead[]>('/leads', { isStudent: true, limit: 1 });
      const currentLead = res.data?.[0];
      if (currentLead) {
        setLead(currentLead);
        const [shortRes, docRes, offRes, payRes, visRes, travRes, msgRes, taskRes] = await Promise.all([
          apiClient.get<Shortlist[]>(`/universities/shortlists/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<DocumentItem[]>(`/documents/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<Offer[]>(`/offers/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<Payment[]>(`/payments/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<VisaRecord>(`/visa/lead/${currentLead._id}`).catch(() => ({ data: null })),
          apiClient.get<TravelSupport>(`/travel/lead/${currentLead._id}`).catch(() => ({ data: null })),
          apiClient.get<Message[]>(`/messages/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<Task[]>(`/tasks`, { leadId: currentLead._id }).catch(() => ({ data: [] })),
        ]);

        setShortlists(shortRes.data || []);
        setDocuments(docRes.data || []);
        setOffers(offRes.data || []);
        setPayments(payRes.data || []);
        setVisa(visRes.data);
        setTravel(travRes.data);
        setMessages(msgRes.data || []);
        setTasks(taskRes.data || []);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load student portal');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Student selects 1 university
  const handleSelectUniversity = async (shortlistId: string) => {
    if (!lead) return;
    try {
      await apiClient.post(`/universities/shortlists/${lead._id}/select/${shortlistId}`);
      success('University choice confirmed! Document checklist is now unlocked.');
      fetchStudentData();
    } catch (err: any) {
      error(err.message || 'Selection failed');
    }
  };

  // Student uploads requested document
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      await apiClient.post(`/documents/${selectedDoc._id}/upload`, {
        fileUrl: docFileUrl,
        originalFileName: `${selectedDoc.title.replace(/\s+/g, '_')}.pdf`,
      });
      success('Document uploaded for counsellor verification.');
      setIsUploadDocOpen(false);
      fetchStudentData();
    } catch (err: any) {
      error(err.message || 'Upload failed');
    }
  };

  // Student uploads signed offer
  const handleUploadSignedOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;
    try {
      await apiClient.post(`/offers/${selectedOffer._id}/signed`, {
        signedOfferUrl,
        signedOfferFileName: 'Signed_Acceptance_Copy.pdf',
      });
      success('Signed offer uploaded! Awaiting counsellor acceptance.');
      setIsSignOfferOpen(false);
      fetchStudentData();
    } catch (err: any) {
      error(err.message || 'Upload failed');
    }
  };

  // Student submits payment proof
  const handleUploadPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    try {
      await apiClient.post(`/payments/${selectedPayment._id}/submit-proof`, {
        transactionReference: payRef,
        proofUrl: payProofUrl,
        proofFileName: 'Bank_Wire_Receipt.png',
        paymentMode: 'Online Bank Wire',
      });
      success('Payment proof submitted! Awaiting counsellor verification.');
      setIsSubmitPaymentOpen(false);
      fetchStudentData();
    } catch (err: any) {
      error(err.message || 'Submission failed');
    }
  };

  // Student sends message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !lead) return;
    try {
      await apiClient.post('/messages', {
        leadId: lead._id,
        content: newMessage,
        isInternalNote: false,
      });
      setNewMessage('');
      const res = await apiClient.get<Message[]>(`/messages/lead/${lead._id}`);
      setMessages(res.data || []);
      success('Message sent to your counsellor.');
    } catch (err: any) {
      error(err.message || 'Failed to send message');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading your student application portal...</div>;
  }

  const currentStageIndex = STAGES_CONFIG.findIndex((s) => s.stage === lead?.stage);
  const activeStageNum = currentStageIndex >= 0 ? currentStageIndex + 1 : 1;
  const progressPercentage = Math.round((activeStageNum / STAGES_CONFIG.length) * 100);

  return (
    <div className="student-portal-container">
      {/* Student Welcome & Profile Card */}
      <div className="card student-welcome-card">
        <div className="student-header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="student-welcome-title">
              Welcome, {user?.name}!
            </h1>
            <Badge variant="primary">{lead?.stage?.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="student-welcome-subtext">
            Target Country: <strong>{lead?.targetCountry || 'International'}</strong> • Program: <strong>{lead?.targetCourse || 'Undecided'}</strong>
          </p>
        </div>

        <CounsellorCard
          counsellor={lead?.counsellorId}
          onOpenChat={() => setActiveTab('messages')}
        />
      </div>

      {/* Portal Tabs */}
      <div className="student-tabs-header">
        <button className={`student-tab-btn ${activeTab === 'journey' ? 'active' : ''}`} onClick={() => setActiveTab('journey')}>
          My Journey & Next Steps
        </button>
        <button className={`student-tab-btn ${activeTab === 'universities' ? 'active' : ''}`} onClick={() => setActiveTab('universities')}>
          Shortlisted Universities ({shortlists.length})
        </button>
        <button className={`student-tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          Upload Documents ({documents.length})
        </button>
        <button className={`student-tab-btn ${activeTab === 'offers' ? 'active' : ''}`} onClick={() => setActiveTab('offers')}>
          Offers & Acceptance ({offers.length})
        </button>
        <button className={`student-tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
          Fee Payments ({payments.length})
        </button>
        <button className={`student-tab-btn ${activeTab === 'visa_travel' ? 'active' : ''}`} onClick={() => setActiveTab('visa_travel')}>
          Visa & Pre-Departure
        </button>
        <button className={`student-tab-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
          Message Counsellor ({messages.length})
        </button>
        <button className={`student-tab-btn ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}>
          ❓ Guide & FAQs
        </button>
      </div>

      {/* --- TAB 1: JOURNEY --- */}
      {activeTab === 'journey' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Lifecycle Progress Stepper Summary Accordion Card */}
          <div className="student-progress-summary-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Application Progress
                </span>
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  Current: {lead?.stage?.replace(/_/g, ' ')} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--primary)' }}>(Stage {activeStageNum} of {STAGES_CONFIG.length})</span>
                </div>
              </div>
              <Badge variant="primary">
                {progressPercentage}%
              </Badge>
            </div>

            {/* Subtle Thin Horizontal Progress Bar */}
            <div className="student-progress-bar-bg">
              <div className="student-progress-bar-fill" style={{ width: `${progressPercentage}%` }} />
            </div>

            {/* Expandable Accordion Toggle */}
            <button
              type="button"
              className="student-accordion-toggle"
              onClick={() => setIsJourneyExpanded(!isJourneyExpanded)}
            >
              <span>{isJourneyExpanded ? 'Hide Full Stepper' : 'View Full Journey Stepper'}</span>
              {isJourneyExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Collapsible Stepper Content */}
            {isJourneyExpanded && (
              <div style={{ marginTop: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <StageStepper currentStage={lead?.stage || StudentStage.PROFILE_EVALUATION} />
              </div>
            )}
          </div>

          <div className="student-grid-2col">
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '12px' }}>Current Stage Action Item</h3>
              <div style={{ padding: '16px', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 87, 248, 0.2)' }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '14px', marginBottom: '6px' }}>
                  Stage: {lead?.stage?.replace(/_/g, ' ')}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                  {lead?.stage === StudentStage.PROFILE_EVALUATION
                    ? 'Your counsellor is reviewing your academic transcripts and test scores to build your university recommendations.'
                    : lead?.stage === StudentStage.UNIVERSITY_SHORTLISTING
                      ? 'Your university options are ready! Please review the shortlist and confirm your 1 preferred university.'
                      : lead?.stage === StudentStage.DOCUMENT_COLLECTION
                        ? 'Please upload your mandatory documents (Passport, Degree/Transcripts, English Test Score) for verification.'
                        : lead?.stage === StudentStage.OFFER_MANAGEMENT
                          ? 'Congratulations! Your university offer letter is ready. Download it, sign the acceptance page, and upload your signed copy.'
                          : lead?.stage === StudentStage.FEE_PAYMENT
                            ? 'Your offer is accepted! Please check the fee deposit details and upload your wire transfer receipt.'
                            : lead?.stage === StudentStage.VISA_PROCESSING
                              ? 'Your student visa filing is currently in progress with the embassy. We will notify you upon decision.'
                              : 'Get ready for your pre-departure orientation and flight booking!'}
                </p>

                {/* Direct CTA button to help user */}
                {lead?.stage === StudentStage.UNIVERSITY_SHORTLISTING && (
                  <Button variant="primary" size="sm" className="student-card-btn-full" onClick={() => setActiveTab('universities')}>
                    👉 Choose Preferred University
                  </Button>
                )}
                {lead?.stage === StudentStage.DOCUMENT_COLLECTION && (
                  <Button variant="primary" size="sm" className="student-card-btn-full" onClick={() => setActiveTab('documents')}>
                    👉 Upload Required Documents
                  </Button>
                )}
                {lead?.stage === StudentStage.OFFER_MANAGEMENT && (
                  <Button variant="primary" size="sm" className="student-card-btn-full" onClick={() => setActiveTab('offers')}>
                    👉 Review & Sign Offer Letter
                  </Button>
                )}
                {lead?.stage === StudentStage.FEE_PAYMENT && (
                  <Button variant="primary" size="sm" className="student-card-btn-full" onClick={() => setActiveTab('payments')}>
                    👉 Submit Fee Receipt Proof
                  </Button>
                )}
                {lead?.stage === StudentStage.VISA_PROCESSING && (
                  <Button variant="primary" size="sm" className="student-card-btn-full" onClick={() => setActiveTab('visa_travel')}>
                    👉 View Visa & Travel Status
                  </Button>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '12px' }}>Pending Documents & Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documents.filter((d) => d.status === DocumentStatus.REQUESTED).length === 0 ? (
                  <div style={{ color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> All requested documents are currently uploaded!
                  </div>
                ) : (
                  documents
                    .filter((d) => d.status === DocumentStatus.REQUESTED)
                    .map((d) => (
                      <div
                        key={d._id}
                        className="student-action-item"
                      >
                        <div>
                          <strong>{d.title}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.category}</div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          className="student-card-btn-full"
                          onClick={() => {
                            setSelectedDoc(d);
                            setIsUploadDocOpen(true);
                          }}
                        >
                          Upload
                        </Button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Pending Tasks Section / Card */}
          <PendingTasksCard tasks={tasks} loading={loading} />
        </div>
      )}

      {/* --- TAB 2: UNIVERSITIES --- */}
      {activeTab === 'universities' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '14px' }}>Your Approved University Options</h3>
          <div className="student-table-responsive">
            <Table
              columns={[
                { header: 'UNIVERSITY', accessor: 'universityName' },
                { header: 'COURSE', accessor: 'courseTitle' },
                { header: 'COUNTRY', accessor: 'country' },
                { header: 'INTAKE', accessor: 'intake' },
                {
                  header: 'ANNUAL FEE',
                  render: (s) => (s.annualFee ? `${s.currency} ${s.annualFee.toLocaleString()}` : '—'),
                },
                {
                  header: 'STATUS',
                  render: (s) => <StatusBadge status={s.status} />,
                },
                {
                  header: 'ACTION',
                  align: 'right',
                  render: (s) =>
                    s.status !== 'SELECTED_BY_STUDENT' ? (
                      <Button variant="primary" size="sm" onClick={() => handleSelectUniversity(s._id)}>
                        Select This Choice
                      </Button>
                    ) : (
                      <Badge variant="success">✓ Selected</Badge>
                    ),
                },
              ]}
              data={shortlists}
              emptyMessage="Your counsellor is curating your personalized university shortlist."
            />
          </div>
        </div>
      )}

      {/* --- TAB 3: DOCUMENTS --- */}
      {activeTab === 'documents' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '14px' }}>Document Checklist</h3>
          <div className="student-table-responsive">
            <Table
              columns={[
                {
                  header: 'DOCUMENT',
                  render: (d) => (
                    <div>
                      <strong>{d.title}</strong>
                      {d.isMandatory && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
                    </div>
                  ),
                },
                {
                  header: 'STATUS',
                  render: (d) => <StatusBadge status={d.status} />,
                },
                {
                  header: 'ATTACHMENT',
                  render: (d) =>
                    d.fileUrl ? (
                      <a href={d.fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                        {d.originalFileName || 'View File'}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Not Uploaded</span>
                    ),
                },
                {
                  header: 'FEEDBACK / REASON',
                  render: (d) =>
                    d.status === DocumentStatus.REJECTED ? (
                      <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{d.rejectionReason}</span>
                    ) : (
                      '—'
                    ),
                },
                {
                  header: 'ACTION',
                  align: 'right',
                  render: (d) => (
                    <Button
                      variant={d.status === DocumentStatus.APPROVED ? 'ghost' : 'secondary'}
                      size="sm"
                      disabled={d.status === DocumentStatus.APPROVED}
                      onClick={() => {
                        setSelectedDoc(d);
                        setIsUploadDocOpen(true);
                      }}
                    >
                      {d.fileUrl ? 'Re-upload' : 'Upload'}
                    </Button>
                  ),
                },
              ]}
              data={documents}
              emptyMessage="No documents requested yet."
            />
          </div>
        </div>
      )}

      {/* --- TAB 4: OFFERS --- */}
      {activeTab === 'offers' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '14px' }}>Official University Offer Letters</h3>
          <div className="student-table-responsive">
            <Table
              columns={[
                { header: 'UNIVERSITY', accessor: 'universityName' },
                { header: 'COURSE', accessor: 'courseTitle' },
                { header: 'OFFER TYPE', accessor: 'offerType' },
                {
                  header: 'OFFICIAL LETTER',
                  render: (o) => (
                    <a href={o.originalOfferUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                      Download Official Offer <ExternalLink size={12} />
                    </a>
                  ),
                },
                {
                  header: 'SIGNED ACCEPTANCE',
                  render: (o) =>
                    o.signedOfferUrl ? (
                      <span style={{ color: 'var(--success)' }}>✓ Uploaded</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                    ),
                },
                {
                  header: 'STATUS',
                  render: (o) => <StatusBadge status={o.status} />,
                },
                {
                  header: 'ACTION',
                  align: 'right',
                  render: (o) => (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedOffer(o);
                        setIsSignOfferOpen(true);
                      }}
                    >
                      {o.signedOfferUrl ? 'Update Signed Copy' : 'Upload Signed Offer'}
                    </Button>
                  ),
                },
              ]}
              data={offers}
              emptyMessage="No university offer letters available yet."
            />
          </div>
        </div>
      )}

      {/* --- TAB 5: PAYMENTS --- */}
      {activeTab === 'payments' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '14px' }}>Fee Deposit & Receipts</h3>
          <div className="student-table-responsive">
            <Table
              columns={[
                { header: 'PAYMENT TITLE', accessor: 'title' },
                {
                  header: 'AMOUNT DUE',
                  render: (p) => <strong>{p.currency} {p.amount.toLocaleString()}</strong>,
                },
                {
                  header: 'STATUS',
                  render: (p) => <StatusBadge status={p.status} />,
                },
                {
                  header: 'ACTION',
                  align: 'right',
                  render: (p) => (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={p.status === PaymentStatus.VERIFIED}
                      onClick={() => {
                        setSelectedPayment(p);
                        setIsSubmitPaymentOpen(true);
                      }}
                    >
                      {p.status === PaymentStatus.VERIFIED ? 'Verified ✓' : 'Submit Payment Proof'}
                    </Button>
                  ),
                },
              ]}
              data={payments}
              emptyMessage="No payment requests generated yet."
            />
          </div>
        </div>
      )}

      {/* --- TAB 6: VISA & TRAVEL --- */}
      {activeTab === 'visa_travel' && (
        <div className="student-grid-2col">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '12px' }}>Visa Filing Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Country:</span> <strong>{visa?.country || lead?.targetCountry}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Visa Status:</span> <StatusBadge status={visa?.status || 'PENDING'} /></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Grant Number:</span> <strong>{visa?.visaNumber || 'Under Review'}</strong></div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '12px' }}>Pre-Departure Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Accommodation:</span> <Badge variant="neutral">{travel?.accommodationStatus || 'PENDING'}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Flight Tickets:</span> <Badge variant="neutral">{travel?.flightStatus || 'PENDING'}</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Health Insurance:</span> <Badge variant="neutral">{travel?.insuranceStatus || 'PENDING'}</Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 7: MESSAGES --- */}
      {activeTab === 'messages' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '14px' }}>Chat with Your Education Counsellor</h3>
          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              padding: '12px',
              backgroundColor: 'var(--bg-app)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>No messages exchanged yet.</div>
            ) : (
              messages.map((m) => (
                <div
                  key={m._id}
                  style={{
                    alignSelf: m.senderRole === 'STUDENT' ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: m.senderRole === 'STUDENT' ? 'var(--primary-light)' : '#FFFFFF',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '2px' }}>
                    {m.senderName} • {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{m.content}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your question or update for your counsellor..."
            />
            <Button type="submit" variant="primary" icon={<Send size={14} />}>
              Send
            </Button>
          </form>
        </div>
      )}

      {/* --- TAB 8: STUDENT GUIDE & FAQS --- */}
      {activeTab === 'help' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '14px' }}>📘 Student Study Abroad FAQ & Support</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  1. How do I select my university from the shortlist?
                </strong>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Go to the <strong>Shortlisted Universities</strong> tab. Review the programs recommended by your counselor and click <strong>"Confirm Selection"</strong> on your top preferred university. This unlocks your document upload checklist.
                </p>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  2. What file formats are accepted for document uploads?
                </strong>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  We support <strong>PDF, JPG, PNG, and DOCX</strong> files up to 15MB. Ensure all scans (especially passport and grade marksheets) are clear and legible to prevent verification delays.
                </p>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  3. How do I accept my university Offer Letter?
                </strong>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  In the <strong>Offers & Acceptance</strong> tab, download the official university offer PDF. Sign the acceptance declaration page, scan/save it, and click <strong>"Upload Signed Copy"</strong>. Once approved, fee payment instructions are unlocked.
                </p>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  4. How do I pay tuition fee deposits and submit proof?
                </strong>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Under <strong>Fee Payments</strong>, view the required amount and bank wire instructions. After transferring the funds via your bank, click <strong>"Submit Payment Proof"</strong>, enter your Transaction Reference Number, and attach your wire receipt.
                </p>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  5. Need assistance or have questions?
                </strong>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Use the <strong>Message Counsellor</strong> tab to send messages directly to your assigned counselor. You can also reach our support desk at <strong>support@iiec.edu.np</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Student Upload Document Modal --- */}
      <Modal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        title={`Upload Document: ${selectedDoc?.title}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsUploadDocOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUploadDoc}>
              Submit File
            </Button>
          </>
        }
      >
        <form onSubmit={handleUploadDoc}>
          <Input
            label="Document File URL / Path"
            value={docFileUrl}
            onChange={(e) => setDocFileUrl(e.target.value)}
            required
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Allowed file formats: PDF, JPG, PNG, DOCX (Max 15MB).
          </div>
        </form>
      </Modal>

      {/* --- Student Upload Signed Offer Modal --- */}
      <Modal
        isOpen={isSignOfferOpen}
        onClose={() => setIsSignOfferOpen(false)}
        title="Upload Signed Acceptance Letter"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsSignOfferOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUploadSignedOffer}>
              Upload Signed Copy
            </Button>
          </>
        }
      >
        <form onSubmit={handleUploadSignedOffer}>
          <Input
            label="Signed Offer PDF URL"
            value={signedOfferUrl}
            onChange={(e) => setSignedOfferUrl(e.target.value)}
            required
          />
        </form>
      </Modal>

      {/* --- Student Submit Payment Proof Modal --- */}
      <Modal
        isOpen={isSubmitPaymentOpen}
        onClose={() => setIsSubmitPaymentOpen(false)}
        title={`Submit Payment Proof: ${selectedPayment?.title}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsSubmitPaymentOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUploadPaymentProof}>
              Submit Proof
            </Button>
          </>
        }
      >
        <form onSubmit={handleUploadPaymentProof}>
          <Input
            label="Bank Wire Transaction Reference Number *"
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
            placeholder="e.g. TXN-984729184"
            required
          />
          <Input
            label="Receipt Screenshot / PDF URL *"
            value={payProofUrl}
            onChange={(e) => setPayProofUrl(e.target.value)}
            required
          />
        </form>
      </Modal>
    </div>
  );
};

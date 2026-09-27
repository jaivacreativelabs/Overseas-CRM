import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  FileText,
  Award,
  CreditCard,
  Stamp,
  Plane,
  MessageSquare,
  Upload,
  Download,
  Eye,
  CheckCircle2,
  ExternalLink,
  Send,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Lead,
  StudentStage,
  DocumentItem,
  Shortlist,
  Application,
  Offer,
  Payment,
  VisaRecord,
  TravelSupport,
  Message,
  DocumentStatus,
  OfferStatus,
  PaymentStatus,
} from '../../types';
import { StageStepper } from '../../components/StageStepper';
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

  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [visa, setVisa] = useState<VisaRecord | null>(null);
  const [travel, setTravel] = useState<TravelSupport | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Rich University Detail Modal
  const [isUnivDetailsOpen, setIsUnivDetailsOpen] = useState(false);
  const [selectedUnivItem, setSelectedUnivItem] = useState<Shortlist | null>(null);

  // Modals for student upload actions
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docFileUrl, setDocFileUrl] = useState('');

  const [isSignOfferOpen, setIsSignOfferOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [signedOfferUrl, setSignedOfferUrl] = useState('');
  const [signedOfferFile, setSignedOfferFile] = useState<File | null>(null);

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
        const [shortRes, docRes, appRes, offRes, payRes, visRes, travRes, msgRes] = await Promise.all([
          apiClient.get<Shortlist[]>(`/universities/shortlists/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<DocumentItem[]>(`/documents/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<Application[]>(`/applications/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<Offer[]>(`/offers/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<Payment[]>(`/payments/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<VisaRecord>(`/visa/lead/${currentLead._id}`).catch(() => ({ data: null })),
          apiClient.get<TravelSupport>(`/travel/lead/${currentLead._id}`).catch(() => ({ data: null })),
          apiClient.get<Message[]>(`/messages/lead/${currentLead._id}`).catch(() => ({ data: [] })),
        ]);

        setShortlists(shortRes.data || []);
        setDocuments(docRes.data || []);
        setApplications(appRes.data || []);
        setOffers(offRes.data || []);
        setPayments(payRes.data || []);
        setVisa(visRes.data);
        setTravel(travRes.data);
        setMessages(msgRes.data || []);
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
      if (signedOfferFile) {
        const formData = new FormData();
        formData.append('file', signedOfferFile);
        await apiClient.post(`/offers/${selectedOffer._id}/signed`, formData);
      } else {
        await apiClient.post(`/offers/${selectedOffer._id}/signed`, {
          signedOfferUrl,
          signedOfferFileName: 'Signed_Acceptance_Copy.pdf',
        });
      }
      success('Signed offer uploaded! Awaiting counsellor acceptance.');
      setIsSignOfferOpen(false);
      setSignedOfferFile(null);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Student Welcome & Profile Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Welcome, {user?.name}!
            </h1>
            <Badge variant="primary">{lead?.stage?.replace(/_/g, ' ')}</Badge>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Target Country: <strong>{lead?.targetCountry || 'International'}</strong> • Program: <strong>{lead?.targetCourse || 'Undecided'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileText size={14} />}
            onClick={() => lead && window.open(`/api/v1/leads/${lead._id}/download-all-details`, '_blank')}
          >
            Download Summary Dossier
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <User size={18} color="var(--primary)" />
            <div style={{ fontSize: '12px' }}>
              <div style={{ fontWeight: 600 }}>Assigned Counsellor</div>
              <div style={{ color: 'var(--text-muted)' }}>{lead?.counsellorId?.name || 'Sarah Jenkins'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 12-Stage Student Journey Progress Stepper */}
      <StageStepper currentStage={lead?.stage || StudentStage.PROFILE_EVALUATION} />

      {/* Portal Tabs */}
      <div className="tabs-header">
        <button className={`tab-btn ${activeTab === 'journey' ? 'active' : ''}`} onClick={() => setActiveTab('journey')}>
          My Journey & Next Steps
        </button>
        <button className={`tab-btn ${activeTab === 'universities' ? 'active' : ''}`} onClick={() => setActiveTab('universities')}>
          Shortlisted Universities ({shortlists.length})
        </button>
        <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          Upload Documents ({documents.length})
        </button>
        <button className={`tab-btn ${activeTab === 'offers' ? 'active' : ''}`} onClick={() => setActiveTab('offers')}>
          Offers & Acceptance ({offers.length})
        </button>
        <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
          Fee Payments ({payments.length})
        </button>
        <button className={`tab-btn ${activeTab === 'visa_travel' ? 'active' : ''}`} onClick={() => setActiveTab('visa_travel')}>
          Visa & Pre-Departure
        </button>
        <button className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
          Message Counsellor ({messages.length})
        </button>
        <button className={`tab-btn ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}>
          ❓ Guide & FAQs
        </button>
      </div>

      {/* --- TAB 1: JOURNEY --- */}
      {activeTab === 'journey' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                <Button variant="primary" size="sm" onClick={() => setActiveTab('universities')}>
                  👉 Choose Preferred University
                </Button>
              )}
              {lead?.stage === StudentStage.DOCUMENT_COLLECTION && (
                <Button variant="primary" size="sm" onClick={() => setActiveTab('documents')}>
                  👉 Upload Required Documents
                </Button>
              )}
              {lead?.stage === StudentStage.OFFER_MANAGEMENT && (
                <Button variant="primary" size="sm" onClick={() => setActiveTab('offers')}>
                  👉 Review & Sign Offer Letter
                </Button>
              )}
              {lead?.stage === StudentStage.FEE_PAYMENT && (
                <Button variant="primary" size="sm" onClick={() => setActiveTab('payments')}>
                  👉 Submit Fee Receipt Proof
                </Button>
              )}
              {lead?.stage === StudentStage.VISA_PROCESSING && (
                <Button variant="primary" size="sm" onClick={() => setActiveTab('visa_travel')}>
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
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{d.title}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.category}</div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
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
      )}

      {/* --- TAB 2: UNIVERSITIES --- */}
      {activeTab === 'universities' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Your Approved University Options</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Click "View Details" to inspect complete course requirements, fees, deadlines, and accommodation before confirming.
              </p>
            </div>
          </div>

          <Table
            columns={[
              { header: 'UNIVERSITY', accessor: 'universityName' },
              { header: 'COURSE', accessor: 'courseTitle' },
              { header: 'COUNTRY', accessor: 'country' },
              { header: 'INTAKE', accessor: 'intake' },
              {
                header: 'ANNUAL FEE',
                render: (s) => (s.annualFee ? `${s.currency || '$'} ${s.annualFee.toLocaleString()}` : '—'),
              },
              {
                header: 'STATUS',
                render: (s) => <StatusBadge status={s.status} />,
              },
              {
                header: 'ACTION',
                align: 'right',
                render: (s) => (
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedUnivItem(s);
                        setIsUnivDetailsOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    {s.status !== 'SELECTED_BY_STUDENT' ? (
                      <Button variant="primary" size="sm" onClick={() => handleSelectUniversity(s._id)}>
                        Select Choice
                      </Button>
                    ) : (
                      <Badge variant="success">✓ Selected</Badge>
                    )}
                  </div>
                ),
              },
            ]}
            data={shortlists}
            emptyMessage="Your counsellor is curating your personalized university shortlist."
          />
        </div>
      )}

      {/* --- TAB 3: DOCUMENTS --- */}
      {activeTab === 'documents' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '14px' }}>Document Checklist</h3>
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
      )}

      {/* --- TAB 4: OFFERS --- */}
      {activeTab === 'offers' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '14px' }}>Official University Offer Letters & Signed Acceptances</h3>
          <Table
            columns={[
              { header: 'UNIVERSITY', accessor: 'universityName' },
              { header: 'COURSE', accessor: 'courseTitle' },
              { header: 'OFFER TYPE', accessor: 'offerType' },
              {
                header: '1. ORIGINAL OFFER LETTER',
                render: (o) => (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <a
                      href={o.originalOfferUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                    >
                      <Eye size={14} /> View
                    </a>
                    <a
                      href={`/api/v1/offers/${o._id}/download/original`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: 'var(--primary)',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        padding: '4px 8px',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        textDecoration: 'none',
                      }}
                    >
                      <Download size={13} /> Download
                    </a>
                  </div>
                ),
              },
              {
                header: '2. SIGNED ACCEPTANCE COPY',
                render: (o) =>
                  o.signedOfferUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> Signed Offer Letter
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {o.signedOfferFileName || 'signed_offer.pdf'}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <a
                          href={o.signedOfferUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            color: 'var(--success)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            backgroundColor: 'var(--bg-subtle)',
                          }}
                        >
                          <Eye size={12} /> View
                        </a>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Download size={12} />}
                          onClick={() => window.open(`http://localhost:5000/api/v1/offers/${o._id}/download/signed`, '_blank')}
                        >
                          Download
                        </Button>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Uploaded: {o.signedUploadedAt ? new Date(o.signedUploadedAt).toLocaleString() : new Date(o.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', fontWeight: 500 }}>
                        Signed Offer Letter Not Available
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Upload size={12} />}
                        onClick={() => {
                          setSelectedOffer(o);
                          setIsSignOfferOpen(true);
                        }}
                      >
                        Upload Signed Offer Letter
                      </Button>
                    </div>
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
      )}

      {/* --- TAB 5: PAYMENTS --- */}
      {activeTab === 'payments' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '14px' }}>Fee Deposit & Receipts</h3>
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
      )}

      {/* --- TAB 6: VISA & TRAVEL --- */}
      {activeTab === 'visa_travel' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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

      {/* --- Student University & Course Complete Details Modal --- */}
      <Modal
        isOpen={isUnivDetailsOpen}
        onClose={() => setIsUnivDetailsOpen(false)}
        title={`University & Course Specifications: ${selectedUnivItem?.universityName}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsUnivDetailsOpen(false)}>
              Close
            </Button>
            {selectedUnivItem && selectedUnivItem.status !== 'SELECTED_BY_STUDENT' && (
              <Button
                variant="primary"
                onClick={async () => {
                  if (!lead) return;
                  try {
                    await apiClient.post(`/universities/shortlists/${lead._id}/select/${selectedUnivItem._id}`);
                    success(`Confirmed selection of ${selectedUnivItem.courseTitle} at ${selectedUnivItem.universityName}!`);
                    setIsUnivDetailsOpen(false);
                    fetchStudentData();
                  } catch (err: any) {
                    error(err.message || 'Selection failed');
                  }
                }}
              >
                Confirm University Choice
              </Button>
            )}
          </>
        }
      >
        {selectedUnivItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
            {/* University Overview */}
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>{selectedUnivItem.universityName}</h4>
                <Badge variant="primary">{selectedUnivItem.country}</Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginTop: '10px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Location / City:</span> <strong>{(selectedUnivItem.universityId as any)?.city || selectedUnivItem.country}</strong></div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Official Website:</span>{' '}
                  {(selectedUnivItem.universityId as any)?.website ? (
                    <a href={(selectedUnivItem.universityId as any).website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {(selectedUnivItem.universityId as any).website} <ExternalLink size={12} />
                    </a>
                  ) : (
                    'N/A'
                  )}
                </div>
                <div><span style={{ color: 'var(--text-muted)' }}>Global Ranking:</span> <strong>#{(selectedUnivItem.universityId as any)?.ranking || 'Top 100 Global'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <StatusBadge status={selectedUnivItem.status} /></div>
              </div>
            </div>

            {/* Course & Academic Specifications */}
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Program: {selectedUnivItem.courseTitle}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '14px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Intake:</span> <strong>{selectedUnivItem.intake}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Duration:</span> <strong>{(selectedUnivItem.courseId as any)?.durationMonths || 12} Months</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Tuition Fee:</span> <strong>{selectedUnivItem.currency || '$'} {selectedUnivItem.annualFee?.toLocaleString() || 'N/A'} / Year</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Application Fee:</span> <strong>{(selectedUnivItem.courseId as any)?.applicationFee ? `${selectedUnivItem.currency || '$'} ${(selectedUnivItem.courseId as any).applicationFee}` : 'Waived / Free'}</strong></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Academic & GPA Criteria:</strong>
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
                    {(selectedUnivItem.courseId as any)?.academicRequirements || (selectedUnivItem.courseId as any)?.eligibilityRequirements || 'Minimum 60% or 3.0 GPA in relevant Bachelor’s degree.'}
                  </p>
                </div>

                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>English Proficiency Requirements:</strong>
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
                    {(selectedUnivItem.courseId as any)?.englishRequirements || 'IELTS Overall 6.5 (Minimum 6.0 in all bands) / PTE 58 Academic / TOEFL iBT 88.'}
                  </p>
                </div>

                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Application Deadlines:</strong>
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
                    {(selectedUnivItem.courseId as any)?.deadlines || 'Fall Intake: July 15 • Spring Intake: November 30 (Early submission recommended).'}
                  </p>
                </div>

                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Scholarship Opportunities:</strong>
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
                    {(selectedUnivItem.courseId as any)?.scholarshipInfo || (selectedUnivItem.universityId as any)?.scholarshipInfo || 'International Merit Scholarships up to £3,000 / $5,000 available.'}
                  </p>
                </div>

                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Accommodation Options:</strong>
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
                    {(selectedUnivItem.courseId as any)?.accommodationInfo || (selectedUnivItem.universityId as any)?.accommodationInfo || 'On-campus dormitories + private student halls available.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
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
              Submit Signed Copy
            </Button>
          </>
        }
      >
        <form onSubmit={handleUploadSignedOffer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Attach Signed Offer PDF / Image *
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setSignedOfferFile(e.target.files?.[0] || null)}
              style={{
                padding: '8px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Select the scanned copy of your signed offer acceptance declaration.
            </span>
          </div>

          <Input
            label="Or Enter Signed Offer Document URL / Path"
            value={signedOfferUrl}
            onChange={(e) => setSignedOfferUrl(e.target.value)}
            placeholder="e.g. /uploads/signed_acceptance.pdf"
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

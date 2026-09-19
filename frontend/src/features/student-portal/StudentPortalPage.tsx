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
  const [activeTab, setActiveTab] = useState<'journey' | 'universities' | 'documents' | 'offers' | 'payments' | 'visa_travel' | 'messages'>('journey');

  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [visa, setVisa] = useState<VisaRecord | null>(null);
  const [travel, setTravel] = useState<TravelSupport | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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
        const [shortRes, docRes, offRes, payRes, visRes, travRes, msgRes] = await Promise.all([
          apiClient.get<Shortlist[]>(`/universities/shortlists/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<DocumentItem[]>(`/documents/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<Offer[]>(`/offers/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<Payment[]>(`/payments/lead/${currentLead._id}`).catch(() => ({ data: [] })),
          apiClient.get<VisaRecord>(`/visa/lead/${currentLead._id}`).catch(() => ({ data: null })),
          apiClient.get<TravelSupport>(`/travel/lead/${currentLead._id}`).catch(() => ({ data: null })),
          apiClient.get<Message[]>(`/messages/lead/${currentLead._id}`).catch(() => ({ data: [] })),
        ]);

        setShortlists(shortRes.data || []);
        setDocuments(docRes.data || []);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <User size={18} color="var(--primary)" />
          <div style={{ fontSize: '12px' }}>
            <div style={{ fontWeight: 600 }}>Assigned Counsellor</div>
            <div style={{ color: 'var(--text-muted)' }}>{lead?.counsellorId?.name || 'Sarah Jenkins'}</div>
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
      </div>

      {/* --- TAB 1: JOURNEY --- */}
      {activeTab === 'journey' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '12px' }}>Current Stage Action Item</h3>
            <div style={{ padding: '14px', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 87, 248, 0.2)' }}>
              <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '14px', marginBottom: '4px' }}>
                Stage: {lead?.stage?.replace(/_/g, ' ')}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {lead?.stage === StudentStage.PROFILE_EVALUATION
                  ? 'Your counsellor is evaluating your academic credentials and test scores.'
                  : lead?.stage === StudentStage.UNIVERSITY_SHORTLISTING
                  ? 'Please review your approved university shortlist and select your preferred choice.'
                  : lead?.stage === StudentStage.DOCUMENT_COLLECTION
                  ? 'Please upload your mandatory documents (Passport, Transcripts, IELTS) for verification.'
                  : lead?.stage === StudentStage.OFFER_MANAGEMENT
                  ? 'Your university offer letter is ready! Download, sign, and upload your signed copy.'
                  : lead?.stage === StudentStage.FEE_PAYMENT
                  ? 'Please review fee payment instructions and submit your deposit receipt.'
                  : lead?.stage === StudentStage.VISA_PROCESSING
                  ? 'Visa application is in progress. Check embassy updates.'
                  : 'Prepare for your pre-departure briefing and flight.'}
              </p>
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
          <h3 className="card-title" style={{ marginBottom: '14px' }}>Your Approved University Options</h3>
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
          <h3 className="card-title" style={{ marginBottom: '14px' }}>Official University Offer Letters</h3>
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

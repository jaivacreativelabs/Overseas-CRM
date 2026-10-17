import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Download,
  Eye,
  CheckCircle2,
  ExternalLink,
  Send,
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Video,
  Check,
  X,
  Calendar,
  Compass,
  BarChart3,
  Building2,
  File,
  FolderOpen,
  FileCheck,
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
  Task,
  UserRole,
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary active tab derived from URL query param: 'universities' | 'documents' | 'report'
  const activeTabParam = searchParams.get('tab') || 'report';

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJourneyExpanded, setIsJourneyExpanded] = useState(false);

  // Sub-tab state inside the Report page
  const [reportSection, setReportSection] = useState<
    'overview' | 'counselling' | 'applications' | 'others' | 'payments' | 'visa' | 'travel' | 'orientation'
  >('overview');

  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [visa, setVisa] = useState<VisaRecord | null>(null);
  const [travel, setTravel] = useState<TravelSupport | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orientations, setOrientations] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Rich University Detail Modal
  const [isUnivDetailsOpen, setIsUnivDetailsOpen] = useState(false);
  const [selectedUnivItem, setSelectedUnivItem] = useState<Shortlist | null>(null);

  // Modals for student upload actions
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docFileUrl, setDocFileUrl] = useState('');
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
      // 1. Try fetching authoritative student profile for logged-in user
      let currentLead: Lead | null = null;
      try {
        const myProfileRes = await apiClient.get<Lead>('/leads/my-student-profile');
        if (myProfileRes.data) {
          currentLead = myProfileRes.data;
        }
      } catch (e) {
        // Fallback for compatibility
        const res = await apiClient.get<Lead[]>('/leads', { isStudent: true, limit: 1 });
        currentLead = res.data?.[0] || null;
      }
      if (currentLead) {
        setLead(currentLead);
        const [shortRes, docRes, appRes, offRes, payRes, visRes, travRes, msgRes, taskRes, orientRes] =
          await Promise.all([
            apiClient.get<Shortlist[]>(`/universities/shortlists/${currentLead._id}`).catch(() => ({ data: [] })),
            apiClient.get<DocumentItem[]>(`/documents/lead/${currentLead._id}`).catch(() => ({ data: [] })),
            apiClient.get<Application[]>(`/applications/lead/${currentLead._id}`).catch(() => ({ data: [] })),
            apiClient.get<Offer[]>(`/offers/lead/${currentLead._id}`).catch(() => ({ data: [] })),
            apiClient.get<Payment[]>(`/payments/lead/${currentLead._id}`).catch(() => ({ data: [] })),
            apiClient.get<VisaRecord>(`/visa/lead/${currentLead._id}`).catch(() => ({ data: null })),
            apiClient.get<TravelSupport>(`/travel/lead/${currentLead._id}`).catch(() => ({ data: null })),
            apiClient.get<Message[]>(`/messages/lead/${currentLead._id}`).catch(() => ({ data: [] })),
            apiClient.get<Task[]>(`/tasks`, { leadId: currentLead._id }).catch(() => ({ data: [] })),
            apiClient.get<any[]>('/orientation').catch(() => ({ data: [] })),
          ]);

        setShortlists(shortRes.data || []);
        setDocuments(docRes.data || []);
        setApplications(appRes.data || []);
        setOffers(offRes.data || []);
        setPayments(payRes.data || []);
        setVisa(visRes.data);
        setTravel(travRes.data);
        setMessages(msgRes.data || []);
        setTasks(taskRes.data || []);
        setOrientations(orientRes.data || []);
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

    if (!docFile && !docFileUrl.trim()) {
      error('Please select a file or enter a valid document URL.');
      return;
    }

    if (docFile) {
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
      const fileExt = '.' + (docFile.name.split('.').pop() || '').toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        error(`Invalid file format "${fileExt}". Please upload PDF, JPG, PNG, or DOCX.`);
        return;
      }
      if (docFile.size > 15 * 1024 * 1024) {
        error('File exceeds the maximum limit of 15MB. Please choose a smaller file.');
        return;
      }
    }

    setIsUploadingDoc(true);
    setUploadProgress(20);

    try {
      if (docFile) {
        const fd = new FormData();
        fd.append('file', docFile);
        setUploadProgress(60);
        await apiClient.post(`/documents/${selectedDoc._id}/upload`, fd);
      } else {
        setUploadProgress(60);
        await apiClient.post(`/documents/${selectedDoc._id}/upload`, {
          fileUrl: docFileUrl.trim(),
          originalFileName: `${selectedDoc.title.replace(/\s+/g, '_')}.pdf`,
        });
      }
      setUploadProgress(100);
      success('Document submitted successfully for counselor verification.');
      setIsUploadDocOpen(false);
      setDocFile(null);
      setDocFileUrl('');
      fetchStudentData();
    } catch (err: any) {
      error(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploadingDoc(false);
      setUploadProgress(0);
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

  const currentStageIndex = STAGES_CONFIG.findIndex((s) => s.stage === lead?.stage);
  const activeStageNum = currentStageIndex >= 0 ? currentStageIndex + 1 : 1;
  const progressPercentage = Math.round((activeStageNum / STAGES_CONFIG.length) * 100);
  const counsellingSessions = lead?.counsellingSessions || [];

  return (
    <div className="student-portal-container">
      {/* Student Welcome & Profile Summary Header */}
      <div className="card student-welcome-card">
        <div className="student-header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="student-welcome-title">Welcome, {lead?.name || user?.name}!</h1>
            <Badge variant="primary">{lead?.stage?.replace(/_/g, ' ') || 'PROFILE EVALUATION'}</Badge>
            {user?.role !== UserRole.STUDENT && (
              <Badge variant="warning">Staff Preview Mode</Badge>
            )}
          </div>
          <p className="student-welcome-subtext">
            Target Country: <strong>{lead?.targetCountry || 'International'}</strong> • Program:{' '}
            <strong>{lead?.targetCourse || 'Undecided'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileText size={14} />}
            onClick={() => lead && window.open(`/api/v1/leads/${lead._id}/download-all-details`, '_blank')}
          >
            Download Summary Dossier
          </Button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <User size={18} color="var(--primary)" />
            <div style={{ fontSize: '12px' }}>
              <div style={{ fontWeight: 600 }}>Assigned Counsellor</div>
              <div style={{ color: 'var(--text-muted)' }}>{lead?.counsellorId?.name || 'Sarah Jenkins'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
         PAGE 1: UNIVERSITIES
         ========================================================================= */}
      {activeTabParam === 'universities' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">📍 Shortlisted Universities</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Review recommended programs and click "Confirm Selection" on your top preferred choice to unlock your document checklist.
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

      {/* =========================================================================
         PAGE 2: DOCUMENTS
         ========================================================================= */}
      {activeTabParam === 'documents' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 className="card-title">📄 Document Checklist</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Please review and upload all required documents requested by your assigned counselor.
              </p>
            </div>
            <Badge variant="primary">
              {documents.filter((d) => d.status === DocumentStatus.APPROVED || d.status === DocumentStatus.SUCCESSFUL).length} / {documents.length} Verified
            </Badge>
          </div>
          <div className="student-table-responsive">
            <Table
              columns={[
                {
                  header: 'DOCUMENT',
                  render: (d) => (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong>{d.title}</strong>
                        {d.isMandatory ? (
                          <span style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 600 }}>[Required]</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>[Optional]</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Category: {d.category}
                        {d.description ? ` • Instructions: ${d.description}` : ''}
                      </div>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <FileText size={14} />
                          {d.originalFileName || 'View Uploaded Document'}
                        </a>
                        {d.fileSize && (
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            {(d.fileSize / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Awaiting Submission</span>
                    ),
                },
                {
                  header: 'COUNSELOR FEEDBACK',
                  render: (d) =>
                    d.status === DocumentStatus.REJECTED || d.status === DocumentStatus.FAILED ? (
                      <div style={{ padding: '4px 8px', backgroundColor: '#FEF2F2', borderRadius: '4px', border: '1px solid #FECACA' }}>
                        <span style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 500 }}>
                          {d.rejectionReason || 'Document requires re-submission'}
                        </span>
                      </div>
                    ) : (
                      '—'
                    ),
                },
                {
                  header: 'ACTION',
                  align: 'right',
                  render: (d) => {
                    const isApproved = d.status === DocumentStatus.APPROVED || d.status === DocumentStatus.SUCCESSFUL;
                    const isRejected = d.status === DocumentStatus.REJECTED || d.status === DocumentStatus.FAILED;
                    return (
                      <Button
                        variant={isApproved ? 'ghost' : isRejected ? 'danger' : 'primary'}
                        size="sm"
                        disabled={isApproved}
                        onClick={() => {
                          setSelectedDoc(d);
                          setDocFile(null);
                          setDocFileUrl('');
                          setIsUploadDocOpen(true);
                        }}
                      >
                        {isApproved ? 'Approved ✓' : d.fileUrl || isRejected ? 'Re-upload' : 'Upload File'}
                      </Button>
                    );
                  },
                },
              ]}
              data={documents}
              emptyMessage="No documents have been requested yet. Your counselor will notify you if any credentials are required."
            />
          </div>
        </div>
      )}

      {/* =========================================================================
         PAGE 3: STUDENT JOURNEY REPORT (FULL-SCREEN WITH HORIZONTAL INTERACTIVE NAV)
         ========================================================================= */}
      {activeTabParam === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Report Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 Student Journey Report
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Full-spectrum journey progress summary & interactive management for all lifecycle stages
              </p>
            </div>
          </div>

          {/* Top Summary Section Cards (Real Data, Clean Empty States) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {/* Summary Card 1: Journey Progress */}
            <div style={{ padding: '14px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Overall Progress
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                {progressPercentage}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                Stage {activeStageNum}/12: {lead?.stage?.replace(/_/g, ' ') || 'PROFILE EVALUATION'}
              </div>
            </div>

            {/* Summary Card 2: Counselling Status */}
            <div style={{ padding: '14px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Counselling Status
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {counsellingSessions.length > 0 ? `${counsellingSessions.length} Session(s)` : lead?.counsellorId?.name ? 'Counsellor Assigned' : 'No information available yet'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {lead?.counsellorId?.name ? `Counsellor: ${lead.counsellorId.name}` : 'No information available yet'}
              </div>
            </div>

            {/* Summary Card 3: Applications Status */}
            <div style={{ padding: '14px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Applications & Offers
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {applications.length > 0 ? `${applications.length} Applied` : 'No information available yet'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {offers.length > 0 ? `${offers.length} Offer Letter(s) Received` : 'No offer letters yet'}
              </div>
            </div>

            {/* Summary Card 4: Payments Status */}
            <div style={{ padding: '14px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Payments Status
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {payments.length > 0 ? `${payments.filter((p) => p.status === PaymentStatus.VERIFIED).length}/${payments.length} Verified` : 'No information available yet'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {payments.some((p) => p.status === PaymentStatus.REQUESTED || p.status === PaymentStatus.PROOF_SUBMITTED) ? 'Fee deposit pending' : 'All clear'}
              </div>
            </div>

            {/* Summary Card 5: Visa Status */}
            <div style={{ padding: '14px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Visa Status
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {visa?.status ? visa.status.replace(/_/g, ' ') : 'No information available yet'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {visa?.visaNumber ? `Grant #: ${visa.visaNumber}` : 'Under review'}
              </div>
            </div>

            {/* Summary Card 6: Travel Status */}
            <div style={{ padding: '14px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Travel Status
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {travel?.flightStatus ? travel.flightStatus.replace(/_/g, ' ') : 'No information available yet'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Housing: {travel?.accommodationStatus || 'Pending'}
              </div>
            </div>

            {/* Summary Card 7: Orientation Status */}
            <div style={{ padding: '14px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Orientation Status
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {orientations.length > 0 ? `${orientations.length} Session(s) Available` : 'No information available yet'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Pre-departure guidance
              </div>
            </div>
          </div>

          {/* Horizontal Interactive Navigation Bar inside Report Page */}
          <div className="student-tabs-header" style={{ marginBottom: '16px' }}>
            <button
              className={`student-tab-btn ${reportSection === 'overview' ? 'active' : ''}`}
              onClick={() => setReportSection('overview')}
            >
              📊 Overview
            </button>
            <button
              className={`student-tab-btn ${reportSection === 'counselling' ? 'active' : ''}`}
              onClick={() => setReportSection('counselling')}
            >
              🗣️ Counselling ({counsellingSessions.length})
            </button>
            <button
              className={`student-tab-btn ${reportSection === 'applications' ? 'active' : ''}`}
              onClick={() => setReportSection('applications')}
            >
              📝 Applications & Offers ({applications.length + offers.length})
            </button>
            <button
              className={`student-tab-btn ${reportSection === 'others' ? 'active' : ''}`}
              onClick={() => setReportSection('others')}
            >
              📁 Others (Tasks & Messages)
            </button>
            <button
              className={`student-tab-btn ${reportSection === 'payments' ? 'active' : ''}`}
              onClick={() => setReportSection('payments')}
            >
              💳 Payments ({payments.length})
            </button>
            <button
              className={`student-tab-btn ${reportSection === 'visa' ? 'active' : ''}`}
              onClick={() => setReportSection('visa')}
            >
              🛂 Visa Tracking
            </button>
            <button
              className={`student-tab-btn ${reportSection === 'travel' ? 'active' : ''}`}
              onClick={() => setReportSection('travel')}
            >
              ✈️ Travel & Departure
            </button>
            <button
              className={`student-tab-btn ${reportSection === 'orientation' ? 'active' : ''}`}
              onClick={() => setReportSection('orientation')}
            >
              🧭 Orientation ({orientations.length})
            </button>
          </div>

          {/* =========================================================================
             REPORT SECTION 1: OVERVIEW
             ========================================================================= */}
          {reportSection === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Stepper Summary Card */}
              <div className="student-progress-summary-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Application Lifecycle Stage
                    </span>
                    <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      Current: {lead?.stage?.replace(/_/g, ' ')}{' '}
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--primary)' }}>
                        (Stage {activeStageNum} of {STAGES_CONFIG.length})
                      </span>
                    </div>
                  </div>
                  <Badge variant="primary">{progressPercentage}%</Badge>
                </div>

                <div className="student-progress-bar-bg">
                  <div className="student-progress-bar-fill" style={{ width: `${progressPercentage}%` }} />
                </div>

                <button
                  type="button"
                  className="student-accordion-toggle"
                  onClick={() => setIsJourneyExpanded(!isJourneyExpanded)}
                >
                  <span>{isJourneyExpanded ? 'Hide Full Stepper Timeline' : 'View Full Journey Stepper Timeline'}</span>
                  {isJourneyExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isJourneyExpanded && (
                  <div style={{ marginTop: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                    <StageStepper currentStage={lead?.stage || StudentStage.PROFILE_EVALUATION} />
                  </div>
                )}
              </div>

              {/* 2-Column Grid */}
              <div className="student-grid-2col">
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: '12px' }}>Current Stage Action Required</h3>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--primary-light)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(0, 87, 248, 0.2)',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '14px', marginBottom: '6px' }}>
                      Stage: {lead?.stage?.replace(/_/g, ' ')}
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                      {lead?.stage === StudentStage.PROFILE_EVALUATION
                        ? 'Your counsellor is reviewing your academic transcripts to build your university recommendations.'
                        : lead?.stage === StudentStage.UNIVERSITY_SHORTLISTING
                        ? 'Your university options are ready! Please review the shortlist and confirm your 1 preferred university.'
                        : lead?.stage === StudentStage.DOCUMENT_COLLECTION
                        ? 'Please upload your mandatory documents (Passport, Transcripts, English Test Score) for verification.'
                        : lead?.stage === StudentStage.OFFER_MANAGEMENT
                        ? 'Congratulations! Your university offer letter is ready. Download it, sign the acceptance page, and upload your signed copy.'
                        : lead?.stage === StudentStage.FEE_PAYMENT
                        ? 'Your offer is accepted! Please check the fee deposit details and upload your wire transfer receipt.'
                        : lead?.stage === StudentStage.VISA_PROCESSING
                        ? 'Your student visa filing is currently in progress with the embassy. We will notify you upon decision.'
                        : 'Get ready for your pre-departure orientation and flight booking!'}
                    </p>

                    {lead?.stage === StudentStage.UNIVERSITY_SHORTLISTING && (
                      <Button variant="primary" size="sm" className="student-card-btn-full" onClick={() => setSearchParams({ tab: 'universities' })}>
                        👉 Choose Preferred University
                      </Button>
                    )}
                    {lead?.stage === StudentStage.DOCUMENT_COLLECTION && (
                      <Button variant="primary" size="sm" className="student-card-btn-full" onClick={() => setSearchParams({ tab: 'documents' })}>
                        👉 Upload Required Documents
                      </Button>
                    )}
                    {lead?.stage === StudentStage.OFFER_MANAGEMENT && (
                      <Button variant="primary" size="sm" className="student-card-btn-full" onClick={() => setReportSection('applications')}>
                        👉 Review & Sign Offer Letter
                      </Button>
                    )}
                    {lead?.stage === StudentStage.FEE_PAYMENT && (
                      <Button variant="primary" size="sm" className="student-card-btn-full" onClick={() => setReportSection('payments')}>
                        👉 Submit Fee Receipt Proof
                      </Button>
                    )}
                    {lead?.stage === StudentStage.VISA_PROCESSING && (
                      <Button variant="primary" size="sm" className="student-card-btn-full" onClick={() => setReportSection('visa')}>
                        👉 View Visa & Travel Status
                      </Button>
                    )}
                  </div>
                </div>

                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: '12px' }}>Pending Checklist Items</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {documents.filter((d) => d.status === DocumentStatus.REQUESTED).length === 0 ? (
                      <div style={{ color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} /> All requested documents are uploaded!
                      </div>
                    ) : (
                      documents
                        .filter((d) => d.status === DocumentStatus.REQUESTED)
                        .map((d) => (
                          <div key={d._id} className="student-action-item">
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

              {/* Pending Tasks Section */}
              <PendingTasksCard tasks={tasks} loading={loading} />
            </div>
          )}

          {/* =========================================================================
             REPORT SECTION 2: COUNSELLING
             ========================================================================= */}
          {reportSection === 'counselling' && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '14px' }}>🗣️ Preliminary Counselling Sessions & Notes</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                View your scheduled 1-on-1 preliminary counselling meetings, join live Google Meet calls, and review counsellor notes.
              </p>

              <Table
                columns={[
                  {
                    header: 'COUNSELLOR',
                    render: (s: any) => (
                      <div>
                        <strong>{s.counsellorName || lead?.counsellorId?.name || 'Sarah Jenkins'}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Education Counsellor</div>
                      </div>
                    ),
                  },
                  {
                    header: 'DATE & TIME',
                    render: (s: any) => (s.scheduledDate ? `${s.scheduledDate} at ${s.scheduledTime || 'TBD'}` : 'Scheduled'),
                  },
                  {
                    header: 'GOOGLE MEET LINK',
                    render: (s: any) =>
                      s.googleMeetLink ? (
                        <a
                          href={s.googleMeetLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Video size={14} /> Join Call <ExternalLink size={12} />
                        </a>
                      ) : (
                        '—'
                      ),
                  },
                  {
                    header: 'STATUS',
                    render: (s: any) => (
                      <Badge variant={s.status === 'COMPLETED' ? 'success' : s.status === 'SCHEDULED' ? 'primary' : 'neutral'}>
                        {s.status || 'SCHEDULED'}
                      </Badge>
                    ),
                  },
                  {
                    header: 'ATTENDANCE',
                    render: (s: any) => (
                      <Badge variant={s.attendance === 'ATTENDED' ? 'success' : s.attendance === 'ABSENT' ? 'danger' : 'neutral'}>
                        {s.attendance || 'PENDING'}
                      </Badge>
                    ),
                  },
                ]}
                data={counsellingSessions}
                emptyMessage="No preliminary counselling sessions recorded yet."
              />
            </div>
          )}

          {/* =========================================================================
             REPORT SECTION 3: APPLICATIONS & OFFERS
             ========================================================================= */}
          {reportSection === 'applications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Submitted Applications Table */}
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '14px' }}>📝 Submitted Applications</h3>
                <Table
                  columns={[
                    { header: 'UNIVERSITY', accessor: 'universityName' },
                    { header: 'COURSE', accessor: 'courseTitle' },
                    { header: 'COUNTRY', accessor: 'country' },
                    { header: 'INTAKE', accessor: 'intake' },
                    {
                      header: 'STATUS',
                      render: (a) => <StatusBadge status={a.status} />,
                    },
                    {
                      header: 'APPLIED DATE',
                      render: (a) => (a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'),
                    },
                  ]}
                  data={applications}
                  emptyMessage="No university applications submitted yet."
                />
              </div>

              {/* University Offer Letters Table */}
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '14px' }}>🏆 Official Offer Letters & Acceptance Declarations</h3>
                <Table
                  columns={[
                    { header: 'UNIVERSITY', accessor: 'universityName' },
                    { header: 'COURSE', accessor: 'courseTitle' },
                    { header: 'OFFER TYPE', accessor: 'offerType' },
                    {
                      header: '1. ORIGINAL OFFER PDF',
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} /> Signed Offer Uploaded
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Download size={12} />}
                              onClick={() => window.open(`/api/v1/offers/${o._id}/download/signed`, '_blank')}
                            >
                              Download Signed Copy
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Upload size={12} />}
                            onClick={() => {
                              setSelectedOffer(o);
                              setIsSignOfferOpen(true);
                            }}
                          >
                            Upload Signed Acceptance
                          </Button>
                        ),
                    },
                    {
                      header: 'STATUS',
                      render: (o) => <StatusBadge status={o.status} />,
                    },
                  ]}
                  data={offers}
                  emptyMessage="No university offer letters available yet."
                />
              </div>
            </div>
          )}

          {/* =========================================================================
             REPORT SECTION 4: OTHERS (TASKS & MESSAGES)
             ========================================================================= */}
          {reportSection === 'others' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Chat with Counsellor */}
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '14px' }}>💬 Chat with Your Education Counsellor</h3>
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

              {/* Tasks & Action Dossier */}
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '12px' }}>📁 Additional Files & Action Tasks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>Full Application Dossier (PDF)</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Complete consolidated profile, transcripts, applications, and offers</div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download size={14} />}
                      onClick={() => lead && window.open(`/api/v1/leads/${lead._id}/download-all-details`, '_blank')}
                    >
                      Download PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
             REPORT SECTION 5: PAYMENTS
             ========================================================================= */}
          {reportSection === 'payments' && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '14px' }}>💳 Tuition Fee Deposits & Payment Receipts</h3>
              <div className="student-table-responsive">
                <Table
                  columns={[
                    { header: 'PAYMENT TITLE', accessor: 'title' },
                    {
                      header: 'AMOUNT DUE',
                      render: (p) => (
                        <strong>
                          {p.currency} {p.amount.toLocaleString()}
                        </strong>
                      ),
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

          {/* =========================================================================
             REPORT SECTION 6: VISA TRACKING
             ========================================================================= */}
          {reportSection === 'visa' && (
            <div className="student-grid-2col">
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '12px' }}>🛂 Visa Filing & Embassy Record</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Destination Country:</span>{' '}
                    <strong>{visa?.country || lead?.targetCountry || 'International'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Visa Filing Status:</span>{' '}
                    <StatusBadge status={visa?.status || 'PENDING'} />
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Visa Grant / Application #:</span>{' '}
                    <strong>{visa?.visaNumber || 'Under Review'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Embassy Appointment Date:</span>{' '}
                    <strong>{visa?.appointmentDate ? new Date(visa.appointmentDate).toLocaleDateString() : 'TBD'}</strong>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '12px' }}>📋 Visa Checklist</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--success)" /> Valid Passport (Minimum 6 Months Validity)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--success)" /> Official CAS / I-20 / Offer Letter
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--success)" /> Financial Proof & Bank Wire Receipts
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
             REPORT SECTION 7: TRAVEL & DEPARTURE
             ========================================================================= */}
          {reportSection === 'travel' && (
            <div className="student-grid-2col">
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '12px' }}>✈️ Flight & Departure Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Flight Ticket Status:</span>{' '}
                    <Badge variant="neutral">{travel?.flightStatus || 'PENDING'}</Badge>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Departure Airport:</span>{' '}
                    <strong>{travel?.departureAirport || 'Kathmandu (KTM)'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Arrival Date:</span>{' '}
                    <strong>{travel?.arrivalDate ? new Date(travel.arrivalDate).toLocaleDateString() : 'TBD'}</strong>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '12px' }}>🏡 Accommodation & Insurance</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Accommodation Status:</span> <Badge variant="neutral">{travel?.accommodationStatus || 'PENDING'}</Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Health Insurance:</span> <Badge variant="neutral">{travel?.insuranceStatus || 'PENDING'}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
             REPORT SECTION 8: ORIENTATION
             ========================================================================= */}
          {reportSection === 'orientation' && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '14px' }}>🧭 Pre-Departure Orientation Sessions</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Join destination-specific orientation workshops to learn about currency exchange, student housing, airport pickup, and campus life.
              </p>

              <Table
                columns={[
                  {
                    header: 'SESSION TITLE',
                    render: (o) => (
                      <div>
                        <strong>{o.title}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {o.country} • {o.intake}
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'DATE & TIME',
                    render: (o) => `${new Date(o.sessionDate).toLocaleDateString()} at ${o.sessionTime}`,
                  },
                  {
                    header: 'MEET LINK',
                    render: (o) =>
                      o.googleMeetLink ? (
                        <a href={o.googleMeetLink} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                          Join Meet
                        </a>
                      ) : (
                        'In-Person'
                      ),
                  },
                  {
                    header: 'AGENDA / TOPICS',
                    render: (o) => o.description || 'Pre-departure guidance',
                  },
                ]}
                data={orientations}
                emptyMessage="No orientation sessions scheduled."
              />
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
         MODALS & DIALOGS
         ========================================================================= */}

      {/* --- Student Upload Document Modal --- */}
      <Modal
        isOpen={isUploadDocOpen}
        onClose={() => {
          if (!isUploadingDoc) {
            setIsUploadDocOpen(false);
            setDocFile(null);
            setDocFileUrl('');
          }
        }}
        title={`Upload Document: ${selectedDoc?.title}`}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isUploadingDoc}
              onClick={() => {
                setIsUploadDocOpen(false);
                setDocFile(null);
                setDocFileUrl('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isUploadingDoc || (!docFile && !docFileUrl.trim())}
              onClick={handleUploadDoc}
            >
              {isUploadingDoc ? 'Uploading...' : 'Submit File'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleUploadDoc} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {selectedDoc?.description && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              <strong>Counselor Instructions:</strong> {selectedDoc.description}
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Select File to Upload
            </label>
            <div
              className={`student-dropzone ${isDraggingDoc ? 'dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingDoc(true);
              }}
              onDragLeave={() => setIsDraggingDoc(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingDoc(false);
                if (e.dataTransfer.files?.[0]) {
                  setDocFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                document.getElementById('student-file-input')?.click();
              }}
            >
              <div className="student-dropzone-icon">
                <Upload size={20} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Click to browse or drag and drop your file here
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Supported: PDF, JPG, PNG, DOCX (Max: 15MB)
              </div>
              <input
                id="student-file-input"
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setDocFile(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Selected File Details */}
          {docFile && (
            <div className="student-selected-file-badge">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <FileCheck size={18} color="var(--primary)" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {docFile.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {(docFile.size / 1024).toFixed(0)} KB
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocFile(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                title="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Upload Progress Indicator */}
          {isUploadingDoc && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--primary)', fontWeight: 600 }}>
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="student-upload-progress-bar">
                <div className="student-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0' }}>
            — OR provide direct document file URL —
          </div>

          <Input
            label="Document URL / Cloud Storage Link"
            value={docFileUrl}
            onChange={(e) => setDocFileUrl(e.target.value)}
            placeholder="e.g. https://storage.googleapis.com/... or /uploads/my_file.pdf"
          />
        </form>
      </Modal>

      {/* --- Student University & Course Detail Modal --- */}
      <Modal
        isOpen={isUnivDetailsOpen}
        onClose={() => setIsUnivDetailsOpen(false)}
        title={`University Specifications: ${selectedUnivItem?.universityName}`}
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
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>{selectedUnivItem.universityName}</h4>
                <Badge variant="primary">{selectedUnivItem.country}</Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginTop: '10px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Location:</span>{' '}
                  <strong>{(selectedUnivItem.universityId as any)?.city || selectedUnivItem.country}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Ranking:</span>{' '}
                  <strong>#{(selectedUnivItem.universityId as any)?.ranking || 'Top 100'}</strong>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Program: {selectedUnivItem.courseTitle}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Intake:</span> <strong>{selectedUnivItem.intake}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Tuition Fee:</span> <strong>{selectedUnivItem.currency || '$'} {selectedUnivItem.annualFee?.toLocaleString() || 'N/A'} / Year</strong></div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* --- Student Upload Signed Offer Modal --- */}
      <Modal
        isOpen={isSignOfferOpen}
        onClose={() => setIsSignOfferOpen(false)}
        title="Upload Signed Acceptance Copy"
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
            placeholder="e.g. /uploads/receipt_proof.png"
            required
          />
        </form>
      </Modal>
    </div>
  );
};

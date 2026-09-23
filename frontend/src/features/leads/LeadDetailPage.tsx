import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
  PhoneCall,
  Edit3,
  Trash2,
  XCircle,
  RotateCcw,
  Video,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Lead,
  LeadSource,
  User as UserType,
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
import { Modal, Drawer, ConfirmDialog } from '../../components/Modal';
import { Input, Select, Textarea } from '../../components/Form';

type ActiveSection =
  | 'overview'
  | 'currentProcess'
  | 'documents'
  | 'counselling'
  | 'profile'
  | 'universities'
  | 'applications'
  | 'offers'
  | 'payments'
  | 'visa_travel';

const getCurrentProcessInfo = (stage?: StudentStage) => {
  switch (stage) {
    case StudentStage.LEAD_CAPTURED:
    case StudentStage.PRELIMINARY_COUNSELLING:
      return { name: 'Counselling', key: 'counselling' as const };
    case StudentStage.PROFILE_EVALUATION:
      return { name: 'Profile Evaluation', key: 'profile' as const };
    case StudentStage.UNIVERSITY_SHORTLISTING:
      return { name: 'University Shortlisting', key: 'universities' as const };
    case StudentStage.DOCUMENT_COLLECTION:
      return { name: 'Document Collection', key: 'documents' as const };
    case StudentStage.APPLICATION_SUBMISSION:
      return { name: 'Application Process', key: 'applications' as const };
    case StudentStage.OFFER_MANAGEMENT:
      return { name: 'Offer Letter', key: 'offers' as const };
    case StudentStage.FEE_PAYMENT:
      return { name: 'Fee Payments', key: 'payments' as const };
    case StudentStage.VISA_PROCESSING:
    case StudentStage.PRE_DEPARTURE:
    case StudentStage.DEPARTURE:
    case StudentStage.ARRIVAL_CONFIRMED:
      return { name: 'Visa Process', key: 'visa_travel' as const };
    default:
      return { name: 'Counselling', key: 'counselling' as const };
  }
};

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isStudentRoute = location.pathname.startsWith('/students');
  const { success, error } = useToast();
  const { user, isStaff, isAdmin } = useAuth();

  const [lead, setLead] = useState<Lead | null>(null);

  const getInitialSection = (): ActiveSection => {
    const params = new URLSearchParams(window.location.search);
    const secParam = params.get('section') as ActiveSection | null;
    const tabParam = params.get('tab');
    if (secParam && ['overview', 'currentProcess', 'documents', 'profile', 'universities', 'applications', 'offers', 'payments', 'visa_travel'].includes(secParam)) {
      return secParam;
    }
    if (tabParam === 'documents') return 'documents';
    if (tabParam === 'profile') return 'currentProcess';
    return 'overview';
  };

  const getInitialStage = (): StudentStage | undefined => {
    const params = new URLSearchParams(window.location.search);
    const stg = params.get('stage') as StudentStage | null;
    return stg || undefined;
  };

  const [activeSection, setActiveSection] = useState<ActiveSection>(getInitialSection);
  const [activeStage, setActiveStage] = useState<StudentStage | undefined>(getInitialStage);
  const [loading, setLoading] = useState(true);
  const [counsellors, setCounsellors] = useState<UserType[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Sync state if browser back/forward buttons are pressed
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const secParam = params.get('section') as ActiveSection | null;
      if (secParam && ['overview', 'currentProcess', 'documents', 'profile', 'universities', 'applications', 'offers', 'payments', 'visa_travel'].includes(secParam)) {
        setActiveSection(secParam);
      } else {
        setActiveSection('overview');
      }
      const stg = params.get('stage') as StudentStage | null;
      setActiveStage(stg || undefined);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSectionChange = (section: ActiveSection, stage?: StudentStage) => {
    setActiveSection(section);
    if (stage) setActiveStage(stage);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('section', section);
      if (stage) {
        url.searchParams.set('stage', stage);
      } else {
        url.searchParams.delete('stage');
      }
      window.history.pushState({ section, stage }, '', url.pathname + url.search);
    } catch (e) {
      // safe fallback
    }
  };

  const handleStageClick = (stage: StudentStage) => {
    setActiveStage(stage);
    if (stage === StudentStage.LEAD_CAPTURED) {
      handleSectionChange('overview');
    } else if (stage === StudentStage.DOCUMENT_COLLECTION) {
      handleSectionChange('documents');
    } else if (stage === lead?.stage) {
      handleSectionChange('currentProcess');
    } else {
      const stageInfo = getCurrentProcessInfo(stage);
      if (stageInfo.key === 'counselling') {
        handleSectionChange('currentProcess');
      } else if (stageInfo.key === 'documents') {
        handleSectionChange('documents');
      } else {
        handleSectionChange(stageInfo.key as ActiveSection);
      }
    }
  };

  // Lead Actions Modals & Forms
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState<{
    method: 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON';
    outcome: 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'SWITCHED_OFF' | 'CALLBACK_REQUESTED' | 'INVALID_NUMBER' | 'WRONG_NUMBER';
    notes: string;
    callbackDate: string;
    callbackTime: string;
  }>({
    method: 'PHONE',
    outcome: 'CONNECTED',
    notes: '',
    callbackDate: '',
    callbackTime: '',
  });

  const [isCounsellingModalOpen, setIsCounsellingModalOpen] = useState(false);
  const [counsellingForm, setCounsellingForm] = useState({
    scheduledDate: '',
    scheduledTime: '11:00',
    googleMeetLink: '',
    notes: '',
    counsellorId: '',
  });

  const [isClosedLostModalOpen, setIsClosedLostModalOpen] = useState(false);
  const [closedLostReason, setClosedLostReason] = useState('Budget Constraints / Financial Limitations');

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    targetCountry: '',
    targetCourse: '',
    targetIntake: 'Fall 2026',
    budget: '',
    source: LeadSource.WEBSITE,
    counsellorId: '',
    notes: '',
  });

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
    tuitionFee: 0,
    depositAmount: 0,
    currency: 'USD',
    conditions: '',
    originalOfferUrl: '',
    originalOfferFileName: '',
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    title: '',
    purpose: 'TUITION_DEPOSIT' as const,
    amount: 0,
    currency: 'USD',
    bankDetails: '',
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
    if (!id) return;
    try {
      const payload = profile || {
        highestQualification: '',
        institution: '',
        percentageGpa: '',
        yearOfPassing: new Date().getFullYear(),
        backlogsCount: 0,
        workExperienceMonths: 0,
        preferredCountries: [lead?.targetCountry || ''],
        preferredCourses: [lead?.targetCourse || ''],
        budget: lead?.budget || '',
        gapYears: 0,
        isComplete: false,
        missingFields: [],
      };
      const res = await apiClient.put<ProfileEvaluation>(`/profile-evaluations/${id}`, payload);
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

  useEffect(() => {
    apiClient.get<UserType[]>('/users/counsellors').then((res) => setCounsellors(res.data)).catch(() => {});
  }, []);

  // Action Handlers
  const handleRecordContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/leads/${lead._id}/contact-attempts`, contactForm);
      success('Contact attempt recorded.');
      setIsContactModalOpen(false);
      setContactForm({
        method: 'PHONE',
        outcome: 'CONNECTED',
        notes: '',
        callbackDate: '',
        callbackTime: '',
      });
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to record contact attempt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleCounselling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/leads/${lead._id}/counselling`, counsellingForm);
      success('Preliminary counselling scheduled.');
      setIsCounsellingModalOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to schedule counselling');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToStudent = async () => {
    if (!lead) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/leads/${lead._id}/convert-interested`);
      success(`Converted ${lead.name} to Student! Student Portal account provisioned.`);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Conversion failed. Please ensure counselling session took place.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkClosedLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/leads/${lead._id}/closed-lost`, { reason: closedLostReason });
      success('Lead marked as Closed Lost.');
      setIsClosedLostModalOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to mark lead as closed lost');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!lead) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/leads/${lead._id}/reopen`);
      success('Closed Lost lead reopened successfully.');
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to reopen lead');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setActionLoading(true);
    try {
      await apiClient.put(`/leads/${lead._id}`, editForm);
      success('Lead information updated successfully.');
      setIsEditModalOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to update lead');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!lead) return;
    setActionLoading(true);
    try {
      await apiClient.delete(`/leads/${lead._id}`);
      success('Lead permanently deleted.');
      setIsDeleteConfirmOpen(false);
      navigate('/leads');
    } catch (err: any) {
      error(err.message || 'Failed to delete lead');
    } finally {
      setActionLoading(false);
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

  const currentProcessInfo = getCurrentProcessInfo(lead.stage);
  const isOverview = activeSection === 'overview';
  const isDocuments = activeSection === 'documents';
  const isCurrentProcess = activeSection === 'currentProcess' || activeSection === currentProcessInfo.key;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Back button & Student Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(isStudentRoute ? '/students' : '/leads')}
          >
            Back to {isStudentRoute ? 'Students' : 'Leads'}
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{lead.name}</h1>
              <StatusBadge status={lead.status} />
              <Badge variant="primary">{lead.stage.replace(/_/g, ' ')}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', flexWrap: 'wrap' }}>
              <span><Mail size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{lead.email}</span>
              <span><Phone size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{lead.phone}</span>
              <span><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{lead.city || 'India'}</span>
              <span><strong>Source:</strong> <Badge variant="neutral">{lead.source ? String(lead.source).replace(/_/g, ' ') : 'Website'}</Badge></span>
            </div>
          </div>
        </div>

        {/* Organized Lead Actions Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<PhoneCall size={14} />}
            onClick={() => setIsContactModalOpen(true)}
          >
            Call / Contact
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Calendar size={14} />}
            onClick={() => {
              setCounsellingForm({
                scheduledDate: new Date().toISOString().split('T')[0],
                scheduledTime: '11:00',
                googleMeetLink: '',
                notes: '',
                counsellorId: lead.counsellorId?._id || user?._id || '',
              });
              setIsCounsellingModalOpen(true);
            }}
          >
            Schedule Counselling
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Edit3 size={14} />}
            onClick={() => {
              setEditForm({
                name: lead.name || '',
                email: lead.email || '',
                phone: lead.phone || '',
                city: lead.city || '',
                targetCountry: lead.targetCountry || '',
                targetCourse: lead.targetCourse || '',
                targetIntake: lead.targetIntake || 'Fall 2026',
                budget: lead.budget || '',
                source: (lead.source as any) || LeadSource.WEBSITE,
                counsellorId: lead.counsellorId?._id || '',
                notes: lead.notes || '',
              });
              setIsEditModalOpen(true);
            }}
          >
            Edit Lead
          </Button>

          {lead.status !== LeadStatus.INTERESTED && lead.status !== LeadStatus.CLOSED_LOST && (
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle2 size={14} />}
              onClick={handleConvertToStudent}
              loading={actionLoading}
            >
              Convert to Student
            </Button>
          )}

          {lead.status !== LeadStatus.CLOSED_LOST ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<XCircle size={14} color="var(--danger)" />}
              onClick={() => setIsClosedLostModalOpen(true)}
            >
              Mark Closed Lost
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={14} color="var(--primary)" />}
              onClick={handleReopen}
              loading={actionLoading}
            >
              Reopen Lead
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              Delete Lead
            </Button>
          )}
        </div>
      </div>

      {/* 12-Stage Student Journey Stepper */}
      <StageStepper
        currentStage={lead.stage}
        activeStage={activeStage}
        onStageClick={handleStageClick}
      />

      {/* Navigation Tabs Header: Overview | [Current Process] | Documents */}
      <div className="tabs-header" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={isOverview}
          className={`tab-btn ${isOverview ? 'active' : ''}`}
          onClick={() => handleSectionChange('overview')}
        >
          Overview
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isCurrentProcess}
          className={`tab-btn ${isCurrentProcess ? 'active' : ''}`}
          onClick={() => handleSectionChange('currentProcess')}
        >
          {currentProcessInfo.name}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isDocuments}
          className={`tab-btn ${isDocuments ? 'active' : ''}`}
          onClick={() => handleSectionChange('documents')}
        >
          Documents
        </button>
      </div>

      {/* --- NAVIGATION CONTENT --- */}

      {/* 1. Overview Section */}
      {isOverview && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Lead Details & Preferences</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ID: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>{lead._id}</span>
              </span>
            </div>

            <div className="lead-details-grid">
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Student Name
                </span>
                <strong style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>
                  {lead.name || 'Not provided'}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Email ID
                </span>
                <div style={{ marginTop: '3px' }}>
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {lead.email}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Not provided</span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Phone Number
                </span>
                <div style={{ marginTop: '3px' }}>
                  {lead.phone ? (
                    <a href={`tel:${lead.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {lead.phone}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Not provided</span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Target Country
                </span>
                <strong style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>
                  {lead.targetCountry || 'Not provided'}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Target Course / Program
                </span>
                <strong style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>
                  {lead.targetCourse || 'Not provided'}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Status
                </span>
                <div style={{ marginTop: '3px' }}>
                  <StatusBadge status={lead.status} />
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Current Stage / Process
                </span>
                <div style={{ marginTop: '3px' }}>
                  <Badge variant="primary">{lead.stage ? lead.stage.replace(/_/g, ' ') : 'Not provided'}</Badge>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Intake
                </span>
                <strong style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>
                  {lead.targetIntake || 'Not provided'}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Budget
                </span>
                <strong style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>
                  {lead.budget || 'Not provided'}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Acquisition Source
                </span>
                <div style={{ marginTop: '3px' }}>
                  <Badge variant="neutral">{lead.source ? String(lead.source).replace(/_/g, ' ') : 'Not provided'}</Badge>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Assigned Counsellor
                </span>
                <strong style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>
                  {lead.counsellorId?.name ? (
                    lead.counsellorId.name
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                  )}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Lead ID
                </span>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', wordBreak: 'break-all' }}>
                  {lead._id}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  City / Location
                </span>
                <strong style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>
                  {[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || 'Not provided'}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Passport Number
                </span>
                <strong style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>
                  {lead.passportNumber || 'Not provided'}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Lead Captured Date
                </span>
                <strong style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>
                  {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not provided'}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Last Contacted
                </span>
                <strong style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>
                  {lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleString() : 'Not contacted yet'}
                </strong>
              </div>

              {lead.status === LeadStatus.CLOSED_LOST && lead.closedLostReason && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--danger)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Closed Lost Reason
                  </span>
                  <div style={{ marginTop: '3px' }}>
                    <Badge variant="danger">{lead.closedLostReason}</Badge>
                  </div>
                </div>
              )}
            </div>

            {lead.notes && (
              <div style={{ marginTop: '18px', padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>INITIAL INQUIRY NOTES:</span>
                <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{lead.notes}</p>
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

          {/* Student Profile Summary Card */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">Student Profile Summary</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Academic background, eligibility criteria, and assessment summary
                </p>
              </div>
              {profile?.isComplete ? (
                <Badge variant="success">✓ Profile Evaluation Completed</Badge>
              ) : (
                <Badge variant="warning">
                  Evaluation Pending {profile?.missingFields && profile.missingFields.length > 0 ? `(${profile.missingFields.length} missing)` : ''}
                </Badge>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '13px', marginTop: '12px' }}>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Highest Qualification</span>
                <strong style={{ marginTop: '2px', display: 'block' }}>{profile?.highestQualification || 'Not evaluated yet'}</strong>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Institution / University</span>
                <strong style={{ marginTop: '2px', display: 'block' }}>{profile?.institution || 'Not specified'}</strong>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Percentage / GPA</span>
                <strong style={{ marginTop: '2px', display: 'block' }}>{profile?.percentageGpa || 'N/A'}</strong>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>English Test Score</span>
                <strong style={{ marginTop: '2px', display: 'block' }}>
                  {profile?.testScore?.testType && profile.testScore.testType !== 'NONE'
                    ? `${profile.testScore.testType}: ${profile.testScore.overall || 'Pending'}`
                    : 'Waiver / None'}
                </strong>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>GRE / GMAT</span>
                <strong style={{ marginTop: '2px', display: 'block' }}>{profile?.greGmatScore || 'N/A'}</strong>
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Active Documents</span>
                <strong style={{ marginTop: '2px', display: 'block' }}>{documents.length} document{documents.length === 1 ? '' : 's'} ({documents.filter(d => d.status === DocumentStatus.APPROVED).length} approved)</strong>
              </div>
            </div>

            {profile?.counsellorRemarks && (
              <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#F0FDF4', borderRadius: 'var(--radius-sm)', border: '1px solid #BBF7D0', fontSize: '12px' }}>
                <strong style={{ color: '#166534' }}>Counsellor Remarks: </strong>
                <span style={{ color: '#14532D' }}>{profile.counsellorRemarks}</span>
              </div>
            )}
          </div>

          {/* Card 4: Student Communications & Private Notes */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>Student Communications & Private Notes</h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '280px',
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

          {/* Card 5: Student Journey Activity Timeline */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>Student Journey Activity Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
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
        </div>
      )}

      {/* 2. Current Process: Counselling */}
      {((isCurrentProcess && currentProcessInfo.key === 'counselling') || activeSection === 'counselling') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
          {/* Preliminary Counselling Details Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 className="card-title">Preliminary Counselling Details</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Initial consultation, student preferences, and assigned counsellor
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<Calendar size={14} />}
                onClick={() => {
                  setCounsellingForm({
                    scheduledDate: new Date().toISOString().split('T')[0],
                    scheduledTime: '11:00',
                    googleMeetLink: '',
                    notes: '',
                    counsellorId: lead.counsellorId?._id || user?._id || '',
                  });
                  setIsCounsellingModalOpen(true);
                }}
              >
                Schedule Counselling
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Current Stage</span>
                <div style={{ marginTop: '4px' }}>
                  <Badge variant="primary">{lead.stage.replace(/_/g, ' ')}</Badge>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Lead Status</span>
                <div style={{ marginTop: '4px' }}><StatusBadge status={lead.status} /></div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Counsellor</span>
                <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} color="var(--primary)" />
                  <strong>{lead.counsellorId?.name || 'Unassigned'}</strong>
                </div>
                {lead.counsellorId?.email && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{lead.counsellorId.email}</div>
                )}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Acquisition Source</span>
                <div style={{ marginTop: '4px' }}>
                  <Badge variant="neutral">{lead.source ? String(lead.source).replace(/_/g, ' ') : 'Website'}</Badge>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Target Country</span>
                <strong style={{ marginTop: '4px', display: 'block' }}>{lead.targetCountry || 'Not provided'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Target Course</span>
                <strong style={{ marginTop: '4px', display: 'block' }}>{lead.targetCourse || 'Not provided'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Target Intake</span>
                <strong style={{ marginTop: '4px', display: 'block' }}>{lead.targetIntake || 'Not provided'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Estimated Budget</span>
                <strong style={{ marginTop: '4px', display: 'block' }}>{lead.budget || 'Not provided'}</strong>
              </div>
            </div>

            {lead.notes && (
              <div style={{ marginTop: '18px', padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Initial Student Inquiry / Notes:</span>
                <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Counselling Sessions History & Google Meet Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 className="card-title">Counselling Sessions & Schedule</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Scheduled consultations, Google Meet links, and discussion notes
                </p>
              </div>
              <Badge variant="primary">
                {((lead as any).counsellingSessions || []).length} Session{((lead as any).counsellingSessions || []).length === 1 ? '' : 's'}
              </Badge>
            </div>

            {((lead as any).counsellingSessions || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                <Calendar size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No Counselling Sessions Scheduled</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto 16px' }}>
                  Click below to book a preliminary counselling session with this student and generate a Google Meet video link.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Calendar size={14} />}
                  onClick={() => {
                    setCounsellingForm({
                      scheduledDate: new Date().toISOString().split('T')[0],
                      scheduledTime: '11:00',
                      googleMeetLink: '',
                      notes: '',
                      counsellorId: lead.counsellorId?._id || user?._id || '',
                    });
                    setIsCounsellingModalOpen(true);
                  }}
                >
                  Schedule First Session
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {((lead as any).counsellingSessions || []).map((sess: any) => (
                  <div
                    key={sess._id}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={14} color="var(--primary)" />
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>
                          {sess.scheduledDate} at {sess.scheduledTime}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Badge variant={sess.status === 'COMPLETED' ? 'success' : sess.status === 'CANCELLED' ? 'danger' : 'primary'}>
                          {sess.status}
                        </Badge>
                        <Badge variant={sess.attendance === 'ATTENDED' ? 'success' : sess.attendance === 'ABSENT' ? 'danger' : 'neutral'}>
                          {sess.attendance}
                        </Badge>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>Counsellor: <strong>{sess.counsellorName || lead.counsellorId?.name || 'Assigned Counsellor'}</strong></span>
                      {sess.googleMeetLink && (
                        <a
                          href={sess.googleMeetLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--primary)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            textDecoration: 'none',
                          }}
                        >
                          <Video size={13} /> Join Google Meet <ExternalLink size={11} />
                        </a>
                      )}
                    </div>

                    {sess.discussionSummary && (
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', backgroundColor: '#FFFFFF', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                        <span style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-secondary)' }}>Discussion Summary: </span>
                        {sess.discussionSummary}
                      </div>
                    )}

                    {sess.nextSteps && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <strong>Next Steps:</strong> {sess.nextSteps}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Evaluation */}
      {((isCurrentProcess && currentProcessInfo.key === 'profile') || activeSection === 'profile') && (
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
              <Badge variant="warning">
                Evaluation Pending {profile?.missingFields && profile.missingFields.length > 0 ? `(${profile.missingFields.length} missing)` : ''}
              </Badge>
            )}
          </div>

          {!profile?.isComplete && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#92400E',
              }}
            >
              <Clock size={16} color="#D97706" style={{ flexShrink: 0 }} />
              <div>
                <strong>Status: Profile Evaluation Pending.</strong>{' '}
                {profile?.missingFields && profile.missingFields.length > 0
                  ? `Missing mandatory fields: ${profile.missingFields.join(', ')}. Fill in all required academic details below and click "Save Profile Evaluation".`
                  : 'Preliminary profile assessment is pending completion. Complete and save the details below.'}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input
                label="Highest Qualification *"
                value={profile?.highestQualification || ''}
                onChange={(e) => setProfile((prev) => ({ ...(prev || {}), highestQualification: e.target.value } as ProfileEvaluation))}
                placeholder="e.g. B.Tech Computer Science"
                required
              />
              <Input
                label="Institution / University *"
                value={profile?.institution || ''}
                onChange={(e) => setProfile((prev) => ({ ...(prev || {}), institution: e.target.value } as ProfileEvaluation))}
                placeholder="e.g. Delhi University"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <Input
                label="Percentage / GPA *"
                value={profile?.percentageGpa || ''}
                onChange={(e) => setProfile((prev) => ({ ...(prev || {}), percentageGpa: e.target.value } as ProfileEvaluation))}
                placeholder="e.g. 78% or 3.6 GPA"
                required
              />
              <Input
                label="Year of Passing *"
                type="number"
                value={profile?.yearOfPassing || ''}
                onChange={(e) => setProfile((prev) => ({ ...(prev || {}), yearOfPassing: parseInt(e.target.value, 10) } as ProfileEvaluation))}
                placeholder="e.g. 2025"
                required
              />
              <Input
                label="Backlogs Count"
                type="number"
                value={profile?.backlogsCount || 0}
                onChange={(e) => setProfile((prev) => ({ ...(prev || {}), backlogsCount: parseInt(e.target.value, 10) } as ProfileEvaluation))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <Select
                label="English Test Type"
                value={profile?.testScore?.testType || 'NONE'}
                onChange={(e) => setProfile((prev) => ({ ...(prev || {}), testScore: { ...(prev?.testScore as any), testType: e.target.value as any } } as ProfileEvaluation))}
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
                onChange={(e) => setProfile((prev) => ({ ...(prev || {}), testScore: { ...(prev?.testScore as any), overall: parseFloat(e.target.value) } } as ProfileEvaluation))}
                placeholder="e.g. 7.5"
              />
              <Input
                label="GRE / GMAT Score (if any)"
                value={profile?.greGmatScore || ''}
                onChange={(e) => setProfile((prev) => ({ ...(prev || {}), greGmatScore: e.target.value } as ProfileEvaluation))}
                placeholder="e.g. 320"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input
                label="Preferred Country *"
                value={profile?.preferredCountries?.[0] || ''}
                onChange={(e) => setProfile((prev) => ({ ...(prev || {}), preferredCountries: [e.target.value] } as ProfileEvaluation))}
                placeholder="e.g. United Kingdom"
                required
              />
              <Input
                label="Estimated Budget *"
                value={profile?.budget || ''}
                onChange={(e) => setProfile((prev) => ({ ...(prev || {}), budget: e.target.value } as ProfileEvaluation))}
                placeholder="e.g. £30,000 / Year"
                required
              />
            </div>

            <Textarea
              label="Counsellor Evaluation Remarks"
              value={profile?.counsellorRemarks || ''}
              onChange={(e) => setProfile((prev) => ({ ...(prev || {}), counsellorRemarks: e.target.value } as ProfileEvaluation))}
              placeholder="Detailed profile assessment and eligible tier 1/tier 2 university recommendations..."
            />

            <Button type="submit" variant="primary" style={{ alignSelf: 'flex-start' }}>
              Save Profile Evaluation
            </Button>
          </form>
        </div>
      )}

      {/* Curated University Shortlist */}
      {((isCurrentProcess && currentProcessInfo.key === 'universities') || activeSection === 'universities') && (
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

      {/* 3. Documents Section */}
      {(isDocuments || (isCurrentProcess && (currentProcessInfo.key as string) === 'documents')) && (
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

      {/* University Applications */}
      {((isCurrentProcess && currentProcessInfo.key === 'applications') || activeSection === 'applications') && (
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

      {/* Official Offer Letters */}
      {((isCurrentProcess && currentProcessInfo.key === 'offers') || activeSection === 'offers') && (
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

      {/* Tuition & Fee Payments */}
      {((isCurrentProcess && currentProcessInfo.key === 'payments') || activeSection === 'payments') && (
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

      {/* Visa & Pre-Departure */}
      {((isCurrentProcess && currentProcessInfo.key === 'visa_travel') || activeSection === 'visa_travel') && (
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

      {/* --- Record Contact Attempt Modal --- */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={`Record Contact Attempt: ${lead?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsContactModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRecordContact} loading={actionLoading}>
              Save Attempt (Immutable)
            </Button>
          </>
        }
      >
        <form onSubmit={handleRecordContact}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Contact Method"
              value={contactForm.method}
              onChange={(e) => setContactForm({ ...contactForm, method: e.target.value as any })}
              options={[
                { value: 'PHONE', label: 'Phone Call' },
                { value: 'WHATSAPP', label: 'WhatsApp' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'IN_PERSON', label: 'In-Person Branch Meeting' },
              ]}
            />
            <Select
              label="Call / Meeting Outcome"
              value={contactForm.outcome}
              onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value as any })}
              options={[
                { value: 'CONNECTED', label: 'Connected / Spoke with Student' },
                { value: 'CALLBACK_REQUESTED', label: 'Call Back Requested (Auto Task)' },
                { value: 'NO_ANSWER', label: 'No Answer / Ringing' },
                { value: 'BUSY', label: 'Line Busy' },
                { value: 'SWITCHED_OFF', label: 'Switched Off' },
                { value: 'INVALID_NUMBER', label: 'Invalid / Disconnected Number' },
              ]}
            />
          </div>

          {contactForm.outcome === 'CALLBACK_REQUESTED' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <Input
                label="Callback Date *"
                type="date"
                value={contactForm.callbackDate}
                onChange={(e) => setContactForm({ ...contactForm, callbackDate: e.target.value })}
                required
              />
              <Input
                label="Callback Time"
                type="time"
                value={contactForm.callbackTime}
                onChange={(e) => setContactForm({ ...contactForm, callbackTime: e.target.value })}
              />
            </div>
          )}

          <Textarea
            label="Call Notes & Discussion Details"
            value={contactForm.notes}
            onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
            placeholder="Summary of student response..."
          />
        </form>
      </Modal>

      {/* --- Schedule Counselling Modal --- */}
      <Modal
        isOpen={isCounsellingModalOpen}
        onClose={() => setIsCounsellingModalOpen(false)}
        title={`Schedule Preliminary Counselling: ${lead?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCounsellingModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleScheduleCounselling} loading={actionLoading}>
              Schedule Session
            </Button>
          </>
        }
      >
        <form onSubmit={handleScheduleCounselling}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Session Date *"
              type="date"
              value={counsellingForm.scheduledDate}
              onChange={(e) => setCounsellingForm({ ...counsellingForm, scheduledDate: e.target.value })}
              required
            />
            <Input
              label="Session Time *"
              type="time"
              value={counsellingForm.scheduledTime}
              onChange={(e) => setCounsellingForm({ ...counsellingForm, scheduledTime: e.target.value })}
              required
            />
          </div>

          <Input
            label="Google Meet / Video Conference Link"
            value={counsellingForm.googleMeetLink}
            onChange={(e) => setCounsellingForm({ ...counsellingForm, googleMeetLink: e.target.value })}
            placeholder="https://meet.google.com/..."
          />

          <Select
            label="Assigned Counsellor"
            value={counsellingForm.counsellorId}
            onChange={(e) => setCounsellingForm({ ...counsellingForm, counsellorId: e.target.value })}
            options={counsellors.map((c) => ({ value: c._id, label: c.name }))}
          />

          <Textarea
            label="Agenda / Notes"
            value={counsellingForm.notes}
            onChange={(e) => setCounsellingForm({ ...counsellingForm, notes: e.target.value })}
            placeholder="Topics to cover during the 1-on-1 preliminary session..."
          />
        </form>
      </Modal>

      {/* --- Edit Lead Modal --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Lead: ${lead?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditLead} loading={actionLoading}>
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditLead} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Student Name *"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            <Input
              label="Email Address *"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Phone Number *"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              required
            />
            <Input
              label="City"
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Target Country"
              value={editForm.targetCountry}
              onChange={(e) => setEditForm({ ...editForm, targetCountry: e.target.value })}
              placeholder="e.g. United Kingdom"
            />
            <Input
              label="Target Course"
              value={editForm.targetCourse}
              onChange={(e) => setEditForm({ ...editForm, targetCourse: e.target.value })}
              placeholder="e.g. MSc Data Science"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Target Intake"
              value={editForm.targetIntake}
              onChange={(e) => setEditForm({ ...editForm, targetIntake: e.target.value })}
              placeholder="e.g. Fall 2026"
            />
            <Input
              label="Estimated Budget"
              value={editForm.budget}
              onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
              placeholder="e.g. £30,000 / $40,000"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Lead Source *"
              value={editForm.source}
              onChange={(e) => setEditForm({ ...editForm, source: e.target.value as LeadSource })}
              options={Object.values(LeadSource).map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
            />
            <Select
              label="Assign Counsellor"
              value={editForm.counsellorId}
              onChange={(e) => setEditForm({ ...editForm, counsellorId: e.target.value })}
              options={[
                { value: '', label: 'Unassigned' },
                ...counsellors.map((c) => ({ value: c._id, label: c.name })),
              ]}
            />
          </div>

          <Textarea
            label="Internal Notes"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            placeholder="Preliminary notes from initial inquiry..."
          />
        </form>
      </Modal>

      {/* --- Closed Lost Modal --- */}
      <Modal
        isOpen={isClosedLostModalOpen}
        onClose={() => setIsClosedLostModalOpen(false)}
        title={`Mark Closed Lost: ${lead?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsClosedLostModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleMarkClosedLost} loading={actionLoading}>
              Mark Closed Lost
            </Button>
          </>
        }
      >
        <form onSubmit={handleMarkClosedLost}>
          <Select
            label="Reason for Closed Lost *"
            value={closedLostReason}
            onChange={(e) => setClosedLostReason(e.target.value)}
            options={[
              { value: 'Budget Constraints / Financial Limitations', label: 'Budget Constraints / Financial Limitations' },
              { value: 'Chose Competitor Agency', label: 'Chose Competitor Agency' },
              { value: 'Postponed / Decided Not to Study Abroad', label: 'Postponed / Decided Not to Study Abroad' },
              { value: 'Visa Ineligible / Low Test Scores', label: 'Visa Ineligible / Low Test Scores' },
              { value: 'Unresponsive After Multiple Follow-ups', label: 'Unresponsive After Multiple Follow-ups' },
              { value: 'Personal / Family Emergency', label: 'Personal / Family Emergency' },
            ]}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Note: You can reopen this record at any time to restore the previous stage and status.
          </div>
        </form>
      </Modal>

      {/* --- Delete Confirmation Dialog --- */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteLead}
        title="Permanently Delete Lead"
        message={`Are you sure you want to permanently delete ${lead?.name}? This action is irreversible and recorded in the audit log.`}
        isDanger
        confirmText="Delete Permanently"
        loading={actionLoading}
      />
    </div>
  );
};

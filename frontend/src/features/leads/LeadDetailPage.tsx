import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Eye,
  FileCheck,
  AlertCircle,
  X,
  MoreVertical,
  EyeOff,
  Globe,
  GraduationCap,
  DollarSign,
} from 'lucide-react';
import { applicationService } from '../applications/services/applicationService';
import { offerService } from '../offers/services/offerService';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  AdminType,
  Lead,
  LeadSource,
  User as UserType,
  StudentStage,
  LeadStatus,
  ProfileEvaluation,
  Shortlist,
  University,
  Course,
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
  // Owner Admin does not message students directly (notes and call logs only).
  const isOwnerAdmin =
    user?.role === UserRole.ADMIN && (user?.adminType === AdminType.OWNER_ADMIN || !user?.adminType);

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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

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

  // Overview "Activity" hub: one composer (message / internal note / call) + one merged feed
  const [composerMode, setComposerMode] = useState<'message' | 'note' | 'call'>(isOwnerAdmin ? 'note' : 'message');
  const [activityFilter, setActivityFilter] = useState<'all' | 'call' | 'message' | 'note' | 'update'>('all');

  // University shortlist curation: counsellor picks which universities/courses the student sees.
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);
  const [shortlistUniversities, setShortlistUniversities] = useState<University[]>([]);
  const [shortlistCourses, setShortlistCourses] = useState<Course[]>([]);
  const [shortlistForm, setShortlistForm] = useState({
    universityId: '',
    courseId: '',
    intake: '',
    notes: '',
    isVisibleToStudent: true,
  });
  const [shortlistSaving, setShortlistSaving] = useState(false);
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<'ACADEMIC' | 'IDENTITY' | 'FINANCIAL' | 'LANGUAGE_TEST' | 'EXPERIENCE' | 'OTHER'>('ACADEMIC');
  const [docMandatory, setDocMandatory] = useState(true);

  const [isReviewDocOpen, setIsReviewDocOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docReviewStatus, setDocReviewStatus] = useState<DocumentStatus.APPROVED | DocumentStatus.REJECTED>(DocumentStatus.APPROVED);
  const [docRejectionReason, setDocRejectionReason] = useState('');

  // Application modals state
  const [isCreateAppModalOpen, setIsCreateAppModalOpen] = useState(false);
  const [appForm, setAppForm] = useState({
    universityId: '',
    universityName: '',
    courseId: '',
    courseTitle: '',
    country: '',
    intake: '',
    applicationNumber: '',
    portalUsername: '',
    portalPassword: '',
    notes: '',
  });

  const [isRejectAppModalOpen, setIsRejectAppModalOpen] = useState(false);
  const [selectedAppForReject, setSelectedAppForReject] = useState<Application | null>(null);
  const [appRejectionReason, setAppRejectionReason] = useState('');
  const [appDecisionDate, setAppDecisionDate] = useState(new Date().toISOString().split('T')[0]);

  const [selectedAppForDetails, setSelectedAppForDetails] = useState<Application | null>(null);
  const [isAppDetailsDrawerOpen, setIsAppDetailsDrawerOpen] = useState(false);
  const [showAppPortalPassword, setShowAppPortalPassword] = useState(false);

  // Offer modals state
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerFile, setOfferFile] = useState<File | null>(null);
  const [offerForm, setOfferForm] = useState({
    applicationId: '',
    offerType: 'CONDITIONAL' as const,
    tuitionFee: 15000,
    depositAmount: 3000,
    currency: 'USD',
    conditions: '',
    deadlineDate: '',
    originalOfferUrl: '',
    originalOfferFileName: '',
  });

  const [isRejectSignedOfferModalOpen, setIsRejectSignedOfferModalOpen] = useState(false);
  const [selectedOfferForReject, setSelectedOfferForReject] = useState<Offer | null>(null);
  const [signedOfferRejectNotes, setSignedOfferRejectNotes] = useState('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    title: '',
    purpose: 'TUITION_DEPOSIT' as 'TUITION_DEPOSIT' | 'APPLICATION_FEE' | 'VISA_FEE' | 'INSURANCE' | 'OTHER',
    amount: 0,
    currency: 'INR',
    bankDetails: '',
  });

  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(isOwnerAdmin);

  // Full-page loader only on the first load of a record; refreshes after an action update in place.
  const loadedLeadIdRef = useRef<string | null>(null);

  const fetchLeadDetails = useCallback(async () => {
    if (!id) return;
    const isFirstLoad = loadedLeadIdRef.current !== id;
    if (isFirstLoad) setLoading(true);
    try {
      // The lead and all tab data are requested together (one round trip instead of two).
      const [res, profRes, shortRes, docRes, appRes, offRes, payRes, visRes, travRes, msgRes, actRes] = await Promise.all([
        apiClient.get<Lead>(`/leads/${id}`),
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

      setLead(res.data);
      loadedLeadIdRef.current = id;
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
      if (isFirstLoad) setLoading(false);
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

  // Open Create Application Modal
  const handleOpenCreateAppModal = () => {
    const selectedShortlist = shortlist.find((s) => s.status === 'SELECTED_BY_STUDENT') || shortlist[0];
    if (selectedShortlist) {
      setAppForm({
        universityId: selectedShortlist.universityId,
        universityName: selectedShortlist.universityName,
        courseId: selectedShortlist.courseId,
        courseTitle: selectedShortlist.courseTitle,
        country: selectedShortlist.country,
        intake: selectedShortlist.intake,
        applicationNumber: `APP-${Date.now().toString().slice(-6)}`,
        portalUsername: '',
        portalPassword: '',
        notes: '',
      });
    } else {
      setAppForm({
        universityId: '',
        universityName: lead?.targetCountry ? `University in ${lead.targetCountry}` : '',
        courseId: '',
        courseTitle: lead?.targetCourse || '',
        country: lead?.targetCountry || 'International',
        intake: lead?.targetIntake || 'Fall 2026',
        applicationNumber: `APP-${Date.now().toString().slice(-6)}`,
        portalUsername: '',
        portalPassword: '',
        notes: '',
      });
    }
    setIsCreateAppModalOpen(true);
  };

  // Submit Application
  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!appForm.universityName.trim() || !appForm.courseTitle.trim()) {
      error('University name and course title are required.');
      return;
    }

    try {
      await applicationService.createApplication(id, {
        universityId: appForm.universityId || '000000000000000000000000',
        universityName: appForm.universityName.trim(),
        courseId: appForm.courseId || '000000000000000000000000',
        courseTitle: appForm.courseTitle.trim(),
        country: appForm.country.trim() || lead?.targetCountry || 'International',
        intake: appForm.intake.trim() || 'Fall 2026',
        applicationNumber: appForm.applicationNumber.trim() || undefined,
        portalUsername: appForm.portalUsername.trim() || undefined,
        portalPassword: appForm.portalPassword.trim() || undefined,
        notes: appForm.notes.trim() || undefined,
      });
      success('Application submitted successfully! Application stage updated.');
      setIsCreateAppModalOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to submit application');
    }
  };

  // Application status transitions
  const handleUpdateAppStatus = async (appId: string, status: ApplicationStatus) => {
    try {
      await applicationService.updateApplicationStatus(appId, {
        status,
        decisionDate: status === ApplicationStatus.OFFER_RECEIVED ? new Date() : undefined,
      });
      success(`Application marked as ${status.replace(/_/g, ' ')}.`);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to update application');
    }
  };

  // Open Reject App Modal
  const handleOpenRejectAppModal = (app: Application) => {
    setSelectedAppForReject(app);
    setAppRejectionReason('');
    setAppDecisionDate(new Date().toISOString().split('T')[0]);
    setIsRejectAppModalOpen(true);
  };

  // Confirm Reject Application
  const handleConfirmRejectApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForReject) return;
    if (!appRejectionReason.trim()) {
      error('A rejection reason is mandatory when marking application as rejected.');
      return;
    }

    try {
      await applicationService.updateApplicationStatus(selectedAppForReject._id, {
        status: ApplicationStatus.REJECTED,
        rejectionReason: appRejectionReason.trim(),
        decisionDate: appDecisionDate ? new Date(appDecisionDate) : new Date(),
      });
      success('Application marked as Rejected. Rejection reason recorded.');
      setIsRejectAppModalOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to reject application');
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
      let payloadOrFormData: any;
      if (offerFile) {
        const fd = new FormData();
        fd.append('file', offerFile);
        fd.append('applicationId', offerForm.applicationId);
        fd.append('offerType', offerForm.offerType);
        fd.append('tuitionFee', String(offerForm.tuitionFee));
        fd.append('depositAmount', String(offerForm.depositAmount));
        fd.append('currency', offerForm.currency);
        if (offerForm.conditions) fd.append('conditions', offerForm.conditions);
        if (offerForm.deadlineDate) fd.append('deadlineDate', offerForm.deadlineDate);
        payloadOrFormData = fd;
      } else {
        payloadOrFormData = {
          ...offerForm,
          originalOfferUrl: offerForm.originalOfferUrl || '/uploads/offer_letter.pdf',
          originalOfferFileName: offerForm.originalOfferFileName || 'offer_letter.pdf',
        };
      }

      await offerService.uploadOriginalOffer(id, payloadOrFormData);
      success('Offer letter uploaded & issued to student. Offer Management stage unlocked.');
      setIsOfferModalOpen(false);
      setOfferFile(null);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to upload offer');
    }
  };

  // Accept signed offer
  const handleAcceptSignedOffer = async (offerId: string) => {
    try {
      await offerService.reviewSignedOffer(offerId, {
        status: OfferStatus.ACCEPTED,
        notes: 'Signed offer accepted by counsellor. Fee Payment stage unlocked.',
      });
      success('Signed offer accepted! Fee Payment stage is now unlocked.');
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to review offer');
    }
  };

  // Open Reject Signed Offer Modal
  const handleOpenRejectSignedOfferModal = (offer: Offer) => {
    setSelectedOfferForReject(offer);
    setSignedOfferRejectNotes('');
    setIsRejectSignedOfferModalOpen(true);
  };

  // Confirm Reject Signed Offer
  const handleConfirmRejectSignedOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferForReject) return;
    if (!signedOfferRejectNotes.trim()) {
      error('A reason/note is mandatory when rejecting a signed offer.');
      return;
    }
    try {
      await offerService.reviewSignedOffer(selectedOfferForReject._id, {
        status: OfferStatus.REJECTED,
        notes: signedOfferRejectNotes.trim(),
        rejectionReason: signedOfferRejectNotes.trim(),
      });
      success('Signed offer rejected. Feedback recorded for student to re-upload.');
      setIsRejectSignedOfferModalOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      error(err.message || 'Failed to reject signed offer');
    }
  };

  // Create payment request
  const handleCreatePaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!paymentForm.title.trim() || !(paymentForm.amount > 0)) {
      error('Enter a fee title and an amount greater than 0.');
      return;
    }
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
      success('Payment verified.');
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
      success(isStudentRoute ? 'Student permanently deleted.' : 'Lead permanently deleted.');
      setIsDeleteConfirmOpen(false);
      navigate(isStudentRoute ? '/students' : '/leads');
    } catch (err: any) {
      error(err.message || (isStudentRoute ? 'Failed to delete student' : 'Failed to delete lead'));
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
  const headerBranch = typeof lead.branchId === 'object' && lead.branchId ? lead.branchId : null;

  const openEditLeadModal = () => {
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
  };

  // ---- Overview Activity feed: contact attempts + messages/notes + journey updates, newest first ----
  type FeedKind = 'call' | 'message' | 'note' | 'update';
  type FeedItem = { id: string; kind: FeedKind; at: string; title: string; tag?: string; tagTone?: string; body?: string; by?: string };
  const contactMethodLabel: Record<string, string> = { PHONE: 'Phone call', CALL: 'Phone call', WHATSAPP: 'WhatsApp', EMAIL: 'Email', SMS: 'SMS' };
  const feedItems: FeedItem[] = [
    ...(((lead as any).contactAttempts || []) as any[]).map((ca) => ({
      id: `ca-${ca._id}`,
      kind: 'call' as const,
      at: ca.attemptDate || ca.createdAt,
      title: contactMethodLabel[ca.method] || (ca.method ? String(ca.method).replace(/_/g, ' ') : 'Contact attempt'),
      tag: ca.outcome ? String(ca.outcome).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase()) : undefined,
      tagTone: ca.outcome === 'CONNECTED' ? 'good' : ca.outcome === 'CALLBACK_REQUESTED' ? 'info' : 'warn',
      body: ca.notes,
      by: ca.recordedByName || 'Advisor',
    })),
    ...messages.map((m) => ({
      id: `msg-${m._id}`,
      kind: (m.isInternalNote ? 'note' : 'message') as FeedKind,
      at: m.createdAt,
      title: m.isInternalNote ? 'Internal note' : m.senderRole === UserRole.STUDENT ? 'Message from student' : 'Message to student',
      tag: m.isInternalNote ? 'Staff only' : undefined,
      tagTone: 'note',
      body: m.content,
      by: m.senderName,
    })),
    // Messages and contact attempts already appear above; skip their duplicate journey events.
    ...activities
      .filter((act) => act.action !== 'MESSAGE_SENT' && !/CONTACT_ATTEMPT/.test(act.action || ''))
      .map((act) => ({
        id: `act-${act._id}`,
        kind: 'update' as const,
        at: act.createdAt,
        title: act.title,
        body: act.description,
        by: act.actorName || 'System',
      })),
  ]
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const feedCounts = {
    all: feedItems.length,
    call: feedItems.filter((i) => i.kind === 'call').length,
    message: feedItems.filter((i) => i.kind === 'message').length,
    note: feedItems.filter((i) => i.kind === 'note').length,
    update: feedItems.filter((i) => i.kind === 'update').length,
  };
  const visibleFeed = activityFilter === 'all' ? feedItems : feedItems.filter((i) => i.kind === activityFilter);
  const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
  const formatFeedTime = (iso: string) =>
    isToday(iso)
      ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const academicMissing = profile?.missingFields?.length || 0;

  const refreshShortlist = async () => {
    const res = await apiClient.get<Shortlist[]>(`/universities/shortlists/${id}`);
    setShortlist(res.data || []);
  };

  const openAddShortlist = async () => {
    setShortlistForm({ universityId: '', courseId: '', intake: lead.targetIntake || '', notes: '', isVisibleToStudent: true });
    setShortlistCourses([]);
    setIsShortlistModalOpen(true);
    if (shortlistUniversities.length === 0) {
      try {
        const res = await apiClient.get<University[]>('/universities/list');
        setShortlistUniversities(res.data || []);
      } catch (err: any) {
        error(err.message || 'Could not load universities');
      }
    }
  };

  const handleShortlistUniversityChange = async (universityId: string) => {
    setShortlistForm((prev) => ({ ...prev, universityId, courseId: '' }));
    setShortlistCourses([]);
    if (!universityId) return;
    try {
      const res = await apiClient.get<Course[]>('/universities/courses', { universityId });
      setShortlistCourses(res.data || []);
    } catch (err: any) {
      error(err.message || 'Could not load courses');
    }
  };

  const handleAddShortlist = async () => {
    if (!shortlistForm.universityId || !shortlistForm.courseId || !shortlistForm.intake.trim()) {
      error('Choose a university, a course and an intake.');
      return;
    }
    setShortlistSaving(true);
    try {
      await apiClient.post(`/universities/shortlists/${id}`, {
        ...shortlistForm,
        intake: shortlistForm.intake.trim(),
      });
      success(shortlistForm.isVisibleToStudent ? 'University added and shown to the student' : 'University added (hidden from student)');
      setIsShortlistModalOpen(false);
      await refreshShortlist();
    } catch (err: any) {
      error(err.message || 'Failed to add university');
    } finally {
      setShortlistSaving(false);
    }
  };

  const handleToggleShortlistVisibility = async (item: Shortlist) => {
    const nextVisible = !item.isVisibleToStudent;
    setVisibilityUpdatingId(item._id);
    try {
      await apiClient.put(`/universities/shortlists/item/${item._id}/visibility`, { isVisible: nextVisible });
      setShortlist((prev) => prev.map((s) => (s._id === item._id ? { ...s, isVisibleToStudent: nextVisible } : s)));
      success(nextVisible ? `${item.universityName} is now shown to the student` : `${item.universityName} is now hidden from the student`);
    } catch (err: any) {
      error(err.message || 'Failed to update visibility');
    } finally {
      setVisibilityUpdatingId(null);
    }
  };

  const selectedShortlistCourse = shortlistCourses.find((c) => c._id === shortlistForm.courseId);
  const isOverview = activeSection === 'overview';
  const isDocuments = activeSection === 'documents';
  const isCurrentProcess = activeSection === 'currentProcess' || activeSection === currentProcessInfo.key;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Lead / Student record header: identity + actions on top, labelled contact facts below */}
      <div className="lead-header-wrap">
        <button
          type="button"
          className="lead-back-link"
          onClick={() => navigate(isStudentRoute ? '/students' : '/leads')}
        >
          <ArrowLeft size={16} />
          {isStudentRoute ? 'Back to Students' : 'Back to Leads'}
        </button>

        <section className="lead-record-header" aria-label={isStudentRoute ? 'Student summary' : 'Lead summary'}>
          <div className="lead-header-top">
            <div className="lead-identity-group">
              <div className="lead-avatar-badge" aria-hidden="true">
                {(lead.name || 'S')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part: string) => part.charAt(0).toUpperCase())
                  .join('')}
              </div>
              <div className="lead-identity-meta">
                <div className="lead-title-row">
                  <h1 className="lead-name-text">{lead.name}</h1>
                  <StatusBadge status={lead.status} />
                </div>
                <p className="lead-subline">
                  Stage: {lead.stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  {lead.studentId && <> · ID {lead.studentId}</>}
                  {lead.createdAt && (
                    <> · Added {new Date(lead.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</>
                  )}
                </p>
              </div>
            </div>

            {/* Actions: 2 secondary + 1 primary, then icon-only Pin and "..." menu */}
            <div className="lead-header-actions-bar" ref={moreMenuRef}>
              <Button
                variant="secondary"
                className="lead-action-btn"
                icon={<PhoneCall size={16} />}
                onClick={() => setIsContactModalOpen(true)}
              >
                Log contact
              </Button>

              <Button
                variant="secondary"
                className="lead-action-btn"
                icon={<Calendar size={16} />}
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

              {lead.status !== LeadStatus.INTERESTED && lead.status !== LeadStatus.CLOSED_LOST && (
                <Button
                  variant="primary"
                  className="lead-action-btn"
                  icon={<CheckCircle2 size={16} />}
                  onClick={handleConvertToStudent}
                  loading={actionLoading}
                >
                  Convert to Student
                </Button>
              )}

              {lead.status === LeadStatus.CLOSED_LOST && (
                <Button
                  variant="secondary"
                  className="lead-action-btn"
                  icon={<RotateCcw size={16} color="var(--primary)" />}
                  onClick={handleReopen}
                  loading={actionLoading}
                >
                  Reopen Lead
                </Button>
              )}

              {/* More Actions Popover */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="lead-icon-btn"
                  title="More actions"
                  aria-label="More actions"
                  aria-haspopup="menu"
                  aria-expanded={isMoreMenuOpen}
                  onClick={() => setIsMoreMenuOpen(prev => !prev)}
                >
                  <MoreVertical size={16} />
                </button>

                {isMoreMenuOpen && (
                  <div className="lead-more-dropdown">
                    <button
                      type="button"
                      className="lead-more-dropdown-item"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
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
                      <Edit3 size={14} />
                      <span>Edit Lead Info</span>
                    </button>

                    {lead.status !== LeadStatus.CLOSED_LOST && (
                      <button
                        type="button"
                        className="lead-more-dropdown-item"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsClosedLostModalOpen(true);
                        }}
                      >
                        <XCircle size={14} color="var(--danger)" />
                        <span>Mark Closed Lost</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        className="lead-more-dropdown-item danger"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 size={14} />
                        <span>{isStudentRoute ? 'Delete Student' : 'Delete Lead'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

            <div className="lead-header-divider" aria-hidden="true" />

            <dl className="lead-facts">
              <div className="lead-fact">
                <dt><Mail size={13} /> Email</dt>
                <dd>{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : <span className="lead-fact-empty">Not provided</span>}</dd>
              </div>
              <div className="lead-fact">
                <dt><Phone size={13} /> Phone</dt>
                <dd>{lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : <span className="lead-fact-empty">Not provided</span>}</dd>
              </div>
              <div className="lead-fact">
                <dt><MapPin size={13} /> Location</dt>
                <dd>{[lead.city, lead.country].filter(Boolean).join(', ') || <span className="lead-fact-empty">Not provided</span>}</dd>
              </div>
              <div className="lead-fact">
                <dt><Globe size={13} /> Source</dt>
                <dd>{lead.source ? String(lead.source).replace(/_/g, ' ') : 'Website'}</dd>
              </div>
              <div className="lead-fact">
                <dt><Building2 size={13} /> Branch</dt>
                <dd>
                  {headerBranch ? (
                    `${headerBranch.name}${headerBranch.city ? ` (${headerBranch.city})` : ''}`
                  ) : (
                    <span className="lead-fact-empty">Not assigned</span>
                  )}
                </dd>
              </div>
            </dl>
        </section>
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

        {/* Fees are available at every stage; at the Fee Payment stage the process tab already shows them */}
        {currentProcessInfo.key !== 'payments' && (
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'payments'}
            className={`tab-btn ${activeSection === 'payments' ? 'active' : ''}`}
            onClick={() => handleSectionChange('payments')}
          >
            Fees
          </button>
        )}
      </div>

      {/* --- NAVIGATION CONTENT --- */}

      {/* 1. Overview Section: 2-Column Responsive Workspace */}
      {isOverview && (
        <div className="ov-workspace">
          {/* LEFT: one Student profile card (study plan · academics · tracking) */}
          <section className="ov-card" aria-labelledby="ov-profile-h">
            <div className="ov-card-head">
              <h3 id="ov-profile-h" className="ov-card-title">{isStudentRoute ? 'Student profile' : 'Lead profile'}</h3>
              <button type="button" className="ov-mini-btn" onClick={openEditLeadModal}>
                <Edit3 size={13} />
                Edit
              </button>
            </div>

            <div className="ov-section">
              <h4 className="ov-section-title">Study plan</h4>
              <dl className="ov-dl">
                <div><dt>Destination</dt><dd className={lead.targetCountry ? '' : 'is-empty'}>{lead.targetCountry || 'Not added'}</dd></div>
                <div><dt>Course</dt><dd className={lead.targetCourse ? '' : 'is-empty'}>{lead.targetCourse || 'Not added'}</dd></div>
                <div><dt>Intake</dt><dd className={lead.targetIntake ? '' : 'is-empty'}>{lead.targetIntake || 'Not added'}</dd></div>
                <div><dt>Budget</dt><dd className={lead.budget ? '' : 'is-empty'}>{lead.budget || 'Not added'}</dd></div>
              </dl>
              {lead.status === LeadStatus.CLOSED_LOST && lead.closedLostReason && (
                <div className="ov-callout is-danger">
                  <strong>Closed lost reason</strong>
                  <span>{lead.closedLostReason}</span>
                </div>
              )}
            </div>

            <div className="ov-section">
              <div className="ov-section-head">
                <h4 className="ov-section-title">Academics</h4>
                {profile?.isComplete ? (
                  <span className="ov-pill is-good">Evaluated</span>
                ) : academicMissing > 0 ? (
                  <span className="ov-pill is-warn">{academicMissing} detail{academicMissing === 1 ? '' : 's'} missing</span>
                ) : (
                  <span className="ov-pill is-warn">Not evaluated</span>
                )}
              </div>
              <dl className="ov-dl">
                <div><dt>Highest qualification</dt><dd className={profile?.highestQualification ? '' : 'is-empty'}>{profile?.highestQualification || 'Not added'}</dd></div>
                <div><dt>Institution</dt><dd className={profile?.institution ? '' : 'is-empty'}>{profile?.institution || 'Not added'}</dd></div>
                <div><dt>GPA / percentage</dt><dd className={profile?.percentageGpa ? '' : 'is-empty'}>{profile?.percentageGpa || 'Not added'}</dd></div>
                <div>
                  <dt>English test</dt>
                  <dd className={profile?.testScore?.testType && profile.testScore.testType !== 'NONE' ? '' : 'is-empty'}>
                    {profile?.testScore?.testType && profile.testScore.testType !== 'NONE'
                      ? `${profile.testScore.testType}: ${profile.testScore.overall || 'Pending'}`
                      : 'Not added'}
                  </dd>
                </div>
                <div><dt>GRE / GMAT</dt><dd className={profile?.greGmatScore ? '' : 'is-empty'}>{profile?.greGmatScore || 'Not added'}</dd></div>
                <div><dt>Passport</dt><dd className={lead.passportNumber ? '' : 'is-empty'}>{lead.passportNumber || 'Not added'}</dd></div>
                <div>
                  <dt>Documents</dt>
                  <dd>{documents.length} uploaded · {documents.filter((d) => d.status === DocumentStatus.APPROVED).length} approved</dd>
                </div>
              </dl>
              {profile?.counsellorRemarks && (
                <div className="ov-callout is-good">
                  <strong>Counsellor remarks</strong>
                  <span>{profile.counsellorRemarks}</span>
                </div>
              )}
              {!profile?.isComplete && (
                <button type="button" className="ov-dashed-btn" onClick={() => handleSectionChange('profile')}>
                  + Add academic details
                </button>
              )}
            </div>

            <div className="ov-section">
              <h4 className="ov-section-title">Tracking</h4>
              <dl className="ov-dl">
                <div><dt>Lead source</dt><dd>{lead.source ? String(lead.source).replace(/_/g, ' ') : 'Website'}</dd></div>
                <div>
                  <dt>Added</dt>
                  <dd>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</dd>
                </div>
                <div>
                  <dt>Last contacted</dt>
                  <dd className={lead.lastContactedAt ? '' : 'is-warn'}>
                    {lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleString() : 'Never'}
                  </dd>
                </div>
              </dl>
              {lead.notes && (
                <div className="ov-callout">
                  <strong>Inquiry notes</strong>
                  <span>{lead.notes}</span>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: one Activity hub (composer + merged feed) */}
          <section className="ov-card" aria-labelledby="ov-activity-h">
            <div className="ov-card-head is-wrap">
              <h3 id="ov-activity-h" className="ov-card-title">Activity</h3>
              <div className="ov-filters" role="group" aria-label="Filter activity">
                {(
                  [
                    ['all', 'All'],
                    ['call', 'Calls'],
                    ['message', 'Messages'],
                    ['note', 'Notes'],
                    ['update', 'Updates'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={activityFilter === key}
                    className={`ov-filter ${activityFilter === key ? 'is-active' : ''}`}
                    onClick={() => setActivityFilter(key)}
                  >
                    {label} · {feedCounts[key]}
                  </button>
                ))}
              </div>
            </div>

            {/* Composer */}
            <div className="ov-composer">
              <div className="ov-seg" role="tablist" aria-label="What to add">
                {!isOwnerAdmin && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={composerMode === 'message'}
                    className={composerMode === 'message' ? 'is-active' : ''}
                    onClick={() => {
                      setComposerMode('message');
                      setIsInternalNote(false);
                    }}
                  >
                    <MessageSquare size={14} /> Message student
                  </button>
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={composerMode === 'note'}
                  className={composerMode === 'note' ? 'is-active' : ''}
                  onClick={() => {
                    setComposerMode('note');
                    setIsInternalNote(true);
                  }}
                >
                  <Lock size={14} /> Internal note
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={composerMode === 'call'}
                  className={composerMode === 'call' ? 'is-active' : ''}
                  onClick={() => setComposerMode('call')}
                >
                  <PhoneCall size={14} /> Log call
                </button>
              </div>

              {composerMode === 'call' ? (
                <div className="ov-composer-call">
                  <span>Record a call, WhatsApp or email attempt with its outcome.</span>
                  <Button variant="primary" size="sm" icon={<PhoneCall size={14} />} onClick={() => setIsContactModalOpen(true)}>
                    Log contact attempt
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSendMessage}>
                  <label className="ov-sr-only" htmlFor="ov-composer-text">
                    {composerMode === 'note' ? 'Internal note' : 'Message to the student'}
                  </label>
                  <textarea
                    id="ov-composer-text"
                    className={`ov-textarea ${composerMode === 'note' ? 'is-note' : ''}`}
                    rows={3}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={composerMode === 'note' ? 'Write a note only staff can see…' : 'Write a message to the student…'}
                  />
                  <div className="ov-composer-foot">
                    <span>{composerMode === 'note' ? 'Only staff can see internal notes.' : 'The student sees this in their portal.'}</span>
                    <Button type="submit" variant="primary" size="sm" icon={<Send size={14} />} disabled={!newMessage.trim()}>
                      {composerMode === 'note' ? 'Save note' : 'Send'}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Merged feed */}
            {visibleFeed.length === 0 ? (
              <div className="ov-feed-empty">
                {activityFilter === 'all' ? 'No activity yet. Send a message, add a note or log a call to start the record.' : 'Nothing here yet.'}
              </div>
            ) : (
              <ol className="ov-feed">
                {visibleFeed.map((item, index) => {
                  const showDay = index === 0 || isToday(visibleFeed[index - 1].at) !== isToday(item.at);
                  return (
                    <React.Fragment key={item.id}>
                      {showDay && <li className="ov-feed-day">{isToday(item.at) ? 'Today' : 'Earlier'}</li>}
                      <li className="ov-feed-item">
                        <span className={`ov-feed-icon is-${item.kind}`} aria-hidden="true">
                          {item.kind === 'call' ? (
                            <PhoneCall size={15} />
                          ) : item.kind === 'note' ? (
                            <Lock size={15} />
                          ) : item.kind === 'message' ? (
                            <MessageSquare size={15} />
                          ) : (
                            <Clock size={15} />
                          )}
                        </span>
                        <div className="ov-feed-body">
                          <div className="ov-feed-top">
                            <span className="ov-feed-title">
                              {item.title}
                              {item.tag && <span className={`ov-feed-tag is-${item.tagTone || 'note'}`}>{item.tag}</span>}
                            </span>
                            <span className="ov-feed-meta">
                              {formatFeedTime(item.at)} · {item.by}
                            </span>
                          </div>
                          {item.body && <p className="ov-feed-text">{item.body}</p>}
                        </div>
                      </li>
                    </React.Fragment>
                  );
                })}
              </ol>
            )}
          </section>
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
                  Initial consultation, student preferences, and scheduled sessions
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
                    counsellorId: user?._id || '',
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
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Advisory Coverage</span>
                <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} color="var(--primary)" />
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>Open to All Counsellors</span>
                </div>
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
                      <span>Counsellor: <strong>{sess.counsellorName || lead.counsellorId?.name || 'Admissions Advisor'}</strong></span>
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
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h3 className="card-title">Curated University Shortlist</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Only universities set to <strong>Shown</strong> appear in the student portal ({shortlist.filter((s) => s.isVisibleToStudent).length} of {shortlist.length} shown). The student selects 1 to unlock document submission.
              </span>
            </div>
            <Button variant="primary" icon={<Plus size={16} />} onClick={openAddShortlist}>
              Add university
            </Button>
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
                header: 'SHOWN TO STUDENT',
                render: (s) => (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.isVisibleToStudent}
                    aria-label={`${s.isVisibleToStudent ? 'Hide' : 'Show'} ${s.universityName} – ${s.courseTitle} ${s.isVisibleToStudent ? 'from' : 'to'} the student`}
                    disabled={visibilityUpdatingId === s._id}
                    onClick={() => handleToggleShortlistVisibility(s)}
                    title={s.isVisibleToStudent ? 'Click to hide from the student portal' : 'Click to show in the student portal'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      minHeight: '32px',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      border: `1px solid ${s.isVisibleToStudent ? '#A7F3D0' : 'var(--border-color)'}`,
                      backgroundColor: s.isVisibleToStudent ? '#ECFDF5' : 'var(--bg-surface)',
                      color: s.isVisibleToStudent ? '#047857' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: visibilityUpdatingId === s._id ? 'wait' : 'pointer',
                      opacity: visibilityUpdatingId === s._id ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.isVisibleToStudent ? <Eye size={14} /> : <EyeOff size={14} />}
                    {s.isVisibleToStudent ? 'Shown' : 'Hidden'}
                  </button>
                ),
              },
              {
                header: 'STATUS',
                render: (s) => <StatusBadge status={s.status} />,
              },
            ]}
            data={shortlist}
            emptyMessage="No universities shortlisted yet. Use “Add university” to choose what this student sees."
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
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Rule: Exactly 1 active application permitted at a time. Historic rejections remain archived.
              </p>
            </div>
            {isStaff && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                disabled={applications.some((a) => a.status === ApplicationStatus.SUBMITTED || a.status === ApplicationStatus.UNDER_REVIEW)}
                onClick={handleOpenCreateAppModal}
                title={
                  applications.some((a) => a.status === ApplicationStatus.SUBMITTED || a.status === ApplicationStatus.UNDER_REVIEW)
                    ? 'An active application is already in progress. Complete or resolve it before submitting a new one.'
                    : 'Submit new application'
                }
              >
                + Submit Application
              </Button>
            )}
          </div>

          <Table
            columns={[
              {
                header: 'UNIVERSITY & COUNTRY',
                render: (a) => (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.universityName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.country}</div>
                  </div>
                ),
              },
              {
                header: 'COURSE & INTAKE',
                render: (a) => (
                  <div>
                    <div style={{ color: 'var(--text-primary)' }}>{a.courseTitle}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.intake}</div>
                  </div>
                ),
              },
              {
                header: 'APP NUMBER',
                render: (a) =>
                  a.applicationNumber ? (
                    <code style={{ fontSize: '11.5px', backgroundColor: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
                      {a.applicationNumber}
                    </code>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  ),
              },
              {
                header: 'SUBMITTED',
                render: (a) => (
                  <span style={{ fontSize: '12px' }}>
                    {a.submissionDate ? new Date(a.submissionDate).toLocaleDateString() : '—'}
                  </span>
                ),
              },
              {
                header: 'DECISION / FEEDBACK',
                render: (a) => {
                  if (a.status === ApplicationStatus.REJECTED) {
                    return (
                      <div style={{ maxWidth: '240px' }}>
                        <span style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 600, display: 'block' }}>
                          Rejection Reason:
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--danger-text)' }}>
                          {a.rejectionReason || 'No reason specified'}
                        </span>
                        {a.decisionDate && (
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Decided: {new Date(a.decisionDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (a.decisionDate) {
                    return (
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Decided: {new Date(a.decisionDate).toLocaleDateString()}
                      </span>
                    );
                  }
                  return <span style={{ color: 'var(--text-muted)' }}>In Review</span>;
                },
              },
              {
                header: 'STATUS',
                render: (a) => <StatusBadge status={a.status} />,
              },
              {
                header: 'ACTIONS',
                align: 'right',
                render: (a) => (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye size={13} />}
                      onClick={() => {
                        setSelectedAppForDetails(a);
                        setIsAppDetailsDrawerOpen(true);
                      }}
                      title="View Details"
                    >
                      Details
                    </Button>

                    {isStaff && a.status === ApplicationStatus.SUBMITTED && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Clock size={13} />}
                          onClick={() => handleUpdateAppStatus(a._id, ApplicationStatus.UNDER_REVIEW)}
                          title="Move to Under Review"
                        >
                          Under Review
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle2 size={13} />}
                          onClick={() => handleUpdateAppStatus(a._id, ApplicationStatus.OFFER_RECEIVED)}
                          title="Mark Offer Received"
                        >
                          Offer Received
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<XCircle size={13} />}
                          onClick={() => handleOpenRejectAppModal(a)}
                          title="Reject Application"
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {isStaff && a.status === ApplicationStatus.UNDER_REVIEW && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle2 size={13} />}
                          onClick={() => handleUpdateAppStatus(a._id, ApplicationStatus.OFFER_RECEIVED)}
                          title="Mark Offer Received"
                        >
                          Offer Received
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<XCircle size={13} />}
                          onClick={() => handleOpenRejectAppModal(a)}
                          title="Reject Application"
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {isStaff && a.status === ApplicationStatus.OFFER_RECEIVED && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Upload size={13} />}
                        onClick={() => {
                          setOfferForm((prev) => ({ ...prev, applicationId: a._id }));
                          setIsOfferModalOpen(true);
                        }}
                      >
                        Upload Offer
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            data={applications}
            emptyMessage="No applications submitted yet. Click '+ Submit Application' to begin."
          />
        </div>
      )}

      {/* Official Offer Letters */}
      {((isCurrentProcess && currentProcessInfo.key === 'offers') || activeSection === 'offers') && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Official Offer Letters & Acceptance</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Upload official letters, monitor student signed declarations, and approve offers to unlock fee payments.
              </p>
            </div>
            {isStaff && applications.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={<Upload size={14} />}
                onClick={() => {
                  setOfferForm((prev) => ({
                    ...prev,
                    applicationId: applications.find((a) => a.status === ApplicationStatus.OFFER_RECEIVED)?._id || applications[0]._id,
                  }));
                  setIsOfferModalOpen(true);
                }}
              >
                Upload Offer Letter
              </Button>
            )}
          </div>

          <Table
            columns={[
              {
                header: 'UNIVERSITY & COURSE',
                render: (o) => (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.universityName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{o.courseTitle}</div>
                  </div>
                ),
              },
              {
                header: 'TYPE',
                render: (o) => (
                  <Badge variant={o.offerType === 'UNCONDITIONAL' ? 'success' : 'neutral'}>
                    {o.offerType}
                  </Badge>
                ),
              },
              {
                header: 'TUITION / DEPOSIT',
                render: (o) => (
                  <div>
                    <strong>
                      {o.currency} {o.depositAmount.toLocaleString()}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                      Tuition: {o.currency} {o.tuitionFee.toLocaleString()}
                    </span>
                    {o.deadlineDate && (
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>
                        Due: {new Date(o.deadlineDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                header: 'ORIGINAL LETTER',
                render: (o) => (
                  <a
                    href={o.originalOfferUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: 'var(--primary)',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 500,
                    }}
                  >
                    <ExternalLink size={12} /> {o.originalOfferFileName || 'View Letter'}
                  </a>
                ),
              },
              {
                header: 'SIGNED ACCEPTANCE',
                render: (o) =>
                  o.signedOfferUrl ? (
                    <a
                      href={o.signedOfferUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: 'var(--success)',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 500,
                      }}
                    >
                      <FileCheck size={12} /> {o.signedOfferFileName || 'Signed Copy'}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Pending Upload</span>
                  ),
              },
              {
                header: 'REVIEW / FEEDBACK',
                render: (o) => {
                  if (o.status === OfferStatus.REJECTED) {
                    return (
                      <div style={{ maxWidth: '200px' }}>
                        <span style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 600, display: 'block' }}>
                          Signed Copy Rejected:
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--danger-text)' }}>
                          {o.rejectionReason || o.reviewNotes || 'Resubmission requested'}
                        </span>
                      </div>
                    );
                  }
                  if (o.reviewedByName) {
                    return (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Reviewed by {o.reviewedByName}
                      </span>
                    );
                  }
                  return <span style={{ color: 'var(--text-muted)' }}>—</span>;
                },
              },
              {
                header: 'STATUS',
                render: (o) => <StatusBadge status={o.status} />,
              },
              {
                header: 'ACTIONS',
                align: 'right',
                render: (o) => (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {isStaff && o.status === OfferStatus.SIGNED_UPLOADED && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle2 size={13} />}
                          onClick={() => handleAcceptSignedOffer(o._id)}
                          title="Accept Signed Offer"
                        >
                          Accept
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<XCircle size={13} />}
                          onClick={() => handleOpenRejectSignedOfferModal(o)}
                          title="Reject Signed Offer"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {o.status === OfferStatus.ACCEPTED && (
                      <span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: 600 }}>
                        ✓ Fee Payment Unlocked
                      </span>
                    )}
                  </div>
                ),
              },
            ]}
            data={offers}
            emptyMessage="No offer letters issued yet. Issue an offer once admission is confirmed."
          />
        </div>
      )}

      {/* Tuition & Fee Payments */}
      {((isCurrentProcess && currentProcessInfo.key === 'payments') || activeSection === 'payments') && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tuition & Fee Payment Requests</h3>
            {isStaff && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  // Default fee type: the tuition deposit at the Fee Payment stage, an application fee before it.
                  setPaymentForm((prev) => ({
                    ...prev,
                    purpose: currentProcessInfo.key === 'payments' ? 'TUITION_DEPOSIT' : 'APPLICATION_FEE',
                  }));
                  setIsPaymentModalOpen(true);
                }}
              >
                Request Fee
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

      {/* --- Submit / Create Application Modal --- */}
      <Modal
        isOpen={isCreateAppModalOpen}
        onClose={() => setIsCreateAppModalOpen(false)}
        title="Submit University Application"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateAppModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateApplication}>
              Submit Application
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateApplication}>
          {shortlist.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Prefill from Shortlist Option</label>
              <select
                className="form-select"
                onChange={(e) => {
                  const s = shortlist.find((item) => item._id === e.target.value);
                  if (s) {
                    setAppForm((prev) => ({
                      ...prev,
                      universityId: s.universityId,
                      universityName: s.universityName,
                      courseId: s.courseId,
                      courseTitle: s.courseTitle,
                      country: s.country,
                      intake: s.intake,
                    }));
                  }
                }}
              >
                <option value="">-- Choose from student's shortlist --</option>
                {shortlist.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.universityName} — {s.courseTitle} ({s.intake}) {s.status === 'SELECTED_BY_STUDENT' ? '✓ Selected' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="University Name *"
              value={appForm.universityName}
              onChange={(e) => setAppForm({ ...appForm, universityName: e.target.value })}
              required
            />
            <Input
              label="Country *"
              value={appForm.country}
              onChange={(e) => setAppForm({ ...appForm, country: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
            <Input
              label="Course Title *"
              value={appForm.courseTitle}
              onChange={(e) => setAppForm({ ...appForm, courseTitle: e.target.value })}
              required
            />
            <Input
              label="Intake *"
              value={appForm.intake}
              onChange={(e) => setAppForm({ ...appForm, intake: e.target.value })}
              placeholder="e.g. Fall 2026"
              required
            />
          </div>

          <Input
            label="Application Reference Number"
            value={appForm.applicationNumber}
            onChange={(e) => setAppForm({ ...appForm, applicationNumber: e.target.value })}
            placeholder="e.g. OXF-2026-99214"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Portal Username"
              value={appForm.portalUsername}
              onChange={(e) => setAppForm({ ...appForm, portalUsername: e.target.value })}
              placeholder="Admissions portal username"
            />
            <Input
              label="Portal Password"
              value={appForm.portalPassword}
              onChange={(e) => setAppForm({ ...appForm, portalPassword: e.target.value })}
              placeholder="Admissions portal password"
            />
          </div>

          <Textarea
            label="Internal Notes"
            value={appForm.notes}
            onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })}
            placeholder="e.g. Application lodged via agent portal, conditional on final transcript..."
            rows={2}
          />
        </form>
      </Modal>

      {/* --- Reject Application Modal --- */}
      <Modal
        isOpen={isRejectAppModalOpen}
        onClose={() => setIsRejectAppModalOpen(false)}
        title="Record University Rejection"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRejectAppModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={<XCircle size={14} />} onClick={handleConfirmRejectApp}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <form onSubmit={handleConfirmRejectApp}>
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '12.5px',
              color: 'var(--danger-text)',
            }}
          >
            <strong>University Rejection:</strong> Recording this rejection marks this application as permanently resolved and archived. The student will be permitted to reapply to another institution from their shortlist.
          </div>

          <Input
            label="Decision Date *"
            type="date"
            value={appDecisionDate}
            onChange={(e) => setAppDecisionDate(e.target.value)}
            required
          />

          <Textarea
            label="Mandatory Rejection Reason *"
            value={appRejectionReason}
            onChange={(e) => setAppRejectionReason(e.target.value)}
            placeholder="e.g. Minimum GPA prerequisite not met, program cohort filled, missing language test score..."
            rows={4}
            required
          />
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
            <Select
              label="Currency"
              value={offerForm.currency}
              onChange={(e) => setOfferForm({ ...offerForm, currency: e.target.value })}
              options={[
                { value: 'USD', label: 'USD ($)' },
                { value: 'GBP', label: 'GBP (£)' },
                { value: 'CAD', label: 'CAD ($)' },
                { value: 'AUD', label: 'AUD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'INR', label: 'INR (₹)' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Tuition Fee (Annual)"
              type="number"
              value={offerForm.tuitionFee}
              onChange={(e) => setOfferForm({ ...offerForm, tuitionFee: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Required Deposit Amount *"
              type="number"
              value={offerForm.depositAmount}
              onChange={(e) => setOfferForm({ ...offerForm, depositAmount: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <Input
            label="Acceptance / Deposit Deadline"
            type="date"
            value={offerForm.deadlineDate}
            onChange={(e) => setOfferForm({ ...offerForm, deadlineDate: e.target.value })}
          />

          <div className="form-group">
            <label className="form-label">Attach Offer Letter PDF *</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg"
              className="form-input"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setOfferFile(e.target.files[0]);
                  setOfferForm((prev) => ({
                    ...prev,
                    originalOfferFileName: e.target.files![0].name,
                  }));
                }
              }}
            />
            {!offerFile && (
              <Input
                label="Or File URL / Path"
                value={offerForm.originalOfferUrl}
                onChange={(e) => setOfferForm({ ...offerForm, originalOfferUrl: e.target.value })}
                placeholder="e.g. /uploads/offer_letter.pdf"
              />
            )}
          </div>

          <Textarea
            label="Conditions / Notes"
            value={offerForm.conditions}
            onChange={(e) => setOfferForm({ ...offerForm, conditions: e.target.value })}
            placeholder="e.g. Submit official graduation marksheet and 6.5+ IELTS score by July 15..."
          />
        </form>
      </Modal>

      {/* --- Reject Signed Offer Modal --- */}
      <Modal
        isOpen={isRejectSignedOfferModalOpen}
        onClose={() => setIsRejectSignedOfferModalOpen(false)}
        title="Reject Signed Offer Acceptance"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRejectSignedOfferModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={<XCircle size={14} />} onClick={handleConfirmRejectSignedOffer}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <form onSubmit={handleConfirmRejectSignedOffer}>
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '12.5px',
              color: 'var(--danger-text)',
            }}
          >
            <strong>Signed Offer Rejection:</strong> The student will be prompted to review your feedback notes and re-upload an amended signed copy.
          </div>

          <Textarea
            label="Mandatory Rejection Feedback / Reason *"
            value={signedOfferRejectNotes}
            onChange={(e) => setSignedOfferRejectNotes(e.target.value)}
            placeholder="e.g. Signature missing on page 2, incorrect acceptance date, scanned copy cut off..."
            rows={4}
            required
          />
        </form>
      </Modal>

      {/* --- Application Details Drawer --- */}
      <Drawer
        isOpen={isAppDetailsDrawerOpen}
        onClose={() => setIsAppDetailsDrawerOpen(false)}
        title="University Application Details"
      >
        {selectedAppForDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Current Status
                </span>
                <div style={{ marginTop: '4px' }}>
                  <StatusBadge status={selectedAppForDetails.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Submitted On
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {new Date(selectedAppForDetails.submissionDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {selectedAppForDetails.status === ApplicationStatus.REJECTED && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 600, fontSize: '13px' }}>
                  <AlertCircle size={16} /> Rejection Reason
                </div>
                <div style={{ fontSize: '13px', color: 'var(--danger-text)', lineHeight: 1.4 }}>
                  {selectedAppForDetails.rejectionReason || 'No reason specified'}
                </div>
                {selectedAppForDetails.decisionDate && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Decision Date: {new Date(selectedAppForDetails.decisionDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Program & Institution
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>University</span>
                  <strong>{selectedAppForDetails.universityName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Country</span>
                  <span>{selectedAppForDetails.country}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Course Title</span>
                  <strong>{selectedAppForDetails.courseTitle}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Intake</span>
                  <span>{selectedAppForDetails.intake}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>App Number</span>
                  <strong>{selectedAppForDetails.applicationNumber || 'None'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Lodged By</span>
                  <span>{selectedAppForDetails.createdByName}</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  University Portal Credentials
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAppPortalPassword(!showAppPortalPassword)}
                >
                  {showAppPortalPassword ? 'Hide' : 'Reveal'}
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Portal Username</span>
                  <code>{selectedAppForDetails.portalUsername || 'Not provided'}</code>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Portal Password</span>
                  <code>
                    {selectedAppForDetails.portalPassword
                      ? showAppPortalPassword
                        ? selectedAppForDetails.portalPassword
                        : '••••••••••••'
                      : 'Not provided'}
                  </code>
                </div>
              </div>
            </div>

            {selectedAppForDetails.notes && (
              <div className="card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Submission Notes
                </h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {selectedAppForDetails.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

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
            label="Fee Title *"
            value={paymentForm.title}
            onChange={(e) => setPaymentForm({ ...paymentForm, title: e.target.value })}
            placeholder="e.g. University application fee"
            required
          />
          {/* Amount | Currency | Fee type on one row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
            <Input
              label="Amount *"
              type="number"
              min={0}
              value={paymentForm.amount || ''}
              placeholder="0"
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
              required
            />
            <Select
              label="Currency"
              value={paymentForm.currency}
              onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
              options={[
                { value: 'INR', label: 'INR (₹)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'GBP', label: 'GBP (£)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'AUD', label: 'AUD (A$)' },
                { value: 'CAD', label: 'CAD (C$)' },
              ]}
            />
            <Select
              label="Fee type *"
              value={paymentForm.purpose}
              onChange={(e) => setPaymentForm({ ...paymentForm, purpose: e.target.value as typeof paymentForm.purpose })}
              options={[
                { value: 'APPLICATION_FEE', label: 'Application fee' },
                { value: 'TUITION_DEPOSIT', label: 'Tuition deposit' },
                { value: 'VISA_FEE', label: 'Visa fee' },
                { value: 'INSURANCE', label: 'Insurance' },
                { value: 'OTHER', label: 'Other / service fee' },
              ]}
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
              Save Attempt
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

      {/* --- Add University to Shortlist Modal --- */}
      <Modal
        isOpen={isShortlistModalOpen}
        onClose={() => setIsShortlistModalOpen(false)}
        title="Add university to shortlist"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsShortlistModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddShortlist} loading={shortlistSaving}>
              Add to shortlist
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Select
            label="University *"
            value={shortlistForm.universityId}
            onChange={(e) => handleShortlistUniversityChange(e.target.value)}
            options={[
              { value: '', label: shortlistUniversities.length ? '-- Select university --' : 'Loading universities…' },
              ...shortlistUniversities.map((u) => ({ value: u._id, label: `${u.name} (${u.country})` })),
            ]}
          />
          <Select
            label="Course *"
            value={shortlistForm.courseId}
            disabled={!shortlistForm.universityId}
            onChange={(e) => {
              const course = shortlistCourses.find((c) => c._id === e.target.value);
              setShortlistForm((prev) => ({
                ...prev,
                courseId: e.target.value,
                intake: prev.intake || course?.intakes?.[0] || '',
              }));
            }}
            options={[
              {
                value: '',
                label: !shortlistForm.universityId
                  ? 'Select a university first'
                  : shortlistCourses.length
                  ? '-- Select course --'
                  : 'No courses listed for this university',
              },
              ...shortlistCourses.map((c) => ({
                value: c._id,
                label: `${c.title} · ${c.level}${c.annualFee ? ` · ${c.currency} ${c.annualFee}/yr` : ''}`,
              })),
            ]}
          />
          <Input
            label="Intake *"
            value={shortlistForm.intake}
            onChange={(e) => setShortlistForm((prev) => ({ ...prev, intake: e.target.value }))}
            placeholder="e.g. Fall 2026"
            list="shortlist-intake-options"
          />
          {selectedShortlistCourse?.intakes?.length ? (
            <datalist id="shortlist-intake-options">
              {selectedShortlistCourse.intakes.map((intake) => (
                <option key={intake} value={intake} />
              ))}
            </datalist>
          ) : null}
          <Textarea
            label="Note for this option (optional)"
            value={shortlistForm.notes}
            onChange={(e) => setShortlistForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Why this university fits the student…"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shortlistForm.isVisibleToStudent}
              onChange={(e) => setShortlistForm((prev) => ({ ...prev, isVisibleToStudent: e.target.checked }))}
              style={{ width: '16px', height: '16px' }}
            />
            Show this university to the student now
          </label>
        </div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            <Select
              label="Lead Source *"
              value={editForm.source}
              onChange={(e) => setEditForm({ ...editForm, source: e.target.value as LeadSource })}
              options={Object.values(LeadSource).map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
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
        title={isStudentRoute ? "Permanently Delete Student" : "Permanently Delete Lead"}
        message={`Are you sure you want to permanently delete ${lead?.name}? This action is irreversible and recorded in the audit log.`}
        isDanger
        confirmText="Delete Permanently"
        loading={actionLoading}
      />
    </div>
  );
};

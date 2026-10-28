import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Lock,
  X,
  Calendar,
  Compass,
  Building2,
  FolderOpen,
  FileCheck,
  AlertCircle,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  Clock,
  ShieldCheck,
  Globe,
  DollarSign,
  FileSpreadsheet,
  MapPin,
  Percent,
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
  University,
  Course,
} from '../../types';
import { PendingTasksCard } from './components/PendingTasksCard';
import { CounsellorCard } from './components/CounsellorCard';
import { StageStepper, STAGES_CONFIG } from '../../components/StageStepper';
import { Button } from '../../components/Button';
import { Badge, StatusBadge } from '../../components/Badge';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Form';
import { UniversityDetailsModal } from '../universities/components/UniversityDetailsModal';

const DEFAULT_CAMPUS_GALLERY = [
  {
    url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80',
    title: 'Historic Academic Quad & Faculty Lawns',
  },
  {
    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
    title: 'Modern Multimedia Lecture Hall',
  },
  {
    url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
    title: 'Central University Library & Digital Archives',
  },
  {
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    title: 'Advanced Science & Computing Laboratories',
  },
  {
    url: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1200&q=80',
    title: 'Student Innovation Center & Recreation Hub',
  },
];

const getUniversityFromShortlist = (item: Shortlist | null): University | null => {
  if (!item) return null;
  const populated =
    typeof item.universityId === 'object' && item.universityId !== null
      ? (item.universityId as any)
      : null;

  return {
    _id: populated?._id || (typeof item.universityId === 'string' ? item.universityId : item._id),
    name: populated?.name || item.universityName,
    country: populated?.country || item.country,
    state: populated?.state,
    city: populated?.city || (item.country === 'USA' ? 'California' : item.country === 'UK' ? 'London' : item.country),
    address: populated?.address,
    website: populated?.website || 'https://www.google.com/search?q=' + encodeURIComponent(item.universityName),
    ranking: populated?.ranking || 49,
    customComment: populated?.customComment,
    logoUrl: populated?.logoUrl,
    bannerUrl: populated?.bannerUrl || DEFAULT_CAMPUS_GALLERY[0].url,
    description:
      populated?.description ||
      `Premier academic institution renowned for research excellence, state-of-the-art facilities, and exceptional graduate employability in ${item.country}.`,
    galleryPhotos:
      populated?.galleryPhotos && populated.galleryPhotos.length > 0
        ? populated.galleryPhotos
        : DEFAULT_CAMPUS_GALLERY.map((p) => p.url),
    overview:
      populated?.overview ||
      `${item.universityName} offers comprehensive academic programs structured for international career success, supported by distinguished faculty and industry partnerships.`,
    campusFacilities: populated?.campusFacilities || [
      'Research Libraries',
      'Computer Labs',
      'Student Residence',
      'Sports Complex',
      'Career Placement Center',
    ],
    establishedYear: populated?.establishedYear || 1868,
    acceptanceRate: populated?.acceptanceRate || '22%',
    averageTuitionFee:
      populated?.averageTuitionFee ||
      (item.annualFee ? `${item.currency || '$'} ${item.annualFee.toLocaleString()} / Year` : '$28,000 / Year'),
    scholarshipInfo:
      populated?.scholarshipInfo ||
      'International merit and diversity scholarships up to $10,000 available for early applicants.',
    accommodationInfo:
      populated?.accommodationInfo || 'On-campus dormitories and certified university partner housing available.',
    generalRequirements:
      populated?.generalRequirements ||
      'Official academic transcripts, minimum IELTS 6.5 / TOEFL 85, and Statement of Purpose.',
    isActive: true,
  };
};

const getCoursesFromShortlist = (item: Shortlist | null): Course[] => {
  if (!item) return [];
  const populatedCourse =
    typeof item.courseId === 'object' && item.courseId !== null
      ? (item.courseId as any)
      : null;

  return [
    {
      _id: populatedCourse?._id || (typeof item.courseId === 'string' ? item.courseId : `${item._id}-course`),
      universityId:
        typeof item.universityId === 'object' && item.universityId !== null
          ? (item.universityId as any)._id
          : typeof item.universityId === 'string'
          ? item.universityId
          : '',
      universityName: item.universityName || populatedCourse?.universityName || '',
      country: item.country || populatedCourse?.country || '',
      title: item.courseTitle || populatedCourse?.title || 'Degree Program',
      level: populatedCourse?.level || 'Master',
      durationMonths: populatedCourse?.durationMonths || 24,
      annualFee: item.annualFee || populatedCourse?.annualFee || 28000,
      currency: item.currency || populatedCourse?.currency || 'USD',
      intakes: populatedCourse?.intakes || [item.intake || 'Fall 2026'],
      eligibilityRequirements:
        populatedCourse?.eligibilityRequirements || 'Bachelor degree with minimum GPA 3.0 or equivalent',
      description: populatedCourse?.description || 'Curriculum specifically selected based on your academic profile.',
    },
  ];
};

export const StudentPortalPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary active tab derived from URL query param: 'overview' | 'universities' | 'documents' | 'applications' | 'payments' | 'visa' | 'travel' | 'messages'
  const rawTabParam = searchParams.get('tab') || 'overview';
  // Backward compatibility: map legacy 'report' to 'overview'
  const activeTab = rawTabParam === 'report' ? 'overview' : rawTabParam;

  const handleTabChange = (tabKey: string) => {
    setSearchParams({ tab: tabKey });
  };

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJourneyExpanded, setIsJourneyExpanded] = useState(false);

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

  // Document filter in Document Locker
  const [docFilter, setDocFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');

  // Rich University Detail Modal & Showcase Selection
  const [isUnivDetailsOpen, setIsUnivDetailsOpen] = useState(false);
  const [selectedUnivItem, setSelectedUnivItem] = useState<Shortlist | null>(null);
  const [activeShowcaseId, setActiveShowcaseId] = useState<string | null>(null);

  // Identify confirmed choice (if student selected one)
  const confirmedChoice = useMemo(() => {
    return shortlists.find((s) => s.status === 'SELECTED_BY_STUDENT');
  }, [shortlists]);

  // Active showcase item (explicit user switch -> confirmed choice -> first shortlist item)
  const showcaseItem = useMemo(() => {
    if (activeShowcaseId) {
      const match = shortlists.find((s) => s._id === activeShowcaseId);
      if (match) return match;
    }
    if (confirmedChoice) return confirmedChoice;
    return shortlists[0] || null;
  }, [shortlists, activeShowcaseId, confirmedChoice]);

  const showcaseUniversity = useMemo(() => {
    return getUniversityFromShortlist(showcaseItem);
  }, [showcaseItem]);

  const modalUniversity = useMemo(() => {
    return getUniversityFromShortlist(selectedUnivItem || showcaseItem);
  }, [selectedUnivItem, showcaseItem]);

  const modalCourses = useMemo(() => {
    return getCoursesFromShortlist(selectedUnivItem || showcaseItem);
  }, [selectedUnivItem, showcaseItem]);

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

  // Student selects 1 preferred university
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
      success('Message sent to your advisor.');
    } catch (err: any) {
      error(err.message || 'Failed to send message');
    }
  };

  // Dynamic greeting based on time of day
  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Compute stage indexes and progress
  const currentStageIndex = STAGES_CONFIG.findIndex((s) => s.stage === lead?.stage);
  const activeStageIndex = currentStageIndex >= 0 ? currentStageIndex : 0;
  const activeStageNum = activeStageIndex + 1;
  const progressPercentage = Math.round((activeStageNum / STAGES_CONFIG.length) * 100);
  const counsellingSessions = lead?.counsellingSessions || [];
  const nextSession = counsellingSessions.find((s) => s.status === 'SCHEDULED') || null;

  // Mobile responsive refs for smooth touch auto-scrolling
  const stepperRef = useRef<HTMLDivElement>(null);
  const navBarRef = useRef<HTMLElement>(null);

  // Auto-center active stage on mobile
  useEffect(() => {
    if (stepperRef.current) {
      const activeEl = stepperRef.current.querySelector('.student-stepper-step.is-current') as HTMLElement;
      if (activeEl) {
        const containerWidth = stepperRef.current.offsetWidth;
        const stepLeft = activeEl.offsetLeft;
        const stepWidth = activeEl.offsetWidth;
        stepperRef.current.scrollTo({
          left: Math.max(0, stepLeft - containerWidth / 2 + stepWidth / 2),
          behavior: 'smooth',
        });
      }
    }
  }, [activeStageIndex]);

  // Auto-scroll active tab into view on mobile
  useEffect(() => {
    if (navBarRef.current) {
      const activeTabEl = navBarRef.current.querySelector('.student-nav-item.is-active') as HTMLElement;
      if (activeTabEl) {
        const containerWidth = navBarRef.current.offsetWidth;
        const tabLeft = activeTabEl.offsetLeft;
        const tabWidth = activeTabEl.offsetWidth;
        navBarRef.current.scrollTo({
          left: Math.max(0, tabLeft - containerWidth / 2 + tabWidth / 2),
          behavior: 'smooth',
        });
      }
    }
  }, [activeTab]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    if (docFilter === 'VERIFIED') {
      return documents.filter((d) => d.status === DocumentStatus.APPROVED || d.status === DocumentStatus.SUCCESSFUL);
    }
    if (docFilter === 'REJECTED') {
      return documents.filter((d) => d.status === DocumentStatus.REJECTED || d.status === DocumentStatus.FAILED);
    }
    if (docFilter === 'PENDING') {
      return documents.filter((d) => d.status === DocumentStatus.REQUESTED);
    }
    return documents;
  }, [documents, docFilter]);

  const verifiedDocsCount = documents.filter(
    (d) => d.status === DocumentStatus.APPROVED || d.status === DocumentStatus.SUCCESSFUL
  ).length;
  const rejectedDocsCount = documents.filter(
    (d) => d.status === DocumentStatus.REJECTED || d.status === DocumentStatus.FAILED
  ).length;
  const pendingDocsCount = documents.filter((d) => d.status === DocumentStatus.REQUESTED).length;

  // Dynamic Next Best Action Spotlight Data
  const spotlightAction = useMemo(() => {
    const stage = lead?.stage;
    if (stage === StudentStage.UNIVERSITY_SHORTLISTING) {
      return {
        label: 'Action Required',
        title: 'Select Your Preferred University Choice',
        desc: 'Your counsellor has prepared university recommendations. Choose your top program to unlock your document checklist.',
        btnText: 'Choose University',
        tab: 'universities',
        icon: <Building2 size={20} />,
      };
    }
    if (stage === StudentStage.DOCUMENT_COLLECTION || pendingDocsCount > 0) {
      return {
        label: 'Action Required',
        title: `${pendingDocsCount} Mandatory Document${pendingDocsCount === 1 ? '' : 's'} Pending`,
        desc: 'Upload your academic transcripts, English proficiency test scores, and passport for counsellor verification.',
        btnText: 'Open Document Locker',
        tab: 'documents',
        icon: <FileText size={20} />,
      };
    }
    if (stage === StudentStage.OFFER_MANAGEMENT || offers.some((o) => !o.signedOfferUrl)) {
      return {
        label: 'Exciting Milestone',
        title: 'Review & Sign University Offer Letter',
        desc: 'Your official acceptance package is ready! Download the offer, sign the acceptance declaration, and upload your signed copy.',
        btnText: 'Review Offers',
        tab: 'applications',
        icon: <Award size={20} />,
      };
    }
    if (stage === StudentStage.FEE_PAYMENT || payments.some((p) => p.status === PaymentStatus.REQUESTED)) {
      return {
        label: 'Action Required',
        title: 'Submit Tuition Deposit Wire Receipt',
        desc: 'Secure your university admission seat by completing your tuition wire deposit and submitting bank reference proof.',
        btnText: 'Submit Fee Proof',
        tab: 'payments',
        icon: <CreditCard size={20} />,
      };
    }
    if (stage === StudentStage.VISA_PROCESSING) {
      return {
        label: 'In Progress',
        title: 'Embassy Visa Filing in Progress',
        desc: visa?.appointmentDate
          ? `Biometrics & Interview scheduled for ${new Date(visa.appointmentDate).toLocaleDateString()} at ${visa.vfsCenterLocation || 'VFS Embassy Center'}.`
          : 'Your counsellor is preparing your visa documentation dossier for embassy submission.',
        btnText: 'Track Visa Status',
        tab: 'visa',
        icon: <Stamp size={20} />,
      };
    }
    if (stage === StudentStage.PRE_DEPARTURE || stage === StudentStage.DEPARTURE) {
      return {
        label: 'Pre-Departure Guidance',
        title: 'Prepare for Travel & Orientation',
        desc: 'Join scheduled pre-departure workshops, confirm your student accommodation, and check health insurance coverage.',
        btnText: 'View Travel Details',
        tab: 'travel',
        icon: <Plane size={20} />,
      };
    }

    return {
      label: 'Current Status',
      title: 'Profile Evaluation Underway',
      desc: 'Our admissions counsellors are reviewing your academic background to find your best university options.',
      btnText: 'Message Advisor',
      tab: 'messages',
      icon: <Sparkles size={20} />,
    };
  }, [lead?.stage, pendingDocsCount, offers, payments, visa]);

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 16px auto', animation: 'spin 1s linear infinite' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Loading your student portal...</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Retrieving your academic journey and live application statuses.</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const studentDisplayName = lead?.name || user?.name || 'Student';
  const studentInitial = studentDisplayName.charAt(0).toUpperCase();

  return (
    <div className="student-portal-container">
      {/* =========================================================================
         1. HERO WELCOME & PROFILE BANNER
         ========================================================================= */}
      <section className="student-hero-banner" aria-label="Student Welcome">
        <div className="student-hero-content">
          <div className="student-hero-profile-group">
            <div className="student-hero-avatar-box">
              {studentInitial}
            </div>
            <div className="student-hero-text-block">
              <div className="student-hero-title-row">
                <h1 className="student-hero-greeting">
                  {greetingTime}, {studentDisplayName}!
                </h1>
                <Badge variant="primary">
                  {lead?.stage?.replace(/_/g, ' ') || 'PROFILE EVALUATION'}
                </Badge>
                {user?.role !== UserRole.STUDENT && (
                  <Badge variant="warning">Staff Preview Mode</Badge>
                )}
              </div>
              <div className="student-hero-meta-pills">
                <span className="student-hero-meta-pill">
                  <Globe size={13} color="var(--primary)" />
                  Target Country: <strong>{lead?.targetCountry || 'International'}</strong>
                </span>
                <span className="student-hero-meta-pill">
                  <GraduationCap size={13} color="var(--primary)" />
                  Program: <strong>{lead?.targetCourse || 'Undecided'}</strong>
                </span>
                {lead?.targetIntake && (
                  <span className="student-hero-meta-pill">
                    <Calendar size={13} color="var(--primary)" />
                    Intake: <strong>{lead.targetIntake}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="student-hero-actions">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={() => lead && window.open(`/api/v1/leads/${lead._id}/download-all-details`, '_blank')}
            >
              Download Application Dossier
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<MessageSquare size={14} />}
              onClick={() => handleTabChange('messages')}
            >
              Contact Advisor
            </Button>
          </div>
        </div>
      </section>

      {/* =========================================================================
         2. NEXT BEST ACTION SPOTLIGHT CARD
         ========================================================================= */}
      <section className="student-spotlight-card" aria-label="Current Action Required">
        <div className="student-spotlight-body">
          <div className="student-spotlight-icon-circle">
            {spotlightAction.icon}
          </div>
          <div className="student-spotlight-text">
            <span className="student-spotlight-label">{spotlightAction.label}</span>
            <h2 className="student-spotlight-title">{spotlightAction.title}</h2>
            <p className="student-spotlight-desc">{spotlightAction.desc}</p>
          </div>
        </div>
        <div className="student-spotlight-cta">
          <Button
            variant="primary"
            size="sm"
            icon={<ArrowRight size={14} />}
            onClick={() => handleTabChange(spotlightAction.tab)}
          >
            {spotlightAction.btnText}
          </Button>
        </div>
      </section>

      {/* =========================================================================
         3. JOURNEY LIFECYCLE PROGRESS & ACCORDION
         ========================================================================= */}
      <section className="student-lifecycle-card" aria-label="Journey Progress Roadmap">
        <div className="student-lifecycle-header">
          <div className="student-lifecycle-title-group">
            <Compass size={16} color="var(--primary)" />
            <h3 className="student-lifecycle-title">Admissions Journey Roadmap</h3>
            <span className="student-lifecycle-stage-pill">
              Stage {activeStageNum} of {STAGES_CONFIG.length}: {lead?.stage?.replace(/_/g, ' ')}
            </span>
          </div>
          <span className="student-lifecycle-percentage">{progressPercentage}% Completed</span>
        </div>

        {/* Stepper with progress line right through the 12 lifecycle checkpoints */}
        <div className="student-stepper-wrapper" ref={stepperRef}>
          <div className="student-stepper-track">
            {STAGES_CONFIG.map((item, index) => {
              const isCompleted = index < activeStageIndex;
              const isCurrent = index === activeStageIndex;
              const isLocked = index > activeStageIndex;
              const isLast = index === STAGES_CONFIG.length - 1;
              const cleanLabel = item.label.replace(/^\d+\.\s*/, '');

              return (
                <div
                  key={item.stage}
                  className={`student-stepper-step ${isCompleted ? 'is-completed' : ''} ${isCurrent ? 'is-current' : ''} ${isLocked ? 'is-locked' : ''}`}
                  title={isLocked ? `Stage ${index + 1}: ${cleanLabel} (${item.lockReason || 'Locked'})` : `Stage ${index + 1}: ${cleanLabel}`}
                  onClick={() => {
                    if (item.stage === StudentStage.PRELIMINARY_COUNSELLING) handleTabChange('messages');
                    else if (item.stage === StudentStage.UNIVERSITY_SHORTLISTING) handleTabChange('universities');
                    else if (item.stage === StudentStage.DOCUMENT_COLLECTION) handleTabChange('documents');
                    else if (item.stage === StudentStage.APPLICATION_SUBMISSION || item.stage === StudentStage.OFFER_MANAGEMENT) handleTabChange('applications');
                    else if (item.stage === StudentStage.FEE_PAYMENT) handleTabChange('payments');
                    else if (item.stage === StudentStage.VISA_PROCESSING) handleTabChange('visa');
                    else if (item.stage === StudentStage.PRE_DEPARTURE || item.stage === StudentStage.DEPARTURE || item.stage === StudentStage.ARRIVAL_CONFIRMED) handleTabChange('travel');
                  }}
                >
                  <div className="student-stepper-node-row">
                    {/* Left connecting segment */}
                    <div
                      className={`student-stepper-line ${
                        index > 0 && index <= activeStageIndex ? 'is-active' : ''
                      } ${index === 0 ? 'is-hidden' : ''}`}
                    />

                    {/* Checkpoint Circle */}
                    <div className="student-stepper-circle">
                      {isCompleted ? (
                        <Check size={13} strokeWidth={2.5} />
                      ) : isLocked ? (
                        <Lock size={11} />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Right connecting segment */}
                    <div
                      className={`student-stepper-line ${
                        index < activeStageIndex ? 'is-active' : ''
                      } ${isLast ? 'is-hidden' : ''}`}
                    />
                  </div>

                  {/* Checkpoint Label */}
                  <span className="student-stepper-label" title={cleanLabel}>
                    {cleanLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="student-accordion-btn"
          onClick={() => setIsJourneyExpanded(!isJourneyExpanded)}
          aria-expanded={isJourneyExpanded}
        >
          <span>{isJourneyExpanded ? 'Hide Detailed 12-Stage Stepper' : 'View Full 12-Stage Stepper Timeline'}</span>
          {isJourneyExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isJourneyExpanded && (
          <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            <StageStepper currentStage={lead?.stage || StudentStage.PROFILE_EVALUATION} />
          </div>
        )}
      </section>

      {/* =========================================================================
         4. PRIMARY NAVIGATION TAB BAR
         ========================================================================= */}
      <nav className="student-nav-bar" ref={navBarRef} aria-label="Student Portal Sections">
        <button
          type="button"
          className={`student-nav-item ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          <LayoutDashboard size={15} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`student-nav-item ${activeTab === 'universities' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('universities')}
        >
          <Building2 size={15} />
          <span>Universities</span>
          {shortlists.length > 0 && <span className="student-nav-badge">{shortlists.length}</span>}
        </button>

        <button
          type="button"
          className={`student-nav-item ${activeTab === 'documents' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('documents')}
        >
          <FileText size={15} />
          <span>Document Locker</span>
          {documents.length > 0 && (
            <span className="student-nav-badge">
              {verifiedDocsCount}/{documents.length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`student-nav-item ${activeTab === 'applications' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('applications')}
        >
          <Award size={15} />
          <span>Applications & Offers</span>
          {offers.length > 0 && <span className="student-nav-badge">{offers.length} Offer{offers.length === 1 ? '' : 's'}</span>}
        </button>

        <button
          type="button"
          className={`student-nav-item ${activeTab === 'payments' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('payments')}
        >
          <CreditCard size={15} />
          <span>Tuition & Fees</span>
          {payments.length > 0 && <span className="student-nav-badge">{payments.length}</span>}
        </button>

        <button
          type="button"
          className={`student-nav-item ${activeTab === 'visa' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('visa')}
        >
          <Stamp size={15} />
          <span>Visa Tracking</span>
          {visa?.status && <span className="student-nav-badge">{visa.status.replace(/_/g, ' ')}</span>}
        </button>

        <button
          type="button"
          className={`student-nav-item ${activeTab === 'travel' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('travel')}
        >
          <Plane size={15} />
          <span>Travel & Orientation</span>
          {orientations.length > 0 && <span className="student-nav-badge">{orientations.length}</span>}
        </button>

        <button
          type="button"
          className={`student-nav-item ${activeTab === 'messages' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('messages')}
        >
          <MessageSquare size={15} />
          <span>Advisor & Chat</span>
          {messages.length > 0 && <span className="student-nav-badge">{messages.length}</span>}
        </button>
      </nav>

      {/* =========================================================================
         TAB 1: OVERVIEW (BENTO GRID DASHBOARD COMMAND CENTER)
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 6 Bento Grid Summary Cards */}
          <div className="student-bento-grid">
            {/* Bento Card 1: Universities */}
            <div className="student-bento-card" onClick={() => handleTabChange('universities')}>
              <div className="student-bento-card-top">
                <div className="student-bento-icon-box blue">
                  <Building2 size={20} />
                </div>
                <Badge variant={shortlists.some((s) => s.status === 'SELECTED_BY_STUDENT') ? 'success' : 'primary'}>
                  {shortlists.some((s) => s.status === 'SELECTED_BY_STUDENT') ? 'Choice Selected' : `${shortlists.length} Shortlisted`}
                </Badge>
              </div>
              <div className="student-bento-card-middle">
                <span className="student-bento-metric">{shortlists.length}</span>
                <span className="student-bento-label">Recommended Programs</span>
                <p className="student-bento-subtext">
                  {shortlists.some((s) => s.status === 'SELECTED_BY_STUDENT')
                    ? `Selected: ${shortlists.find((s) => s.status === 'SELECTED_BY_STUDENT')?.universityName}`
                    : 'Review curated options and lock your preferred choice.'}
                </p>
              </div>
              <div className="student-bento-card-footer">
                <span>View Shortlists <ArrowRight size={13} /></span>
              </div>
            </div>

            {/* Bento Card 2: Document Locker */}
            <div className="student-bento-card" onClick={() => handleTabChange('documents')}>
              <div className="student-bento-card-top">
                <div className="student-bento-icon-box green">
                  <FileText size={20} />
                </div>
                <Badge variant={rejectedDocsCount > 0 ? 'danger' : pendingDocsCount > 0 ? 'warning' : 'success'}>
                  {rejectedDocsCount > 0 ? `${rejectedDocsCount} Resubmit` : `${verifiedDocsCount}/${documents.length} Verified`}
                </Badge>
              </div>
              <div className="student-bento-card-middle">
                <span className="student-bento-metric">{verifiedDocsCount} / {documents.length || 0}</span>
                <span className="student-bento-label">Documents Verified</span>
                <p className="student-bento-subtext">
                  {pendingDocsCount > 0
                    ? `${pendingDocsCount} mandatory document(s) awaiting your upload.`
                    : 'All submitted documents verified by admissions.'}
                </p>
              </div>
              <div className="student-bento-card-footer">
                <span>Manage Locker <ArrowRight size={13} /></span>
              </div>
            </div>

            {/* Bento Card 3: Applications & Offers */}
            <div className="student-bento-card" onClick={() => handleTabChange('applications')}>
              <div className="student-bento-card-top">
                <div className="student-bento-icon-box purple">
                  <Award size={20} />
                </div>
                <Badge variant={offers.length > 0 ? 'success' : 'neutral'}>
                  {offers.length > 0 ? `${offers.length} Offer Letter(s)` : `${applications.length} Applied`}
                </Badge>
              </div>
              <div className="student-bento-card-middle">
                <span className="student-bento-metric">{applications.length}</span>
                <span className="student-bento-label">Submitted Applications</span>
                <p className="student-bento-subtext">
                  {offers.length > 0
                    ? `Official offer received from ${offers[0]?.universityName || 'University'}.`
                    : 'Applications filed and tracking university review.'}
                </p>
              </div>
              <div className="student-bento-card-footer">
                <span>Check Offers <ArrowRight size={13} /></span>
              </div>
            </div>

            {/* Bento Card 4: Tuition & Payments */}
            <div className="student-bento-card" onClick={() => handleTabChange('payments')}>
              <div className="student-bento-card-top">
                <div className="student-bento-icon-box amber">
                  <CreditCard size={20} />
                </div>
                <Badge variant={payments.some((p) => p.status === PaymentStatus.REQUESTED) ? 'warning' : 'neutral'}>
                  {payments.filter((p) => p.status === PaymentStatus.VERIFIED).length}/{payments.length} Verified
                </Badge>
              </div>
              <div className="student-bento-card-middle">
                <span className="student-bento-metric">{payments.length}</span>
                <span className="student-bento-label">Tuition Deposit Invoices</span>
                <p className="student-bento-subtext">
                  {payments.some((p) => p.status === PaymentStatus.REQUESTED)
                    ? 'Tuition deposit wire transfer pending submission.'
                    : 'Fee invoices and bank receipts recorded.'}
                </p>
              </div>
              <div className="student-bento-card-footer">
                <span>Payment Details <ArrowRight size={13} /></span>
              </div>
            </div>

            {/* Bento Card 5: Visa Tracking */}
            <div className="student-bento-card" onClick={() => handleTabChange('visa')}>
              <div className="student-bento-card-top">
                <div className="student-bento-icon-box sky">
                  <Stamp size={20} />
                </div>
                <Badge variant={visa?.status === 'APPROVED' ? 'success' : visa?.appointmentDate ? 'info' : 'neutral'}>
                  {visa?.status ? visa.status.replace(/_/g, ' ') : 'Pending'}
                </Badge>
              </div>
              <div className="student-bento-card-middle">
                <span className="student-bento-metric" style={{ fontSize: '18px' }}>
                  {visa?.visaNumber || (visa?.status ? visa.status.replace(/_/g, ' ') : 'Under Preparation')}
                </span>
                <span className="student-bento-label">Visa & Embassy Record</span>
                <p className="student-bento-subtext">
                  {visa?.appointmentDate
                    ? `Appointment: ${new Date(visa.appointmentDate).toLocaleDateString()}`
                    : `Destination: ${visa?.country || lead?.targetCountry || 'International'}`}
                </p>
              </div>
              <div className="student-bento-card-footer">
                <span>Embassy Timeline <ArrowRight size={13} /></span>
              </div>
            </div>

            {/* Bento Card 6: Travel & Orientation */}
            <div className="student-bento-card" onClick={() => handleTabChange('travel')}>
              <div className="student-bento-card-top">
                <div className="student-bento-icon-box indigo">
                  <Plane size={20} />
                </div>
                <Badge variant="neutral">
                  {orientations.length} Session{orientations.length === 1 ? '' : 's'}
                </Badge>
              </div>
              <div className="student-bento-card-middle">
                <span className="student-bento-metric">
                  {travel?.flightStatus ? travel.flightStatus.replace(/_/g, ' ') : 'Planning'}
                </span>
                <span className="student-bento-label">Departure Readiness</span>
                <p className="student-bento-subtext">
                  Housing: {travel?.accommodationStatus || 'Pending'} • Health Insurance: {travel?.insuranceStatus || 'Pending'}
                </p>
              </div>
              <div className="student-bento-card-footer">
                <span>View Briefings <ArrowRight size={13} /></span>
              </div>
            </div>
          </div>

          {/* 2-Column: Assigned Counsellor & Pending Tasks */}
          <div className="student-dual-column">
            <CounsellorCard
              counsellor={lead?.counsellorId}
              onOpenChat={() => handleTabChange('messages')}
              nextSession={nextSession}
            />
            <PendingTasksCard tasks={tasks} loading={loading} />
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 2: UNIVERSITIES SHORTLIST
         ========================================================================= */}
      {activeTab === 'universities' && (
        <div className="student-univ-page-container">
          {/* Header */}
          <div className="student-univ-page-header">
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="var(--primary)" /> Shortlisted Universities & Degree Programs
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                Review recommended institutions curated by your advisor. Confirm your top choice to unlock the document checklist.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {confirmedChoice && (
                <Badge variant="success">✓ Confirmed: {confirmedChoice.universityName}</Badge>
              )}
              <Badge variant="primary">{shortlists.length} Programs Shortlisted</Badge>
            </div>
          </div>

          {shortlists.length === 0 ? (
            <div className="card">
              <div className="student-tasks-empty-state">
                <div className="student-tasks-empty-icon" style={{ background: '#EFF6FF', color: 'var(--primary)' }}>
                  <Building2 size={32} />
                </div>
                <h4 className="student-tasks-empty-title">Curating Your University Shortlist</h4>
                <p className="student-tasks-empty-subtext">
                  Your education counsellor is analyzing your academic background and test scores to curate top-tier university recommendations.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Full-Page University Showcase Hero Card (Matching UniversityDetailsModal design from user screenshot) */}
              {showcaseUniversity && showcaseItem && (
                <div className="student-univ-showcase-card">
                  {/* Top Campus Cover Banner */}
                  <div className="student-univ-showcase-banner">
                    <img
                      src={showcaseUniversity.bannerUrl}
                      alt={showcaseUniversity.name}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {/* Verified Partner Badge */}
                    <div className="student-univ-partner-badge">
                      <CheckCircle2 size={13} /> Verified Partner Institution
                    </div>
                    {/* Global Ranking Chip */}
                    <div className="student-univ-ranking-chip">
                      <Award size={13} /> Global Rank #{showcaseUniversity.ranking || 49}
                    </div>
                  </div>

                  {/* Showcase Body */}
                  <div className="student-univ-showcase-body">
                    {/* Top Row: Pop-Out Logo & Action Buttons */}
                    <div className="student-univ-showcase-header">
                      <div className="student-univ-showcase-logo">
                        {showcaseUniversity.logoUrl ? (
                          <img
                            src={showcaseUniversity.logoUrl}
                            alt={showcaseUniversity.name}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="student-univ-showcase-logo-fallback">
                            {showcaseUniversity.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="student-univ-showcase-actions">
                        {showcaseUniversity.website && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<ExternalLink size={13} />}
                            onClick={() => window.open(showcaseUniversity.website, '_blank')}
                          >
                            Official Website
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Eye size={13} />}
                          onClick={() => {
                            setSelectedUnivItem(showcaseItem);
                            setIsUnivDetailsOpen(true);
                          }}
                        >
                          View Full Specifications
                        </Button>
                        {showcaseItem.status === 'SELECTED_BY_STUDENT' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled
                            style={{ backgroundColor: '#10B981', borderColor: '#10B981', cursor: 'default' }}
                            icon={<Check size={13} />}
                          >
                            Confirmed Choice ✓
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<CheckCircle2 size={13} />}
                            onClick={() => handleSelectUniversity(showcaseItem._id)}
                          >
                            Confirm Selection
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* University Name & Location */}
                    <div className="student-univ-showcase-meta">
                      <h2 className="student-univ-showcase-title">{showcaseUniversity.name}</h2>
                      <div className="student-univ-showcase-location">
                        <MapPin size={15} color="var(--primary)" />
                        <span>{[showcaseUniversity.city, showcaseUniversity.state, showcaseUniversity.country].filter(Boolean).join(', ')}</span>
                      </div>
                    </div>

                    {/* 4-Stat Box with Dividers */}
                    <div className="student-univ-stats-strip">
                      <div className="student-univ-stat-col">
                        <span className="student-univ-stat-label">GLOBAL RANK</span>
                        <span className="student-univ-stat-val gold">
                          <Award size={15} /> #{showcaseUniversity.ranking || 49}
                        </span>
                      </div>
                      <div className="student-univ-stat-col">
                        <span className="student-univ-stat-label">ACCEPTANCE</span>
                        <span className="student-univ-stat-val blue">
                          <Percent size={15} /> {showcaseUniversity.acceptanceRate || '22%'}
                        </span>
                      </div>
                      <div className="student-univ-stat-col">
                        <span className="student-univ-stat-label">ESTABLISHED</span>
                        <span className="student-univ-stat-val">
                          <Calendar size={15} color="var(--text-secondary)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                          {showcaseUniversity.establishedYear || 1868}
                        </span>
                      </div>
                      <div className="student-univ-stat-col">
                        <span className="student-univ-stat-label">OFFERED COURSES</span>
                        <span className="student-univ-stat-val blue">
                          <GraduationCap size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                          {shortlists.filter(s => (s.universityId as any)?._id === (showcaseUniversity as any)._id || s.universityName === showcaseUniversity.name).length || 1} Programs
                        </span>
                      </div>
                    </div>

                    {/* Campus & Classroom Gallery Strip */}
                    <div className="student-univ-gallery-section">
                      <div className="student-univ-gallery-header">
                        <h4 className="student-univ-gallery-title">
                          <Sparkles size={16} color="var(--primary)" /> Campus & Classroom Gallery
                        </h4>
                        <span className="student-univ-gallery-count">
                          {(showcaseUniversity.galleryPhotos || DEFAULT_CAMPUS_GALLERY).length} Photos Available
                        </span>
                      </div>
                      <div className="student-univ-gallery-grid">
                        {(showcaseUniversity.galleryPhotos && showcaseUniversity.galleryPhotos.length > 0
                          ? showcaseUniversity.galleryPhotos.slice(0, 3)
                          : DEFAULT_CAMPUS_GALLERY.slice(0, 3).map((p) => p.url)
                        ).map((url, idx) => (
                          <div
                            key={idx}
                            className="student-univ-gallery-thumb"
                            onClick={() => {
                              setSelectedUnivItem(showcaseItem);
                              setIsUnivDetailsOpen(true);
                            }}
                            title="Click to explore interactive campus gallery"
                          >
                            <img src={url} alt={`${showcaseUniversity.name} campus ${idx + 1}`} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shortlisted Degree Program Highlight Strip */}
                    <div
                      style={{
                        padding: '16px 20px',
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        border: '1px solid var(--border-color, #E5E7EB)',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '14px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Curated Program For You
                        </div>
                        <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 2px 0' }}>
                          {showcaseItem.courseTitle}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span><strong>Intake:</strong> {showcaseItem.intake}</span>
                          <span>•</span>
                          <span><strong>Tuition:</strong> {showcaseItem.annualFee ? `${showcaseItem.currency || '$'} ${showcaseItem.annualFee.toLocaleString()} / Year` : 'Tuition on request'}</span>
                          <span>•</span>
                          <span><strong>Destination:</strong> {showcaseItem.country}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <StatusBadge status={showcaseItem.status} />
                        {showcaseItem.status !== 'SELECTED_BY_STUDENT' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSelectUniversity(showcaseItem._id)}
                          >
                            Select This Program
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* All Shortlisted Recommendations Grid (Counsellor-Dashboard Card Style) */}
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={18} color="var(--primary)" /> All Recommended Universities ({shortlists.length})
                  </h3>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Click any card to inspect or switch featured preview
                  </span>
                </div>

                <div className="student-counsellor-cards-grid">
                  {shortlists.map((s) => {
                    const isSelected = s.status === 'SELECTED_BY_STUDENT';
                    const isShowcased = showcaseItem?._id === s._id;
                    const uni = getUniversityFromShortlist(s);

                    return (
                      <div
                        key={s._id}
                        className={`student-counsellor-uni-card ${isShowcased ? 'is-active-featured' : ''} ${isSelected ? 'is-confirmed-choice' : ''}`}
                        onClick={() => setActiveShowcaseId(s._id)}
                      >
                        {/* 130px Cover Banner */}
                        <div className="student-uni-card-banner">
                          {uni?.bannerUrl ? (
                            <img
                              src={uni.bannerUrl}
                              alt={s.universityName}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Building2 size={40} color="rgba(255,255,255,0.2)" />
                            </div>
                          )}

                          {/* Global Ranking Chip on Banner */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: 'rgba(15, 23, 42, 0.8)',
                              backdropFilter: 'blur(4px)',
                              color: '#FBBF24',
                              padding: '3px 9px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              border: '1px solid rgba(251, 191, 36, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                              zIndex: 10,
                            }}
                          >
                            <Award size={11} color="#FBBF24" />
                            <span>#{uni?.ranking || 49} Global</span>
                          </div>
                        </div>

                        {/* Pop-Out Logo (56px) */}
                        <div className="student-uni-card-logo">
                          {uni?.logoUrl ? (
                            <img
                              src={uni.logoUrl}
                              alt={s.universityName}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {s.universityName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="student-uni-card-body">
                          <div>
                            <h4
                              style={{
                                fontSize: '15px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                margin: 0,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={s.universityName}
                            >
                              {s.universityName}
                            </h4>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                              <MapPin size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {[uni?.city, s.country].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          </div>

                          <div style={{ marginTop: '4px', padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.courseTitle}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span>Intake: <strong>{s.intake}</strong></span>
                              <span>Fee: <strong>{s.annualFee ? `${s.currency || '$'}${s.annualFee.toLocaleString()}/yr` : '—'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="student-uni-card-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ flex: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUnivItem(s);
                              setIsUnivDetailsOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                          {isSelected ? (
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <Badge variant="success">✓ Confirmed Choice</Badge>
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              style={{ flex: 1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectUniversity(s._id);
                              }}
                            >
                              Select Choice
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
         TAB 3: DOCUMENT LOCKER
         ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={18} color="var(--primary)" /> Document Locker & Credential Checklist
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Upload verified PDFs or scans of your academic transcripts, test certificates, and identification.
              </p>
            </div>
            <Badge variant="primary">
              {verifiedDocsCount} / {documents.length} Verified
            </Badge>
          </div>

          {/* Document Summary Strip */}
          <div className="student-docs-summary-strip">
            <div className="student-doc-summary-pill" onClick={() => setDocFilter('ALL')} style={{ cursor: 'pointer', borderColor: docFilter === 'ALL' ? 'var(--primary)' : undefined }}>
              <div className="student-doc-summary-icon" style={{ background: '#EFF6FF', color: 'var(--primary)' }}>
                <FileText size={16} />
              </div>
              <div>
                <div className="student-doc-summary-count">{documents.length}</div>
                <div className="student-doc-summary-label">All Documents</div>
              </div>
            </div>

            <div className="student-doc-summary-pill" onClick={() => setDocFilter('PENDING')} style={{ cursor: 'pointer', borderColor: docFilter === 'PENDING' ? 'var(--warning)' : undefined }}>
              <div className="student-doc-summary-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                <Clock size={16} />
              </div>
              <div>
                <div className="student-doc-summary-count">{pendingDocsCount}</div>
                <div className="student-doc-summary-label">Awaiting Upload</div>
              </div>
            </div>

            <div className="student-doc-summary-pill" onClick={() => setDocFilter('VERIFIED')} style={{ cursor: 'pointer', borderColor: docFilter === 'VERIFIED' ? 'var(--success)' : undefined }}>
              <div className="student-doc-summary-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div className="student-doc-summary-count">{verifiedDocsCount}</div>
                <div className="student-doc-summary-label">Verified & Approved</div>
              </div>
            </div>

            <div className="student-doc-summary-pill" onClick={() => setDocFilter('REJECTED')} style={{ cursor: 'pointer', borderColor: docFilter === 'REJECTED' ? 'var(--danger)' : undefined }}>
              <div className="student-doc-summary-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                <AlertCircle size={16} />
              </div>
              <div>
                <div className="student-doc-summary-count">{rejectedDocsCount}</div>
                <div className="student-doc-summary-label">Needs Re-upload</div>
              </div>
            </div>
          </div>

          <div className="student-table-responsive">
            <Table
              columns={[
                {
                  header: 'DOCUMENT TITLE',
                  render: (d) => (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{d.title}</strong>
                        {d.isMandatory ? (
                          <span style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 700, background: '#FEF2F2', padding: '1px 6px', borderRadius: '4px' }}>
                            Mandatory
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Optional</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Category: {d.category}
                        {d.description ? ` • Instructions: ${d.description}` : ''}
                      </div>
                      {(d.status === DocumentStatus.REJECTED || d.status === DocumentStatus.FAILED) && (
                        <div className="student-doc-rejection-callout">
                          <strong>Counsellor Feedback:</strong> {d.rejectionReason || 'Document unreadable or invalid format. Please re-upload.'}
                        </div>
                      )}
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--primary)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12.5px',
                          }}
                        >
                          <FileText size={14} />
                          {d.originalFileName || 'View Uploaded File'}
                        </a>
                        {d.fileSize && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {(d.fileSize / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Pending Submission</span>
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
              data={filteredDocuments}
              emptyMessage={
                docFilter === 'ALL'
                  ? 'No documents have been requested yet. Your counsellor will notify you when checklists are generated.'
                  : `No documents found matching the filter "${docFilter}".`
              }
            />
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 4: APPLICATIONS & OFFERS
         ========================================================================= */}
      {activeTab === 'applications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Official University Offer Letters */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="var(--primary)" /> Official University Offer Letters
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Download official admission letters and submit signed acceptance declarations to confirm your enrollment.
                </p>
              </div>
              <Badge variant="primary">{offers.length} Offer{offers.length === 1 ? '' : 's'}</Badge>
            </div>

            <Table
              columns={[
                {
                  header: 'UNIVERSITY & COURSE',
                  render: (o) => (
                    <div>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{o.universityName}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '2px' }}>{o.courseTitle}</div>
                    </div>
                  ),
                },
                {
                  header: 'OFFER TYPE',
                  render: (o) => <Badge variant={o.offerType === 'UNCONDITIONAL' ? 'success' : 'warning'}>{o.offerType || 'OFFICIAL'}</Badge>,
                },
                {
                  header: 'ORIGINAL OFFER PDF',
                  render: (o) => (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <a
                        href={o.originalOfferUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px' }}
                      >
                        <Eye size={14} /> View
                      </a>
                      <a
                        href={`/api/v1/offers/${o._id}/download/original`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px' }}
                      >
                        <Download size={13} /> Download PDF
                      </a>
                    </div>
                  ),
                },
                {
                  header: 'SIGNED ACCEPTANCE COPY',
                  render: (o) =>
                    o.signedOfferUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} /> Signed Copy Uploaded
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Download size={12} />}
                          onClick={() => window.open(`/api/v1/offers/${o._id}/download/signed`, '_blank')}
                        >
                          Download Acceptance
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
              emptyMessage="No university offer letters available yet. Track your submitted applications below."
            />
          </div>

          {/* Submitted Applications */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={18} color="var(--primary)" /> Submitted University Applications
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Track institutional review, application reference numbers, and intake timelines.
                </p>
              </div>
              <Badge variant="neutral">{applications.length} Submitted</Badge>
            </div>

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
                  header: 'SUBMISSION DATE',
                  render: (a) => (a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'),
                },
              ]}
              data={applications}
              emptyMessage="No applications submitted to universities yet."
            />
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 5: TUITION & PAYMENTS
         ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="var(--primary)" /> Tuition Deposit & Institutional Fee Payments
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                View requested enrollment fees, bank wire transfer instructions, and upload proof of payment.
              </p>
            </div>
            <Badge variant="primary">{payments.length} Payments</Badge>
          </div>

          <div className="student-table-responsive">
            <Table
              columns={[
                { header: 'PAYMENT DESCRIPTION', accessor: 'title' },
                {
                  header: 'AMOUNT DUE',
                  render: (p) => (
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                      {p.currency} {p.amount.toLocaleString()}
                    </strong>
                  ),
                },
                {
                  header: 'PAYMENT STATUS',
                  render: (p) => <StatusBadge status={p.status} />,
                },
                {
                  header: 'RECEIPT & PROOF',
                  render: (p) =>
                    p.proofUrl ? (
                      <a
                        href={p.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                      >
                        <FileCheck size={14} /> Receipt Attached
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Awaiting Wire Receipt</span>
                    ),
                },
                {
                  header: 'ACTION',
                  align: 'right',
                  render: (p) => (
                    <Button
                      variant={p.status === PaymentStatus.VERIFIED ? 'ghost' : 'primary'}
                      size="sm"
                      disabled={p.status === PaymentStatus.VERIFIED}
                      onClick={() => {
                        setSelectedPayment(p);
                        setIsSubmitPaymentOpen(true);
                      }}
                    >
                      {p.status === PaymentStatus.VERIFIED ? 'Verified ✓' : p.proofUrl ? 'Re-upload Proof' : 'Submit Bank Proof'}
                    </Button>
                  ),
                },
              ]}
              data={payments}
              emptyMessage="No tuition fee deposits requested yet."
            />
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 6: VISA TRACKING
         ========================================================================= */}
      {activeTab === 'visa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="student-dual-column">
            {/* Visa Record Details */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stamp size={18} color="var(--primary)" /> Visa Filing & Embassy Application
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Destination Country:</span>
                  <strong>{visa?.country || lead?.targetCountry || 'International'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Target University:</span>
                  <strong>{visa?.universityName || 'University Destination'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Embassy Filing Status:</span>
                  <StatusBadge status={visa?.status || 'PENDING'} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Visa Grant / Application #:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>
                    {visa?.visaNumber || visa?.applicationId || 'Under Processing'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Filing Submission Date:</span>
                  <strong>{visa?.submissionDate ? new Date(visa.submissionDate).toLocaleDateString() : 'In Progress'}</strong>
                </div>

                {visa?.appointmentDate && (
                  <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ color: '#0369A1', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={15} /> Embassy Biometrics & Interview
                    </div>
                    <div style={{ color: '#0C4A6E', fontSize: '13.5px', fontWeight: 600, marginTop: '4px' }}>
                      {new Date(visa.appointmentDate).toLocaleString()}
                    </div>
                    {visa.vfsCenterLocation && (
                      <div style={{ fontSize: '12px', color: '#0369A1', marginTop: '2px' }}>
                        Center: {visa.vfsCenterLocation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Official Embassy Decision or Checklist */}
            {visa?.decision ? (
              <div
                className="card"
                style={{
                  border: visa.decision === 'APPROVED' ? '1px solid rgba(22, 163, 74, 0.4)' : '1px solid rgba(220, 38, 38, 0.4)',
                  backgroundColor: visa.decision === 'APPROVED' ? '#F0FDF4' : '#FEF2F2',
                }}
              >
                <h3 className="card-title" style={{ color: visa.decision === 'APPROVED' ? '#15803D' : '#B91C1C', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {visa.decision === 'APPROVED' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {visa.decision === 'APPROVED' ? 'Embassy Decision: Visa Granted' : 'Embassy Decision: Visa Refused'}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginTop: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Decision Recorded:</span>{' '}
                    <strong>{visa.decisionDate ? new Date(visa.decisionDate).toLocaleDateString() : 'Confirmed'}</strong>
                  </div>
                  {visa.studentInstructions && (
                    <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase' }}>
                        Counsellor Briefing Notes:
                      </span>
                      <div style={{ marginTop: '4px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {visa.studentInstructions}
                      </div>
                    </div>
                  )}
                  {visa.decisionDocumentUrl && (
                    <div style={{ marginTop: '6px' }}>
                      <a
                        href={visa.decisionDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={14} /> Download Official Decision Document
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="var(--primary)" /> Visa Interview & Biometrics Checklist
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--success)" /> Original Passport with 6+ Months Validity
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--success)" /> Official Confirmation of Acceptance for Studies (CAS / I-20)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--success)" /> Tuition Fee Deposit Wire Receipt
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--success)" /> Bank Financial Statements & Solvency Certificate
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--success)" /> Biometric Enrollment Appointment Letter
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline History */}
          {visa?.statusHistory && visa.statusHistory.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '14px', fontSize: '14px' }}>
                Visa Status Updates & Timeline
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {visa.statusHistory.slice().reverse().map((hist: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      fontSize: '13px',
                      paddingBottom: '10px',
                      borderBottom: index !== visa.statusHistory!.length - 1 ? '1px dashed var(--border-color)' : 'none',
                    }}
                  >
                    <StatusBadge status={hist.status} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {hist.studentInstructions || hist.remarks || `Status transitioned to ${hist.status.replace(/_/g, ' ')}`}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(hist.changedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
         TAB 7: TRAVEL & PRE-DEPARTURE ORIENTATION
         ========================================================================= */}
      {activeTab === 'travel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="student-dual-column">
            {/* Flight Ticket Card */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plane size={18} color="var(--primary)" /> Flight & Departure Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Flight Ticket Status:</span>
                  <Badge variant="neutral">{travel?.flightStatus || 'PENDING'}</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Departure Airport:</span>
                  <strong>{travel?.departureAirport || 'Home Airport'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Arrival Destination Date:</span>
                  <strong>{travel?.arrivalDate ? new Date(travel.arrivalDate).toLocaleDateString() : 'TBD'}</strong>
                </div>
              </div>
            </div>

            {/* Accommodation & Insurance Card */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} color="var(--primary)" /> Accommodation & Health Insurance
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Housing / Student Dormitory:</span>
                  <Badge variant={travel?.accommodationStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                    {travel?.accommodationStatus || 'PENDING'}
                  </Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Overseas Student Health Cover:</span>
                  <Badge variant={travel?.insuranceStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                    {travel?.insuranceStatus || 'PENDING'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Orientation Sessions */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="var(--primary)" /> Pre-Departure Orientation Workshops
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Join destination workshops on foreign exchange, airport pickup, campus registration, and local student life.
                </p>
              </div>
              <Badge variant="primary">{orientations.length} Workshops</Badge>
            </div>

            <Table
              columns={[
                {
                  header: 'SESSION TITLE & FOCUS',
                  render: (o) => (
                    <div>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>{o.title}</strong>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
                      <a
                        href={o.googleMeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Video size={13} /> Join Live Meet <ExternalLink size={11} />
                      </a>
                    ) : (
                      'In-Person Session'
                    ),
                },
                {
                  header: 'TOPICS & AGENDA',
                  render: (o) => o.description || 'Pre-departure guidance',
                },
              ]}
              data={orientations}
              emptyMessage="No pre-departure orientation sessions scheduled at this moment."
            />
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 8: COUNSELLOR & DIRECT MESSAGES
         ========================================================================= */}
      {activeTab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Scheduled Preliminary Counselling Meetings */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="var(--primary)" /> 1-on-1 Counselling Consultations
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Join scheduled video meetings with your advisor and review preliminary consultation notes.
                </p>
              </div>
              <Badge variant="primary">{counsellingSessions.length} Consultations</Badge>
            </div>

            <Table
              columns={[
                {
                  header: 'ADVISOR',
                  render: (s: any) => (
                    <div>
                      <strong>{s.counsellorName || lead?.counsellorId?.name || 'Sarah Jenkins'}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Education Advisor</div>
                    </div>
                  ),
                },
                {
                  header: 'DATE & TIME',
                  render: (s: any) => (s.scheduledDate ? `${s.scheduledDate} at ${s.scheduledTime || 'TBD'}` : 'Scheduled'),
                },
                {
                  header: 'VIDEO CALL LINK',
                  render: (s: any) =>
                    s.googleMeetLink ? (
                      <a
                        href={s.googleMeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Video size={13} /> Join Call <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>In-Person / Phone</span>
                    ),
                },
                {
                  header: 'SESSION STATUS',
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
              emptyMessage="No 1-on-1 preliminary counselling meetings recorded yet."
            />
          </div>

          {/* Real-Time Chat Thread */}
          <div className="student-chat-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Conversation with {lead?.counsellorId?.name || 'Your Education Advisor'}
                  </h4>
                  <span style={{ fontSize: '11.5px', color: 'var(--success)', fontWeight: 600 }}>Active Direct Channel</span>
                </div>
              </div>
            </div>

            <div className="student-chat-messages-box">
              {messages.length === 0 ? (
                <div className="student-tasks-empty-state">
                  <div className="student-tasks-empty-icon" style={{ background: '#EFF6FF', color: 'var(--primary)' }}>
                    <MessageSquare size={28} />
                  </div>
                  <h5 className="student-tasks-empty-title">Start a Conversation</h5>
                  <p className="student-tasks-empty-subtext">
                    Have questions about university shortlists, SOP requirements, or visa deadlines? Type a message below to reach your advisor directly.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isStudent = m.senderRole === 'STUDENT';
                  return (
                    <div
                      key={m._id}
                      className={`student-chat-bubble ${isStudent ? 'student' : 'counsellor'}`}
                    >
                      <div className="student-chat-meta">
                        {m.senderName} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div>{m.content}</div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="form-input"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message or enquiry for your advisor..."
                style={{ flex: 1 }}
              />
              <Button type="submit" variant="primary" icon={<Send size={14} />}>
                Send
              </Button>
            </form>
          </div>
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
        title={`Upload Document: ${selectedDoc?.title || ''}`}
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
              {isUploadingDoc ? 'Uploading...' : 'Submit Document'}
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
                fontSize: '12.5px',
                color: 'var(--text-secondary)',
              }}
            >
              <strong>Advisor Instructions:</strong> {selectedDoc.description}
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

      {/* --- Student University & Course Detail Modal (Rich Counsellor-Grade Modal) --- */}
      <UniversityDetailsModal
        university={modalUniversity}
        courses={modalCourses}
        isOpen={isUnivDetailsOpen}
        onClose={() => setIsUnivDetailsOpen(false)}
        onSelectProgram={(course) => {
          if (!lead) return;
          const matchingShortlist = shortlists.find(
            (s) =>
              (typeof s.courseId === 'object' && (s.courseId as any)?._id === course._id) ||
              s.courseId === course._id ||
              s.courseTitle === course.title
          );
          if (matchingShortlist) {
            handleSelectUniversity(matchingShortlist._id);
            setIsUnivDetailsOpen(false);
          }
        }}
      />

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
        title={`Submit Payment Proof: ${selectedPayment?.title || ''}`}
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

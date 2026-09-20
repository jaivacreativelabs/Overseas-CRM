import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  UserCheck,
  PhoneCall,
  Video,
  FileSpreadsheet,
  GraduationCap,
  FileCheck,
  Send,
  Award,
  CreditCard,
  Stamp,
  Plane,
  Users,
  Compass,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { Modal } from '../Modal';
import { Badge } from '../Badge';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'journey' | 'roles' | 'faqs'>('journey');

  const stages = [
    {
      num: 1,
      title: 'Lead Capture & Assignment',
      icon: UserCheck,
      color: '#3B82F6',
      desc: 'Inquiries arrive from Website, Social Media, Referrals, or Walk-ins. Admin assigns a dedicated Counselor.',
      actor: 'Admin / Lead Source',
    },
    {
      num: 2,
      title: 'Contact Attempts & Follow-up',
      icon: PhoneCall,
      color: '#06B6D4',
      desc: 'Counselor calls student to understand study goals. If student requests a callback, a follow-up task is auto-created.',
      actor: 'Counselor',
    },
    {
      num: 3,
      title: 'Preliminary Counselling',
      icon: Video,
      color: '#8B5CF6',
      desc: '1-on-1 counseling via Google Meet. If student is Interested, their Student Portal account is automatically activated!',
      actor: 'Counselor + Student',
    },
    {
      num: 4,
      title: 'Profile Evaluation',
      icon: FileSpreadsheet,
      color: '#EC4899',
      desc: 'Academic credentials, test scores (IELTS/PTE/TOEFL/GRE), and budget are reviewed to match ideal countries and programs.',
      actor: 'Counselor',
    },
    {
      num: 5,
      title: 'University Shortlisting',
      icon: GraduationCap,
      color: '#F59E0B',
      desc: 'Counselor presents curated universities. Student reviews options in their portal and selects their top preferred choice.',
      actor: 'Counselor + Student',
    },
    {
      num: 6,
      title: 'Document Collection',
      icon: FileCheck,
      color: '#10B981',
      desc: 'Counselor requests required documents (Passport, Transcripts, SOP). Student uploads them; Counselor approves or requests re-upload.',
      actor: 'Student (Upload) ➔ Staff (Review)',
    },
    {
      num: 7,
      title: 'Application Submission',
      icon: Send,
      color: '#6366F1',
      desc: 'Application is officially lodged with the university. System tracks status from Submitted ➔ Under Review ➔ Decision.',
      actor: 'Counselor / Admin',
    },
    {
      num: 8,
      title: 'Offer Letter & Acceptance',
      icon: Award,
      color: '#14B8A6',
      desc: 'University issues offer letter. Student downloads, signs acceptance copy, and uploads it back to unlock the next stage.',
      actor: 'Student (Signs) ➔ Counselor (Accepts)',
    },
    {
      num: 9,
      title: 'Fee Payment & Verification',
      icon: CreditCard,
      color: '#EAB308',
      desc: 'Counselor issues tuition fee deposit instructions. Student submits bank wire receipt/screenshot for verified confirmation.',
      actor: 'Student ➔ Counselor Verification',
    },
    {
      num: 10,
      title: 'Visa Processing',
      icon: Stamp,
      color: '#F97316',
      desc: 'Counselor guides visa documentation & appointment filing. Once the embassy decides, status is updated and student is alerted.',
      actor: 'Counselor + Student',
    },
    {
      num: 11,
      title: 'Travel Support Checklist',
      icon: Plane,
      color: '#0284C7',
      desc: 'Tracking 3 critical items: 1) Accommodation Booking, 2) Flight Tickets, and 3) Travel Health Insurance.',
      actor: 'Counselor & Student',
    },
    {
      num: 12,
      title: 'Pre-Departure Orientation',
      icon: Compass,
      color: '#84CC16',
      desc: 'Briefing session covering life abroad, university enrollment, baggage allowance, foreign exchange, and emergency contacts.',
      actor: 'Counselor + Students',
    },
    {
      num: 13,
      title: 'Departure & Flight',
      icon: Plane,
      color: '#3B82F6',
      desc: 'Student embarks on their flight abroad. Departure date is recorded in the CRM.',
      actor: 'Admin / Counselor',
    },
    {
      num: 14,
      title: 'Arrival Confirmation & Support',
      icon: CheckCircle2,
      color: '#10B981',
      desc: 'Student safely lands and confirms arrival at destination university campus. Post-arrival check-ins commence.',
      actor: 'Student & Counselor',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎓 Platform User Guide & Stage Lifecycle" maxWidth="680px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('journey')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'journey' ? 'var(--primary)' : 'var(--bg-subtle)',
              color: activeTab === 'journey' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            🗺️ 14-Stage Student Journey
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'roles' ? 'var(--primary)' : 'var(--bg-subtle)',
              color: activeTab === 'roles' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            👥 Roles & Responsibilities
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('faqs')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'faqs' ? 'var(--primary)' : 'var(--bg-subtle)',
              color: activeTab === 'faqs' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            ❓ Quick FAQs
          </button>
        </div>

        {/* Tab 1: 14-Stage Student Journey */}
        {activeTab === 'journey' && (
          <div style={{ maxHeight: '460px', overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: '#EFF6FF', borderRadius: 'var(--radius-md)', border: '1px solid #BFDBFE', fontSize: '12.5px', color: '#1E40AF' }}>
              ℹ️ <strong>Stage-Gated Process:</strong> Each student progresses step-by-step. All mandatory actions in a stage must be satisfied before the next stage opens.
            </div>

            {stages.map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.num}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: st.color,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                        {st.num}. {st.title}
                      </span>
                      <Badge variant="neutral">{st.actor}</Badge>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {st.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Roles & Permissions */}
        {activeTab === 'roles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '460px', overflowY: 'auto' }}>
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>👑</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Owner Admin</strong>
                <Badge variant="danger">Root Superadmin</Badge>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                Has full operational and strategic control. Manages branch admins, system settings, master data, audit logs, and financial reconciliation. Strictly protected: cannot be deleted, deactivated, or demoted.
              </p>
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>🛡️</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Branch Admin</strong>
                <Badge variant="primary">Operations Manager</Badge>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                Manages branch counselors, assigns incoming leads, oversees document and visa compliance, and reviews operational KPI reports.
              </p>
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>🎓</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Counselor</strong>
                <Badge variant="warning">Student Advisor</Badge>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                Guides students from lead stage through departure. Logs contact attempts, conducts counselling sessions, manages shortlists, reviews documents, issues fee payment requests, tracks visas, and conducts orientations.
              </p>
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>👨‍🎓</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Student</strong>
                <Badge variant="success">Applicant</Badge>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                Self-service applicant portal. Students view real-time stage progress, choose their university, upload documents, sign offer letters, submit fee payment proofs, and chat with their counselor.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: FAQs */}
        {activeTab === 'faqs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '460px', overflowY: 'auto' }}>
            <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                ❓ How does a lead become an active student?
              </strong>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                When a counselor conducts a preliminary counselling session and marks the outcome as <strong>Interested</strong>, the CRM automatically converts the lead into an active student record and generates their student portal credentials.
              </p>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                ❓ What happens if a lead is marked "Not Interested"?
              </strong>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                The lead moves to <strong>Closed Lost</strong> with a mandatory recorded reason (e.g. Budget Constraints, Chose Other Agency). Counselors can easily reopen the lead if the student changes their mind later.
              </p>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                ❓ Can students upload multiple formats of documents?
              </strong>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Yes! PDF files, JPG, and PNG scans are accepted. Counselors review each file and can either approve it or request a clearer copy with specific feedback.
              </p>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                ❓ How does fee payment verification work?
              </strong>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Once an offer letter is accepted, the counselor issues a payment request. The student transfers funds to the university/agency and uploads their wire receipt screenshot. The counselor verifies the transaction in the CRM.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

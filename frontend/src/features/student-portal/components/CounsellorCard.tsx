import React from 'react';
import { MessageSquare, UserX, Mail, Phone, Calendar, ShieldCheck } from 'lucide-react';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';

interface CounsellorCardProps {
  counsellor?: { name?: string; email?: string; phone?: string; avatar?: string } | null;
  onOpenChat?: () => void;
  nextSession?: {
    scheduledDate?: string;
    scheduledTime?: string;
    googleMeetLink?: string;
  } | null;
}

export const CounsellorCard: React.FC<CounsellorCardProps> = ({
  counsellor,
  onOpenChat,
  nextSession,
}) => {
  if (!counsellor || !counsellor.name) {
    return (
      <div className="student-counsellor-card empty-state">
        <div className="student-counsellor-avatar-placeholder">
          <UserX size={20} />
        </div>
        <div className="student-counsellor-info">
          <div className="student-counsellor-title-row">
            <span className="student-counsellor-name">Counsellor Matching in Progress</span>
            <Badge variant="warning">Matching</Badge>
          </div>
          <p className="student-counsellor-subtext">
            Our admissions team is assigning a dedicated education advisor to guide your university applications.
          </p>
        </div>
      </div>
    );
  }

  const initials = counsellor.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="student-counsellor-card">
      <div className="student-counsellor-header">
        <div className="student-counsellor-avatar-wrapper">
          {counsellor.avatar ? (
            <img src={counsellor.avatar} alt={counsellor.name} className="student-counsellor-avatar-img" />
          ) : (
            <div className="student-counsellor-avatar-initials">{initials}</div>
          )}
          <span className="student-counsellor-status-dot" title="Active Advisor" />
        </div>

        <div className="student-counsellor-meta">
          <div className="student-counsellor-badge-row">
            <span className="student-counsellor-role">
              <ShieldCheck size={13} color="var(--primary)" />
              Dedicated Education Advisor
            </span>
            <span className="student-counsellor-online-badge">Online</span>
          </div>
          <h4 className="student-counsellor-name">{counsellor.name}</h4>

          <div className="student-counsellor-contact-list">
            {counsellor.email && (
              <a href={`mailto:${counsellor.email}`} className="student-counsellor-contact-item" title="Send Email">
                <Mail size={13} />
                <span>{counsellor.email}</span>
              </a>
            )}
            {counsellor.phone && (
              <a href={`tel:${counsellor.phone}`} className="student-counsellor-contact-item" title="Call Advisor">
                <Phone size={13} />
                <span>{counsellor.phone}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {nextSession && nextSession.scheduledDate && (
        <div className="student-counsellor-upcoming-session">
          <div className="student-counsellor-session-info">
            <Calendar size={14} color="var(--primary)" />
            <span>
              Next Consultation: <strong>{nextSession.scheduledDate}</strong> at {nextSession.scheduledTime || 'TBD'}
            </span>
          </div>
          {nextSession.googleMeetLink && (
            <a
              href={nextSession.googleMeetLink}
              target="_blank"
              rel="noreferrer"
              className="student-counsellor-meet-link"
            >
              Join Call
            </a>
          )}
        </div>
      )}

      {onOpenChat && (
        <div className="student-counsellor-action-row">
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenChat}
            className="student-card-btn-full"
            icon={<MessageSquare size={14} />}
          >
            Message Advisor
          </Button>
        </div>
      )}
    </div>
  );
};

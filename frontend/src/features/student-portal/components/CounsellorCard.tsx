import React from 'react';
import { UserCheck, MessageSquare, Clock, UserX } from 'lucide-react';
import { Badge } from '../../../components/Badge';

interface CounsellorCardProps {
  counsellor?: { name?: string; email?: string; phone?: string; avatar?: string } | null;
  onOpenChat?: () => void;
}

export const CounsellorCard: React.FC<CounsellorCardProps> = ({
  counsellor,
  onOpenChat,
}) => {
  if (!counsellor || !counsellor.name) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        >
          <UserX size={18} />
        </div>
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>No Counsellor Assigned</span>
            <Badge variant="warning">Pending</Badge>
          </div>
          <div style={{ color: 'var(--text-muted)', marginTop: '2px', fontSize: '11px' }}>
            Our team will pair you with a counsellor soon.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onOpenChat}
      title="Click to send a direct message to your counsellor"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-xs)',
        cursor: onOpenChat ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (onOpenChat) {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.backgroundColor = 'var(--primary-light)';
        }
      }}
      onMouseLeave={(e) => {
        if (onOpenChat) {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        }
      }}
    >
      {/* Icon / Avatar with Online Dot */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            fontWeight: 700,
            fontSize: '14px',
          }}
        >
          {counsellor.name.charAt(0).toUpperCase()}
        </div>
        <span
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: 'var(--success)',
            border: '2px solid #FFFFFF',
          }}
          title="Available"
        />
      </div>

      {/* Counsellor Info & Contextual Status Message */}
      <div style={{ fontSize: '12px', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Assigned Counsellor:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {counsellor.name}
          </span>
        </div>
        <div style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 500, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MessageSquare size={12} />
          <span>Available for review • Click to chat</span>
        </div>
      </div>
    </div>
  );
};


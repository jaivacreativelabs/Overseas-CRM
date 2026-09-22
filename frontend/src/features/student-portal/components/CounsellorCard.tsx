import React from 'react';
import { MessageSquare, UserX } from 'lucide-react';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';

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
        className="student-counsellor-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xs)',
          width: '100%',
          boxSizing: 'border-box',
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
        <div style={{ fontSize: '12px', flex: 1 }}>
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
      className="student-counsellor-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '10px 14px',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-xs)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        {/* Avatar with Online Dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            {counsellor.name.charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              border: '2px solid #FFFFFF',
            }}
            title="Available"
          />
        </div>

        {/* Info */}
        <div style={{ fontSize: '12px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Counsellor:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {counsellor.name}
            </span>
          </div>
          <div style={{ color: 'var(--success)', fontSize: '11px', fontWeight: 500, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
            <span>Online • Available</span>
          </div>
        </div>
      </div>

      {onOpenChat && (
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenChat}
          className="student-card-btn-full"
          icon={<MessageSquare size={13} />}
        >
          Message Counsellor
        </Button>
      )}
    </div>
  );
};

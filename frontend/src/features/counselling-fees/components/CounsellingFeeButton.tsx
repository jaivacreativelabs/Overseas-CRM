import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { CounsellingFeeStatus } from '../../../types';

interface CounsellingFeeButtonProps {
  status: CounsellingFeeStatus;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  label?: string;
  loading?: boolean;
}

const resolveTone = (status: CounsellingFeeStatus): 'success' | 'danger' | 'neutral' => {
  if (status === CounsellingFeeStatus.PAID) return 'success';
  if (status === CounsellingFeeStatus.NOT_PAID) return 'danger';
  return 'neutral';
};

const toneStyles: Record<'success' | 'danger' | 'neutral', { base: React.CSSProperties; hover: React.CSSProperties }> = {
  success: {
    base: { backgroundColor: 'var(--success)', borderColor: 'var(--success)', color: '#FFFFFF' },
    hover: { backgroundColor: '#059669', borderColor: '#059669' },
  },
  danger: {
    base: { backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', color: '#FFFFFF' },
    hover: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  },
  neutral: {
    base: { backgroundColor: '#FFFFFF', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' },
    hover: { backgroundColor: 'var(--bg-hover)', borderColor: 'var(--border-dark)', color: 'var(--text-primary)' },
  },
};

export const CounsellingFeeButton: React.FC<CounsellingFeeButtonProps> = ({
  status,
  onClick,
  label = 'View Payment',
  loading = false,
}) => {
  const [hovered, setHovered] = useState(false);
  const tone = toneStyles[resolveTone(status)];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: 600,
        lineHeight: 1,
        padding: '6px 10px',
        borderRadius: 'var(--radius-md)',
        borderWidth: 1,
        borderStyle: 'solid',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        ...tone.base,
        ...(hovered ? tone.hover : {}),
      }}
    >
      <Eye size={13} />
      {label}
    </button>
  );
};
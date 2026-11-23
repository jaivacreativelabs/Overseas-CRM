import React from 'react';

// Background / text pairs; each student gets the same pair every time, picked from their name.
const AVATAR_COLORS = [
  { bg: '#EEF4FF', fg: '#0057F8' },
  { bg: '#ECFDF5', fg: '#047857' },
  { bg: '#FFF7ED', fg: '#C2410C' },
  { bg: '#F5F3FF', fg: '#6D28D9' },
  { bg: '#FDF2F8', fg: '#BE185D' },
  { bg: '#F0F9FF', fg: '#0369A1' },
];

/** Square initials avatar used in student and lead lists. */
export const StudentAvatar: React.FC<{ name?: string; size?: number }> = ({ name, size = 36 }) => {
  const clean = (name || '').trim();
  const initials =
    clean
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'S';
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) | 0;
  const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];

  return (
    <div
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        borderRadius: `${Math.round(size * 0.22)}px`,
        backgroundColor: color.bg,
        color: color.fg,
        fontSize: `${Math.round(size * 0.36)}px`,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initials}
    </div>
  );
};

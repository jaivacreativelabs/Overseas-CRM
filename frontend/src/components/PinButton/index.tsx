import React, { useState, useEffect } from 'react';
import { Pin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';
import {
  CounsellorPinnedItem,
  isCounsellorItemPinned,
  toggleCounsellorPin,
} from '../../utils/counsellorPinManager';

export interface PinButtonProps {
  item: CounsellorPinnedItem;
  size?: number;
}

export const PinButton: React.FC<PinButtonProps> = ({ item, size = 13 }) => {
  const { user } = useAuth();
  const { success } = useToast();

  const [isPinned, setIsPinned] = useState<boolean>(() =>
    user?._id ? isCounsellorItemPinned(user._id, item.id) : false
  );

  useEffect(() => {
    const syncPinState = () => {
      if (user?._id) {
        setIsPinned(isCounsellorItemPinned(user._id, item.id));
      }
    };
    window.addEventListener('counsellor_pins_changed', syncPinState);
    return () => window.removeEventListener('counsellor_pins_changed', syncPinState);
  }, [user?._id, item.id]);

  if (!user || (user.role !== UserRole.COUNSELLOR && user.role !== UserRole.ADMIN)) {
    return null;
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user._id) return;
    const nowPinned = toggleCounsellorPin(user._id, item);
    setIsPinned(nowPinned);
    success(
      nowPinned
        ? `Pinned "${item.title}" to top header Pinned Items`
        : `Unpinned "${item.title}"`
    );
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      style={{
        background: isPinned ? 'rgba(0, 87, 248, 0.12)' : 'transparent',
        border: isPinned ? '1px solid var(--primary)' : '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '3px 6px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        fontWeight: 600,
        color: isPinned ? 'var(--primary)' : 'var(--text-muted)',
        transition: 'all 0.15s ease',
      }}
      title={isPinned ? 'Click to unpin from top nav Pinned Items' : 'Click to pin to top nav Pinned Items'}
    >
      <Pin size={size} strokeWidth={isPinned ? 2.5 : 1.8} fill={isPinned ? 'var(--primary)' : 'none'} />
      <span>{isPinned ? 'Pinned 📌' : 'Pin'}</span>
    </button>
  );
};

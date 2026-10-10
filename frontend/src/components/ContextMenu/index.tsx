import React, { useEffect, useRef } from 'react';
import { Eye, Pin } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  icon?: any;
  onClick: () => void;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, isOpen, onClose, items }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: Math.min(y, window.innerHeight - 120),
        left: Math.min(x, window.innerWidth - 180),
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        zIndex: 9999,
        padding: '4px',
        minWidth: '160px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-light)';
              e.currentTarget.style.color = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
          >
            {Icon && <Icon size={14} />}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

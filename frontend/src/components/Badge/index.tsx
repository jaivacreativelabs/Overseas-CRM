import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  return <span className={`badge badge-${variant} ${className}`}>{children}</span>;
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'neutral';
  let label = status.replace(/_/g, ' ');

  switch (status) {
    case 'NEW':
      variant = 'info';
      break;
    case 'CONTACTED':
    case 'UNDER_REVIEW':
    case 'PROOF_SUBMITTED':
    case 'SIGNED_UPLOADED':
      variant = 'warning';
      break;
    case 'INTERESTED':
    case 'APPROVED':
    case 'ACCEPTED':
    case 'VERIFIED':
    case 'COMPLETED':
    case 'SELECTED_BY_STUDENT':
    case 'ARRIVAL_CONFIRMED':
      variant = 'success';
      break;
    case 'NOT_INTERESTED':
    case 'CLOSED_LOST':
    case 'REJECTED':
    case 'BLOCKED':
    case 'CANCELLED':
      variant = 'danger';
      break;
    case 'COUNSELLING_SCHEDULED':
    case 'SUBMITTED':
    case 'ISSUED':
    case 'OFFER_RECEIVED':
      variant = 'primary';
      break;
    default:
      variant = 'neutral';
  }

  return <Badge variant={variant}>{label}</Badge>;
};

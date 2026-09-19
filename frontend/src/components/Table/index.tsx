import React, { ReactNode } from 'react';
import { Search, ChevronLeft, ChevronRight, AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '../Button';

export interface Column<T> {
  header: string;
  accessor?: keyof T | string;
  render?: (item: T) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  keyExtractor?: (item: T) => string;
}

export function Table<T extends { _id?: string; id?: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found',
  onRowClick,
  keyExtractor = (item) => item._id || item.id || Math.random().toString(),
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="table-container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <Loader2 className="animate-spin" size={28} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <Inbox size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
          {emptyMessage}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          Try adjusting your search or filters.
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="crm-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                style={{
                  width: col.width,
                  textAlign: col.align || 'left',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((col, index) => (
                <td
                  key={index}
                  style={{
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.render
                    ? col.render(item)
                    : col.accessor
                    ? String((item as any)[col.accessor] ?? '—')
                    : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: '#FFFFFF',
        fontSize: '13px',
        color: 'var(--text-secondary)',
      }}
    >
      <div>
        Showing <strong>{start}</strong> to <strong>{end}</strong> of <strong>{totalItems}</strong> entries
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          icon={<ChevronLeft size={14} />}
        >
          Previous
        </Button>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            fontWeight: 600,
            fontSize: '12px',
          }}
        >
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
};

export const SearchInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Search...' }) => {
  return (
    <div className="search-box">
      <Search className="search-icon" size={16} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}> = ({ title, description, action, icon }) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
        {icon || <Inbox size={42} style={{ margin: '0 auto' }} />}
      </div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 16px' }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = 'An error occurred while loading data.', onRetry }) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '50px 20px',
        backgroundColor: 'var(--danger-bg)',
        border: '1px solid var(--danger-border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <AlertCircle size={36} color="var(--danger)" style={{ margin: '0 auto 10px' }} />
      <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--danger-text)', marginBottom: '6px' }}>
        Unable to Load Content
      </h4>
      <p style={{ fontSize: '12px', color: 'var(--danger-text)', marginBottom: '14px' }}>{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};

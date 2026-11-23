import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Table, Pagination } from '../../components/Table';
import { AdminType, AuditLog, UserRole } from '../../types';

const PAGE_SIZE = 25;

/** "USER_LOGIN" -> "user login"; "PROFILE_EVALUATION" -> "profile evaluation". */
const humanize = (s?: string) => (s || '').toLowerCase().replace(/_/g, ' ').trim();

const formatWhen = (iso: string) =>
  new Date(iso)
    .toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\b(am|pm)\b/, (m) => m.toUpperCase());

const roleLabel = (l: AuditLog) => {
  const role = l.userRole || (l.userId?.role as UserRole | undefined);
  if (role === UserRole.ADMIN) return l.userId?.adminType === AdminType.ADMIN ? 'Branch Admin' : 'Owner Admin';
  if (role === UserRole.COUNSELLOR) return 'Counsellor';
  if (role === UserRole.STUDENT) return 'Student';
  return 'System';
};

const quoted = (s?: string) => (s ? `“${s}”` : '');

/** One plain sentence for the Details column, built from what each action records. */
const describe = (l: AuditLog): string => {
  const a = l.after || {};
  const b = l.before || {};
  const leadName = a.name || b.name || 'a lead';

  switch (l.action) {
    case 'USER_LOGIN':
      return l.userId?.email ? `Signed in as ${l.userId.email}` : 'Signed in';
    case 'CREATE_LEAD':
      return `Created lead ${leadName}`;
    case 'UPDATE_LEAD':
      return `Updated lead ${leadName}`;
    case 'CONVERT_LEAD_TO_STUDENT':
      return `Converted ${b.name || 'a lead'} to a student`;
    case 'MARK_CLOSED_LOST':
      return `Marked ${b.name || 'a lead'} as closed lost${a.reason ? ` – ${a.reason}` : ''}`;
    case 'REOPEN_CLOSED_LOST':
      return `Reopened ${b.name || 'a closed lead'}`;
    case 'ARCHIVE_LEAD':
      return `Archived lead ${b.name || ''}`.trim();
    case 'DELETE_LEAD':
      return `Deleted lead ${b.name || ''}`.trim();
    case 'REVIEW_DOCUMENT': {
      const approved = a.status === 'APPROVED' || a.status === 'SUCCESSFUL';
      return approved
        ? `Approved document ${quoted(a.title)}`
        : `Asked for a re-upload of ${quoted(a.title) || 'a document'}${a.rejectionReason ? ` – ${a.rejectionReason}` : ''}`;
    }
    case 'UPDATE_TASK_STATUS':
      return `Moved task ${quoted(a.title) || ''} to ${humanize(a.status) || 'a new status'}`.replace(/\s+/g, ' ');
    case 'CREATE_APPLICATION':
      return `Created an application to ${a.universityName || 'a university'}`;
    case 'UPDATE_APPLICATION_STATUS':
      return `Application to ${a.universityName || 'a university'} is now ${humanize(a.status)}`;
    case 'REAPPLICATION_SUBMITTED':
      return `Submitted a re-application to ${a.universityName || 'a university'}`;
    case 'VERIFY_PAYMENT':
      return `Marked a payment${a.amount ? ` of ${a.currency || 'INR'} ${a.amount}` : ''} as ${humanize(a.status) || 'verified'}`;
    case 'REVIEW_SIGNED_OFFER':
      return `Reviewed a signed offer${a.status ? ` – ${humanize(a.status)}` : ''}`;
    case 'UPDATE_VISA_STATUS':
      return `Set visa status to ${humanize(a.status) || 'updated'}`;
    case 'RECORD_VISA_DECISION':
      return `Recorded visa decision: ${humanize(a.decision || a.status) || 'updated'}`;
    case 'CREATE_USER':
      return `Added ${a.name || 'a user'}${a.role ? ` as ${humanize(a.role)}` : ''}`;
    case 'UPDATE_USER':
      return `Updated user ${a.name || b.name || ''}`.trim();
    case 'DELETE_USER':
      return `Removed user ${b.name || ''}`.trim();
    case 'CREATE_ORIENTATION':
      return `Scheduled orientation ${quoted(a.title)}`.trim();
    case 'MARK_ORIENTATION_ATTENDANCE':
      return `Marked orientation attendance for ${a.attendedCount ?? 0} student${a.attendedCount === 1 ? '' : 's'}`;
    case 'UPDATE_PROFILE_EVALUATION':
      return 'Updated a profile evaluation';
    case 'UPDATE_TRAVEL_SUPPORT':
      return 'Updated travel support details';
    case 'TOGGLE_SHORTLIST_VISIBILITY':
      return a.isVisibleToStudent ? 'Shared a university shortlist with the student' : 'Hid a university shortlist from the student';
    default: {
      const text = `${humanize(l.action)}${l.entityType ? ` (${humanize(l.entityType)})` : ''}`;
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
  }
};

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1, limit: PAGE_SIZE });
  const [actions, setActions] = useState<string[]>([]);
  const [actionFilter, setActionFilter] = useState('');

  const { error } = useToast();
  const { user } = useAuth();
  const isOwnerAdmin = user?.role === UserRole.ADMIN && (user?.adminType === AdminType.OWNER_ADMIN || !user?.adminType);

  useEffect(() => {
    apiClient
      .get<string[]>('/audit-logs/actions')
      .then((res) => setActions(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<AuditLog[]>('/audit-logs', {
          page,
          limit: PAGE_SIZE,
          action: actionFilter || undefined,
        });
        setLogs(res.data || []);
        if (res.meta) setMeta(res.meta);
      } catch (err: any) {
        error(err.message || 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page, actionFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Audit Log</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {isOwnerAdmin
              ? 'Who changed what – sign-ins, leads, documents, payments, visas and team changes.'
              : 'Everything you have done in the CRM – sign-ins, leads, documents and status changes.'}
          </p>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Filter by action</span>
          <select
            className="form-select"
            style={{ width: '240px' }}
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {humanize(a).replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Table
        columns={[
          {
            header: 'When',
            width: '200px',
            render: (l) => <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatWhen(l.createdAt)}</span>,
          },
          {
            header: 'Who',
            width: '200px',
            render: (l) => (
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {/* Some actions save an email as userName, so prefer the account's real name. */}
                  {l.userId?.name || l.userName || 'System'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{roleLabel(l)}</div>
              </div>
            ),
          },
          {
            header: 'Action',
            width: '210px',
            render: (l) => (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {humanize(l.action)}
              </span>
            ),
          },
          {
            header: 'Details',
            render: (l) => (
              <span style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{describe(l)}</span>
            ),
          },
        ]}
        data={logs}
        loading={loading}
        emptyMessage={actionFilter ? 'No entries for this action.' : 'No activity recorded yet.'}
      />

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
};

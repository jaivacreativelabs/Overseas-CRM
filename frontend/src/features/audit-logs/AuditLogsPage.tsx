import React, { useState, useEffect } from 'react';
import { Shield, Eye, Clock, User } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table, Pagination } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { AuditLog } from '../../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1, limit: 25 });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { error } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<AuditLog[]>('/audit-logs', { page, limit: 25 });
      setLogs(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err: any) {
      error(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          System Audit Trail & Compliance
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Immutable record of state changes, stage transitions, document approvals, and administrative actions.
        </p>
      </div>

      <Table
        columns={[
          {
            header: 'TIMESTAMP',
            render: (l) => (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {new Date(l.createdAt).toLocaleString()}
              </span>
            ),
          },
          {
            header: 'ACTOR / ROLE',
            render: (l) => (
              <div>
                <strong>{l.userName || (l.userId as any)?.name || 'System'}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {l.userRole || (l.userId as any)?.role || 'SYSTEM'}
                </div>
              </div>
            ),
          },
          {
            header: 'ACTION',
            render: (l) => <Badge variant="primary">{l.action}</Badge>,
          },
          { header: 'ENTITY TYPE', accessor: 'entityType' },
          {
            header: 'DETAILS',
            align: 'right',
            render: (l) => (
              <Button variant="secondary" size="sm" icon={<Eye size={14} />} onClick={() => setSelectedLog(l)}>
                View Diff
              </Button>
            ),
          },
        ]}
        data={logs}
        loading={loading}
      />

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        totalItems={meta.total}
        pageSize={25}
        onPageChange={setPage}
      />

      {/* --- Diff Viewer Modal --- */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Log Record: ${selectedLog?.action}`}
        maxWidth="620px"
        footer={
          <Button variant="secondary" onClick={() => setSelectedLog(null)}>
            Close
          </Button>
        }
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Action:</span> <strong>{selectedLog.action}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Entity:</span> <strong>{selectedLog.entityType} ({selectedLog.entityId})</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Timestamp:</span> <strong>{new Date(selectedLog.createdAt).toISOString()}</strong></div>
            </div>

            {selectedLog.before && (
              <div>
                <span style={{ fontWeight: 600, color: 'var(--danger-text)', marginBottom: '4px', display: 'block' }}>
                  STATE BEFORE:
                </span>
                <pre
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    overflowX: 'auto',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {JSON.stringify(selectedLog.before, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.after && (
              <div>
                <span style={{ fontWeight: 600, color: 'var(--success-text)', marginBottom: '4px', display: 'block' }}>
                  STATE AFTER:
                </span>
                <pre
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    overflowX: 'auto',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {JSON.stringify(selectedLog.after, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

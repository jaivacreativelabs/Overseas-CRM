import React, { useState, useEffect } from 'react';
import { Video, Check, X, Clock, ExternalLink, Eye, Pin } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ContextMenu } from '../../components/ContextMenu';
import { getPinnedModules, togglePinModule } from '../../utils/pinnedModules';
import { PinButton } from '../../components/PinButton';

export const CounsellingPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const [pinnedList, setPinnedList] = useState<string[]>(getPinnedModules());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handlePinnedChange = () => setPinnedList(getPinnedModules());
    window.addEventListener('pinned_modules_changed', handlePinnedChange);
    return () => window.removeEventListener('pinned_modules_changed', handlePinnedChange);
  }, []);

  const isPinned = pinnedList.includes('counselling');

  const fetchCounselling = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/leads', { limit: 50 });
      const allSessions: any[] = [];
      (res.data || []).forEach((lead) => {
        if (lead.counsellingSessions) {
          lead.counsellingSessions.forEach((s: any) => {
            allSessions.push({ ...s, studentName: lead.name, leadId: lead._id });
          });
        }
      });
      setSessions(allSessions);
    } catch (err: any) {
      error(err.message || 'Failed to fetch counselling sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounselling();
  }, []);

  const handleUpdateAttendance = async (leadId: string, sessionId: string, attendance: 'ATTENDED' | 'ABSENT') => {
    try {
      await apiClient.put(`/leads/${leadId}/counselling/${sessionId}/attendance`, {
        attendance,
        status: attendance === 'ATTENDED' ? 'COMPLETED' : 'NO_SHOW',
      });
      success(`Attendance marked as ${attendance}.`);
      fetchCounselling();
    } catch (err: any) {
      error(err.message || 'Failed to record attendance');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        style={{ cursor: 'context-menu', userSelect: 'none' }}
        title={`Right-click to ${isPinned ? 'unpin' : 'pin'} Counselling in sidebar`}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Preliminary Counselling Sessions {isPinned && <span style={{ fontSize: '13px', color: 'var(--primary)' }}>📌</span>}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Schedule, launch Google Meet sessions, and record mandatory attendance before marking leads as Interested. Right-click header to pin to sidebar.
        </p>
      </div>

      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (s: any) => (
              <div>
                <strong>{s.studentName}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Counsellor: {s.counsellorName}</div>
              </div>
            ),
          },
          {
            header: 'DATE & TIME',
            render: (s: any) => `${s.scheduledDate} at ${s.scheduledTime}`,
          },
          {
            header: 'MEET LINK',
            render: (s: any) =>
              s.googleMeetLink ? (
                <a
                  href={s.googleMeetLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Video size={14} /> Join Call <ExternalLink size={12} />
                </a>
              ) : (
                '—'
              ),
          },
          {
            header: 'STATUS',
            render: (s: any) => (
              <Badge variant={s.status === 'COMPLETED' ? 'success' : s.status === 'SCHEDULED' ? 'primary' : 'danger'}>
                {s.status}
              </Badge>
            ),
          },
          {
            header: 'ATTENDANCE',
            render: (s: any) => (
              <Badge variant={s.attendance === 'ATTENDED' ? 'success' : s.attendance === 'ABSENT' ? 'danger' : 'neutral'}>
                {s.attendance}
              </Badge>
            ),
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (s: any) => (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <PinButton
                  item={{
                    id: s._id || s.leadId,
                    category: 'counselling',
                    title: `Counselling Session: ${s.studentName}`,
                    subtitle: `${s.scheduledDate} at ${s.scheduledTime}`,
                    path: `/leads/${s.leadId}`,
                    pinnedAt: new Date().toISOString(),
                  }}
                />
                {s.attendance === 'PENDING' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Check size={12} />}
                      onClick={() => handleUpdateAttendance(s.leadId, s._id, 'ATTENDED')}
                    >
                      Attended
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<X size={12} />}
                      onClick={() => handleUpdateAttendance(s.leadId, s._id, 'ABSENT')}
                    >
                      No Show
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        data={sessions}
        loading={loading}
        emptyMessage="No preliminary counselling sessions scheduled."
      />

      {/* RIGHT-CLICK CONTEXT MENU (OPEN / PIN TO SIDEBAR / UNPIN FROM SIDEBAR) */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOpen={!!contextMenu}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Open',
              icon: Eye,
              onClick: () => {},
            },
            {
              label: isPinned ? 'Unpin from Sidebar' : 'Pin to Sidebar',
              icon: Pin,
              onClick: () => {
                const wasPinned = isPinned;
                togglePinModule('counselling');
                success(
                  wasPinned
                    ? 'Unpinned Counselling from sidebar'
                    : 'Pinned Counselling to Student Journey sidebar'
                );
              },
            },
          ]}
        />
      )}
    </div>
  );
};

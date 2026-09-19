import React, { useState, useEffect } from 'react';
import { Video, Check, X, Clock, ExternalLink } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

export const CounsellingPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const fetchCounselling = async () => {
    setLoading(true);
    try {
      // Get leads with counselling
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
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Preliminary Counselling Sessions
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Schedule, launch Google Meet sessions, and record mandatory attendance before marking leads as Interested.
        </p>
      </div>

      <Table
        columns={[
          {
            header: 'STUDENT NAME',
            render: (s) => (
              <div>
                <strong>{s.studentName}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Counsellor: {s.counsellorName}</div>
              </div>
            ),
          },
          {
            header: 'DATE & TIME',
            render: (s) => `${s.scheduledDate} at ${s.scheduledTime}`,
          },
          {
            header: 'MEET LINK',
            render: (s) =>
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
            render: (s) => (
              <Badge variant={s.status === 'COMPLETED' ? 'success' : s.status === 'SCHEDULED' ? 'primary' : 'danger'}>
                {s.status}
              </Badge>
            ),
          },
          {
            header: 'ATTENDANCE',
            render: (s) => (
              <Badge variant={s.attendance === 'ATTENDED' ? 'success' : s.attendance === 'ABSENT' ? 'danger' : 'neutral'}>
                {s.attendance}
              </Badge>
            ),
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (s) => (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
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
    </div>
  );
};

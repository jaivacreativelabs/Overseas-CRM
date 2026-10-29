import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Check,
  X,
  Clock,
  ExternalLink,
  Eye,
  Pin,
  Calendar,
  Plus,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ContextMenu } from '../../components/ContextMenu';
import { getPinnedModules, togglePinModule } from '../../utils/pinnedModules';
import { PinButton } from '../../components/PinButton';
import { Modal } from '../../components/Modal';
import { Input, Select, Textarea } from '../../components/Form';

export const CounsellingPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // Scheduling Form
  const [scheduleForm, setScheduleForm] = useState({
    leadId: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '11:00',
    googleMeetLink: 'https://meet.google.com/new',
    notes: '',
  });

  const { success, error } = useToast();
  const navigate = useNavigate();

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
      const res = await apiClient.get<any[]>('/leads', { limit: 100 });
      setLeadsList(res.data || []);
      const allSessions: any[] = [];
      (res.data || []).forEach((lead) => {
        if (lead.counsellingSessions) {
          lead.counsellingSessions.forEach((s: any) => {
            allSessions.push({
              ...s,
              studentName: lead.name,
              leadId: lead._id,
              studentEmail: lead.email,
              studentPhone: lead.phone,
              targetCountry: lead.country,
              targetCourse: lead.preferredCourse,
            });
          });
        }
      });
      // Sort newest first
      allSessions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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
      success(`Attendance recorded as ${attendance}.`);
      fetchCounselling();
    } catch (err: any) {
      error(err.message || 'Failed to record attendance');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.leadId) {
      error('Please select a student lead');
      return;
    }
    setSubmittingSchedule(true);
    try {
      await apiClient.post(`/leads/${scheduleForm.leadId}/counselling`, {
        scheduledDate: scheduleForm.scheduledDate,
        scheduledTime: scheduleForm.scheduledTime,
        googleMeetLink: scheduleForm.googleMeetLink,
        notes: scheduleForm.notes,
      });
      success('Preliminary counselling session booked successfully!');
      setIsScheduleModalOpen(false);
      fetchCounselling();
    } catch (err: any) {
      error(err.message || 'Failed to book session');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  // Filtered Sessions
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        s.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.counsellorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.targetCountry?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status tab
      if (activeFilter === 'today') {
        return s.scheduledDate === todayStr;
      }
      if (activeFilter === 'pending') {
        return s.attendance === 'PENDING';
      }
      if (activeFilter === 'completed') {
        return s.status === 'COMPLETED' || s.attendance === 'ATTENDED';
      }
      return true;
    });
  }, [sessions, searchQuery, activeFilter, todayStr]);

  const stats = useMemo(() => {
    const todayCount = sessions.filter((s) => s.scheduledDate === todayStr).length;
    const pendingCount = sessions.filter((s) => s.attendance === 'PENDING').length;
    const completedCount = sessions.filter((s) => s.status === 'COMPLETED' || s.attendance === 'ATTENDED').length;
    return {
      total: sessions.length,
      today: todayCount,
      pending: pendingCount,
      completed: completedCount,
    };
  }, [sessions, todayStr]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Header Row */}
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          cursor: 'context-menu',
          userSelect: 'none',
        }}
        title={`Right-click to ${isPinned ? 'unpin' : 'pin'} Counselling in sidebar`}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            Preliminary Counselling Hub {isPinned && <span style={{ fontSize: '13px', color: 'var(--primary)' }}>📌</span>}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Schedule 1-on-1 consultations, launch Google Meet sessions, and record attendance to evaluate prospective students.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsScheduleModalOpen(true)}
          >
            Schedule Consultation
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          width: '100%',
        }}
      >
        <div
          className="card"
          onClick={() => setActiveFilter('all')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            borderColor: activeFilter === 'all' ? '#0057F8' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              All Sessions
            </span>
            <Calendar size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Booked consultations
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveFilter('today')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            borderColor: activeFilter === 'today' ? '#0057F8' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Today's Calls
            </span>
            <Clock size={16} color="#0057F8" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0057F8' }}>
            {stats.today}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Scheduled for today
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveFilter('pending')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            borderColor: activeFilter === 'pending' ? '#D97706' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Pending Attendance
            </span>
            <AlertCircle size={16} color="#D97706" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#D97706' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Awaiting attendance confirmation
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveFilter('completed')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            borderColor: activeFilter === 'completed' ? '#059669' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Completed
            </span>
            <CheckCircle2 size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669' }}>
            {stats.completed}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Successfully held sessions
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search & View Mode Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="view-mode-toggle">
            <button
              className={`view-mode-toggle-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All ({stats.total})
            </button>
            <button
              className={`view-mode-toggle-btn ${activeFilter === 'today' ? 'active' : ''}`}
              onClick={() => setActiveFilter('today')}
            >
              Today ({stats.today})
            </button>
            <button
              className={`view-mode-toggle-btn ${activeFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveFilter('pending')}
            >
              Pending ({stats.pending})
            </button>
            <button
              className={`view-mode-toggle-btn ${activeFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveFilter('completed')}
            >
              Completed ({stats.completed})
            </button>
          </div>

          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search student or advisor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <button
            className={`view-mode-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="Card Grid View"
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>
          <button
            className={`view-mode-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table View"
          >
            <TableIcon size={14} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Cards or Table */}
      {viewMode === 'cards' ? (
        filteredSessions.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: '16px',
              width: '100%',
            }}
          >
            {filteredSessions.map((s) => (
              <div
                key={s._id || `${s.leadId}-${s.scheduledDate}`}
                className="card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: s.attendance === 'PENDING' ? '1px solid #E2E8F0' : '1px solid var(--border-color)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <h3
                      onClick={() => navigate(`/students/${s.leadId}`)}
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        margin: 0,
                        color: 'var(--primary)',
                        cursor: 'pointer',
                      }}
                    >
                      {s.studentName}
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Advisor: {s.counsellorName || 'Admissions Advisory Team'}
                    </div>
                  </div>
                  <Badge variant={s.attendance === 'ATTENDED' ? 'success' : s.attendance === 'ABSENT' ? 'danger' : 'neutral'}>
                    {s.attendance}
                  </Badge>
                </div>

                {/* Date & Time Strip */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} color="var(--primary)" />
                    {s.scheduledDate}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} color="var(--text-secondary)" />
                    {s.scheduledTime}
                  </span>
                </div>

                {/* Program / Target Details if available */}
                {(s.targetCountry || s.targetCourse) && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {s.targetCountry && <span>📍 {s.targetCountry}</span>}
                    {s.targetCourse && <span>🎯 {s.targetCourse}</span>}
                  </div>
                )}

                {/* Google Meet Link Button */}
                {s.googleMeetLink ? (
                  <a
                    href={s.googleMeetLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      backgroundColor: '#EFF6FF',
                      color: '#0057F8',
                      border: '1px solid #BFDBFE',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <Video size={14} />
                    <span>Launch Google Meet</span>
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No Google Meet URL provided
                  </div>
                )}

                {/* Attendance Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                  {s.attendance === 'PENDING' ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Check size={12} />}
                        onClick={() => handleUpdateAttendance(s.leadId, s._id, 'ATTENDED')}
                        style={{ flex: 1 }}
                      >
                        Attended
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<X size={12} />}
                        onClick={() => handleUpdateAttendance(s.leadId, s._id, 'ABSENT')}
                        style={{ flex: 1 }}
                      >
                        No Show
                      </Button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Status: <strong>{s.status}</strong>
                      </span>
                      <PinButton
                        item={{
                          id: s._id || s.leadId,
                          category: 'counselling',
                          title: `Counselling: ${s.studentName}`,
                          subtitle: `${s.scheduledDate} at ${s.scheduledTime}`,
                          path: `/leads/${s.leadId}`,
                          pinnedAt: new Date().toISOString(),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No preliminary counselling sessions match the selected filter.
          </div>
        )
      ) : (
        <Table
          columns={[
            {
              header: 'STUDENT NAME',
              render: (s: any) => (
                <div>
                  <strong
                    onClick={() => navigate(`/students/${s.leadId}`)}
                    style={{ color: 'var(--primary)', cursor: 'pointer' }}
                  >
                    {s.studentName}
                  </strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Advisor: {s.counsellorName || 'Admissions Advisory Team'}</div>
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
          data={filteredSessions}
          loading={loading}
          emptyMessage="No preliminary counselling sessions scheduled."
        />
      )}

      {/* SCHEDULE NEW SESSION MODAL */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Schedule Preliminary Counselling Session"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSession} disabled={submittingSchedule}>
              {submittingSchedule ? 'Scheduling...' : 'Confirm Session'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Select
            label="Select Student Lead *"
            value={scheduleForm.leadId}
            onChange={(e) => setScheduleForm({ ...scheduleForm, leadId: e.target.value })}
            options={[
              { value: '', label: '-- Choose a lead to counsel --' },
              ...leadsList.map((l) => ({
                value: l._id,
                label: `${l.name} (${l.email || l.phone || 'No Contact'}) - ${l.stage || 'LEAD'}`,
              })),
            ]}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              type="date"
              label="Session Date *"
              value={scheduleForm.scheduledDate}
              onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
              required
            />
            <Input
              type="time"
              label="Session Time *"
              value={scheduleForm.scheduledTime}
              onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })}
              required
            />
          </div>

          <Input
            type="url"
            label="Google Meet Link *"
            value={scheduleForm.googleMeetLink}
            onChange={(e) => setScheduleForm({ ...scheduleForm, googleMeetLink: e.target.value })}
            placeholder="https://meet.google.com/..."
            required
          />

          <Textarea
            label="Counselling Agenda / Notes"
            value={scheduleForm.notes}
            onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
            placeholder="Topics to discuss, e.g. UK vs Canada budget, IELTS preparation requirements..."
          />
        </form>
      </Modal>

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

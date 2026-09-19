import React, { useState, useEffect } from 'react';
import { Plus, Compass, Calendar, Video, Users, Check } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input, Select, Textarea } from '../../components/Form';

export const OrientationPage: React.FC = () => {
  const [orientations, setOrientations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    country: '',
    intake: '',
    sessionDate: '',
    sessionTime: '',
    googleMeetLink: '',
    description: '',
  });

  const { success, error } = useToast();

  const fetchOrientations = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/orientation');
      setOrientations(res.data || []);
    } catch (err: any) {
      error(err.message || 'Failed to load orientation sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrientations();
  }, []);

  const handleCreateOrientation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/orientation', form);
      success('Orientation session scheduled successfully.');
      setIsModalOpen(false);
      setForm({
        title: '',
        country: '',
        intake: '',
        sessionDate: '',
        sessionTime: '',
        googleMeetLink: '',
        description: '',
      });
      fetchOrientations();
    } catch (err: any) {
      error(err.message || 'Failed to create orientation');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Pre-Departure Orientation Sessions
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Organize destination-specific orientation sessions for flying students and track attendance.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsModalOpen(true)}>
          Create Orientation
        </Button>
      </div>

      <Table
        columns={[
          {
            header: 'SESSION TITLE',
            render: (o) => (
              <div>
                <strong>{o.title}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.country} • {o.intake}</div>
              </div>
            ),
          },
          {
            header: 'DATE & TIME',
            render: (o) => `${new Date(o.sessionDate).toLocaleDateString()} at ${o.sessionTime}`,
          },
          {
            header: 'MEET LINK',
            render: (o) =>
              o.googleMeetLink ? (
                <a href={o.googleMeetLink} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                  Join Meet
                </a>
              ) : (
                'In-Person'
              ),
          },
          {
            header: 'INVITED STUDENTS',
            render: (o) => `${(o.invitedStudentIds || []).length} Students`,
          },
          {
            header: 'ATTENDED',
            render: (o) => (
              <Badge variant="success">
                {(o.attendedStudentIds || []).length} Attended
              </Badge>
            ),
          },
        ]}
        data={orientations}
        loading={loading}
        emptyMessage="No orientation sessions created."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Orientation Session"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateOrientation}>
              Schedule Orientation
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateOrientation}>
          <Input
            label="Session Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Country *"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              required
            />
            <Input
              label="Intake"
              value={form.intake}
              onChange={(e) => setForm({ ...form, intake: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Date *"
              type="date"
              value={form.sessionDate}
              onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
              required
            />
            <Input
              label="Time *"
              type="time"
              value={form.sessionTime}
              onChange={(e) => setForm({ ...form, sessionTime: e.target.value })}
              required
            />
          </div>
          <Input
            label="Google Meet Link"
            value={form.googleMeetLink}
            onChange={(e) => setForm({ ...form, googleMeetLink: e.target.value })}
          />
          <Textarea
            label="Orientation Topics & Agenda"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
};

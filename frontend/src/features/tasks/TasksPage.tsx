import React, { useState, useEffect } from 'react';
import { Plus, CheckSquare, Clock, AlertTriangle, Check, User } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Table, SearchInput } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input, Select, Textarea } from '../../components/Form';
import { Task, TaskPriority, TaskStatus, TaskType } from '../../types';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [counsellors, setCounsellors] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: TaskType.FOLLOW_UP,
    assignedTo: '',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: TaskPriority.MEDIUM,
  });

  const { success, error } = useToast();
  const { user } = useAuth();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Task[]>('/tasks', {
        status: statusFilter,
        priority: priorityFilter,
        search,
      });
      setTasks(res.data || []);
    } catch (err: any) {
      error(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    const loadCounsellors = async () => {
      try {
        const res = await apiClient.get<any[]>('/users/counsellors');
        setCounsellors(res.data || []);
        if (res.data && res.data.length > 0) {
          setForm((prev) => ({ ...prev, assignedTo: res.data[0]._id }));
        }
      } catch (err) {}
    };
    loadCounsellors();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/tasks', form);
      success('Task created successfully!');
      setIsModalOpen(false);
      setForm({
        title: '',
        description: '',
        type: TaskType.FOLLOW_UP,
        assignedTo: counsellors[0]?._id || '',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: TaskPriority.MEDIUM,
      });
      fetchTasks();
    } catch (err: any) {
      error(err.message || 'Failed to create task');
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: TaskStatus) => {
    try {
      const newStatus = currentStatus === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED;
      await apiClient.put(`/tasks/${taskId}/status`, { status: newStatus });
      success(`Task marked as ${newStatus.toLowerCase()}.`);
      fetchTasks();
    } catch (err: any) {
      error(err.message || 'Failed to update task');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Tasks & Operational Reminders
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Follow-up callbacks, document reviews, application submission alerts, and counsellor duties.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsModalOpen(true)}>
          Create Task
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <SearchInput value={search} onChange={setSearch} placeholder="Search tasks..." />

          <select
            className="form-select"
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value={TaskStatus.PENDING}>Pending</option>
            <option value={TaskStatus.COMPLETED}>Completed</option>
            <option value={TaskStatus.BLOCKED}>Blocked</option>
          </select>

          <select
            className="form-select"
            style={{ width: '150px' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            {Object.values(TaskPriority).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Table
        columns={[
          {
            header: 'TASK TITLE',
            render: (t) => (
              <div>
                <strong style={{ textDecoration: t.status === TaskStatus.COMPLETED ? 'line-through' : 'none' }}>
                  {t.title}
                </strong>
                {t.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.description}</div>}
              </div>
            ),
          },
          {
            header: 'RELATED STUDENT',
            render: (t) => (t.leadId ? (t.leadId as any).name : 'General'),
          },
          {
            header: 'ASSIGNED TO',
            render: (t) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} color="var(--primary)" />
                <span>{t.assignedToName}</span>
              </div>
            ),
          },
          {
            header: 'DUE DATE',
            render: (t) => {
              const isOverdue = new Date(t.dueDate) < new Date() && t.status !== TaskStatus.COMPLETED;
              return (
                <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-primary)', fontWeight: isOverdue ? 600 : 400 }}>
                  {new Date(t.dueDate).toLocaleDateString()} {isOverdue && '⚠️ (Overdue)'}
                </span>
              );
            },
          },
          {
            header: 'PRIORITY',
            render: (t) => (
              <Badge variant={t.priority === TaskPriority.URGENT || t.priority === TaskPriority.HIGH ? 'danger' : t.priority === TaskPriority.MEDIUM ? 'warning' : 'neutral'}>
                {t.priority}
              </Badge>
            ),
          },
          {
            header: 'STATUS',
            render: (t) => (
              <Badge variant={t.status === TaskStatus.COMPLETED ? 'success' : 'neutral'}>
                {t.status}
              </Badge>
            ),
          },
          {
            header: 'ACTIONS',
            align: 'right',
            render: (t) => (
              <Button
                variant={t.status === TaskStatus.COMPLETED ? 'secondary' : 'primary'}
                size="sm"
                icon={<Check size={12} />}
                onClick={() => handleToggleStatus(t._id, t.status)}
              >
                {t.status === TaskStatus.COMPLETED ? 'Reopen' : 'Complete'}
              </Button>
            ),
          },
        ]}
        data={tasks}
        loading={loading}
        emptyMessage="No tasks found matching criteria."
      />

      {/* Create Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Operational Task"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateTask}>
              Create Task
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateTask}>
          <Input
            label="Task Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Follow up on student transcript submission"
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Task Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              options={Object.values(TaskType).map((ty) => ({ value: ty, label: ty.replace(/_/g, ' ') }))}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
              options={Object.values(TaskPriority).map((pr) => ({ value: pr, label: pr }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Assignee *"
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              options={counsellors.map((c) => ({ value: c._id, label: c.name }))}
              required
            />
            <Input
              label="Due Date *"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </div>
          <Textarea
            label="Description & Instructions"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Details on what needs to be accomplished..."
          />
        </form>
      </Modal>
    </div>
  );
};

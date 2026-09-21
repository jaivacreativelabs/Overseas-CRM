import React from 'react';
import { ListTodo, CheckCircle2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '../../../types';
import { Badge } from '../../../components/Badge';

interface PendingTasksCardProps {
  tasks?: Task[];
  loading?: boolean;
}

export const PendingTasksCard: React.FC<PendingTasksCardProps> = ({
  tasks,
  loading = false,
}) => {
  // Defensive filtering for non-completed pending tasks
  const pendingTasks = tasks?.filter((t) => t && t.status !== TaskStatus.COMPLETED) ?? [];

  const getPriorityBadgeVariant = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'danger';
      case TaskPriority.HIGH:
        return 'warning';
      case TaskPriority.MEDIUM:
        return 'info';
      default:
        return 'neutral';
    }
  };

  return (
    <div
      className="card"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Card Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListTodo size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Pending Tasks
          </h3>
        </div>
        <Badge variant={pendingTasks.length > 0 ? 'primary' : 'neutral'}>
          {pendingTasks.length} {pendingTasks.length === 1 ? 'Action' : 'Actions'}
        </Badge>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 0' }}>
          <div style={{ height: '48px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }} />
          <div style={{ height: '48px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }} />
        </div>
      ) : pendingTasks.length === 0 ? (
        /* Empty State */
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={42} style={{ color: 'var(--success)', opacity: 0.8 }} />
          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
            No pending tasks.
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0, maxWidth: '340px' }}>
            You are all caught up! Check back when your counsellor assigns new actions.
          </p>
        </div>
      ) : (
        /* Task List Rendering */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pendingTasks.map((task) => {
            const dueDateFormatted = task.dueDate
              ? new Date(task.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
              : null;

            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

            return (
              <div
                key={task._id}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                        {task.description}
                      </div>
                    )}
                  </div>
                  <Badge variant={getPriorityBadgeVariant(task.priority)}>
                    {task.priority || 'MEDIUM'}
                  </Badge>
                </div>

                {/* Footer metadata */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {dueDateFormatted && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: isOverdue ? 'var(--danger)' : 'var(--text-muted)',
                          fontWeight: isOverdue ? 600 : 400,
                        }}
                      >
                        {isOverdue ? <AlertCircle size={12} /> : <Calendar size={12} />}
                        Due: {dueDateFormatted}
                      </span>
                    )}
                    {task.type && (
                      <span style={{ textTransform: 'capitalize' }}>
                        • {task.type.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    )}
                  </div>

                  {task.createdByName && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Assigned by {task.createdByName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


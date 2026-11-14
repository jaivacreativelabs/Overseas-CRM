import React from 'react';
import { CheckCircle2, Calendar, AlertCircle, Clock, CheckSquare2 } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '../../../types';
import { Badge } from '../../../components/Badge';

interface PendingTasksCardProps {
  tasks?: Task[];
  loading?: boolean;
  onNavigateToTasks?: () => void;
}

export const PendingTasksCard: React.FC<PendingTasksCardProps> = ({
  tasks,
  loading = false,
  onNavigateToTasks,
}) => {
  // Defensive filtering for non-completed pending tasks
  const pendingTasks = tasks?.filter((t) => t && t.status !== TaskStatus.COMPLETED) ?? [];

  const getPriorityBadgeVariant = (priority?: TaskPriority) => {
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
    <div className="student-tasks-card">
      <div className="student-tasks-card-header">
        <div className="student-tasks-card-title-group">
          <div className="student-tasks-icon-box">
            <CheckSquare2 size={18} />
          </div>
          <div>
            <h3 className="student-tasks-title">Action Items & Tasks</h3>
            <p className="student-tasks-subtitle">Assigned steps by your admissions advisor</p>
          </div>
        </div>
        <Badge variant={pendingTasks.length > 0 ? 'primary' : 'success'}>
          {pendingTasks.length === 0 ? 'All Done ✓' : `${pendingTasks.length} Pending`}
        </Badge>
      </div>

      {loading ? (
        <div className="student-tasks-skeleton-list">
          <div className="student-tasks-skeleton-item" />
          <div className="student-tasks-skeleton-item" />
        </div>
      ) : pendingTasks.length === 0 ? (
        <div className="student-tasks-empty-state">
          <div className="student-tasks-empty-icon">
            <CheckCircle2 size={32} />
          </div>
          <h4 className="student-tasks-empty-title">All tasks are up to date!</h4>
          <p className="student-tasks-empty-subtext">
            No outstanding action items required from you right now. Your counsellor will post new tasks as your applications progress.
          </p>
        </div>
      ) : (
        <div className="student-tasks-list">
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
                className={`student-task-item ${isOverdue ? 'overdue' : ''}`}
              >
                <div className="student-task-item-content">
                  <div className="student-task-item-header">
                    <h5 className="student-task-item-title">{task.title}</h5>
                    <Badge variant={getPriorityBadgeVariant(task.priority)}>
                      {task.priority || 'NORMAL'}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="student-task-item-desc">{task.description}</p>
                  )}

                  <div className="student-task-item-footer">
                    {dueDateFormatted && (
                      <span className={`student-task-due ${isOverdue ? 'is-overdue' : ''}`}>
                        {isOverdue ? <AlertCircle size={12} /> : <Calendar size={12} />}
                        Due: {dueDateFormatted}
                      </span>
                    )}

                    {task.type && (
                      <span className="student-task-type">
                        <Clock size={12} />
                        {task.type.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    )}

                    {task.createdByName && (
                      <span className="student-task-author">
                        By {task.createdByName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

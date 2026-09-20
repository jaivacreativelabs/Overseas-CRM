import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';

import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LeadsPage } from '../features/leads/LeadsPage';
import { LeadDetailPage } from '../features/leads/LeadDetailPage';
import { CounsellingPage } from '../features/counselling/CounsellingPage';
import { UniversitiesPage } from '../features/universities/UniversitiesPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { ApplicationsPage } from '../features/applications/ApplicationsPage';
import { OffersPage } from '../features/offers/OffersPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { VisaPage } from '../features/visa/VisaPage';
import { TravelPage } from '../features/travel/TravelPage';
import { OrientationPage } from '../features/orientation/OrientationPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { MessagesPage } from '../features/messages/MessagesPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { UsersPage } from '../features/users/UsersPage';
import { MastersPage } from '../features/masters/MastersPage';
import { AuditLogsPage } from '../features/audit-logs/AuditLogsPage';
import { StudentPortalPage } from '../features/student-portal/StudentPortalPage';

const ProtectedRoute: React.FC<{ children: React.ReactElement; allowedRoles?: UserRole[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Authenticating session...</div>;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === UserRole.STUDENT) {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Student Portal Dedicated Route */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute allowedRoles={[UserRole.STUDENT, UserRole.ADMIN, UserRole.COUNSELLOR]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentPortalPage />} />
      </Route>

      {/* Staff & Admin CRM Routes */}
      <Route
        element={
          <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.COUNSELLOR]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route path="/students" element={<LeadsPage isStudentOnly={true} />} />
        <Route path="/students/:id" element={<LeadDetailPage />} />
        <Route path="/counselling" element={<CounsellingPage />} />
        <Route path="/universities" element={<UniversitiesPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/visa" element={<VisaPage />} />
        <Route path="/travel" element={<TravelPage />} />
        <Route path="/orientation" element={<OrientationPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/masters" element={<MastersPage />} />

        {/* Admin Exclusive Routes */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback route */}
      <Route
        path="*"
        element={<Navigate to={user?.role === UserRole.STUDENT ? '/portal' : '/dashboard'} replace />}
      />
    </Routes>
  );
};

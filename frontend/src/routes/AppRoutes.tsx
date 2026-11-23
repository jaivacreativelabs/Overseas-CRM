import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminType, UserRole } from '../types';

import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';

import { LoginPage } from '../features/auth/LoginPage';
// Route-level code splitting: each page downloads only when first opened, so the initial
// load ships just the shell + login instead of every page and the charts library.
const lazyPage = <T extends Record<string, any>, K extends keyof T>(loader: () => Promise<T>, name: K) =>
  React.lazy(() => loader().then((m) => ({ default: m[name] as React.ComponentType<any> })));

const DashboardPage = lazyPage(() => import('../features/dashboard/DashboardPage'), 'DashboardPage');
const LeadsPage = lazyPage(() => import('../features/leads/LeadsPage'), 'LeadsPage');
const LeadDetailPage = lazyPage(() => import('../features/leads/LeadDetailPage'), 'LeadDetailPage');
const CounsellingPage = lazyPage(() => import('../features/counselling/CounsellingPage'), 'CounsellingPage');
const UniversitiesPage = lazyPage(() => import('../features/universities/UniversitiesPage'), 'UniversitiesPage');
const DocumentsPage = lazyPage(() => import('../features/documents/DocumentsPage'), 'DocumentsPage');
const ApplicationsPage = lazyPage(() => import('../features/applications/ApplicationsPage'), 'ApplicationsPage');
const OffersPage = lazyPage(() => import('../features/offers/OffersPage'), 'OffersPage');
const PaymentsPage = lazyPage(() => import('../features/payments/PaymentsPage'), 'PaymentsPage');
const VisaPage = lazyPage(() => import('../features/visa/VisaPage'), 'VisaPage');
const TravelPage = lazyPage(() => import('../features/travel/TravelPage'), 'TravelPage');
const OrientationPage = lazyPage(() => import('../features/orientation/OrientationPage'), 'OrientationPage');
const TasksPage = lazyPage(() => import('../features/tasks/TasksPage'), 'TasksPage');
const MessagesPage = lazyPage(() => import('../features/messages/MessagesPage'), 'MessagesPage');
const ReportsPage = lazyPage(() => import('../features/reports/ReportsPage'), 'ReportsPage');
const UsersPage = lazyPage(() => import('../features/users/UsersPage'), 'UsersPage');
const MastersPage = lazyPage(() => import('../features/masters/MastersPage'), 'MastersPage');
const AuditLogsPage = lazyPage(() => import('../features/audit-logs/AuditLogsPage'), 'AuditLogsPage');
const StudentPortalPage = lazyPage(() => import('../features/student-portal/StudentPortalPage'), 'StudentPortalPage');
const BranchesPage = lazyPage(() => import('../features/branches/BranchesPage'), 'BranchesPage');

const ProtectedRoute: React.FC<{
  children: React.ReactElement;
  allowedRoles?: UserRole[];
  requireOwnerAdmin?: boolean;
  /** Send the Owner Admin to the dashboard instead of rendering this route. */
  blockOwnerAdmin?: boolean;
}> = ({ children, allowedRoles, requireOwnerAdmin, blockOwnerAdmin }) => {
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

  const isOwnerAdmin =
    user.role === UserRole.ADMIN &&
    (user.adminType === AdminType.OWNER_ADMIN || !user.adminType);

  if (requireOwnerAdmin && !isOwnerAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (blockOwnerAdmin && isOwnerAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <React.Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading…</div>}>
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
        <Route
          path="/branches"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]} requireOwnerAdmin={true}>
              <BranchesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/integrations" element={<Navigate to="/branches" replace />} />
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
        <Route
          path="/messages"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.COUNSELLOR]} blockOwnerAdmin={true}>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <MastersPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Exclusive Routes */}
        <Route path="/reports" element={<ReportsPage />} />
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
    </React.Suspense>
  );
};

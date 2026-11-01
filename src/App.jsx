import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';

import { DashboardLayout } from './components/layout/DashboardLayout';
import { Spinner } from './components/common/Spinner';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const MesCourriersChefPage = lazy(() => import('./pages/MesCourriersChefPage').then(m => ({ default: m.MesCourriersChefPage })));
const CourriersArrivesPage = lazy(() => import('./pages/CourriersArrivesPage').then(m => ({ default: m.CourriersArrivesPage })));
const CourriersDepartPage = lazy(() => import('./pages/CourriersDepartPage').then(m => ({ default: m.CourriersDepartPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const BackupsPage = lazy(() => import('./pages/BackupsPage').then(m => ({ default: m.BackupsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Page loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="flex flex-col items-center gap-3">
      <Spinner size="lg" className="text-primary-500" />
      <span className="text-sm text-surface-400 font-medium">Chargement...</span>
    </div>
  </div>
);

// Full-screen loading for auth check
const AuthLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
    <div className="flex flex-col items-center gap-3">
      <Spinner size="lg" className="text-primary-500" />
      <span className="text-sm text-surface-500 font-medium">Chargement de l'application...</span>
    </div>
  </div>
);

// Protected Route HOC
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderRadius: '10px',
              border: '1px solid var(--border-primary)',
              fontSize: '13px',
              fontWeight: '500',
              boxShadow: 'var(--shadow-lg)',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#FFFFFF',
              },
            },
          }}
        />
        <Router>
          <Suspense fallback={<AuthLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE', 'USER_SERVICE']}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/mes-courriers"
                element={
                  <ProtectedRoute allowedRoles={['CHEF_DIVISION']}>
                    <MesCourriersChefPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/courriers-arrives"
                element={
                  <ProtectedRoute allowedRoles={['CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE', 'USER_SERVICE']}>
                    <CourriersArrivesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/courriers-depart"
                element={
                  <ProtectedRoute allowedRoles={['CHEF_DIVISION', 'RESPONSABLE_BO', 'SECRETAIRE', 'USER_SERVICE']}>
                    <CourriersDepartPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['CHEF_DIVISION']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['CHEF_DIVISION']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/backups"
                element={
                  <ProtectedRoute allowedRoles={['CHEF_DIVISION']}>
                    <BackupsPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

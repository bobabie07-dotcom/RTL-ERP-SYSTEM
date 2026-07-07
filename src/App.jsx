import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

// Keep Render.com backend awake — ping every 10 minutes to prevent cold starts
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
setInterval(() => fetch(`${BASE_URL}/api/health-check`).catch(() => {}), 10 * 60 * 1000);
import { AuthProvider, useAuth } from './context/AuthContext';
import { FarmProvider } from './context/FarmContext';
import { AppLayout } from './components/navigation/AppLayout';
import { ErrorBoundary } from './components/core/ErrorBoundary';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const HelpdeskPage = lazy(() => import('./pages/HelpdeskPage'));
const TicketDetailPage = lazy(() => import('./pages/TicketDetailPage'));
const BatchesPage = lazy(() => import('./pages/BatchesPage'));
const BatchDetailPage = lazy(() => import('./pages/BatchDetailPage'));
const FarmsPage = lazy(() => import('./pages/FarmsPage'));
const HousesPage = lazy(() => import('./pages/HousesPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const MortalityPage = lazy(() => import('./pages/MortalityPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const HealthPage = lazy(() => import('./pages/HealthPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));
const EggCollectionPage = lazy(() => import('./pages/EggCollectionPage'));
const EggGradingPage = lazy(() => import('./pages/EggGradingPage'));
const EggSalesPage = lazy(() => import('./pages/EggSalesPage'));
const SpentHenSalesPage = lazy(() => import('./pages/SpentHenSalesPage'));

function PageWrapper({ children }) {
  return <div style={{ animation: 'pageFadeIn 150ms ease-out backwards' }}>{children}</div>;
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: 14 }}>
      Loading...
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_first_login) return <Navigate to="/change-password" replace />;
  return (
    <FarmProvider>
      <AppLayout>
        <PageWrapper>
          <ErrorBoundary>{children}</ErrorBoundary>
        </PageWrapper>
      </AppLayout>
    </FarmProvider>
  );
}

function FirstLoginRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_first_login) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/"        element={<Navigate to="/dashboard" replace />} />
            <Route path="/login"   element={<LoginPage />} />
            <Route path="/change-password" element={<FirstLoginRoute><ChangePasswordPage /></FirstLoginRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/batches"   element={<ProtectedRoute><BatchesPage /></ProtectedRoute>} />
            <Route path="/batches/:id" element={<ProtectedRoute><BatchDetailPage /></ProtectedRoute>} />
            <Route path="/farms"       element={<ProtectedRoute><FarmsPage /></ProtectedRoute>} />
            <Route path="/houses"      element={<ProtectedRoute><HousesPage /></ProtectedRoute>} />
            <Route path="/inventory"   element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
            <Route path="/feed"        element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
            <Route path="/mortality"   element={<ProtectedRoute><MortalityPage /></ProtectedRoute>} />
            <Route path="/sales"       element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
            <Route path="/eggs/collections" element={<ProtectedRoute><EggCollectionPage /></ProtectedRoute>} />
            <Route path="/eggs/grading"     element={<ProtectedRoute><EggGradingPage /></ProtectedRoute>} />
            <Route path="/eggs/sales"       element={<ProtectedRoute><EggSalesPage /></ProtectedRoute>} />
            <Route path="/eggs/spent-hens"  element={<ProtectedRoute><SpentHenSalesPage /></ProtectedRoute>} />
            <Route path="/reports"     element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/settings"       element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/notifications"   element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
            <Route path="/super-admin"     element={<ProtectedRoute><SuperAdminPage /></ProtectedRoute>} />
            <Route path="/health"          element={<ProtectedRoute><HealthPage /></ProtectedRoute>} />
            <Route path="/maintenance"     element={<ProtectedRoute><MaintenancePage /></ProtectedRoute>} />
            <Route path="/support"                   element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
            <Route path="/support/tickets/:id"       element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
            <Route path="/helpdesk"                  element={<ProtectedRoute><HelpdeskPage /></ProtectedRoute>} />
            <Route path="/helpdesk/tickets/:id"      element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

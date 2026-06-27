import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FarmProvider } from './context/FarmContext';
import { AppLayout } from './components/navigation/AppLayout';
import { ErrorBoundary } from './components/core/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import SupportPage from './pages/SupportPage';
import HelpdeskPage from './pages/HelpdeskPage';
import BatchesPage from './pages/BatchesPage';
import BatchDetailPage from './pages/BatchDetailPage';
import FarmsPage from './pages/FarmsPage';
import HousesPage from './pages/HousesPage';
import InventoryPage from './pages/InventoryPage';
import FeedPage from './pages/FeedPage';
import MortalityPage from './pages/MortalityPage';
import SalesPage from './pages/SalesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import HealthPage from './pages/HealthPage';
import MaintenancePage from './pages/MaintenancePage';

function PageWrapper({ children }) {
  return <div style={{ animation: 'pageFadeIn 150ms ease-out backwards' }}>{children}</div>;
}

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: '0 0 8px' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>This section is coming soon.</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: 14 }}>
        Loading...
      </div>
    );
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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: 14 }}>
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_first_login) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          <Route path="/reports"     element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/settings"       element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/notifications"   element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/user-management" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
          <Route path="/health"          element={<ProtectedRoute><HealthPage /></ProtectedRoute>} />
          <Route path="/maintenance"     element={<ProtectedRoute><MaintenancePage /></ProtectedRoute>} />
          <Route path="/support"         element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
          <Route path="/helpdesk"        element={<ProtectedRoute><HelpdeskPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

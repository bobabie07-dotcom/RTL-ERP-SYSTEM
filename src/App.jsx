import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/navigation/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BatchesPage from './pages/BatchesPage';
import BatchDetailPage from './pages/BatchDetailPage';
import InventoryPage from './pages/InventoryPage';
import FeedPage from './pages/FeedPage';
import MortalityPage from './pages/MortalityPage';
import SalesPage from './pages/SalesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function PageWrapper({ children }) {
  return (
    <div style={{ animation: 'pageFadeIn 150ms ease-out both' }}>
      {children}
    </div>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: '0 0 8px' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>This section is coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<AppLayout><PageWrapper><DashboardPage /></PageWrapper></AppLayout>} />
        <Route path="/batches" element={<AppLayout><PageWrapper><BatchesPage /></PageWrapper></AppLayout>} />
        <Route path="/batches/:id" element={<AppLayout><PageWrapper><BatchDetailPage /></PageWrapper></AppLayout>} />
        <Route path="/inventory" element={<AppLayout><PageWrapper><InventoryPage /></PageWrapper></AppLayout>} />
        <Route path="/feed" element={<AppLayout><PageWrapper><FeedPage /></PageWrapper></AppLayout>} />
        <Route path="/mortality" element={<AppLayout><PageWrapper><MortalityPage /></PageWrapper></AppLayout>} />
        <Route path="/sales" element={<AppLayout><PageWrapper><SalesPage /></PageWrapper></AppLayout>} />
        <Route path="/reports" element={<AppLayout><PageWrapper><ReportsPage /></PageWrapper></AppLayout>} />
        <Route path="/settings" element={<AppLayout><PageWrapper><SettingsPage /></PageWrapper></AppLayout>} />
        <Route path="/farms" element={<AppLayout><PageWrapper><PlaceholderPage title="Farm Management" /></PageWrapper></AppLayout>} />
        <Route path="/houses" element={<AppLayout><PageWrapper><PlaceholderPage title="Poultry Houses" /></PageWrapper></AppLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

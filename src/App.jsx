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
        <Route path="/dashboard" element={<AppLayout><DashboardPage /></AppLayout>} />
        <Route path="/batches" element={<AppLayout><BatchesPage /></AppLayout>} />
        <Route path="/batches/:id" element={<AppLayout><BatchDetailPage /></AppLayout>} />
        <Route path="/inventory" element={<AppLayout><InventoryPage /></AppLayout>} />
        <Route path="/feed" element={<AppLayout><FeedPage /></AppLayout>} />
        <Route path="/mortality" element={<AppLayout><MortalityPage /></AppLayout>} />
        <Route path="/sales" element={<AppLayout><SalesPage /></AppLayout>} />
        <Route path="/reports" element={<AppLayout><ReportsPage /></AppLayout>} />
        <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
        <Route path="/farms" element={<AppLayout><PlaceholderPage title="Farm Management" /></AppLayout>} />
        <Route path="/houses" element={<AppLayout><PlaceholderPage title="Poultry Houses" /></AppLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

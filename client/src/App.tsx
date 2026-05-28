import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';

// Pages
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { HomePage } from '@/pages/HomePage';
import { WorkspacesPage } from '@/pages/WorkspacesPage';
import { WorkspaceDetailPage } from '@/pages/WorkspaceDetailPage';
import { DatasetsPage } from '@/pages/DatasetsPage';
import { DatasetPreviewPage } from '@/pages/DatasetPreviewPage';
import { TransformPage } from '@/pages/TransformPage';
import { DataModelPage } from '@/pages/DataModelPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ReportBuilderPage } from '@/pages/ReportBuilderPage';
import { SharedPage } from '@/pages/SharedPage';
import { AdminPage } from '@/pages/AdminPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PublicReportPage } from '@/pages/PublicReportPage';
import { EmbedReportPage } from '@/pages/EmbedReportPage';
import { PrintReportPage } from '@/pages/PrintReportPage';
import { ConnectionsPage } from '@/pages/ConnectionsPage';
import { ActivityPage } from '@/pages/ActivityPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="/public/:token" element={<PublicReportPage />} />
        <Route path="/embed/reports/:token" element={<EmbedReportPage />} />

        {/* Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/workspaces" element={<ProtectedRoute><WorkspacesPage /></ProtectedRoute>} />
        <Route path="/workspaces/:id" element={<ProtectedRoute><WorkspaceDetailPage /></ProtectedRoute>} />
        <Route path="/datasets" element={<ProtectedRoute><DatasetsPage /></ProtectedRoute>} />
        <Route path="/datasets/:id" element={<ProtectedRoute><DatasetPreviewPage /></ProtectedRoute>} />
        <Route path="/transform" element={<ProtectedRoute><TransformPage /></ProtectedRoute>} />
        <Route path="/transform/:id" element={<ProtectedRoute><TransformPage /></ProtectedRoute>} />
        <Route path="/data-model" element={<ProtectedRoute><DataModelPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/dashboards" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/reports/:id/edit" element={<ProtectedRoute><ReportBuilderPage /></ProtectedRoute>} />
        <Route path="/reports/:id/print" element={<ProtectedRoute><PrintReportPage /></ProtectedRoute>} />
        <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
        <Route path="/shared" element={<ProtectedRoute><SharedPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

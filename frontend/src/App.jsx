import React, { useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import AppLayout from './components/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InboxPage from './pages/InboxPage.jsx';
import ImportCenterPage from './pages/ImportCenterPage.jsx';
import RoutingAuditPage from './pages/RoutingAuditPage.jsx';
import FindingsPage from './pages/FindingsPage.jsx';
import FollowUpsPage from './pages/FollowUpsPage.jsx';
import ImportHistoryPage from './pages/ImportHistoryPage.jsx';
import ExportCenterPage from './pages/ExportCenterPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [inboxFilters, setInboxFilters] = useState({});

  // Deep navigation from Dashboard KPI clicks to filtered Inbox
  const handleNavigateToInbox = (filters = {}) => {
    if (filters.view === 'followups') {
      setCurrentTab('followups');
      return;
    }
    if (filters.view === 'routing') {
      setCurrentTab('routing');
      return;
    }
    setInboxFilters(filters);
    setCurrentTab('inbox');
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366f1',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          borderRadius: 8,
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: '#3b82f6'
        }
      }}
    >
      <AppLayout currentTab={currentTab} onTabChange={setCurrentTab}>
        {currentTab === 'dashboard' && (
          <DashboardPage onNavigateToInbox={handleNavigateToInbox} />
        )}
        {currentTab === 'inbox' && (
          <InboxPage initialFilters={inboxFilters} />
        )}
        {currentTab === 'import' && (
          <ImportCenterPage onImportSuccess={() => {}} />
        )}
        {currentTab === 'routing' && (
          <RoutingAuditPage />
        )}
        {currentTab === 'findings' && (
          <FindingsPage />
        )}
        {currentTab === 'followups' && (
          <FollowUpsPage />
        )}
        {currentTab === 'history' && (
          <ImportHistoryPage />
        )}
        {currentTab === 'exports' && (
          <ExportCenterPage />
        )}
        {currentTab === 'settings' && (
          <SettingsPage />
        )}
      </AppLayout>
    </ConfigProvider>
  );
}

export default App;

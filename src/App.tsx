import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { NotificationToast } from './components/NotificationToast';
import { Dashboard } from './pages/Dashboard';
import { AttendancePage } from './pages/AttendancePage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailsPage } from './pages/ClientDetailsPage';
import { ExpiringMembershipsPage } from './pages/ExpiringMembershipsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { activePage, settingsLoaded } = useApp();

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'attendance':
        return <AttendancePage />;
      case 'clients':
        return <ClientsPage />;
      case 'client-detail':
        return <ClientDetailsPage />;
      case 'expiring':
        return <ExpiringMembershipsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 transition-colors duration-250">
      {settingsLoaded ? (
        <>
          <Sidebar />
          <main className="flex-1 w-full overflow-y-auto pb-20 md:pb-0">
            {renderPage()}
          </main>
          <NotificationToast />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;

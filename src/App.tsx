import { useEffect } from 'react';
import { StoreProvider, useStore } from './lib/store';
import { Shell } from './components/Layout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { DocumentsPage, ArchivePage } from './pages/Documents';
import { KnowledgePage, LessonsPage } from './pages/Knowledge';
import { AssistantPage, SearchPage } from './pages/Assistant';
import { ReportsPage } from './pages/Reports';
import { InboxPage } from './pages/Inbox';
import { UsersPage, OrgPage, SecurityPage, BackupPage, SystemPage } from './pages/Admin';
import { RegistryPage } from './pages/Registry';
import { HelpPage } from './pages/Help';

function Router() {
  const s = useStore();
  useEffect(() => {
    document.documentElement.dir = s.lang === 'fa' ? 'rtl' : 'ltr';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!s.user) return <LoginPage />;
  const p = s.nav.page;
  const page =
    p === 'dashboard' ? <DashboardPage /> :
    p === 'documents' ? <DocumentsPage /> :
    p === 'archive' ? <ArchivePage /> :
    p === 'knowledge' ? <KnowledgePage /> :
    p === 'lessons' ? <LessonsPage /> :
    p === 'search' ? <SearchPage /> :
    p === 'assistant' ? <AssistantPage /> :
    p === 'reports' ? <ReportsPage /> :
    p === 'inbox' ? <InboxPage /> :
    p === 'users' ? <UsersPage /> :
    p === 'org' ? <OrgPage /> :
    p === 'security' ? <SecurityPage /> :
    p === 'backup' ? <BackupPage /> :
    p === 'system' ? <SystemPage /> :
    p === 'registry' ? <RegistryPage /> :
    p === 'help' ? <HelpPage /> :
    <DashboardPage />;
  return <Shell>{page}</Shell>;
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}

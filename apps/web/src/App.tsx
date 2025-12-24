import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import { CoPilotProvider } from './contexts/CoPilotContext';
import PlanningPage from './pages/Planning';
import KanbanPage from './pages/Kanban';
import UIBuilderPage from './pages/UIBuilder';
import DBBuilderPage from './pages/DBBuilder';
import WorkflowsPage from './pages/Workflows';
import AgentsPage from './pages/Agents';
import TerminalPage from './pages/Terminal';
import UsagePage from './pages/Usage';
import TeamSessionPage from './pages/TeamSession';

// Wrapper component to provide location-keyed error boundary
function RouteContent() {
  const location = useLocation();

  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/kanban" element={<KanbanPage />} />
        <Route path="/ui-builder" element={<UIBuilderPage />} />
        <Route path="/db-builder" element={<DBBuilderPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/terminal" element={<TerminalPage />} />
        <Route path="/usage" element={<UsagePage />} />
        <Route path="/team-session" element={<TeamSessionPage />} />
        <Route path="/team-session/:sessionId" element={<TeamSessionPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

// Get marketing URL - in production, use www.agentworksstudio.com
function getMarketingUrl(): string {
  // Check for explicit env var first
  if (import.meta.env.VITE_MARKETING_URL) {
    return import.meta.env.VITE_MARKETING_URL;
  }
  // In production (not localhost), derive from current domain
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//www.agentworksstudio.com`;
  }
  // Local development fallback
  return 'http://localhost:3012';
}

const MARKETING_URL = getMarketingUrl();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner size="xl" message="Loading..." className="min-h-screen" />;
  }

  if (!user) {
    // Redirect to marketing site's login
    window.location.href = `${MARKETING_URL}/login`;
    return <LoadingSpinner size="xl" message="Redirecting..." className="min-h-screen" />;
  }

  return <>{children}</>;
}

// Component to handle root route - redirect based on auth status
function RootRoute() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner size="xl" message="Loading..." className="min-h-screen" />;
  }

  // If user is logged in, redirect to the app
  if (user) {
    return <Navigate to="/planning" replace />;
  }

  // If not logged in, redirect to marketing site's login
  window.location.href = `${MARKETING_URL}/login`;
  return <LoadingSpinner size="xl" message="Redirecting..." className="min-h-screen" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <CoPilotProvider>
                <Layout>
                  <RouteContent />
                </Layout>
              </CoPilotProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

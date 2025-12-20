import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import { CoPilotProvider } from './contexts/CoPilotContext';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
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
        <Route path="/" element={<Navigate to="/planning" replace />} />
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner size="xl" message="Loading..." className="min-h-screen" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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

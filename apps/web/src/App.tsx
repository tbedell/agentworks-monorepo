import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import { CoPilotProvider } from './contexts/CoPilotContext';
import { TourProvider } from './contexts/TourContext';
import CoPilotDrawer from './components/copilot/CoPilotDrawer';
import InteractiveTour from './components/tour/InteractiveTour';
import { TourChecklist } from './components/tour/TourChecklist';
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

function TourInitializer() {
  // Tour no longer auto-starts - it only starts when user clicks "Start Tour" in SecondaryNavBar
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  const isDevMode = (import.meta as any)?.env?.VITE_DEV_MODE === 'true' || 
                    (import.meta as any)?.env?.DEV === true ||
                    window.location.hostname === 'localhost';

  if (isDevMode) {
    return <>{children}</>;
  }

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
                <TourProvider>
                  <TourInitializer />
                  <Layout>
                    <ErrorBoundary>
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
                      </Routes>
                    </ErrorBoundary>
                  </Layout>
                  <CoPilotDrawer />
                  <InteractiveTour />
                  <TourChecklist />
                </TourProvider>
              </CoPilotProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

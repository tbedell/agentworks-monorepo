import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Lightbulb,
  Columns3,
  Monitor,
  Database,
  Zap,
  Bot,
  DollarSign,
  User,
  LogOut,
  PanelLeft,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import UserProfile from '../user/UserProfile';
import LeftPanel from './LeftPanel';
import PlanningLeftPanel from './panels/PlanningLeftPanel';
import KanbanLeftPanel from './panels/KanbanLeftPanel';
import UIBuilderLeftPanel from './panels/UIBuilderLeftPanel';
import DBBuilderLeftPanel from './panels/DBBuilderLeftPanel';
import WorkflowsLeftPanel from './panels/WorkflowsLeftPanel';
import ProjectSelector from '../project/ProjectSelector';
import { UIAgentProvider } from '../../contexts/UIAgentContext';
import { DBBuilderProvider } from '../../contexts/DBBuilderContext';

const NAV_ITEMS = [
  { to: '/planning', icon: Lightbulb, label: 'Planning' },
  { to: '/kanban', icon: Columns3, label: 'Kanban' },
  { to: '/ui-builder', icon: Monitor, label: 'UI Builder' },
  { to: '/db-builder', icon: Database, label: 'DB Builder' },
  { to: '/workflows', icon: Zap, label: 'Workflows' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/team-session', icon: Users, label: 'Team Session' },
  { to: '/usage', icon: DollarSign, label: 'Usage & Billing' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem('agentworks-left-panel-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('agentworks-left-panel-collapsed', JSON.stringify(leftPanelCollapsed));
  }, [leftPanelCollapsed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setLeftPanelCollapsed((prev: boolean) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 h-14 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-4">
          {/* Left Panel Toggle */}
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className={`p-2 rounded-lg transition-colors ${
              leftPanelCollapsed
                ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
            }`}
            title={`Toggle panel (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+\\)`}
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
              AW
            </div>
            <span className="text-lg font-semibold text-slate-900">AgentWorks</span>
          </div>

          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600"></div>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:block">
            <ProjectSelector />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-blue-300 transition-all"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium text-sm">
                  {user?.name?.[0]?.toUpperCase() || 'TB'}
                </div>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-medium text-sm text-slate-900">{user?.name || 'Thomas Bedell'}</p>
                  <p className="text-xs text-slate-500">{user?.email || 'tb@agentworks.ai'}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserProfile(true);
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Profile & Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Route-based Left Panel with appropriate context providers */}
        {(() => {
          const panelProps = {
            collapsed: leftPanelCollapsed,
            onToggle: () => setLeftPanelCollapsed(!leftPanelCollapsed),
          };

          const mainContent = (
            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
              <div className="flex-1 overflow-auto">
                {children}
              </div>
            </main>
          );

          switch (location.pathname) {
            case '/planning':
              return (
                <>
                  <PlanningLeftPanel {...panelProps} />
                  {mainContent}
                </>
              );
            case '/kanban':
              return (
                <>
                  <KanbanLeftPanel {...panelProps} />
                  {mainContent}
                </>
              );
            case '/ui-builder':
              return (
                <UIAgentProvider>
                  <UIBuilderLeftPanel {...panelProps} />
                  {mainContent}
                </UIAgentProvider>
              );
            case '/db-builder':
              return (
                <DBBuilderProvider>
                  <DBBuilderLeftPanel {...panelProps} />
                  {mainContent}
                </DBBuilderProvider>
              );
            case '/workflows':
              return (
                <>
                  <WorkflowsLeftPanel {...panelProps} />
                  {mainContent}
                </>
              );
            case '/usage':
              // Usage page has no left panel - standalone analytics page
              return mainContent;
            default:
              return (
                <>
                  <LeftPanel {...panelProps} />
                  {mainContent}
                </>
              );
          }
        })()}
      </div>

      <UserProfile
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
      />
    </div>
  );
}

import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Key,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  FileText,
  TrendingUp,
  Zap,
  UserPlus,
  Crown,
  Link2,
  Rocket,
  Mail,
  Star,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
} | {
  type: 'divider';
  label: string;
};

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Executive KPIs', href: '/kpi/executive', icon: TrendingUp },

  // Growth & Marketing section
  { type: 'divider', label: 'Growth & Marketing' },
  { name: 'Launch Control', href: '/launch', icon: Rocket },
  { name: 'Email Campaigns', href: '/campaigns', icon: Mail },
  { name: 'Influencers', href: '/influencers', icon: Star },
  { name: 'Waitlist', href: '/waitlist', icon: UserPlus },
  { name: 'Founders', href: '/founders', icon: Crown },
  { name: 'Affiliates', href: '/affiliates', icon: Link2 },

  // Operations section
  { type: 'divider', label: 'Operations' },
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'BYOA', href: '/byoa', icon: Zap },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Providers', href: '/providers', icon: Key },

  // Insights section
  { type: 'divider', label: 'Insights' },
  { name: '2025 Mkt Report', href: '/market-report', icon: TrendingUp },
  { name: 'KPI Metrics', href: '/kpi', icon: BarChart3 },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Audit Logs', href: '/audit', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">AgentWorks</h1>
              <p className="text-xs text-slate-500">Admin Console</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item, index) => {
            if ('type' in item && item.type === 'divider') {
              return (
                <div key={`divider-${index}`} className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </p>
                </div>
              );
            }

            const navItem = item as { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
            const isActive = location.pathname === navItem.href ||
              (navItem.href !== '/' && location.pathname.startsWith(navItem.href));
            return (
              <Link
                key={navItem.name}
                to={navItem.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <navItem.icon className="w-5 h-5" />
                {navItem.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}

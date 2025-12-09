import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ToastProvider } from '@/components/ui/Toast';
import { Login } from '@/routes/Login';
import { Dashboard } from '@/routes/Dashboard';
import { TenantList } from '@/routes/tenants/TenantList';
import { TenantDetail } from '@/routes/tenants/TenantDetail';
import { TenantForm } from '@/routes/tenants/TenantForm';
import { ProviderList } from '@/routes/providers/ProviderList';
import { ProviderForm } from '@/routes/providers/ProviderForm';
import { BillingDashboard } from '@/routes/billing/BillingDashboard';
import { SubscriptionList } from '@/routes/billing/SubscriptionList';
import { AnalyticsDashboard } from '@/routes/analytics/AnalyticsDashboard';
import { AuditLogs } from '@/routes/audit/AuditLogs';
import { Settings } from '@/routes/settings/Settings';
import { KPIDashboard } from '@/routes/kpi/KPIDashboard';
import { TenantProfitability } from '@/routes/kpi/TenantProfitability';
import { CostEstimator } from '@/routes/kpi/CostEstimator';
import { BYOADashboard } from '@/routes/byoa/BYOADashboard';
import { useAuthStore } from '@/stores/auth';

// New Growth & Marketing pages
import WaitlistDashboard from '@/routes/waitlist/WaitlistDashboard';
import WaitlistDetail from '@/routes/waitlist/WaitlistDetail';
import FoundersDashboard from '@/routes/founders/FoundersDashboard';
import FounderDetail from '@/routes/founders/FounderDetail';
import AffiliateDashboard from '@/routes/affiliates/AffiliateDashboard';
import AffiliateDetail from '@/routes/affiliates/AffiliateDetail';
import PayoutQueue from '@/routes/affiliates/PayoutQueue';
import ExecutiveDashboard from '@/routes/kpi/ExecutiveDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />

              {/* Growth & Marketing */}
              <Route path="/waitlist" element={<WaitlistDashboard />} />
              <Route path="/waitlist/:id" element={<WaitlistDetail />} />
              <Route path="/founders" element={<FoundersDashboard />} />
              <Route path="/founders/:id" element={<FounderDetail />} />
              <Route path="/affiliates" element={<AffiliateDashboard />} />
              <Route path="/affiliates/payouts" element={<PayoutQueue />} />
              <Route path="/affiliates/:id" element={<AffiliateDetail />} />

              {/* Operations */}
              <Route path="/tenants" element={<TenantList />} />
              <Route path="/tenants/new" element={<TenantForm />} />
              <Route path="/tenants/:id" element={<TenantDetail />} />
              <Route path="/tenants/:id/edit" element={<TenantForm />} />
              <Route path="/providers" element={<ProviderList />} />
              <Route path="/providers/new" element={<ProviderForm />} />
              <Route path="/providers/:id/edit" element={<ProviderForm />} />
              <Route path="/billing" element={<BillingDashboard />} />
              <Route path="/billing/subscriptions" element={<SubscriptionList />} />
              <Route path="/byoa" element={<BYOADashboard />} />

              {/* Insights */}
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/kpi" element={<KPIDashboard />} />
              <Route path="/kpi/executive" element={<ExecutiveDashboard />} />
              <Route path="/kpi/tenants" element={<TenantProfitability />} />
              <Route path="/kpi/estimator" element={<CostEstimator />} />
              <Route path="/audit" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

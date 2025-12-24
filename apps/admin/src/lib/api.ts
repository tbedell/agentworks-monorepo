// Use VITE_API_URL if set, otherwise use relative URLs (works with Vite proxy)
const API_BASE = (import.meta as any)?.env?.VITE_API_URL
  ? `${(import.meta as any).env.VITE_API_URL}/api/admin`
  : '/api/admin';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    console.error('API Error:', response.status, url, error);
    throw new Error(error.error || error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial' | 'deleted';
  planId?: string;
  planName?: string;
  stripeCustomerId?: string;
  tokenUsageThisMonth: number;
  tokenLimit?: number;
  memberCount: number;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  provider: string;
  displayName: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
  secretName: string;
  rateLimit?: number;
  monthlyBudget?: number;
  currentSpend: number;
  currentMonthSpend: number;
  status: 'healthy' | 'not_configured' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalTenants: number;
  tenantChange: number;
  monthlyRevenue: number;
  revenueChange: number;
  activeProviders: number;
  totalProviders: number;
  tokensThisMonth: number;
  tokenChange: number;
}

export interface ProviderStatus {
  provider: string;
  displayName: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
  status: 'healthy' | 'not_configured' | 'error';
}

export interface RecentActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  adminName: string;
}

export interface UsageByProvider {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  providerCost: number;
  billedAmount: number;
  requestCount: number;
}

export interface Plan {
  id: string;
  name: string;
  stripePriceId?: string;
  monthlyPrice: number;
  tokenLimit?: number;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
  testMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CryptoWallet {
  id: string;
  currency: string;
  displayName: string;
  walletAddress: string;
  qrCodeUrl?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSettings {
  [key: string]: { value: string; description: string | null };
}

export interface UsageSummary {
  totalTokens: number;
  totalCost: number;
  totalBilled: number;
  byProvider: Record<string, { tokens: number; cost: number; billed: number }>;
  byTenant: Record<string, { tokens: number; cost: number; billed: number }>;
}

export interface Subscription {
  id: string;
  tenantId: string;
  stripeSubscriptionId: string;
  planId: string;
  planName: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  tenantId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  timestamp: string;
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
  getProviderStatus: () => api.get<ProviderStatus[]>('/dashboard/provider-status'),
  getRecentActivity: () => api.get<RecentActivity[]>('/dashboard/recent-activity'),
  getUsageByProvider: () => api.get<UsageByProvider[]>('/dashboard/usage-by-provider'),
};

export const tenantsApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ tenants: Tenant[]; total: number }>('/tenants', params),
  get: (id: string) => api.get<Tenant>(`/tenants/${id}`),
  create: (data: { name: string; slug: string; planId?: string }) =>
    api.post<Tenant>('/tenants', data),
  update: (id: string, data: Partial<Tenant>) => api.patch<Tenant>(`/tenants/${id}`, data),
  suspend: (id: string) => api.post<Tenant>(`/tenants/${id}/suspend`),
  activate: (id: string) => api.post<Tenant>(`/tenants/${id}/activate`),
  delete: (id: string) => api.delete<void>(`/tenants/${id}`),
  adminGrant: (id: string, data: { planId: string; tokenBalance?: number }) =>
    api.post<Tenant>(`/tenants/${id}/admin-grant`, data),
  addTokens: (id: string, tokens: number) =>
    api.post<{ id: string; tokenBalance: number; tokensAdded: number }>(`/tenants/${id}/add-tokens`, { tokens }),
};

export const providersApi = {
  list: () => api.get<Provider[]>('/providers'),
  get: (id: string) => api.get<Provider>(`/providers/${id}`),
  create: (data: { provider: string; displayName: string; apiKey: string }) =>
    api.post<Provider>('/providers', data),
  update: (id: string, data: Partial<Provider>) => api.patch<Provider>(`/providers/${id}`, data),
  updateKey: (id: string, apiKey: string) =>
    api.post<Provider>(`/providers/${id}/rotate-key`, { apiKey }),
  delete: (id: string) => api.delete<void>(`/providers/${id}`),
  testConnection: (id: string) => api.post<{ success: boolean; message: string }>(`/providers/${id}/test`),
};

export const billingApi = {
  getSubscriptions: (params?: { tenantId?: string; status?: string }) =>
    api.get<Subscription[]>('/billing/subscriptions', params),
  getSubscription: (id: string) => api.get<Subscription>(`/billing/subscriptions/${id}`),
  cancelSubscription: (id: string) => api.post<Subscription>(`/billing/subscriptions/${id}/cancel`),
  getInvoices: (tenantId?: string) => api.get<any[]>('/billing/invoices', { tenantId }),
  syncStripe: () => api.post<{ synced: number }>('/billing/sync'),
};

export const analyticsApi = {
  getUsageSummary: (params?: { startDate?: string; endDate?: string; tenantId?: string }) =>
    api.get<UsageSummary>('/analytics/usage', params),
  getRevenueMetrics: () =>
    api.get<{ mrr: number; arr: number; churn: number; growth: number }>('/analytics/revenue'),
  getTopTenants: (limit?: number) =>
    api.get<{ tenants: Array<Tenant & { usage: number; revenue: number }> }>('/analytics/top-tenants', { limit }),
};

export const auditApi = {
  list: (params?: { adminId?: string; action?: string; page?: number; limit?: number }) =>
    api.get<{ logs: AuditLog[]; total: number }>('/audit', params),
};

export interface KPISummary {
  revenue: {
    total: number;
    subscription: number;
    usage: number;
    overage: number;
    growth: number;
  };
  costs: {
    total: number;
    llm: number;
    infrastructure: number;
    affiliate: number;
    operations: number;
  };
  margins: {
    gross: number;
    net: number;
  };
  runway: {
    months: number;
    cashPosition: number;
  };
  metrics: {
    activeTenants: number;
    totalApiCalls: number;
    avgCostPerCall: number;
    avgRevenuePerCall: number;
  };
}

export interface TenantProfitability {
  tenantId: string;
  tenantName: string;
  plan: string;
  revenue: number;
  llmCost: number;
  infraCost: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  status: 'healthy' | 'warning' | 'critical';
  anomalies: string[];
}

export interface Anomaly {
  type: 'margin' | 'usage' | 'cost' | 'churn';
  severity: 'low' | 'medium' | 'high';
  tenantId?: string;
  tenantName?: string;
  message: string;
  value: number;
  threshold: number;
}

export interface GCPCosts {
  totalCost: number;
  byService: Record<string, number>;
  byDate: Array<{ date: string; cost: number }>;
  period: { start: string; end: string };
}

export interface CostEstimate {
  tenants: number;
  avgCallsPerTenant: number;
  modelMix: Record<string, number>;
  planMix: Record<string, number>;
  utilization: number;
  estimates: {
    monthlyRevenue: number;
    monthlyCost: number;
    monthlyProfit: number;
    margin: number;
    costPerCall: number;
    revenuePerCall: number;
  };
}

export interface ProviderPricing {
  provider: string;
  model: string;
  inputPer1M: number;
  outputPer1M: number;
}

export const kpiApi = {
  getSummary: () => api.get<KPISummary>('/kpi/summary'),
  getTenantProfitability: () => api.get<TenantProfitability[]>('/kpi/tenants'),
  getAnomalies: () => api.get<Anomaly[]>('/kpi/anomalies'),
  getGCPCosts: (period?: string) => api.get<GCPCosts>('/kpi/gcp', { period }),
  getCostBreakdown: (tenantId?: string) =>
    api.get<{ llm: number; infra: number; affiliate: number; total: number }>('/kpi/costs', { tenantId }),
  estimate: (params: {
    tenants: number;
    avgCallsPerTenant: number;
    modelMix: Record<string, number>;
    planMix: Record<string, number>;
    utilization: number;
  }) => api.post<CostEstimate>('/kpi/estimate', params),
  getPricing: () => api.get<ProviderPricing[]>('/kpi/pricing'),
  getRealtime: () => api.get<{ timestamp: string; activeRequests: number; queueDepth: number; avgLatency: number }>('/kpi/realtime'),
};

export const settingsApi = {
  getAll: () => api.get<PlatformSettings>('/settings'),
  get: (key: string) => api.get<{ key: string; value: string; description?: string }>(`/settings/${key}`),
  update: (key: string, value: string, description?: string) =>
    api.put<{ key: string; value: string }>(`/settings/${key}`, { value, description }),
  bulkUpdate: (settings: Record<string, string>) =>
    api.post<{ success: boolean; updated: Record<string, string> }>('/settings/bulk', settings),
  getPaymentProviders: () => api.get<PaymentProvider[]>('/settings/payment-providers'),
  updatePaymentProvider: (id: string, data: { enabled?: boolean; testMode?: boolean }) =>
    api.patch<PaymentProvider>(`/settings/payment-providers/${id}`, data),
  getCryptoWallets: () => api.get<CryptoWallet[]>('/settings/crypto-wallets'),
  updateCryptoWallet: (id: string, data: { walletAddress?: string; qrCodeUrl?: string; enabled?: boolean }) =>
    api.patch<CryptoWallet>(`/settings/crypto-wallets/${id}`, data),
  getPlans: () => api.get<Plan[]>('/settings/plans'),
  updatePlan: (id: string, data: Partial<Plan>) => api.patch<Plan>(`/settings/plans/${id}`, data),
};

// ===== WAITLIST TYPES & API =====

export interface WaitlistLead {
  id: string;
  email: string;
  name?: string;
  referralCode: string;
  referredByCode?: string;
  referralCount: number;
  position: number;
  status: 'waiting' | 'invited' | 'converted' | 'expired';
  founderTier?: string;
  founderPlanName?: string;
  affiliate?: {
    id: string;
    name: string;
    code: string;
  } | null;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  convertedAt?: string;
  createdAt: string;
}

export interface WaitlistStats {
  total: number;
  byStatus: Record<string, number>;
  tierBreakdown: Array<{
    tier: string;
    name: string;
    count: number;
    totalSpots: number;
    remainingSpots: number;
  }>;
  recentSignups: number;
  topReferrers: Array<{
    id: string;
    email: string;
    name?: string;
    referralCode: string;
    referralCount: number;
  }>;
  conversionRate: string;
}

export interface WaitlistQuery {
  status?: 'waiting' | 'invited' | 'converted' | 'expired';
  search?: string;
  founderTier?: 'diamond' | 'gold' | 'silver';
  affiliateId?: string;
  hasReferrals?: 'true' | 'false';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'position' | 'createdAt' | 'referralCount' | 'email';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const waitlistApi = {
  list: (params?: WaitlistQuery) =>
    api.get<{ leads: WaitlistLead[]; total: number; page: number; limit: number; totalPages: number }>('/waitlist', params as Record<string, string | number | boolean | undefined>),
  get: (id: string) => api.get<WaitlistLead & {
    referrer?: { id: string; email: string; name?: string; referralCode: string } | null;
    referrals: Array<{ id: string; email: string; name?: string; status: string; createdAt: string }>;
    tenant?: { id: string; name: string; slug: string; status: string; createdAt: string } | null;
  }>(`/waitlist/${id}`),
  getStats: () => api.get<WaitlistStats>('/waitlist/stats'),
  update: (id: string, data: { status?: string; position?: number; name?: string; founderPlanId?: string }) =>
    api.patch<WaitlistLead>(`/waitlist/${id}`, data),
  invite: (id: string) => api.post<{ success: boolean; message: string }>(`/waitlist/${id}/invite`),
  convert: (id: string, data: { tenantName: string; planId?: string; grantTokens?: number }) =>
    api.post<{ success: boolean; tenant: { id: string; name: string; slug: string }; user: { id: string; email: string } }>(`/waitlist/${id}/convert`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/waitlist/${id}`),
  bulk: (data: { ids: string[]; action: 'invite' | 'updateStatus' | 'delete'; status?: string }) =>
    api.post<{ success: boolean; processed: number; total: number; errors?: string[] }>('/waitlist/bulk', data),
  export: (params?: WaitlistQuery) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return fetch(`/api/admin/waitlist/export?${searchParams.toString()}`, { credentials: 'include' });
  },
};

// ===== FOUNDERS TYPES & API =====

export interface FounderPurchase {
  id: string;
  email: string;
  name?: string;
  tier: string;
  tierName: string;
  price: number;
  status: 'waiting' | 'invited' | 'converted' | 'expired';
  position: number;
  referralCode: string;
  referralCount: number;
  affiliate?: { id: string; name: string; code: string } | null;
  tenantId?: string;
  convertedAt?: string;
  createdAt: string;
}

export interface FounderPlan {
  id: string;
  tier: string;
  name: string;
  price: number;
  totalSpots: number;
  remainingSpots: number;
  soldSpots: number;
  features: string[];
  affiliateBonus: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FounderStats {
  summary: {
    totalFounders: number;
    totalRevenue: number;
    totalSold: number;
    totalSpots: number;
    remainingSpots: number;
    conversionRate: string;
    averageOrderValue: string;
  };
  tierStats: Array<{
    tier: string;
    name: string;
    price: number;
    totalSpots: number;
    remainingSpots: number;
    soldSpots: number;
    revenue: number;
    affiliateBonus: number;
    features: string[];
  }>;
  recentPurchases: Array<{
    id: string;
    email: string;
    name?: string;
    tier: string;
    tierName: string;
    price: number;
    status: string;
    affiliate?: { name: string; code: string } | null;
    createdAt: string;
  }>;
}

export interface FounderQuery {
  tier?: 'diamond' | 'gold' | 'silver';
  status?: 'waiting' | 'invited' | 'converted' | 'expired';
  search?: string;
  hasAffiliate?: 'true' | 'false';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'position' | 'tier';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const foundersApi = {
  list: (params?: FounderQuery) =>
    api.get<{ founders: FounderPurchase[]; total: number; page: number; limit: number; totalPages: number }>('/founders', params as Record<string, string | number | boolean | undefined>),
  get: (id: string) => api.get<FounderPurchase & {
    features?: string[];
    affiliateBonus?: number;
    affiliateConversion?: { id: string; commission: number; bonus: number; status: string; createdAt: string } | null;
    tenant?: { id: string; name: string; slug: string; status: string; userCount: number; workspaceCount: number; createdAt: string } | null;
  }>(`/founders/${id}`),
  getStats: () => api.get<FounderStats>('/founders/stats'),
  getPlans: () => api.get<FounderPlan[]>('/founders/plans'),
  updatePlan: (tier: string, data: { name?: string; price?: number; totalSpots?: number; remainingSpots?: number; features?: string[]; affiliateBonus?: number; active?: boolean }) =>
    api.patch<FounderPlan>(`/founders/plans/${tier}`, data),
  update: (id: string, data: { status?: string; notes?: string }) =>
    api.patch<FounderPurchase>(`/founders/${id}`, data),
  activate: (id: string) =>
    api.post<{ success: boolean; tenant: { id: string; name: string; slug: string }; user: { id: string; email: string } }>(`/founders/${id}/activate`),
  refund: (id: string, data: { reason: string; refundAmount?: number }) =>
    api.post<{ success: boolean; refundAmount: number; message: string }>(`/founders/${id}/refund`, data),
};

// ===== AFFILIATE TYPES & API =====

export interface Affiliate {
  id: string;
  email: string;
  name: string;
  code: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  tier: 'standard' | 'silver' | 'gold' | 'platinum';
  tierName: string;
  commissionRate: number;
  lifetimeEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  totalReferrals: number;
  totalConversions: number;
  website?: string;
  leadCount: number;
  conversionCount: number;
  payoutCount: number;
  approvedAt?: string;
  createdAt: string;
}

export interface AffiliateStats {
  summary: {
    totalAffiliates: number;
    approvedAffiliates: number;
    pendingApplications: number;
    totalPendingPayouts: number;
    totalPaidOut: number;
  };
  byStatus: Record<string, number>;
  byTier: Array<{ tier: string; name: string; count: number; totalEarnings: number }>;
  topPerformers: Array<{
    id: string;
    name: string;
    code: string;
    tier: string;
    lifetimeEarnings: number;
    totalConversions: number;
    totalReferrals: number;
  }>;
  recentConversions: Array<{
    id: string;
    affiliateName: string;
    affiliateCode: string;
    founderTier?: string;
    amount: number;
    commission: number;
    bonus: number;
    status: string;
    createdAt: string;
  }>;
}

export interface AffiliateConversion {
  id: string;
  leadEmail: string;
  founderTier?: string;
  founderPlanName?: string;
  amount: number;
  commission: number;
  bonus: number;
  total: number;
  status: 'pending' | 'paid' | 'refunded';
  stripePaymentId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface AffiliatePayout {
  id: string;
  affiliateId: string;
  amount: number;
  method: 'paypal' | 'stripe' | 'manual';
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  processedAt?: string;
  createdAt: string;
}

export interface FraudAlert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  affiliateId: string;
  affiliateName: string;
  affiliateCode: string;
  details: string;
  createdAt: string;
}

export interface AffiliateQuery {
  status?: 'pending' | 'approved' | 'rejected' | 'suspended';
  tier?: 'standard' | 'silver' | 'gold' | 'platinum';
  search?: string;
  hasEarnings?: 'true' | 'false';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'lifetimeEarnings' | 'totalReferrals' | 'totalConversions';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const affiliatesApi = {
  list: (params?: AffiliateQuery) =>
    api.get<{ affiliates: Affiliate[]; total: number; page: number; limit: number; totalPages: number }>('/affiliates', params as Record<string, string | number | boolean | undefined>),
  get: (id: string) => api.get<Affiliate & {
    conversionRate: string;
    socialLinks?: Record<string, string>;
    paypalEmail?: string;
    stripeAccountId?: string;
    notes?: string;
    user?: { id: string; email: string; name: string } | null;
    leads: Array<{ id: string; email: string; name?: string; status: string; createdAt: string }>;
    conversions: AffiliateConversion[];
    payouts: AffiliatePayout[];
  }>(`/affiliates/${id}`),
  getStats: () => api.get<AffiliateStats>('/affiliates/stats'),
  update: (id: string, data: { tier?: string; commissionRate?: number; notes?: string; paypalEmail?: string | null; stripeAccountId?: string | null }) =>
    api.patch<Affiliate>(`/affiliates/${id}`, data),
  approve: (id: string) => api.post<{ success: boolean; affiliate: Affiliate }>(`/affiliates/${id}/approve`),
  reject: (id: string, data: { reason: string }) => api.post<{ success: boolean; affiliate: Affiliate }>(`/affiliates/${id}/reject`, data),
  suspend: (id: string, data: { reason: string }) => api.post<{ success: boolean; affiliate: Affiliate }>(`/affiliates/${id}/suspend`, data),
  reinstate: (id: string) => api.post<{ success: boolean; affiliate: Affiliate }>(`/affiliates/${id}/reinstate`),
  getConversions: (id: string) => api.get<AffiliateConversion[]>(`/affiliates/${id}/conversions`),
  getPayouts: (id: string) => api.get<AffiliatePayout[]>(`/affiliates/${id}/payouts`),
  createPayout: (id: string, data: { amount: number; method: string; transactionId?: string }) =>
    api.post<{ success: boolean; payout: AffiliatePayout }>(`/affiliates/${id}/payout`, data),
  processPayouts: (data: { ids: string[]; transactionIds?: Record<string, string> }) =>
    api.post<{ success: boolean; processed: number; total: number; errors?: string[] }>('/affiliates/payouts/process', data),
  overrideCommission: (id: string, data: { rate: number; reason: string }) =>
    api.patch<{ success: boolean; affiliate: Affiliate }>(`/affiliates/${id}/commission`, data),
  getFraudAlerts: () => api.get<{ alerts: FraudAlert[]; summary: { total: number; high: number; medium: number; low: number } }>('/affiliates/fraud-alerts'),
  getPendingPayouts: () => api.get<{
    pendingPayouts: Array<AffiliatePayout & { affiliate: { id: string; name: string; email: string; code: string; paypalEmail?: string; stripeAccountId?: string } }>;
    affiliatesWithPendingEarnings: Array<{ id: string; name: string; email: string; code: string; pendingEarnings: number; paypalEmail?: string; stripeAccountId?: string }>;
    totalPendingAmount: number;
    totalPendingEarnings: number;
  }>('/affiliates/pending-payouts'),
};

// ===== EXTENDED KPI TYPES & API =====

export interface PipelineFunnel {
  stages: Array<{
    name: string;
    count: number;
    value: number;
    conversionRate?: string;
    breakdown?: Record<string, number>;
  }>;
  summary: {
    totalWaitlist: number;
    totalFounders: number;
    totalTenants: number;
    activeUsers: number;
    totalConversionRate: string;
    founderRevenue: number;
    monthlyRecurringRevenue: number;
  };
  trends: {
    waitlistGrowth: number;
    founderGrowth: number;
    tenantGrowth: number;
    userGrowth: number;
  };
}

export interface RevenueBreakdown {
  founder: {
    total: number;
    percentage: string;
    byTier: Array<{ tier: string; name: string; price: number; count: number; revenue: number }>;
  };
  subscription: {
    mrr: number;
    arr: number;
    percentage: string;
    byPlan: Array<{ name: string; price: number; count: number; revenue: number }>;
    totalSubscribers: number;
  };
  total: {
    revenue: number;
    arr: number;
  };
  costs: {
    affiliatePayouts: number;
    netRevenue: number;
  };
}

export interface AffiliateRevenueMetrics {
  summary: {
    totalAffiliates: number;
    lifetimeEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
  };
  thisMonth: {
    conversions: number;
    sales: number;
    commissions: number;
  };
  byTier: Record<string, { count: number; revenue: number; commissions: number }>;
  payouts: {
    pending: { count: number; amount: number };
    completed: { count: number; amount: number };
  };
  topAffiliates: Array<{
    id: string;
    name: string;
    code: string;
    tier: string;
    lifetimeEarnings: number;
    totalConversions: number;
    totalReferrals: number;
  }>;
  recentConversions: Array<{
    id: string;
    affiliateName: string;
    affiliateCode: string;
    tier: string;
    amount: number;
    commission: number;
    bonus: number;
    status: string;
    createdAt: string;
  }>;
}

export interface FounderMetrics {
  summary: {
    totalRevenue: number;
    totalSold: number;
    totalSpots: number;
    remainingSpots: number;
    overallFillRate: string;
    averageOrderValue: string;
  };
  velocity: {
    salesPerDay: string;
    projectedDaysToSellout: number | null;
    recentSales: number;
  };
  byTier: Array<{
    tier: string;
    name: string;
    price: number;
    totalSpots: number;
    remainingSpots: number;
    soldSpots: number;
    fillRate: string;
    revenue: number;
    potentialRevenue: number;
    affiliateBonus: number;
    breakdown: { total: number; converted: number; pending: number; invited: number };
  }>;
  recentConversions: Array<{
    id: string;
    email: string;
    name?: string;
    tier: string;
    price: number;
    convertedAt?: string;
  }>;
}

// Extend kpiApi with new endpoints
export const extendedKpiApi = {
  ...kpiApi,
  getFunnel: () => api.get<PipelineFunnel>('/kpi/funnel'),
  getRevenueBreakdown: () => api.get<RevenueBreakdown>('/kpi/revenue-breakdown'),
  getAffiliateRevenue: () => api.get<AffiliateRevenueMetrics>('/kpi/affiliate-revenue'),
  getFounderMetrics: () => api.get<FounderMetrics>('/kpi/founder-metrics'),
};

// ===== BOS - BUSINESS OPERATING SYSTEM =====

// RBAC Types
export interface AdminPermission {
  id: string;
  code: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  isSystem: boolean;
  createdAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  isSystem: boolean;
  color?: string;
  createdAt: string;
  permissionCount?: number;
  userCount?: number;
}

export interface AdminGroup {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  parentId?: string;
  managerId?: string;
  color?: string;
  memberCount?: number;
  childCount?: number;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  status: string;
  roles?: { roleId: string; role: AdminRole }[];
  groups?: { groupId: string; group: AdminGroup }[];
  createdAt: string;
  updatedAt: string;
}

export const rbacApi = {
  // Users
  listUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ users: AdminUser[]; total: number }>('/rbac/users', params),

  // Permissions
  listPermissions: (params?: { resource?: string; search?: string }) =>
    api.get<{ permissions: AdminPermission[] }>('/rbac/permissions', params),
  createPermission: (data: { code: string; name: string; description?: string; resource: string; action: string }) =>
    api.post<{ permission: AdminPermission }>('/rbac/permissions', data),
  deletePermission: (id: string) => api.delete<{ success: boolean }>(`/rbac/permissions/${id}`),

  // Roles
  listRoles: () => api.get<{ roles: AdminRole[] }>('/rbac/roles'),
  getRole: (id: string) => api.get<{ role: AdminRole; permissions: AdminPermission[] }>(`/rbac/roles/${id}`),
  createRole: (data: { name: string; displayName: string; description?: string; level?: number; color?: string }) =>
    api.post<{ role: AdminRole }>('/rbac/roles', data),
  updateRole: (id: string, data: { displayName?: string; description?: string; level?: number; color?: string }) =>
    api.put<{ role: AdminRole }>(`/rbac/roles/${id}`, data),
  deleteRole: (id: string) => api.delete<{ success: boolean }>(`/rbac/roles/${id}`),
  assignPermission: (roleId: string, permissionId: string) =>
    api.post<{ success: boolean }>(`/rbac/roles/${roleId}/permissions`, { permissionId }),
  removePermission: (roleId: string, permissionId: string) =>
    api.delete<{ success: boolean }>(`/rbac/roles/${roleId}/permissions/${permissionId}`),

  // Groups
  listGroups: () => api.get<{ groups: AdminGroup[] }>('/rbac/groups'),
  getGroup: (id: string) => api.get<{ group: AdminGroup; members: any[]; roles: AdminRole[]; children: AdminGroup[] }>(`/rbac/groups/${id}`),
  createGroup: (data: { name: string; displayName: string; description?: string; parentId?: string; managerId?: string; color?: string }) =>
    api.post<{ group: AdminGroup }>('/rbac/groups', data),
  updateGroup: (id: string, data: Partial<AdminGroup>) =>
    api.put<{ group: AdminGroup }>(`/rbac/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete<{ success: boolean }>(`/rbac/groups/${id}`),
  addGroupMember: (groupId: string, adminId: string, isPrimary?: boolean) =>
    api.post<{ success: boolean }>(`/rbac/groups/${groupId}/members`, { adminId, isPrimary }),
  removeGroupMember: (groupId: string, adminId: string) =>
    api.delete<{ success: boolean }>(`/rbac/groups/${groupId}/members/${adminId}`),
  assignGroupRole: (groupId: string, roleId: string) =>
    api.post<{ success: boolean }>(`/rbac/groups/${groupId}/roles`, { roleId }),
  removeGroupRole: (groupId: string, roleId: string) =>
    api.delete<{ success: boolean }>(`/rbac/groups/${groupId}/roles/${roleId}`),

  // User roles
  getUserRoles: (adminId: string) => api.get<{ roles: AdminRole[] }>(`/rbac/users/${adminId}/roles`),
  assignUserRole: (adminId: string, roleId: string, expiresAt?: string) =>
    api.post<{ success: boolean }>(`/rbac/users/${adminId}/roles`, { roleId, expiresAt }),
  removeUserRole: (adminId: string, roleId: string) =>
    api.delete<{ success: boolean }>(`/rbac/users/${adminId}/roles/${roleId}`),
  checkPermission: (adminId: string, permissionCode: string) =>
    api.get<{ hasPermission: boolean }>(`/rbac/users/${adminId}/check-permission`, { permissionCode }),
};

// CRM Types
export interface CrmCompany {
  id: string;
  tenantId?: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  type: string;
  status: string;
  ownerId?: string;
  tags: string[];
  contactCount?: number;
  leadCount?: number;
  dealCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrmContact {
  id: string;
  companyId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  type: string;
  status: string;
  ownerId?: string;
  tags: string[];
  company?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CrmLead {
  id: string;
  contactId?: string;
  companyId?: string;
  title: string;
  source?: string;
  stage: string;
  score: number;
  temperature: string;
  ownerId?: string;
  convertedAt?: string;
  dealId?: string;
  contact?: { id: string; firstName: string; lastName: string; email?: string };
  company?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CrmDeal {
  id: string;
  companyId?: string;
  name: string;
  stage: string;
  value: number;
  probability: number;
  expectedCloseDate?: string;
  ownerId?: string;
  company?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CrmActivity {
  id: string;
  companyId?: string;
  contactId?: string;
  leadId?: string;
  dealId?: string;
  ticketId?: string;
  type: string;
  subject: string;
  description?: string;
  scheduledAt?: string;
  completedAt?: string;
  status: string;
  ownerId?: string;
  company?: { id: string; name: string };
  contact?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface CrmStats {
  contacts: { total: number; byType: any[] };
  companies: { total: number; byType: any[] };
  leads: { total: number; byStage: any[]; thisWeek: number; converted: number };
  deals: { total: number; byStage: any[]; totalValue: number; avgValue: number };
  activities: { overdue: number; todayDue: number; completedToday: number };
}

export const crmApi = {
  // Contacts
  listContacts: (params?: { companyId?: string; type?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ contacts: CrmContact[]; total: number }>('/crm/contacts', params),
  getContact: (id: string) => api.get<{ contact: CrmContact }>(`/crm/contacts/${id}`),
  createContact: (data: Partial<CrmContact>) => api.post<{ contact: CrmContact }>('/crm/contacts', data),
  updateContact: (id: string, data: Partial<CrmContact>) => api.put<{ contact: CrmContact }>(`/crm/contacts/${id}`, data),
  deleteContact: (id: string) => api.delete<{ success: boolean }>(`/crm/contacts/${id}`),

  // Companies
  listCompanies: (params?: { type?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ companies: CrmCompany[]; total: number }>('/crm/companies', params),
  getCompany: (id: string) => api.get<{ company: CrmCompany; contacts: CrmContact[]; leads: CrmLead[]; deals: CrmDeal[]; activities: CrmActivity[] }>(`/crm/companies/${id}`),
  createCompany: (data: Partial<CrmCompany>) => api.post<{ company: CrmCompany }>('/crm/companies', data),
  updateCompany: (id: string, data: Partial<CrmCompany>) => api.put<{ company: CrmCompany }>(`/crm/companies/${id}`, data),
  deleteCompany: (id: string) => api.delete<{ success: boolean }>(`/crm/companies/${id}`),

  // Leads
  listLeads: (params?: { stage?: string; temperature?: string; ownerId?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ leads: CrmLead[]; total: number }>('/crm/leads', params),
  getLead: (id: string) => api.get<{ lead: CrmLead; activities: CrmActivity[] }>(`/crm/leads/${id}`),
  createLead: (data: Partial<CrmLead>) => api.post<{ lead: CrmLead }>('/crm/leads', data),
  updateLead: (id: string, data: Partial<CrmLead>) => api.put<{ lead: CrmLead }>(`/crm/leads/${id}`, data),
  deleteLead: (id: string) => api.delete<{ success: boolean }>(`/crm/leads/${id}`),
  convertLead: (id: string, data: {
    createContact?: boolean;
    contactData?: { firstName: string; lastName: string; email?: string; phone?: string; jobTitle?: string };
    createCompany?: boolean;
    companyData?: { name: string; industry?: string; website?: string; phone?: string };
    createDeal?: boolean;
    dealData?: { name: string; value: number; probability: number; expectedCloseDate?: string };
  }) =>
    api.post<{ lead: CrmLead; contact?: CrmContact; company?: CrmCompany; deal?: CrmDeal }>(`/crm/leads/${id}/convert`, data),

  // Deals
  listDeals: (params?: { stage?: string; companyId?: string; ownerId?: string; minValue?: number; maxValue?: number; page?: number; limit?: number }) =>
    api.get<{ deals: CrmDeal[]; total: number }>('/crm/deals', params),
  getDeal: (id: string) => api.get<{ deal: CrmDeal; activities: CrmActivity[] }>(`/crm/deals/${id}`),
  createDeal: (data: Partial<CrmDeal>) => api.post<{ deal: CrmDeal }>('/crm/deals', data),
  updateDeal: (id: string, data: Partial<CrmDeal>) => api.put<{ deal: CrmDeal }>(`/crm/deals/${id}`, data),
  deleteDeal: (id: string) => api.delete<{ success: boolean }>(`/crm/deals/${id}`),
  moveDealStage: (id: string, stage: string) => api.put<{ deal: CrmDeal }>(`/crm/deals/${id}/stage`, { stage }),

  // Activities
  listActivities: (params?: { type?: string; status?: string; ownerId?: string; upcoming?: boolean; overdue?: boolean; page?: number; limit?: number }) =>
    api.get<{ activities: CrmActivity[]; total: number }>('/crm/activities', params),
  createActivity: (data: Partial<CrmActivity>) => api.post<{ activity: CrmActivity }>('/crm/activities', data),
  updateActivity: (id: string, data: Partial<CrmActivity>) => api.put<{ activity: CrmActivity }>(`/crm/activities/${id}`, data),
  deleteActivity: (id: string) => api.delete<{ success: boolean }>(`/crm/activities/${id}`),
  completeActivity: (id: string) => api.put<{ activity: CrmActivity }>(`/crm/activities/${id}/complete`),

  // Stats
  getStats: () => api.get<CrmStats>('/crm/stats'),
};

// Tickets Types
export interface TicketCategory {
  id: string;
  name: string;
  displayName: string;
  color?: string;
  defaultPriority: string;
  isActive: boolean;
  ticketCount?: number;
}

export interface TicketQueue {
  id: string;
  name: string;
  displayName: string;
  groupId?: string;
  autoAssign: boolean;
  isActive: boolean;
  ticketCount?: number;
}

export interface TicketSla {
  id: string;
  name: string;
  criticalResponseMins: number;
  highResponseMins: number;
  mediumResponseMins: number;
  lowResponseMins: number;
  useBusinessHours: boolean;
  isDefault: boolean;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  categoryId?: string;
  queueId?: string;
  slaId?: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  reporterEmail?: string;
  reporterName?: string;
  tenantId?: string;
  assigneeId?: string;
  firstResponseAt?: string;
  firstResponseDue?: string;
  resolutionDue?: string;
  resolvedAt?: string;
  slaStatus: string;
  tags: string[];
  category?: TicketCategory;
  queue?: TicketQueue;
  tenant?: { id: string; name: string };
  assignee?: { id: string; name: string };
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId?: string;
  authorName?: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketStats {
  byStatus: any[];
  byPriority: any[];
  bySlaStatus: any[];
  openCount: number;
  avgResolutionHours: number;
}

export const ticketsApi = {
  // Tickets
  listTickets: (params?: { status?: string; priority?: string; categoryId?: string; queueId?: string; assigneeId?: string; slaStatus?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ tickets: SupportTicket[]; total: number }>('/tickets', params),
  getTicket: (id: string) => api.get<{ ticket: SupportTicket; comments: TicketComment[] }>(`/tickets/${id}`),
  createTicket: (data: Partial<SupportTicket>) => api.post<{ ticket: SupportTicket }>('/tickets', data),
  updateTicket: (id: string, data: Partial<SupportTicket>) => api.put<{ ticket: SupportTicket }>(`/tickets/${id}`, data),
  deleteTicket: (id: string) => api.delete<{ success: boolean }>(`/tickets/${id}`),
  assignTicket: (id: string, assigneeId: string) => api.put<{ ticket: SupportTicket }>(`/tickets/${id}/assign`, { assigneeId }),
  changeStatus: (id: string, status: string, resolution?: string) => api.put<{ ticket: SupportTicket }>(`/tickets/${id}/status`, { status, resolution }),

  // Comments
  addComment: (ticketId: string, data: { content: string; isInternal?: boolean }) =>
    api.post<{ comment: TicketComment }>(`/tickets/${ticketId}/comments`, data),
  deleteComment: (ticketId: string, commentId: string) =>
    api.delete<{ success: boolean }>(`/tickets/${ticketId}/comments/${commentId}`),

  // Categories
  listCategories: () => api.get<{ categories: TicketCategory[] }>('/tickets/categories'),
  createCategory: (data: Partial<TicketCategory>) => api.post<{ category: TicketCategory }>('/tickets/categories', data),
  updateCategory: (id: string, data: Partial<TicketCategory>) => api.put<{ category: TicketCategory }>(`/tickets/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete<{ success: boolean }>(`/tickets/categories/${id}`),

  // Queues
  listQueues: () => api.get<{ queues: TicketQueue[] }>('/tickets/queues'),
  createQueue: (data: Partial<TicketQueue>) => api.post<{ queue: TicketQueue }>('/tickets/queues', data),
  updateQueue: (id: string, data: Partial<TicketQueue>) => api.put<{ queue: TicketQueue }>(`/tickets/queues/${id}`, data),
  deleteQueue: (id: string) => api.delete<{ success: boolean }>(`/tickets/queues/${id}`),

  // SLAs
  listSlas: () => api.get<{ slas: TicketSla[] }>('/tickets/slas'),
  createSla: (data: Partial<TicketSla>) => api.post<{ sla: TicketSla }>('/tickets/slas', data),
  updateSla: (id: string, data: Partial<TicketSla>) => api.put<{ sla: TicketSla }>(`/tickets/slas/${id}`, data),
  deleteSla: (id: string) => api.delete<{ success: boolean }>(`/tickets/slas/${id}`),

  // Stats
  getStats: () => api.get<TicketStats>('/tickets/stats'),
  getMyTickets: () => api.get<{ tickets: SupportTicket[] }>('/tickets/my'),
};

// Workspace Types
export interface PersonalKanban {
  id: string;
  adminId: string;
  name: string;
  lanes: { id: string; name: string; tasks?: PersonalTask[] }[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonalTask {
  id: string;
  kanbanId: string;
  title: string;
  description?: string;
  laneId: string;
  position: number;
  priority: string;
  dueDate?: string;
  completed: boolean;
  completedAt?: string;
  relatedType?: string;
  relatedId?: string;
  tags: string[];
  assigneeId?: string;
  assigneeType?: 'user' | 'group';
  assignee?: {
    id: string;
    name: string;
    type: 'user' | 'group';
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PersonalNote {
  id: string;
  adminId: string;
  title?: string;
  content: string;
  category?: string;
  tags: string[];
  isPinned: boolean;
  relatedType?: string;
  relatedId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceStats {
  tasksByLane: any[];
  completedToday: number;
  overdueTasks: number;
  notesCount: number;
}

export const workspaceApi = {
  // Kanban
  getKanban: () => api.get<{ kanban: PersonalKanban }>('/workspace/kanban'),
  updateKanban: (data: { name?: string; lanes?: { id: string; name: string }[] }) =>
    api.put<{ kanban: PersonalKanban }>('/workspace/kanban', data),

  // Tasks
  listTasks: (params?: { laneId?: string; priority?: string; completed?: string; dueDate?: string }) =>
    api.get<{ tasks: PersonalTask[] }>('/workspace/tasks', params),
  getTask: (id: string) => api.get<{ task: PersonalTask }>(`/workspace/tasks/${id}`),
  createTask: (data: Partial<PersonalTask>) => api.post<{ task: PersonalTask }>('/workspace/tasks', data),
  updateTask: (id: string, data: Partial<PersonalTask>) => api.put<{ task: PersonalTask }>(`/workspace/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete<{ success: boolean }>(`/workspace/tasks/${id}`),
  reorderTasks: (updates: { id: string; laneId: string; position: number }[]) =>
    api.put<{ success: boolean }>('/workspace/tasks/reorder', { updates }),

  // Notes
  listNotes: (params?: { category?: string; search?: string; pinned?: string }) =>
    api.get<{ notes: PersonalNote[] }>('/workspace/notes', params),
  getNote: (id: string) => api.get<{ note: PersonalNote }>(`/workspace/notes/${id}`),
  createNote: (data: Partial<PersonalNote>) => api.post<{ note: PersonalNote }>('/workspace/notes', data),
  updateNote: (id: string, data: Partial<PersonalNote>) => api.put<{ note: PersonalNote }>(`/workspace/notes/${id}`, data),
  deleteNote: (id: string) => api.delete<{ success: boolean }>(`/workspace/notes/${id}`),
  toggleNotePin: (id: string) => api.put<{ note: PersonalNote }>(`/workspace/notes/${id}/pin`),

  // Stats
  getStats: () => api.get<WorkspaceStats>('/workspace/stats'),
};

// Calendar Types
export interface BosCalendar {
  id: string;
  adminId: string;
  name: string;
  timezone: string;
  color?: string;
  isPublic: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BosCalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  type: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location?: string;
  videoUrl?: string;
  status: string;
  visibility: string;
  relatedType?: string;
  relatedId?: string;
  reminders?: any;
  createdBy?: string;
  attendees?: BosEventAttendee[];
  createdAt: string;
  updatedAt: string;
}

export interface BosEventAttendee {
  id: string;
  eventId: string;
  attendeeType: string;
  attendeeId?: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  respondedAt?: string;
  createdAt: string;
}

export interface CalendarStats {
  todayCount: number;
  weekCount: number;
  byType: any[];
}

export const calendarApi = {
  // Calendar
  getCalendar: () => api.get<{ calendar: BosCalendar }>('/calendar'),
  updateCalendar: (data: { name?: string; timezone?: string; color?: string; isPublic?: boolean }) =>
    api.put<{ calendar: BosCalendar }>('/calendar', data),

  // Events
  listEvents: (params?: { start?: string; end?: string; type?: string; status?: string }) =>
    api.get<{ events: BosCalendarEvent[] }>('/calendar/events', params),
  getEvent: (id: string) => api.get<{ event: BosCalendarEvent }>(`/calendar/events/${id}`),
  createEvent: (data: Partial<BosCalendarEvent>) => api.post<{ event: BosCalendarEvent }>('/calendar/events', data),
  updateEvent: (id: string, data: Partial<BosCalendarEvent>) => api.put<{ event: BosCalendarEvent }>(`/calendar/events/${id}`, data),
  deleteEvent: (id: string) => api.delete<{ success: boolean }>(`/calendar/events/${id}`),
  cancelEvent: (id: string) => api.put<{ event: BosCalendarEvent }>(`/calendar/events/${id}/cancel`),

  // Attendees
  addAttendee: (eventId: string, data: { email: string; name?: string; role?: string }) =>
    api.post<{ attendee: BosEventAttendee }>(`/calendar/events/${eventId}/attendees`, data),
  removeAttendee: (eventId: string, attendeeId: string) =>
    api.delete<{ success: boolean }>(`/calendar/events/${eventId}/attendees/${attendeeId}`),
  respondToEvent: (eventId: string, attendeeId: string, status: string) =>
    api.put<{ attendee: BosEventAttendee }>(`/calendar/events/${eventId}/attendees/${attendeeId}/respond`, { status }),

  // Quick access
  getTodayEvents: () => api.get<{ events: BosCalendarEvent[] }>('/calendar/today'),
  getUpcomingEvents: () => api.get<{ events: BosCalendarEvent[] }>('/calendar/upcoming'),

  // Stats
  getStats: () => api.get<CalendarStats>('/calendar/stats'),
};

// Teams Types
export interface BosTeamRoom {
  id: string;
  name: string;
  type: string;
  status: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  maxParticipants: number;
  recordingEnabled: boolean;
  recordingUrl?: string;
  chatEnabled: boolean;
  whiteboardEnabled: boolean;
  screenShareEnabled: boolean;
  createdBy?: string;
  participants?: BosRoomParticipant[];
  whiteboards?: BosWhiteboard[];
  participantCount?: number;
  whiteboardCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BosRoomParticipant {
  id: string;
  roomId: string;
  participantId: string;
  displayName?: string;
  role: string;
  status: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  joinedAt?: string;
  leftAt?: string;
  createdAt: string;
}

export interface BosWhiteboard {
  id: string;
  roomId?: string;
  name: string;
  canvasData: any;
  thumbnailUrl?: string;
  ownerId: string;
  isShared: boolean;
  room?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface TeamsStats {
  activeRooms: number;
  totalRooms: number;
  totalWhiteboards: number;
  recentRooms: BosTeamRoom[];
}

export const teamsApi = {
  // Rooms
  listRooms: (params?: { status?: string; type?: string; page?: number; limit?: number }) =>
    api.get<{ rooms: BosTeamRoom[]; total: number }>('/teams/rooms', params),
  getRoom: (id: string) => api.get<{ room: BosTeamRoom }>(`/teams/rooms/${id}`),
  createRoom: (data: Partial<BosTeamRoom>) => api.post<{ room: BosTeamRoom }>('/teams/rooms', data),
  updateRoom: (id: string, data: Partial<BosTeamRoom>) => api.put<{ room: BosTeamRoom }>(`/teams/rooms/${id}`, data),
  deleteRoom: (id: string) => api.delete<{ success: boolean }>(`/teams/rooms/${id}`),

  // Room actions
  startRoom: (id: string) => api.post<{ room: BosTeamRoom }>(`/teams/rooms/${id}/start`),
  endRoom: (id: string) => api.post<{ room: BosTeamRoom }>(`/teams/rooms/${id}/end`),
  joinRoom: (id: string) => api.post<{ participant: BosRoomParticipant; token: string }>(`/teams/rooms/${id}/join`),
  leaveRoom: (id: string) => api.post<{ success: boolean }>(`/teams/rooms/${id}/leave`),
  updateMedia: (id: string, data: { audioEnabled?: boolean; videoEnabled?: boolean }) =>
    api.put<{ participant: BosRoomParticipant }>(`/teams/rooms/${id}/media`, data),

  // Invitations
  inviteToRoom: (roomId: string, participantIds: string[]) =>
    api.post<{ invited: number }>(`/teams/rooms/${roomId}/invite`, { participantIds }),

  // Instant room
  createInstantRoom: () => api.post<{ room: BosTeamRoom; token: string }>('/teams/rooms/instant'),

  // Whiteboards
  listWhiteboards: (params?: { roomId?: string; shared?: string }) =>
    api.get<{ whiteboards: BosWhiteboard[] }>('/teams/whiteboards', params),
  getWhiteboard: (id: string) => api.get<{ whiteboard: BosWhiteboard }>(`/teams/whiteboards/${id}`),
  createWhiteboard: (data: Partial<BosWhiteboard>) => api.post<{ whiteboard: BosWhiteboard }>('/teams/whiteboards', data),
  updateWhiteboard: (id: string, data: Partial<BosWhiteboard>) => api.put<{ whiteboard: BosWhiteboard }>(`/teams/whiteboards/${id}`, data),
  deleteWhiteboard: (id: string) => api.delete<{ success: boolean }>(`/teams/whiteboards/${id}`),

  // Stats
  getStats: () => api.get<TeamsStats>('/teams/stats'),
};

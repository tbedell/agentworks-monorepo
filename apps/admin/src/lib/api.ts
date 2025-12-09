const API_BASE = '/api/admin';

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
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
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

import type { FastifyPluginAsync } from 'fastify';
import { adminAuthRoutes } from './auth.js';
import { adminTenantsRoutes } from './tenants.js';
import { adminProvidersRoutes } from './providers.js';
import { adminBillingRoutes } from './billing.js';
import { adminAnalyticsRoutes } from './analytics.js';
import { adminAuditRoutes } from './audit.js';
import { adminDashboardRoutes } from './dashboard.js';
import { adminSettingsRoutes } from './settings.js';
import { adminKPIRoutes } from './kpi.js';
import { adminWaitlistRoutes } from './waitlist.js';
import { adminFoundersRoutes } from './founders.js';
import { adminAffiliatesRoutes } from './affiliates.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  await app.register(adminAuthRoutes, { prefix: '/auth' });
  await app.register(adminDashboardRoutes, { prefix: '/dashboard' });
  await app.register(adminTenantsRoutes, { prefix: '/tenants' });
  await app.register(adminProvidersRoutes, { prefix: '/providers' });
  await app.register(adminBillingRoutes, { prefix: '/billing' });
  await app.register(adminAnalyticsRoutes, { prefix: '/analytics' });
  await app.register(adminKPIRoutes, { prefix: '/kpi' });
  await app.register(adminAuditRoutes, { prefix: '/audit' });
  await app.register(adminSettingsRoutes, { prefix: '/settings' });
  // Growth & Marketing routes
  await app.register(adminWaitlistRoutes, { prefix: '/waitlist' });
  await app.register(adminFoundersRoutes, { prefix: '/founders' });
  await app.register(adminAffiliatesRoutes, { prefix: '/affiliates' });
};

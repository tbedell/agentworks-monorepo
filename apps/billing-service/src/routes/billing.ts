import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger, PRICING_INCREMENT } from '@agentworks/shared';
import { calculateWorkspaceBilling, generateBillingReport } from '../lib/billing-processor.js';
import { getWorkspaceUsageSummary } from '../lib/usage-aggregator.js';
import { getDatabase } from '../lib/database.js';
import { getCachedBillingSummary, checkBillingRateLimit } from '../lib/redis.js';

const logger = createLogger('billing-service:billing');

const billingPeriodSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const reportFormatSchema = z.object({
  format: z.enum(['json', 'csv', 'pdf']).optional().default('json'),
  includeDetails: z.boolean().optional().default(false),
});

export async function billingRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Get current billing for workspace
  app.get('/workspace/:workspaceId', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      
      // Check rate limit
      const allowed = await checkBillingRateLimit(workspaceId, 'get_billing', 20, 60);
      if (!allowed) {
        return reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many billing requests',
        });
      }
      
      // Try to get from cache first
      let summary = await getCachedBillingSummary(workspaceId);
      
      if (!summary) {
        // If not cached, get fresh summary
        summary = await getWorkspaceUsageSummary(workspaceId);
      }
      
      if (!summary) {
        return reply.status(404).send({
          error: 'BILLING_NOT_FOUND',
          message: 'No billing data found for workspace',
        });
      }
      
      // Calculate rounded billing
      const roundedPrice = Math.ceil(summary.totalPrice / PRICING_INCREMENT) * PRICING_INCREMENT;
      
      return reply.send({
        workspaceId,
        currentPeriod: summary.period,
        billing: {
          ...summary,
          roundedPrice,
          currency: 'USD',
          increment: PRICING_INCREMENT,
        },
        cached: !!summary.cachedAt,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get workspace billing', { error });
      
      return reply.status(500).send({
        error: 'BILLING_FETCH_FAILED',
        message: 'Failed to fetch workspace billing',
      });
    }
  });

  // Get billing for specific period
  app.post('/workspace/:workspaceId/period', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { startDate, endDate } = billingPeriodSchema.parse(request.body);
      
      // Check rate limit
      const allowed = await checkBillingRateLimit(workspaceId, 'period_billing', 10, 60);
      if (!allowed) {
        return reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many period billing requests',
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Validate date range
      if (start >= end) {
        return reply.status(400).send({
          error: 'INVALID_DATE_RANGE',
          message: 'Start date must be before end date',
        });
      }
      
      const maxDays = 365;
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > maxDays) {
        return reply.status(400).send({
          error: 'DATE_RANGE_TOO_LARGE',
          message: `Date range cannot exceed ${maxDays} days`,
        });
      }
      
      const billing = await calculateWorkspaceBilling(workspaceId, {
        start,
        end,
      });
      
      return reply.send({
        workspaceId,
        period: {
          start,
          end,
          days: daysDiff,
        },
        billing: {
          ...billing,
          currency: 'USD',
          increment: PRICING_INCREMENT,
        },
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get period billing', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid billing period request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'PERIOD_BILLING_FAILED',
        message: 'Failed to calculate period billing',
      });
    }
  });

  // Generate billing report
  app.post('/workspace/:workspaceId/report', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const periodData = billingPeriodSchema.parse(request.body);
      const { format, includeDetails } = reportFormatSchema.parse(request.query);
      
      // Check rate limit
      const allowed = await checkBillingRateLimit(workspaceId, 'generate_report', 5, 300); // 5 reports per 5 minutes
      if (!allowed) {
        return reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many report generation requests',
        });
      }
      
      const start = new Date(periodData.startDate);
      const end = new Date(periodData.endDate);
      
      const report = await generateBillingReport(workspaceId, { start, end });
      
      if (!includeDetails) {
        // Remove detailed daily breakdown to reduce response size
        delete report.billing.byDay;
      }
      
      logger.info('Billing report generated', {
        workspaceId,
        period: { start, end },
        format,
        totalPrice: report.billing.roundedPrice,
      });
      
      if (format === 'json') {
        return reply.send(report);
      } else if (format === 'csv') {
        // Convert to CSV format
        const csvData = generateCSVReport(report);
        
        reply.type('text/csv');
        reply.header('Content-Disposition', `attachment; filename="billing-report-${workspaceId}-${start.toISOString().split('T')[0]}.csv"`);
        return reply.send(csvData);
        
      } else if (format === 'pdf') {
        return reply.status(501).send({
          error: 'FORMAT_NOT_SUPPORTED',
          message: 'PDF format is not yet implemented',
        });
      }
      
    } catch (error) {
      logger.error('Failed to generate billing report', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid report request',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'REPORT_GENERATION_FAILED',
        message: 'Failed to generate billing report',
      });
    }
  });

  // Get billing summary for multiple workspaces (admin endpoint)
  app.get('/summary', async (request, reply) => {
    try {
      // This would typically require admin authentication
      const { limit = '50', offset = '0' } = request.query as { limit?: string; offset?: string };
      
      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);
      
      if (isNaN(limitNum) || isNaN(offsetNum) || limitNum < 1 || limitNum > 100) {
        return reply.status(400).send({
          error: 'INVALID_PAGINATION',
          message: 'Invalid limit or offset parameters',
        });
      }
      
      const db = getDatabase();
      
      // Get workspaces with recent usage
      const workspaces = await db.workspace.findMany({
        include: {
          _count: {
            select: {
              usageEvents: {
                where: {
                  createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                  },
                },
              },
            },
          },
          usageEvents: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
            select: {
              cost: true,
              price: true,
              createdAt: true,
            },
          },
        },
        take: limitNum,
        skip: offsetNum,
        orderBy: {
          updatedAt: 'desc',
        },
      });
      
      const summaries = workspaces.map(workspace => {
        const totalCost = workspace.usageEvents.reduce((sum, event) => sum + event.cost, 0);
        const totalPrice = workspace.usageEvents.reduce((sum, event) => sum + event.price, 0);
        const roundedPrice = Math.ceil(totalPrice / PRICING_INCREMENT) * PRICING_INCREMENT;
        
        return {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          usageEvents: workspace._count.usageEvents,
          billing: {
            totalCost,
            totalPrice,
            roundedPrice,
          },
        };
      });
      
      return reply.send({
        workspaces: summaries,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: summaries.length,
        },
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get billing summary', { error });
      
      return reply.status(500).send({
        error: 'SUMMARY_FETCH_FAILED',
        message: 'Failed to fetch billing summary',
      });
    }
  });

  // Get billing metrics
  app.get('/metrics', async (request, reply) => {
    try {
      const db = getDatabase();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const [
        totalMetrics,
        providerMetrics,
        recentActivity,
      ] = await Promise.all([
        // Total metrics across all workspaces
        db.usageEvent.aggregate({
          where: {
            createdAt: { gte: thirtyDaysAgo },
          },
          _sum: {
            cost: true,
            price: true,
            inputTokens: true,
            outputTokens: true,
          },
          _count: true,
        }),
        
        // Provider breakdown
        db.usageEvent.groupBy({
          by: ['provider'],
          where: {
            createdAt: { gte: thirtyDaysAgo },
          },
          _sum: {
            cost: true,
            price: true,
            inputTokens: true,
            outputTokens: true,
          },
          _count: true,
        }),
        
        // Recent activity (last 7 days)
        db.$queryRaw`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as events,
            SUM(cost) as cost,
            SUM(price) as price
          FROM "UsageEvent"
          WHERE created_at >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 7
        `,
      ]);
      
      const totalRoundedPrice = Math.ceil((totalMetrics._sum.price || 0) / PRICING_INCREMENT) * PRICING_INCREMENT;
      
      return reply.send({
        period: {
          start: thirtyDaysAgo,
          end: new Date(),
          days: 30,
        },
        totals: {
          events: totalMetrics._count,
          cost: totalMetrics._sum.cost || 0,
          price: totalMetrics._sum.price || 0,
          roundedPrice: totalRoundedPrice,
          tokens: (totalMetrics._sum.inputTokens || 0) + (totalMetrics._sum.outputTokens || 0),
        },
        byProvider: providerMetrics,
        recentActivity,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get billing metrics', { error });
      
      return reply.status(500).send({
        error: 'METRICS_FETCH_FAILED',
        message: 'Failed to fetch billing metrics',
      });
    }
  });
}

function generateCSVReport(report: any): string {
  const lines = [];
  
  // Header
  lines.push(`Billing Report for ${report.workspace.name}`);
  lines.push(`Period: ${report.period.start} to ${report.period.end}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  
  // Summary
  lines.push('Summary');
  lines.push('Metric,Value');
  lines.push(`Total Cost,${report.billing.totalCost}`);
  lines.push(`Total Price,${report.billing.totalPrice}`);
  lines.push(`Rounded Price,${report.billing.roundedPrice}`);
  lines.push(`Total Tokens,${report.billing.totalTokens}`);
  lines.push(`Total Requests,${report.billing.totalRequests}`);
  lines.push('');
  
  // By Provider
  lines.push('Usage by Provider');
  lines.push('Provider,Cost,Price,Tokens,Requests');
  for (const [provider, data] of Object.entries(report.billing.byProvider)) {
    lines.push(`${provider},${(data as any).cost},${(data as any).price},${(data as any).tokens},${(data as any).requests}`);
  }
  lines.push('');
  
  // By Project
  lines.push('Usage by Project');
  lines.push('Project,Cost,Price,Tokens,Requests');
  for (const project of report.billing.byProject) {
    lines.push(`${project.projectName},${project.cost},${project.price},${project.tokens},${project.requests}`);
  }
  
  return lines.join('\n');
}
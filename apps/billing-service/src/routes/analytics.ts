import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import { getDatabase } from '../lib/database.js';
import { getUsageRange } from '../lib/redis.js';

const logger = createLogger('billing-service:analytics');

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
  groupBy: z.enum(['provider', 'model', 'project', 'workspace']).optional(),
});

const trendsQuerySchema = z.object({
  metric: z.enum(['cost', 'price', 'tokens', 'requests']).default('price'),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
  groupBy: z.enum(['provider', 'model', 'project']).optional(),
});

export async function analyticsRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Get usage trends for workspace
  app.get('/workspace/:workspaceId/trends', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { metric, period, groupBy } = trendsQuerySchema.parse(request.query);
      
      const db = getDatabase();
      
      // Calculate date range based on period
      const endDate = new Date();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      let query = `
        SELECT 
          DATE(created_at) as date,
          ${getMetricField(metric)} as value
      `;
      
      if (groupBy) {
        query += `, ${groupBy}`;
      }
      
      query += `
        FROM "UsageEvent"
        WHERE workspace_id = $1
          AND created_at >= $2
          AND created_at <= $3
      `;
      
      if (groupBy) {
        query += ` GROUP BY DATE(created_at), ${groupBy}`;
      } else {
        query += ` GROUP BY DATE(created_at)`;
      }
      
      query += ` ORDER BY date ASC`;
      
      const results = await db.$queryRawUnsafe(query, workspaceId, startDate, endDate);
      
      // Format results for time series
      const trends = formatTrendData(results as any[], groupBy);
      
      return reply.send({
        workspaceId,
        metric,
        period: {
          start: startDate,
          end: endDate,
          days,
        },
        groupBy,
        trends,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get usage trends', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid trends query',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'TRENDS_FETCH_FAILED',
        message: 'Failed to fetch usage trends',
      });
    }
  });

  // Get comparative analytics across workspaces (admin endpoint)
  app.get('/comparison', async (request, reply) => {
    try {
      const { startDate, endDate, granularity, groupBy } = analyticsQuerySchema.parse(request.query);
      
      const db = getDatabase();
      
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Build query based on granularity and groupBy
      let query = `
        SELECT 
          workspace_id,
          ${getDateTrunc(granularity)} as period,
          SUM(cost) as total_cost,
          SUM(price) as total_price,
          SUM(input_tokens + output_tokens) as total_tokens,
          COUNT(*) as total_requests
      `;
      
      if (groupBy && groupBy !== 'workspace') {
        query += `, ${groupBy}`;
      }
      
      query += `
        FROM "UsageEvent"
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY workspace_id, period
      `;
      
      if (groupBy && groupBy !== 'workspace') {
        query += `, ${groupBy}`;
      }
      
      query += ` ORDER BY period ASC, workspace_id ASC`;
      
      const results = await db.$queryRawUnsafe(query, start, end);
      
      // Get workspace names
      const workspaceNames = await db.workspace.findMany({
        select: {
          id: true,
          name: true,
        },
      });
      
      const workspaceMap = new Map(workspaceNames.map(w => [w.id, w.name]));
      
      // Format results
      const comparison = formatComparisonData(results as any[], workspaceMap, groupBy);
      
      return reply.send({
        period: { start, end },
        granularity,
        groupBy,
        comparison,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get comparative analytics', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid comparison query',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'COMPARISON_FETCH_FAILED',
        message: 'Failed to fetch comparative analytics',
      });
    }
  });

  // Get cost optimization insights
  app.get('/workspace/:workspaceId/insights', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { days = '30' } = request.query as { days?: string };
      
      const daysNum = parseInt(days, 10);
      const db = getDatabase();
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysNum * 24 * 60 * 60 * 1000);
      
      const [
        providerCosts,
        modelEfficiency,
        usagePatterns,
        topProjects,
      ] = await Promise.all([
        // Provider cost analysis
        db.usageEvent.groupBy({
          by: ['provider'],
          where: {
            workspaceId,
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: {
            cost: true,
            price: true,
            inputTokens: true,
            outputTokens: true,
          },
          _avg: {
            cost: true,
            price: true,
          },
          _count: true,
        }),
        
        // Model efficiency (cost per token)
        db.usageEvent.groupBy({
          by: ['model'],
          where: {
            workspaceId,
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: {
            cost: true,
            price: true,
            inputTokens: true,
            outputTokens: true,
          },
          _count: true,
        }),
        
        // Usage patterns (hourly distribution)
        db.$queryRaw`
          SELECT 
            EXTRACT(HOUR FROM created_at) as hour,
            COUNT(*) as requests,
            SUM(cost) as cost,
            AVG(cost) as avg_cost
          FROM "UsageEvent"
          WHERE workspace_id = ${workspaceId}
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY EXTRACT(HOUR FROM created_at)
          ORDER BY hour
        `,
        
        // Top projects by cost
        db.usageEvent.groupBy({
          by: ['projectId'],
          where: {
            workspaceId,
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: {
            cost: true,
            price: true,
          },
          _count: true,
          orderBy: {
            _sum: {
              price: 'desc',
            },
          },
          take: 10,
        }),
      ]);
      
      // Generate insights
      const insights = generateInsights({
        providerCosts,
        modelEfficiency,
        usagePatterns: usagePatterns as any[],
        topProjects,
      });
      
      return reply.send({
        workspaceId,
        period: { start: startDate, end: endDate, days: daysNum },
        analytics: {
          providerCosts,
          modelEfficiency,
          usagePatterns,
          topProjects,
        },
        insights,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get cost insights', { error });
      
      return reply.status(500).send({
        error: 'INSIGHTS_FETCH_FAILED',
        message: 'Failed to fetch cost optimization insights',
      });
    }
  });

  // Get usage forecasting
  app.get('/workspace/:workspaceId/forecast', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { days = '30' } = request.query as { days?: string };
      
      const forecastDays = parseInt(days, 10);
      if (isNaN(forecastDays) || forecastDays < 1 || forecastDays > 90) {
        return reply.status(400).send({
          error: 'INVALID_FORECAST_DAYS',
          message: 'Forecast days must be between 1 and 90',
        });
      }
      
      const db = getDatabase();
      
      // Get historical data (last 30 days)
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const historicalData = await db.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          SUM(cost) as cost,
          SUM(price) as price,
          COUNT(*) as requests
        FROM "UsageEvent"
        WHERE workspace_id = ${workspaceId}
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      ` as any[];
      
      // Simple linear regression forecast
      const forecast = generateForecast(historicalData, forecastDays);
      
      return reply.send({
        workspaceId,
        historical: {
          period: { start: startDate, end: endDate },
          data: historicalData,
        },
        forecast: {
          period: {
            start: endDate,
            end: new Date(endDate.getTime() + forecastDays * 24 * 60 * 60 * 1000),
            days: forecastDays,
          },
          data: forecast,
        },
        confidence: 'low', // Simple forecast has low confidence
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to generate usage forecast', { error });
      
      return reply.status(500).send({
        error: 'FORECAST_FAILED',
        message: 'Failed to generate usage forecast',
      });
    }
  });

  // Get real-time analytics dashboard data
  app.get('/dashboard', async (request, reply) => {
    try {
      const db = getDatabase();
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const [
        last24hStats,
        last7dStats,
        last30dStats,
        topWorkspaces,
        recentActivity,
      ] = await Promise.all([
        // Last 24 hours
        db.usageEvent.aggregate({
          where: { createdAt: { gte: last24h } },
          _sum: { cost: true, price: true },
          _count: true,
        }),
        
        // Last 7 days
        db.usageEvent.aggregate({
          where: { createdAt: { gte: last7d } },
          _sum: { cost: true, price: true },
          _count: true,
        }),
        
        // Last 30 days
        db.usageEvent.aggregate({
          where: { createdAt: { gte: last30d } },
          _sum: { cost: true, price: true },
          _count: true,
        }),
        
        // Top workspaces by usage (last 7 days)
        db.usageEvent.groupBy({
          by: ['workspaceId'],
          where: { createdAt: { gte: last7d } },
          _sum: { cost: true, price: true },
          _count: true,
          orderBy: { _sum: { price: 'desc' } },
          take: 10,
        }),
        
        // Recent activity (hourly for last 24h)
        db.$queryRaw`
          SELECT 
            DATE_TRUNC('hour', created_at) as hour,
            COUNT(*) as requests,
            SUM(price) as price
          FROM "UsageEvent"
          WHERE created_at >= ${last24h}
          GROUP BY DATE_TRUNC('hour', created_at)
          ORDER BY hour ASC
        `,
      ]);
      
      return reply.send({
        periods: {
          last24h: {
            requests: last24hStats._count,
            cost: last24hStats._sum.cost || 0,
            price: last24hStats._sum.price || 0,
          },
          last7d: {
            requests: last7dStats._count,
            cost: last7dStats._sum.cost || 0,
            price: last7dStats._sum.price || 0,
          },
          last30d: {
            requests: last30dStats._count,
            cost: last30dStats._sum.cost || 0,
            price: last30dStats._sum.price || 0,
          },
        },
        topWorkspaces,
        recentActivity,
        timestamp: new Date(),
      });
      
    } catch (error) {
      logger.error('Failed to get dashboard analytics', { error });
      
      return reply.status(500).send({
        error: 'DASHBOARD_FETCH_FAILED',
        message: 'Failed to fetch dashboard analytics',
      });
    }
  });
}

function getMetricField(metric: string): string {
  switch (metric) {
    case 'cost': return 'SUM(cost)';
    case 'price': return 'SUM(price)';
    case 'tokens': return 'SUM(input_tokens + output_tokens)';
    case 'requests': return 'COUNT(*)';
    default: return 'SUM(price)';
  }
}

function getDateTrunc(granularity: string): string {
  switch (granularity) {
    case 'hour': return 'DATE_TRUNC(\'hour\', created_at)';
    case 'day': return 'DATE(created_at)';
    case 'week': return 'DATE_TRUNC(\'week\', created_at)';
    case 'month': return 'DATE_TRUNC(\'month\', created_at)';
    default: return 'DATE(created_at)';
  }
}

function formatTrendData(results: any[], groupBy?: string): any {
  if (!groupBy) {
    return results.map(row => ({
      date: row.date,
      value: parseFloat(row.value) || 0,
    }));
  }
  
  // Group by the specified field
  const grouped: Record<string, any[]> = {};
  
  for (const row of results) {
    const key = row[groupBy];
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push({
      date: row.date,
      value: parseFloat(row.value) || 0,
    });
  }
  
  return grouped;
}

function formatComparisonData(results: any[], workspaceMap: Map<string, string>, groupBy?: string): any {
  const formatted: Record<string, any> = {};
  
  for (const row of results) {
    const workspaceName = workspaceMap.get(row.workspace_id) || row.workspace_id;
    const period = row.period;
    
    if (!formatted[workspaceName]) {
      formatted[workspaceName] = [];
    }
    
    formatted[workspaceName].push({
      period,
      totalCost: parseFloat(row.total_cost) || 0,
      totalPrice: parseFloat(row.total_price) || 0,
      totalTokens: parseInt(row.total_tokens) || 0,
      totalRequests: parseInt(row.total_requests) || 0,
      ...(groupBy && groupBy !== 'workspace' && { [groupBy]: row[groupBy] }),
    });
  }
  
  return formatted;
}

function generateInsights(data: any): any[] {
  const insights = [];
  
  // Provider cost analysis
  if (data.providerCosts.length > 1) {
    const sorted = [...data.providerCosts].sort((a, b) => b._sum.price - a._sum.price);
    const mostExpensive = sorted[0];
    const leastExpensive = sorted[sorted.length - 1];
    
    insights.push({
      type: 'cost_optimization',
      title: 'Provider Cost Analysis',
      message: `${mostExpensive.provider} is your most expensive provider at $${mostExpensive._sum.price.toFixed(2)}, while ${leastExpensive.provider} costs $${leastExpensive._sum.price.toFixed(2)}`,
      actionable: true,
      suggestion: 'Consider migrating some workloads to more cost-effective providers where appropriate',
    });
  }
  
  // Model efficiency
  const modelEffData = data.modelEfficiency.map((model: any) => ({
    model: model.model,
    costPerToken: (model._sum.cost || 0) / ((model._sum.inputTokens || 0) + (model._sum.outputTokens || 0)),
    usage: model._count,
  }));
  
  modelEffData.sort((a: any, b: any) => b.costPerToken - a.costPerToken);
  
  if (modelEffData.length > 1 && modelEffData[0].usage > 10) {
    insights.push({
      type: 'efficiency',
      title: 'Model Efficiency',
      message: `${modelEffData[0].model} has the highest cost per token at $${modelEffData[0].costPerToken.toFixed(6)}`,
      actionable: true,
      suggestion: 'Review if cheaper models could be used for some use cases',
    });
  }
  
  // Usage patterns
  const hourlyUsage = data.usagePatterns as any[];
  const peakHour = hourlyUsage.reduce((peak, current) => 
    current.requests > peak.requests ? current : peak
  );
  
  insights.push({
    type: 'usage_pattern',
    title: 'Peak Usage Time',
    message: `Peak usage occurs at ${peakHour.hour}:00 with ${peakHour.requests} requests`,
    actionable: false,
    suggestion: 'Consider this for capacity planning and rate limiting',
  });
  
  return insights;
}

function generateForecast(historicalData: any[], days: number): any[] {
  if (historicalData.length < 2) {
    return []; // Not enough data for forecasting
  }
  
  // Simple linear regression
  const n = historicalData.length;
  const sumX = historicalData.reduce((sum, _, i) => sum + i, 0);
  const sumY = historicalData.reduce((sum, row) => sum + parseFloat(row.price), 0);
  const sumXY = historicalData.reduce((sum, row, i) => sum + i * parseFloat(row.price), 0);
  const sumXX = historicalData.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const forecast = [];
  const baseDate = new Date();
  
  for (let i = 1; i <= days; i++) {
    const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const predictedPrice = Math.max(0, intercept + slope * (n + i - 1));
    
    forecast.push({
      date: date.toISOString().split('T')[0],
      predictedPrice: parseFloat(predictedPrice.toFixed(2)),
      predictedCost: parseFloat((predictedPrice * 0.2).toFixed(2)), // Assuming 5x markup
      confidence: Math.max(0.1, 0.8 - (i * 0.02)), // Decreasing confidence over time
    });
  }
  
  return forecast;
}
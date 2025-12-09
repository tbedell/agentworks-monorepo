#!/usr/bin/env node

/**
 * AgentWorks - Usage Tracker and Analytics
 * Tracks agent usage, calculates billing, and generates reports
 */

const fs = require('fs');
const path = require('path');

class UsageTracker {
  constructor(configPath = './projects') {
    this.configPath = configPath;
    this.billingRates = {
      markup: 5.0, // 5x provider cost
      increment: 0.25, // $0.25 minimum billing increment
      targetMargin: 0.80 // 80% gross margin target
    };
  }

  async trackUsage(projectId, agentName, provider, model, tokens, cost) {
    const timestamp = new Date().toISOString();
    const price = this.calculatePrice(cost);
    
    const usageEvent = {
      id: this.generateId(),
      timestamp,
      projectId,
      agentName,
      provider,
      model,
      tokens,
      cost: {
        provider: cost,
        price: price,
        margin: price - cost,
        marginPercent: ((price - cost) / price * 100).toFixed(2)
      }
    };

    await this.logUsageEvent(projectId, usageEvent);
    await this.updateProjectTotals(projectId, usageEvent);
    
    return usageEvent;
  }

  calculatePrice(cost) {
    // AgentWorks pricing formula: 5x cost, rounded up to $0.25 increments
    const markup = cost * this.billingRates.markup;
    return Math.ceil(markup / this.billingRates.increment) * this.billingRates.increment;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async logUsageEvent(projectId, usageEvent) {
    const logDir = path.join(this.configPath, projectId, 'logs', 'usage');
    const todayFile = path.join(logDir, `usage_${new Date().toISOString().split('T')[0]}.json`);
    
    // Ensure directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Load existing events for today
    let events = [];
    if (fs.existsSync(todayFile)) {
      events = JSON.parse(fs.readFileSync(todayFile, 'utf8'));
    }

    events.push(usageEvent);
    fs.writeFileSync(todayFile, JSON.stringify(events, null, 2));
  }

  async updateProjectTotals(projectId, usageEvent) {
    const projectFile = path.join(this.configPath, projectId, 'project.json');
    const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));

    // Update project totals
    project.usage.total_calls += 1;
    project.usage.total_cost += usageEvent.cost.provider;
    project.usage.total_price += usageEvent.cost.price;

    // Update agent breakdown
    const agent = usageEvent.agentName;
    if (!project.usage.calls_by_agent[agent]) {
      project.usage.calls_by_agent[agent] = { calls: 0, cost: 0, price: 0 };
    }
    project.usage.calls_by_agent[agent].calls += 1;
    project.usage.calls_by_agent[agent].cost += usageEvent.cost.provider;
    project.usage.calls_by_agent[agent].price += usageEvent.cost.price;

    // Update provider breakdown
    const provider = usageEvent.provider;
    if (!project.usage.calls_by_provider[provider]) {
      project.usage.calls_by_provider[provider] = { calls: 0, cost: 0, price: 0 };
    }
    project.usage.calls_by_provider[provider].calls += 1;
    project.usage.calls_by_provider[provider].cost += usageEvent.cost.provider;
    project.usage.calls_by_provider[provider].price += usageEvent.cost.price;

    fs.writeFileSync(projectFile, JSON.stringify(project, null, 2));
  }

  async generateBillingReport(projectId, startDate = null, endDate = null) {
    const logDir = path.join(this.configPath, projectId, 'logs', 'usage');
    
    if (!fs.existsSync(logDir)) {
      return { error: 'No usage data found' };
    }

    // Load all usage events in date range
    const logFiles = fs.readdirSync(logDir)
      .filter(file => file.startsWith('usage_') && file.endsWith('.json'))
      .filter(file => {
        if (!startDate && !endDate) return true;
        const fileDate = file.replace('usage_', '').replace('.json', '');
        return (!startDate || fileDate >= startDate) && (!endDate || fileDate <= endDate);
      })
      .sort();

    let allEvents = [];
    for (const file of logFiles) {
      const events = JSON.parse(fs.readFileSync(path.join(logDir, file), 'utf8'));
      allEvents = allEvents.concat(events);
    }

    // Calculate billing summary
    const billing = {
      projectId,
      period: {
        start: startDate || (logFiles[0] || '').replace('usage_', '').replace('.json', ''),
        end: endDate || (logFiles[logFiles.length - 1] || '').replace('usage_', '').replace('.json', ''),
        days: logFiles.length
      },
      summary: {
        totalCalls: allEvents.length,
        totalProviderCost: allEvents.reduce((sum, e) => sum + e.cost.provider, 0),
        totalCustomerPrice: allEvents.reduce((sum, e) => sum + e.cost.price, 0),
        totalMargin: allEvents.reduce((sum, e) => sum + e.cost.margin, 0),
        averageMarginPercent: 0
      },
      byAgent: {},
      byProvider: {},
      daily: {}
    };

    billing.summary.averageMarginPercent = 
      (billing.summary.totalMargin / billing.summary.totalCustomerPrice * 100).toFixed(2);

    // Group by agent
    allEvents.forEach(event => {
      const agent = event.agentName;
      if (!billing.byAgent[agent]) {
        billing.byAgent[agent] = { calls: 0, cost: 0, price: 0, margin: 0 };
      }
      billing.byAgent[agent].calls += 1;
      billing.byAgent[agent].cost += event.cost.provider;
      billing.byAgent[agent].price += event.cost.price;
      billing.byAgent[agent].margin += event.cost.margin;
    });

    // Group by provider
    allEvents.forEach(event => {
      const provider = event.provider;
      if (!billing.byProvider[provider]) {
        billing.byProvider[provider] = { calls: 0, cost: 0, price: 0, margin: 0 };
      }
      billing.byProvider[provider].calls += 1;
      billing.byProvider[provider].cost += event.cost.provider;
      billing.byProvider[provider].price += event.cost.price;
      billing.byProvider[provider].margin += event.cost.margin;
    });

    // Group by day
    allEvents.forEach(event => {
      const day = event.timestamp.split('T')[0];
      if (!billing.daily[day]) {
        billing.daily[day] = { calls: 0, cost: 0, price: 0, margin: 0 };
      }
      billing.daily[day].calls += 1;
      billing.daily[day].cost += event.cost.provider;
      billing.daily[day].price += event.cost.price;
      billing.daily[day].margin += event.cost.margin;
    });

    return billing;
  }

  async generateUsageAnalytics(projectId, timeframe = '7d') {
    const days = parseInt(timeframe.replace('d', ''));
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const billing = await this.generateBillingReport(
      projectId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    if (billing.error) return billing;

    // Calculate analytics insights
    const analytics = {
      projectId,
      timeframe: `${days} days`,
      period: billing.period,
      kpis: {
        dailyAverage: {
          calls: (billing.summary.totalCalls / days).toFixed(1),
          cost: (billing.summary.totalProviderCost / days).toFixed(4),
          price: (billing.summary.totalCustomerPrice / days).toFixed(4),
          margin: (billing.summary.totalMargin / days).toFixed(4)
        },
        efficiency: {
          marginPercent: billing.summary.averageMarginPercent,
          costPerCall: (billing.summary.totalProviderCost / billing.summary.totalCalls).toFixed(4),
          pricePerCall: (billing.summary.totalCustomerPrice / billing.summary.totalCalls).toFixed(4)
        }
      },
      trends: this.calculateTrends(billing.daily),
      insights: this.generateInsights(billing)
    };

    return analytics;
  }

  calculateTrends(dailyData) {
    const days = Object.keys(dailyData).sort();
    if (days.length < 2) return { trend: 'insufficient_data' };

    const firstHalf = days.slice(0, Math.floor(days.length / 2));
    const secondHalf = days.slice(Math.floor(days.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + dailyData[day].calls, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + dailyData[day].calls, 0) / secondHalf.length;

    const change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100);

    return {
      direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      changePercent: change.toFixed(1),
      firstPeriod: firstHalfAvg.toFixed(1),
      secondPeriod: secondHalfAvg.toFixed(1)
    };
  }

  generateInsights(billing) {
    const insights = [];

    // Margin analysis
    const marginPercent = parseFloat(billing.summary.averageMarginPercent);
    if (marginPercent < 70) {
      insights.push({
        type: 'warning',
        category: 'margin',
        message: `Margin of ${marginPercent}% is below 80% target`,
        recommendation: 'Consider adjusting pricing or optimizing provider usage'
      });
    }

    // Agent usage analysis
    const agents = Object.entries(billing.byAgent)
      .sort(([,a], [,b]) => b.price - a.price)
      .slice(0, 3);

    if (agents.length > 0) {
      insights.push({
        type: 'info',
        category: 'usage',
        message: `Top agents by cost: ${agents.map(([name, data]) => 
          `${name} ($${data.price.toFixed(2)})`).join(', ')}`,
        recommendation: 'Monitor high-cost agents for optimization opportunities'
      });
    }

    // Provider distribution
    const providers = Object.keys(billing.byProvider);
    if (providers.length === 1) {
      insights.push({
        type: 'info',
        category: 'providers',
        message: 'Using single provider - consider diversification for cost optimization',
        recommendation: 'Evaluate other providers for specific agent types'
      });
    }

    return insights;
  }

  async exportBillingData(projectId, format = 'json', startDate = null, endDate = null) {
    const billing = await this.generateBillingReport(projectId, startDate, endDate);
    
    if (billing.error) return billing;

    const exportDir = path.join(this.configPath, projectId, 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    
    switch (format.toLowerCase()) {
      case 'csv':
        const csv = this.convertToCSV(billing);
        const csvFile = path.join(exportDir, `billing_${timestamp}.csv`);
        fs.writeFileSync(csvFile, csv);
        return { file: csvFile, format: 'csv' };

      case 'json':
      default:
        const jsonFile = path.join(exportDir, `billing_${timestamp}.json`);
        fs.writeFileSync(jsonFile, JSON.stringify(billing, null, 2));
        return { file: jsonFile, format: 'json' };
    }
  }

  convertToCSV(billing) {
    const headers = ['Date', 'Agent', 'Provider', 'Calls', 'Provider_Cost', 'Customer_Price', 'Margin'];
    let rows = [headers.join(',')];

    // Add daily breakdown
    Object.entries(billing.daily).forEach(([date, data]) => {
      rows.push([
        date,
        'ALL',
        'ALL', 
        data.calls,
        data.cost.toFixed(4),
        data.price.toFixed(4),
        data.margin.toFixed(4)
      ].join(','));
    });

    // Add agent breakdown
    Object.entries(billing.byAgent).forEach(([agent, data]) => {
      rows.push([
        billing.period.start + '_to_' + billing.period.end,
        agent,
        'ALL',
        data.calls,
        data.cost.toFixed(4),
        data.price.toFixed(4),
        data.margin.toFixed(4)
      ].join(','));
    });

    return rows.join('\n');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const tracker = new UsageTracker();

  switch (command) {
    case 'track':
      const [projectId, agentName, provider, model, tokens, cost] = args.slice(1);
      const event = await tracker.trackUsage(
        projectId, 
        agentName, 
        provider, 
        model, 
        parseInt(tokens), 
        parseFloat(cost)
      );
      console.log('Usage tracked:', event.id);
      break;

    case 'report':
      const [reportProjectId, startDate, endDate] = args.slice(1);
      const report = await tracker.generateBillingReport(reportProjectId, startDate, endDate);
      console.log(JSON.stringify(report, null, 2));
      break;

    case 'analytics':
      const [analyticsProjectId, timeframe] = args.slice(1);
      const analytics = await tracker.generateUsageAnalytics(analyticsProjectId, timeframe || '7d');
      console.log(JSON.stringify(analytics, null, 2));
      break;

    case 'export':
      const [exportProjectId, format, exportStart, exportEnd] = args.slice(1);
      const exported = await tracker.exportBillingData(
        exportProjectId, 
        format || 'json', 
        exportStart, 
        exportEnd
      );
      console.log('Exported to:', exported.file);
      break;

    default:
      console.log(`
AgentWorks Usage Tracker

Usage:
  node usage-tracker.js track <project-id> <agent> <provider> <model> <tokens> <cost>
  node usage-tracker.js report <project-id> [start-date] [end-date]
  node usage-tracker.js analytics <project-id> [timeframe]
  node usage-tracker.js export <project-id> [format] [start-date] [end-date]

Examples:
  node usage-tracker.js track my-proj architect openai gpt-4 1000 0.02
  node usage-tracker.js report my-proj 2023-11-01 2023-11-30
  node usage-tracker.js analytics my-proj 7d
  node usage-tracker.js export my-proj csv 2023-11-01 2023-11-30
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UsageTracker };
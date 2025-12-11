import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Zap, BarChart2, Clock, Download, RefreshCw, TrendingUp, Bot } from 'lucide-react'

// Metric card component
function MetricCard({ label, value, subtext, icon: Icon, color, delay }: {
  label: string
  value: string
  subtext: string
  icon: typeof DollarSign
  color: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-lg shadow-sm border border-slate-200 p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500 mb-1">{label}</div>
          <div className="text-2xl font-bold text-slate-800">{value}</div>
          <div className="text-[10px] text-slate-400 mt-1">{subtext}</div>
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </motion.div>
  )
}

// Provider usage bar
function ProviderBar({ name, percentage, color, delay }: { name: string; percentage: number; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3"
    >
      <div className="w-20 text-xs text-slate-600">{name}</div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="w-10 text-xs text-slate-500 text-right">{percentage}%</div>
    </motion.div>
  )
}

// Agent performance row
function AgentRow({ name, requests, successRate, avgTime, delay }: {
  name: string
  requests: number
  successRate: number
  avgTime: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center py-2 border-b border-slate-100 last:border-0"
    >
      <div className="flex-1 flex items-center gap-2">
        <Bot className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-700">{name}</span>
      </div>
      <div className="w-16 text-xs text-slate-500 text-center">{requests}</div>
      <div className="w-16 text-xs text-center">
        <span className={`px-1.5 py-0.5 rounded ${
          successRate >= 95 ? 'bg-green-100 text-green-700' :
          successRate >= 80 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {successRate}%
        </span>
      </div>
      <div className="w-16 text-xs text-slate-500 text-right">{avgTime}</div>
    </motion.div>
  )
}

export default function UsageShowcase() {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(true), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-sm font-medium mb-4"
          >
            <BarChart2 className="w-4 h-4" />
            Usage & Analytics
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-slate-900 mb-3"
          >
            Full Cost Transparency
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-slate-600 max-w-2xl mx-auto"
          >
            Track every API call, token, and dollar. Know exactly what each agent costs and optimize your AI spending.
          </motion.p>
        </div>

        {/* Problem/Solution */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-6 mb-10 max-w-4xl mx-auto"
        >
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <h4 className="font-semibold text-red-800 mb-2">The Problem</h4>
            <p className="text-sm text-red-700">
              AI costs can spiral out of control without visibility. Many teams get surprise bills at the end of the month with no idea which tasks consumed the most.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <h4 className="font-semibold text-green-800 mb-2">Our Solution</h4>
            <p className="text-sm text-green-700">
              Real-time cost tracking with 5x markup pricing transparency. See costs per provider, per agent, and per project - no surprises.
            </p>
          </div>
        </motion.div>

        {/* Usage Dashboard Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto rounded-xl overflow-hidden shadow-xl border border-slate-200 bg-slate-50"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
            <div>
              <h3 className="font-semibold text-slate-800">Usage & Analytics</h3>
              <p className="text-xs text-slate-500">Project-level usage with 5x markup pricing</p>
            </div>
            <div className="flex items-center gap-2">
              <select className="text-xs border border-slate-200 rounded px-2 py-1">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>This month</option>
              </select>
              <button className="p-1.5 rounded hover:bg-slate-100">
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
              <button className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1">
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="Total Billed Cost"
                value={isAnimating ? '$127.50' : '$0.00'}
                subtext="$25.50 actual cost"
                icon={DollarSign}
                color="#10B981"
                delay={0.1}
              />
              <MetricCard
                label="Total Requests"
                value={isAnimating ? '1,248' : '0'}
                subtext="98.4% success rate"
                icon={Zap}
                color="#3B82F6"
                delay={0.2}
              />
              <MetricCard
                label="Total Tokens"
                value={isAnimating ? '2.4M' : '0'}
                subtext="1.8M input / 0.6M output"
                icon={BarChart2}
                color="#8B5CF6"
                delay={0.3}
              />
              <MetricCard
                label="Avg Response"
                value={isAnimating ? '1.2s' : '0.0s'}
                subtext="Average response time"
                icon={Clock}
                color="#F59E0B"
                delay={0.4}
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
              {['Overview', 'Providers', 'Agents', 'Trends'].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px ${
                    i === 0 ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Provider Usage */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800 mb-4">Provider Usage</h4>
                <div className="space-y-3">
                  {isAnimating && (
                    <>
                      <ProviderBar name="Anthropic" percentage={52} color="#10B981" delay={0.5} />
                      <ProviderBar name="OpenAI" percentage={35} color="#3B82F6" delay={0.6} />
                      <ProviderBar name="Google" percentage={13} color="#F59E0B" delay={0.7} />
                    </>
                  )}
                </div>
              </div>

              {/* Agent Performance */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800 mb-4">Agent Performance</h4>
                <div className="text-[10px] text-slate-500 flex items-center py-1 border-b border-slate-200 mb-1">
                  <div className="flex-1">Agent</div>
                  <div className="w-16 text-center">Requests</div>
                  <div className="w-16 text-center">Success</div>
                  <div className="w-16 text-right">Avg Time</div>
                </div>
                {isAnimating && (
                  <>
                    <AgentRow name="Dev Backend" requests={423} successRate={99} avgTime="1.4s" delay={0.5} />
                    <AgentRow name="Dev Frontend" requests={312} successRate={97} avgTime="1.1s" delay={0.6} />
                    <AgentRow name="CEO CoPilot" requests={189} successRate={100} avgTime="2.3s" delay={0.7} />
                    <AgentRow name="QA Agent" requests={156} successRate={95} avgTime="0.9s" delay={0.8} />
                    <AgentRow name="Architect" requests={98} successRate={98} avgTime="1.8s" delay={0.9} />
                  </>
                )}
              </div>
            </div>

            {/* Cost Trend */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-4 bg-white rounded-lg p-4 border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-800">Cost Trend (Last 7 Days)</h4>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>12% lower than last week</span>
                </div>
              </div>
              {/* Simple bar chart */}
              <div className="flex items-end gap-2 h-24">
                {[65, 45, 80, 55, 70, 40, 85].map((height, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 1.2 + i * 0.1, duration: 0.5 }}
                    className="flex-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6 mt-10 max-w-4xl mx-auto"
        >
          {[
            {
              title: '5x Markup Pricing',
              description: 'Transparent pricing with clear cost visibility at all times.',
            },
            {
              title: 'Per-Agent Tracking',
              description: 'See exactly which agents consume the most resources.',
            },
            {
              title: 'Export Reports',
              description: 'Download detailed usage reports for billing and analysis.',
            },
          ].map((feature, i) => (
            <div key={i} className="text-center">
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-500">
                {feature.description}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bot, Settings, BarChart2, FileText, Code, Rocket, Brain, ChevronDown } from 'lucide-react'

// Agent definitions matching the actual app
const agents = [
  {
    id: 'architect',
    name: 'Architect Agent',
    slug: 'architect',
    description: 'Designs system architecture and chooses technology stack.',
    lane: 'Lane 3',
    provider: 'Anthropic',
    model: 'Claude 3.5 Sonnet',
    color: '#3B82F6',
    icon: Brain,
  },
  {
    id: 'ceo_copilot',
    name: 'CEO CoPilot',
    slug: 'ceo_copilot',
    description: 'Executive supervisor for the entire project. Runs Lane 0 Q&A, maintains alignment between Blueprint, PRD, MVP, and actual work.',
    lane: 'Lane 0-10',
    provider: 'OpenAI',
    model: 'GPT-4o',
    color: '#8B5CF6',
    icon: Bot,
  },
  {
    id: 'dev_backend',
    name: 'Dev Backend Agent',
    slug: 'dev_backend',
    description: 'Implements backend APIs and services.',
    lane: 'Lane 6',
    provider: 'Anthropic',
    model: 'Claude 3.5 Sonnet',
    color: '#10B981',
    icon: Code,
  },
  {
    id: 'dev_frontend',
    name: 'Dev Frontend Agent',
    slug: 'dev_frontend',
    description: 'Implements frontend UI components and pages.',
    lane: 'Lane 6',
    provider: 'Anthropic',
    model: 'Claude 3.5 Sonnet',
    color: '#F59E0B',
    icon: Code,
  },
  {
    id: 'devops',
    name: 'DevOps Agent',
    slug: 'devops',
    description: 'Creates infrastructure-as-code, CI/CD pipelines, and deployment configs.',
    lane: 'Lane 5, 8',
    provider: 'Anthropic',
    model: 'Claude 3.5 Sonnet',
    color: '#EC4899',
    icon: Rocket,
  },
  {
    id: 'docs',
    name: 'Docs Agent',
    slug: 'docs',
    description: 'Creates user documentation, API docs, and runbooks.',
    lane: 'Lane 9',
    provider: 'OpenAI',
    model: 'GPT-4o',
    color: '#06B6D4',
    icon: FileText,
  },
]

function AgentCard({ agent, index, isActive }: { agent: typeof agents[0]; index: number; isActive: boolean }) {
  const Icon = agent.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-white rounded-lg shadow-sm border ${
        isActive ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
      } overflow-hidden`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: agent.color + '20' }}
            >
              <Icon className="w-5 h-5" style={{ color: agent.color }} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">{agent.name}</h4>
              <span className="text-xs text-slate-400">{agent.slug}</span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {isActive ? 'active' : 'ready'}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
          {agent.description}
        </p>

        {/* Lane Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">
            {agent.lane}
          </span>
        </div>

        {/* Provider & Model */}
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">AI Provider</label>
            <div className="flex items-center justify-between bg-slate-50 rounded px-2 py-1.5 border border-slate-200">
              <span className="text-xs text-slate-700">{agent.provider}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Model</label>
            <div className="flex items-center justify-between bg-slate-50 rounded px-2 py-1.5 border border-slate-200">
              <span className="text-xs text-slate-700">{agent.model}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <button className="flex-1 text-[10px] text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 py-1">
            <Settings className="w-3 h-3" />
            Fine-Tune
          </button>
          <button className="flex-1 text-[10px] text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 py-1">
            <FileText className="w-3 h-3" />
            Logs
          </button>
          <button className="flex-1 text-[10px] text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 py-1">
            <BarChart2 className="w-3 h-3" />
            Metrics
          </button>
        </div>
      </div>

      {/* Activity Indicator */}
      {isActive && (
        <motion.div
          animate={{ scaleX: [0, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-0.5 bg-gradient-to-r from-blue-500 to-green-500"
          style={{ transformOrigin: 'left' }}
        />
      )}
    </motion.div>
  )
}

export default function AgentsShowcase() {
  const [activeAgentIndex, setActiveAgentIndex] = useState(0)

  // Cycle through active agents
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAgentIndex(prev => (prev + 1) % agents.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-4"
          >
            <Bot className="w-4 h-4" />
            AI Agents
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-slate-900 mb-3"
          >
            15 Specialized AI Agents
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-slate-600 max-w-2xl mx-auto"
          >
            Configure AI providers for each agent. Mix OpenAI, Anthropic, and Google models to optimize cost and performance.
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
              Different tasks require different AI capabilities. One model doesn't fit all - code generation, analysis, and documentation have different needs.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <h4 className="font-semibold text-green-800 mb-2">Our Solution</h4>
            <p className="text-sm text-green-700">
              Mix and match AI providers per agent. Use Claude for code, GPT-4 for planning, and Gemini for analysis - all in one project.
            </p>
          </div>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto mb-6"
        >
          <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-3">
            <div>
              <h3 className="font-semibold text-slate-800">Agent Management</h3>
              <p className="text-xs text-slate-500">Configure AI providers for all {agents.length} agents across project lanes</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs border border-slate-200 rounded hover:bg-slate-50 flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Global Settings
              </button>
              <button className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1">
                <Rocket className="w-3 h-3" />
                Deploy All Agents
              </button>
            </div>
          </div>
        </motion.div>

        {/* Agent Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4"
        >
          {agents.map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={index}
              isActive={index === activeAgentIndex}
            />
          ))}
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
              title: 'Multi-Provider',
              description: 'Use OpenAI, Anthropic, and Google AI in the same project.',
            },
            {
              title: 'Fine-Tuning',
              description: 'Customize each agent with project-specific instructions.',
            },
            {
              title: 'Real-Time Metrics',
              description: 'Track performance, cost, and success rate per agent.',
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

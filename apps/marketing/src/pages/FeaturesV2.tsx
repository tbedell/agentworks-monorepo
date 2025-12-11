import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Kanban, Terminal, Palette, Database, Zap, Bot, BarChart2,
  ArrowRight, Check, GitBranch, Layers, Brain, Code2, FileText
} from 'lucide-react'
import { NavigationV2, FooterV2 } from '../components/v2'

const features = [
  {
    id: 'kanban',
    icon: Kanban,
    name: 'Visual Tracking',
    tagline: '11-Lane Kanban Pipeline',
    description: 'Watch your project evolve through a visual pipeline. Every feature moves from vision to deployment across 11 specialized lanes.',
    color: 'blue',
    highlights: [
      'Real-time card movements',
      'Automatic lane transitions',
      'Progress visualization',
      'Dependency tracking',
    ],
  },
  {
    id: 'terminal',
    icon: Terminal,
    name: 'Realtime Terminal',
    tagline: 'Full Transparency',
    description: 'See exactly what agents are doing in real-time. Every command, every decision, every line of code - completely transparent.',
    color: 'green',
    highlights: [
      'Live execution logs',
      'Session replay',
      'Error highlighting',
      'Multi-agent view',
    ],
  },
  {
    id: 'design',
    icon: Palette,
    name: 'Visual Design',
    tagline: 'Drag-Drop UI Builder',
    description: 'Design your interfaces visually. Drag components, set properties, and watch the AI generate production-ready React code.',
    color: 'pink',
    highlights: [
      'Component library',
      'Responsive layouts',
      'Theme customization',
      'Code export',
    ],
  },
  {
    id: 'database',
    icon: Database,
    name: 'Visual Database',
    tagline: 'AI-Powered Schema Design',
    description: 'Design your database schema visually. The AI suggests relationships, indexes, and generates migrations automatically.',
    color: 'purple',
    highlights: [
      'ERD visualization',
      'Auto migrations',
      'Relationship mapping',
      'Query builder',
    ],
  },
  {
    id: 'workflow',
    icon: Zap,
    name: 'Visual Workflow',
    tagline: 'Automation Pipeline Builder',
    description: 'Create powerful automations with triggers, conditions, and actions. Orchestrate agents automatically based on events.',
    color: 'orange',
    highlights: [
      'Event triggers',
      'Conditional logic',
      'Agent orchestration',
      'Webhook support',
    ],
  },
  {
    id: 'agents',
    icon: Bot,
    name: 'Specialized Agents',
    tagline: '15 AI Agents with Provider Mixing',
    description: 'A team of specialized AI agents for every development task. Mix OpenAI, Anthropic, and Google models for optimal results.',
    color: 'cyan',
    highlights: [
      'Per-agent configuration',
      'Multi-provider mixing',
      'Fine-tuning support',
      'Custom prompts',
    ],
  },
  {
    id: 'analytics',
    icon: BarChart2,
    name: 'Usage & Analytics',
    tagline: 'Full Cost Transparency',
    description: 'Track every API call, token, and dollar. Know exactly what each agent costs and optimize your AI spending.',
    color: 'teal',
    highlights: [
      'Real-time cost tracking',
      'Per-agent metrics',
      'Provider breakdown',
      'Export reports',
    ],
  },
]

const additionalFeatures = [
  { icon: GitBranch, name: 'Your GitHub Repository', description: 'Code stays in your repo' },
  { icon: Layers, name: 'Blueprint-First', description: 'Structured planning before coding' },
  { icon: Brain, name: 'CEO CoPilot', description: 'Executive oversight across all lanes' },
  { icon: Code2, name: 'Production Ready', description: 'Tests, docs, and best practices' },
  { icon: FileText, name: 'Auto Documentation', description: 'Generated docs and runbooks' },
]

function FeatureSection({ feature, index }: { feature: typeof features[0]; index: number }) {
  const isEven = index % 2 === 0
  const Icon = feature.icon

  return (
    <section id={feature.id} className={`py-20 ${isEven ? 'bg-white' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid lg:grid-cols-2 gap-12 items-center ${!isEven ? 'lg:flex-row-reverse' : ''}`}>
          <motion.div
            initial={{ opacity: 0, x: isEven ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={!isEven ? 'lg:order-2' : ''}
          >
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${feature.color}-100 text-${feature.color}-700 text-sm font-medium mb-4`}>
              <Icon className="w-4 h-4" />
              {feature.name}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {feature.tagline}
            </h2>
            <p className="text-lg text-slate-600 mb-6">
              {feature.description}
            </p>
            <ul className="space-y-3">
              {feature.highlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-3">
                  <Check className={`w-5 h-5 text-${feature.color}-500 flex-shrink-0`} />
                  <span className="text-slate-700">{highlight}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: isEven ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={`bg-gradient-to-br from-${feature.color}-50 to-${feature.color}-100 rounded-2xl p-8 ${!isEven ? 'lg:order-1' : ''}`}
          >
            <div className={`w-full h-64 rounded-xl bg-white shadow-lg flex items-center justify-center`}>
              <Icon className={`w-24 h-24 text-${feature.color}-300`} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default function FeaturesV2() {
  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationV2 />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-blue-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-slate-900 mb-4"
          >
            Powerful Features for Modern Development
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-600 max-w-2xl mx-auto mb-8"
          >
            Everything you need to build software with AI agents. Visual tools, full transparency, and complete control.
          </motion.p>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {features.map((feature) => (
              <a
                key={feature.id}
                href={`#${feature.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <feature.icon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">{feature.name}</span>
              </a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature Sections */}
      {features.map((feature, index) => (
        <FeatureSection key={feature.id} feature={feature} index={index} />
      ))}

      {/* Additional Features */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-white mb-4"
            >
              And Much More
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-400"
            >
              Built-in features that make AgentWorks the complete development platform.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {additionalFeatures.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-4"
              >
                <div className="w-12 h-12 mx-auto rounded-lg bg-slate-800 flex items-center justify-center mb-3">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">{feature.name}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-blue-500 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-white mb-4"
          >
            Ready to Experience These Features?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-blue-100 mb-8"
          >
            Join the waitlist and be among the first to build with AI agents.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/waitlist"
              className="w-full sm:w-auto px-8 py-4 bg-white text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              Join the Waitlist
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto px-8 py-4 text-white border-2 border-white/30 hover:border-white/50 font-medium rounded-xl transition-colors"
            >
              View Pricing
            </Link>
          </motion.div>
        </div>
      </section>

      <FooterV2 />
    </div>
  )
}

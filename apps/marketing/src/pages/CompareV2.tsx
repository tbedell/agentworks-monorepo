import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Check, X, ArrowRight, GitBranch, Bot, Kanban, Layers } from 'lucide-react'
import { NavigationV2, FooterV2 } from '../components/v2'

const competitors = [
  { name: 'Lovable', description: 'AI app builder' },
  { name: 'Replit', description: 'Online IDE with AI' },
  { name: 'Bolt.new', description: 'AI code generation' },
  { name: 'Cursor', description: 'AI code editor' },
  { name: 'Windsurf', description: 'AI coding assistant' },
]

const features = [
  {
    category: 'Development Approach',
    items: [
      {
        name: 'Blueprint-First Planning',
        description: 'Structured planning before coding',
        agentworks: true,
        lovable: false,
        replit: false,
        bolt: false,
        cursor: false,
        windsurf: false,
      },
      {
        name: 'Multi-Agent System (15+)',
        description: 'Specialized agents for each task',
        agentworks: true,
        lovable: false,
        replit: 'limited',
        bolt: false,
        cursor: false,
        windsurf: false,
      },
      {
        name: 'CEO CoPilot',
        description: 'Executive oversight across all lanes',
        agentworks: true,
        lovable: false,
        replit: false,
        bolt: false,
        cursor: false,
        windsurf: false,
      },
    ],
  },
  {
    category: 'Project Management',
    items: [
      {
        name: 'Visual Kanban Board',
        description: '11-lane development pipeline',
        agentworks: true,
        lovable: false,
        replit: false,
        bolt: false,
        cursor: false,
        windsurf: false,
      },
      {
        name: 'Real-time Progress Tracking',
        description: 'Watch cards move through lanes',
        agentworks: true,
        lovable: 'limited',
        replit: false,
        bolt: false,
        cursor: false,
        windsurf: false,
      },
      {
        name: 'Live Terminal Output',
        description: 'See exactly what agents are doing',
        agentworks: true,
        lovable: false,
        replit: true,
        bolt: 'limited',
        cursor: true,
        windsurf: true,
      },
    ],
  },
  {
    category: 'AI & Providers',
    items: [
      {
        name: 'Multi-Provider Mixing',
        description: 'Use OpenAI, Anthropic, Google together',
        agentworks: true,
        lovable: false,
        replit: false,
        bolt: false,
        cursor: false,
        windsurf: false,
      },
      {
        name: 'Per-Agent Configuration',
        description: 'Different models for different tasks',
        agentworks: true,
        lovable: false,
        replit: false,
        bolt: false,
        cursor: false,
        windsurf: false,
      },
      {
        name: 'BYOA Support',
        description: 'Bring your own agents & API keys',
        agentworks: true,
        lovable: false,
        replit: 'limited',
        bolt: false,
        cursor: true,
        windsurf: true,
      },
    ],
  },
  {
    category: 'Code Ownership',
    items: [
      {
        name: 'Your GitHub Repository',
        description: 'Code stays in your GitHub',
        agentworks: true,
        lovable: false,
        replit: true,
        bolt: false,
        cursor: true,
        windsurf: true,
      },
      {
        name: 'No Platform Lock-in',
        description: 'Export and run anywhere',
        agentworks: true,
        lovable: false,
        replit: true,
        bolt: false,
        cursor: true,
        windsurf: true,
      },
      {
        name: 'Automated Cloud Deployment',
        description: 'Deploy to AWS, GCP, Azure',
        agentworks: true,
        lovable: 'limited',
        replit: true,
        bolt: 'limited',
        cursor: false,
        windsurf: false,
      },
    ],
  },
]

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="w-5 h-5 text-green-500 mx-auto" />
  }
  if (value === 'limited') {
    return <span className="text-xs text-amber-600 font-medium">Limited</span>
  }
  return <X className="w-5 h-5 text-slate-300 mx-auto" />
}

const differentiators = [
  {
    icon: GitBranch,
    title: 'Your GitHub, YOUR CODE!',
    description: 'Your code lives in your repository. Not locked into any platform. Full ownership and portability.',
    color: 'green',
  },
  {
    icon: Bot,
    title: '15 Specialized Agents',
    description: 'Not just one AI - a team of specialized agents for architecture, backend, frontend, QA, docs, and more.',
    color: 'blue',
  },
  {
    icon: Kanban,
    title: 'Visual Pipeline',
    description: '11-lane Kanban board shows exactly where every feature is in the development process.',
    color: 'purple',
  },
  {
    icon: Layers,
    title: 'Blueprint-First',
    description: 'Structured planning with PRD and MVP definition before any code is written.',
    color: 'orange',
  },
]

export default function CompareV2() {
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
            How AgentWorks Compares
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-600 max-w-2xl mx-auto"
          >
            See how AgentWorks stacks up against other AI coding tools. We're not just another code generator.
          </motion.p>
        </div>
      </section>

      {/* Key Differentiator */}
      <section className="py-12 bg-green-50 border-y border-green-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <GitBranch className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-800">Your GitHub, YOUR CODE!</h2>
                <p className="text-green-700">Code stays in your repository. Deploy anywhere. No lock-in.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-7 gap-4 p-4 text-center">
                <div className="text-left font-semibold text-slate-700">Feature</div>
                <div className="font-bold text-blue-600">AgentWorks</div>
                {competitors.map((comp) => (
                  <div key={comp.name} className="text-sm font-medium text-slate-500">
                    {comp.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Groups */}
            {features.map((group, groupIndex) => (
              <div key={group.category}>
                {/* Category Header */}
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                  <span className="text-sm font-semibold text-slate-600">{group.category}</span>
                </div>

                {/* Feature Rows */}
                {group.items.map((feature, featureIndex) => (
                  <motion.div
                    key={feature.name}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: (groupIndex * 3 + featureIndex) * 0.05 }}
                    className="grid grid-cols-7 gap-4 p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="text-left">
                      <div className="font-medium text-slate-800">{feature.name}</div>
                      <div className="text-xs text-slate-500">{feature.description}</div>
                    </div>
                    <div className="flex items-center justify-center">
                      <FeatureCell value={feature.agentworks} />
                    </div>
                    <div className="flex items-center justify-center">
                      <FeatureCell value={feature.lovable} />
                    </div>
                    <div className="flex items-center justify-center">
                      <FeatureCell value={feature.replit} />
                    </div>
                    <div className="flex items-center justify-center">
                      <FeatureCell value={feature.bolt} />
                    </div>
                    <div className="flex items-center justify-center">
                      <FeatureCell value={feature.cursor} />
                    </div>
                    <div className="flex items-center justify-center">
                      <FeatureCell value={feature.windsurf} />
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-slate-900 mb-4"
            >
              What Makes AgentWorks Different
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              We're building a complete development platform, not just another AI code generator.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {differentiators.map((diff, index) => (
              <motion.div
                key={diff.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-50 rounded-xl p-6 border border-slate-200"
              >
                <div className={`w-12 h-12 rounded-lg bg-${diff.color}-100 flex items-center justify-center mb-4`}>
                  <diff.icon className={`w-6 h-6 text-${diff.color}-600`} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{diff.title}</h3>
                <p className="text-slate-600 text-sm">{diff.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Not Just Use... */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-slate-900 mb-4"
            >
              Why Not Just Use...
            </motion.h2>
          </div>

          <div className="space-y-6">
            {[
              {
                competitor: 'Lovable',
                problem: 'Great for quick prototypes, but code is locked to their platform. No real project management.',
                solution: 'AgentWorks gives you your code in your GitHub, with full Kanban visibility.',
              },
              {
                competitor: 'Cursor',
                problem: 'Excellent code editor with AI, but it\'s still a single-agent experience. No structured workflow.',
                solution: 'AgentWorks orchestrates 15 specialized agents with a visual pipeline you can track.',
              },
              {
                competitor: 'Replit',
                problem: 'Good for learning and deployment, but AI capabilities are limited to basic code completion.',
                solution: 'AgentWorks uses multiple AI providers with specialized agents for each development task.',
              },
              {
                competitor: 'Bolt.new',
                problem: 'Fast code generation, but no planning phase. Code quality varies without structure.',
                solution: 'AgentWorks follows Blueprint → PRD → MVP → Build flow for consistent quality.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.competitor}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 border border-slate-200"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Why not just use {item.competitor}?
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <div className="text-xs font-semibold text-red-600 mb-1">The Challenge</div>
                    <p className="text-sm text-red-800">{item.problem}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-xs font-semibold text-green-600 mb-1">AgentWorks Solution</div>
                    <p className="text-sm text-green-800">{item.solution}</p>
                  </div>
                </div>
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
            Ready to See the Difference?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-blue-100 mb-8"
          >
            Join the waitlist and experience AI-powered development done right.
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

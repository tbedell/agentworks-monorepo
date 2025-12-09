import { motion } from 'framer-motion'
import { Check, X, ArrowRight, Sparkles } from 'lucide-react'

interface Competitor {
  name: string
  tagline: string
  pricing: string
  strengths: string[]
  weaknesses: string[]
  bestFor: string
}

const competitors: Competitor[] = [
  {
    name: 'Lovable',
    tagline: 'Plain English to full-stack apps',
    pricing: '$20-$100/mo',
    strengths: [
      'Visual editor (Figma-like)',
      'Multi-modal input (text, images, Figma)',
      'Fast MVP generation',
      'Real-time collaboration',
    ],
    weaknesses: [
      'Single AI model',
      'No strategic planning phase',
      'No lane-based workflow',
      'Limited oversight controls',
    ],
    bestFor: 'Quick prototypes and MVPs',
  },
  {
    name: 'Replit',
    tagline: 'Browser-based IDE with AI Agent',
    pricing: '$15/mo Core',
    strengths: [
      'Full cloud IDE',
      'Agent 3 with autonomy',
      'Build/Plan/Edit modes',
      '50+ languages supported',
    ],
    weaknesses: [
      'Single AI context',
      'No Blueprint methodology',
      'Generic agent approach',
      'No visual production line',
    ],
    bestFor: 'Learning and quick experiments',
  },
  {
    name: 'Bolt.new',
    tagline: 'Full-stack in browser with AI',
    pricing: '$20-$200/mo',
    strengths: [
      'WebContainer technology',
      'No local setup needed',
      'Multi-framework support',
      'Netlify integration',
    ],
    weaknesses: [
      'Single AI (Claude)',
      'Token-based limitations',
      'No workflow visualization',
      'No oversight mechanisms',
    ],
    bestFor: 'Browser-based development',
  },
  {
    name: 'Cursor',
    tagline: 'AI-first IDE for developers',
    pricing: '$20/mo Pro',
    strengths: [
      'VS Code base',
      'Multi-model support',
      'Codebase understanding',
      'Tab completion',
    ],
    weaknesses: [
      'No orchestration',
      'Requires coding knowledge',
      'No project management',
      'No strategic alignment',
    ],
    bestFor: 'Professional developers',
  },
  {
    name: 'Windsurf',
    tagline: 'Agentic IDE for flow state',
    pricing: 'Free tier + paid',
    strengths: [
      'Cascade AI',
      'Flows synchronization',
      'Multi-modal input',
      'IDE plugins',
    ],
    weaknesses: [
      'Single context window',
      'No Blueprint planning',
      'No visual workflow',
      'No CEO oversight',
    ],
    bestFor: 'IDE power users',
  },
]

function CompetitorCard({ competitor, index }: { competitor: Competitor; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="glass rounded-2xl p-8"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">{competitor.name}</h3>
          <p className="text-dark-400 text-sm">{competitor.tagline}</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-dark-800 text-sm text-dark-300">
          {competitor.pricing}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-sm font-medium text-green-400 mb-3">Strengths</h4>
          <ul className="space-y-2">
            {competitor.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm text-dark-300">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-3">Limitations</h4>
          <ul className="space-y-2">
            {competitor.weaknesses.map((w) => (
              <li key={w} className="flex items-start gap-2 text-sm text-dark-300">
                <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5">
        <span className="text-sm text-dark-400">Best for: </span>
        <span className="text-sm text-white font-medium">{competitor.bestFor}</span>
      </div>
    </motion.div>
  )
}

export default function Compare() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-32 pb-20"
    >
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-medium text-dark-300">
              Honest comparison
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            AgentWorks vs{' '}
            <span className="gradient-text">The Competition</span>
          </h1>
          <p className="text-xl text-dark-300 max-w-3xl mx-auto">
            We respect our competitors. Here's an honest look at how AgentWorks 
            differs from other AI development tools.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-8 mb-12 border-2 border-brand-500/50"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AgentWorks</h2>
              <p className="text-dark-400">The Kanban for AI Development</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 rounded-xl bg-brand-500/10">
              <h4 className="font-semibold text-white mb-2">Blueprint-First</h4>
              <p className="text-sm text-dark-300">Strategic planning before any code is written</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-500/10">
              <h4 className="font-semibold text-white mb-2">11+ Specialist Agents</h4>
              <p className="text-sm text-dark-300">Right agent for each stage of development</p>
            </div>
            <div className="p-4 rounded-xl bg-pink-500/10">
              <h4 className="font-semibold text-white mb-2">Visual Kanban</h4>
              <p className="text-sm text-dark-300">See cards flow through production lanes</p>
            </div>
            <div className="p-4 rounded-xl bg-cyan-500/10">
              <h4 className="font-semibold text-white mb-2">CEO CoPilot</h4>
              <p className="text-sm text-dark-300">Continuous alignment with your Blueprint</p>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {competitors.map((competitor, index) => (
            <CompetitorCard key={competitor.name} competitor={competitor} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <h3 className="text-2xl font-bold text-white mb-4">
            Ready to see the difference?
          </h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary text-lg flex items-center gap-2 mx-auto"
          >
            Try AgentWorks Free
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  )
}

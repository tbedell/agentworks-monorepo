import { motion } from 'framer-motion'
import { Check, X, Sparkles } from 'lucide-react'

interface Feature {
  name: string
  agentworks: boolean | string
  lovable: boolean | string
  replit: boolean | string
  bolt: boolean | string
  cursor: boolean | string
}

const features: Feature[] = [
  { name: 'Blueprint-First Planning', agentworks: true, lovable: false, replit: false, bolt: false, cursor: false },
  { name: 'Multi-Agent Orchestration', agentworks: '11+ Agents', lovable: 'Single AI', replit: 'Single AI', bolt: 'Single AI', cursor: 'Single AI' },
  { name: 'Visual Kanban Workflow', agentworks: true, lovable: false, replit: false, bolt: false, cursor: false },
  { name: 'CEO CoPilot Oversight', agentworks: true, lovable: false, replit: false, bolt: false, cursor: false },
  { name: 'Provider Mixing', agentworks: 'GPT-4 + Claude + Gemini', lovable: 'OpenAI only', replit: 'Claude + GPT-4', bolt: 'Claude only', cursor: 'Multi-model' },
  { name: 'Full-Stack Generation', agentworks: true, lovable: true, replit: true, bolt: true, cursor: true },
  { name: 'Real-time Collaboration', agentworks: true, lovable: true, replit: true, bolt: false, cursor: false },
  { name: 'Usage Transparency', agentworks: 'Real-time tracking', lovable: 'Basic', replit: 'Basic', bolt: 'Token-based', cursor: 'Basic' },
  { name: 'Lane-based Progress', agentworks: '11 Lanes', lovable: false, replit: false, bolt: false, cursor: false },
  { name: 'Specialized Dev Agents', agentworks: 'Backend + Frontend', lovable: 'Generic', replit: 'Generic', bolt: 'Generic', cursor: 'Generic' },
]

const competitors = [
  { key: 'agentworks', name: 'AgentWorks', highlight: true },
  { key: 'lovable', name: 'Lovable', highlight: false },
  { key: 'replit', name: 'Replit', highlight: false },
  { key: 'bolt', name: 'Bolt.new', highlight: false },
  { key: 'cursor', name: 'Cursor', highlight: false },
]

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') {
    return value ? (
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        className="flex justify-center"
      >
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-4 h-4 text-green-400" />
        </div>
      </motion.div>
    ) : (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center">
          <X className="w-4 h-4 text-dark-500" />
        </div>
      </div>
    )
  }
  return (
    <span className="text-sm text-dark-300 text-center block">{value}</span>
  )
}

export default function ComparisonTable() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-500/10 rounded-full blur-[200px]" />

      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-medium text-dark-300">
              See the difference
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Why Choose{' '}
            <span className="gradient-text">AgentWorks</span>?
          </h2>
          <p className="text-xl text-dark-300 max-w-2xl mx-auto">
            Compare our multi-agent orchestration with single-AI alternatives.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-x-auto"
        >
          <div className="min-w-[800px]">
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left p-6 text-sm font-medium text-dark-400">
                      Features
                    </th>
                    {competitors.map((comp) => (
                      <th
                        key={comp.key}
                        className={`p-6 text-center ${
                          comp.highlight
                            ? 'bg-gradient-to-b from-brand-500/20 to-transparent'
                            : ''
                        }`}
                      >
                        <span
                          className={`text-sm font-semibold ${
                            comp.highlight ? 'gradient-text' : 'text-white'
                          }`}
                        >
                          {comp.name}
                        </span>
                        {comp.highlight && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2"
                          >
                            <span className="text-xs px-2 py-1 rounded-full bg-brand-500/20 text-brand-400">
                              Recommended
                            </span>
                          </motion.div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <motion.tr
                      key={feature.name}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-6 text-sm font-medium text-white">
                        {feature.name}
                      </td>
                      {competitors.map((comp) => (
                        <td
                          key={comp.key}
                          className={`p-6 ${
                            comp.highlight
                              ? 'bg-gradient-to-b from-brand-500/10 to-transparent'
                              : ''
                          }`}
                        >
                          <FeatureCell
                            value={feature[comp.key as keyof Feature] as boolean | string}
                          />
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary"
          >
            Start Free Trial
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

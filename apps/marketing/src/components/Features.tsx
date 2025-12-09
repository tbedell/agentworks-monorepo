import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import {
  Layers, Bot, BarChart3, Shield,
  Zap, GitBranch, Terminal, Eye, Shuffle
} from 'lucide-react'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}

const features: Feature[] = [
  {
    icon: <Layers className="w-6 h-6" />,
    title: 'Blueprint-First Development',
    description: 'Start with strategy, not code. Define your vision in Lane 0 before any agent writes a single line.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <Bot className="w-6 h-6" />,
    title: '11+ Specialist Agents',
    description: 'CEO CoPilot, Strategy, PRD, Architect, Dev, QA, and more. Each optimized for their role.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: <Eye className="w-6 h-6" />,
    title: 'Visual Kanban Workflow',
    description: 'Watch cards flow through lanes. Real-time visibility into every stage of development.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: <Shuffle className="w-6 h-6" />,
    title: 'Provider Mixing',
    description: 'GPT-4 for strategy, Claude for code, Gemini for debugging. The right AI for each job.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Usage Transparency',
    description: 'Real-time cost tracking with clear 2× markup. No surprise bills, ever.',
    color: 'from-brand-500 to-purple-500',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'CEO CoPilot Oversight',
    description: 'Continuous alignment checks ensure agents follow your Blueprint and PRD.',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    icon: <Terminal className="w-6 h-6" />,
    title: 'LLM Terminal',
    description: 'Live logs and replay for every agent execution. Debug and understand AI decisions.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: <GitBranch className="w-6 h-6" />,
    title: 'GitHub Integration',
    description: 'Seamless sync with your repositories. Agents commit directly to your codebase.',
    color: 'from-gray-500 to-slate-500',
  },
]

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [50, -50])
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0])

  return (
    <motion.div
      ref={cardRef}
      style={{ y, opacity }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10"
        style={{
          backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
        }}
      />
      <div className="glass rounded-2xl p-8 h-full transition-all duration-300 group-hover:border-white/20">
        <motion.div
          whileHover={{ rotate: 5, scale: 1.1 }}
          className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-6`}
        >
          {feature.icon}
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
        <p className="text-dark-400 leading-relaxed">{feature.description}</p>
      </div>
    </motion.div>
  )
}

export default function Features() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-brand-500/5 rounded-full blur-[200px]" />

      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6">
            <Zap className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-medium text-dark-300">
              Everything you need
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Built for{' '}
            <span className="gradient-text">Serious Development</span>
          </h2>
          <p className="text-xl text-dark-300 max-w-2xl mx-auto">
            Not just another AI coding tool. A complete orchestration platform for building production applications.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, Lightbulb, FileText, Search, Boxes, Wrench,
  Code2, TestTube, Rocket, BookOpen, RefreshCw, Sparkles
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  role: string
  provider: string
  providerColor: string
  icon: React.ReactNode
  lane: number
}

const agents: Agent[] = [
  { id: 'ceo', name: 'CEO CoPilot', role: 'Executive Supervisor', provider: 'GPT-4', providerColor: 'text-green-400', icon: <Brain className="w-5 h-5" />, lane: 0 },
  { id: 'strategy', name: 'Strategy Agent', role: 'Product Strategy', provider: 'GPT-4', providerColor: 'text-green-400', icon: <Lightbulb className="w-5 h-5" />, lane: 0 },
  { id: 'prd', name: 'PRD Agent', role: 'Requirements', provider: 'GPT-4', providerColor: 'text-green-400', icon: <FileText className="w-5 h-5" />, lane: 1 },
  { id: 'research', name: 'Research Agent', role: 'Analysis', provider: 'GPT-4', providerColor: 'text-green-400', icon: <Search className="w-5 h-5" />, lane: 2 },
  { id: 'architect', name: 'Architect Agent', role: 'System Design', provider: 'Claude', providerColor: 'text-orange-400', icon: <Boxes className="w-5 h-5" />, lane: 3 },
  { id: 'devops', name: 'DevOps Agent', role: 'Infrastructure', provider: 'Claude', providerColor: 'text-orange-400', icon: <Wrench className="w-5 h-5" />, lane: 5 },
  { id: 'dev', name: 'Dev Agent', role: 'Implementation', provider: 'Claude', providerColor: 'text-orange-400', icon: <Code2 className="w-5 h-5" />, lane: 6 },
  { id: 'qa', name: 'QA Agent', role: 'Quality Assurance', provider: 'Claude', providerColor: 'text-orange-400', icon: <TestTube className="w-5 h-5" />, lane: 7 },
  { id: 'deploy', name: 'Deploy Agent', role: 'Production', provider: 'Claude', providerColor: 'text-orange-400', icon: <Rocket className="w-5 h-5" />, lane: 8 },
  { id: 'docs', name: 'Docs Agent', role: 'Documentation', provider: 'GPT-4', providerColor: 'text-green-400', icon: <BookOpen className="w-5 h-5" />, lane: 9 },
  { id: 'refactor', name: 'Refactor Agent', role: 'Optimization', provider: 'Claude', providerColor: 'text-orange-400', icon: <RefreshCw className="w-5 h-5" />, lane: 10 },
]

export default function AgentWorkflow() {
  const [activeAgent, setActiveAgent] = useState(0)
  const [particles, setParticles] = useState<{ id: number; x: number; progress: number }[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAgent((prev) => (prev + 1) % agents.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({ ...p, progress: p.progress + 0.02 }))
          .filter((p) => p.progress < 1)

        if (Math.random() > 0.7) {
          updated.push({
            id: Date.now(),
            x: Math.random() * 100,
            progress: 0,
          })
        }

        return updated
      })
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0">
        <svg className="w-full h-full opacity-10">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-dark-600" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

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
              Multi-Provider Intelligence
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            The Right Agent for{' '}
            <span className="gradient-text">Every Task</span>
          </h2>
          <p className="text-xl text-dark-300 max-w-2xl mx-auto">
            GPT-4 for strategy. Claude for code. Each agent uses the best LLM for its specialty.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-brand-500/50 to-transparent">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-2 h-2 -left-[3px] rounded-full bg-brand-400"
                style={{
                  top: `${particle.progress * 100}%`,
                  opacity: 1 - particle.progress,
                }}
              />
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -4 }}
                  className={`p-6 rounded-2xl transition-all duration-300 ${
                    activeAgent === index
                      ? 'glass border-brand-500/50 shadow-lg shadow-brand-500/10'
                      : 'glass'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <motion.div
                      animate={activeAgent === index ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.5, repeat: activeAgent === index ? Infinity : 0 }}
                      className={`p-3 rounded-xl ${
                        activeAgent === index
                          ? 'bg-gradient-to-br from-brand-500 to-purple-500'
                          : 'bg-dark-800'
                      }`}
                    >
                      {agent.icon}
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{agent.name}</h3>
                        <span className={`text-xs font-medium ${agent.providerColor}`}>
                          {agent.provider}
                        </span>
                      </div>
                      <p className="text-sm text-dark-400 mb-2">{agent.role}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-dark-800 text-dark-300">
                          Lane {agent.lane}
                        </span>
                        {activeAgent === index && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-xs px-2 py-1 rounded-full bg-brand-500/20 text-brand-400"
                          >
                            Active
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${
                    activeAgent === index
                      ? 'bg-brand-500 border-brand-400'
                      : 'bg-dark-800 border-dark-600'
                  } ${index % 2 === 0 ? 'right-0 md:-right-2' : 'left-0 md:-left-2'} hidden md:block`}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

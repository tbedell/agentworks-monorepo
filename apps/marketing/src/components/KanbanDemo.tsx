import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lightbulb, FileText, Search, Boxes, Code2, TestTube, 
  Rocket, CheckCircle2, Loader2,
  Bot, Zap
} from 'lucide-react'

interface Card {
  id: string
  title: string
  lane: number
  status: 'pending' | 'active' | 'done'
  agent?: string
  provider?: string
}

interface Lane {
  id: number
  name: string
  icon: React.ReactNode
  color: string
}

const lanes: Lane[] = [
  { id: 0, name: 'Vision', icon: <Lightbulb className="w-4 h-4" />, color: 'from-yellow-500 to-orange-500' },
  { id: 1, name: 'PRD', icon: <FileText className="w-4 h-4" />, color: 'from-blue-500 to-cyan-500' },
  { id: 2, name: 'Research', icon: <Search className="w-4 h-4" />, color: 'from-purple-500 to-pink-500' },
  { id: 3, name: 'Architect', icon: <Boxes className="w-4 h-4" />, color: 'from-green-500 to-emerald-500' },
  { id: 4, name: 'Build', icon: <Code2 className="w-4 h-4" />, color: 'from-brand-500 to-purple-500' },
  { id: 5, name: 'Test', icon: <TestTube className="w-4 h-4" />, color: 'from-red-500 to-rose-500' },
  { id: 6, name: 'Deploy', icon: <Rocket className="w-4 h-4" />, color: 'from-teal-500 to-cyan-500' },
]

const agents = [
  { name: 'CEO CoPilot', provider: 'GPT-4' },
  { name: 'Strategy Agent', provider: 'GPT-4' },
  { name: 'PRD Agent', provider: 'GPT-4' },
  { name: 'Research Agent', provider: 'GPT-4' },
  { name: 'Architect Agent', provider: 'Claude' },
  { name: 'Dev Agent', provider: 'Claude' },
  { name: 'QA Agent', provider: 'Claude' },
  { name: 'Deploy Agent', provider: 'Claude' },
]

const initialCards: Card[] = [
  { id: '1', title: 'User Authentication', lane: 0, status: 'done', agent: 'CEO CoPilot', provider: 'GPT-4' },
  { id: '2', title: 'Dashboard UI', lane: 0, status: 'done', agent: 'Strategy Agent', provider: 'GPT-4' },
  { id: '3', title: 'API Integration', lane: 1, status: 'active', agent: 'PRD Agent', provider: 'GPT-4' },
  { id: '4', title: 'Database Schema', lane: 2, status: 'pending' },
  { id: '5', title: 'Payment Flow', lane: 0, status: 'done', agent: 'CEO CoPilot', provider: 'GPT-4' },
]

export default function KanbanDemo() {
  const [cards, setCards] = useState<Card[]>(initialCards)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setCards((prevCards) => {
        const pendingCards = prevCards.filter(c => c.status === 'pending' || c.status === 'active')
        if (pendingCards.length === 0) {
          return initialCards.map(c => ({ ...c, lane: 0, status: 'pending' as const }))
        }

        const activeCard = prevCards.find(c => c.status === 'active')
        if (activeCard) {
          const agent = agents[Math.min(activeCard.lane, agents.length - 1)]
          setActiveAgent(agent.name)

          if (activeCard.lane < lanes.length - 1) {
            return prevCards.map(c =>
              c.id === activeCard.id
                ? { ...c, lane: c.lane + 1, agent: agent.name, provider: agent.provider }
                : c
            )
          } else {
            return prevCards.map(c =>
              c.id === activeCard.id ? { ...c, status: 'done' as const } : c
            )
          }
        }

        const firstPending = prevCards.find(c => c.status === 'pending')
        if (firstPending) {
          const agent = agents[0]
          setActiveAgent(agent.name)
          return prevCards.map(c =>
            c.id === firstPending.id
              ? { ...c, status: 'active' as const, agent: agent.name, provider: agent.provider }
              : c
          )
        }

        return prevCards
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-950/50 to-transparent" />

      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Watch Your Ideas{' '}
            <span className="gradient-text">Flow Through Lanes</span>
          </h2>
          <p className="text-xl text-dark-300 max-w-2xl mx-auto">
            Every feature card moves through specialist agents, each optimized for their lane.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-xl" />

          <div className="relative glass rounded-2xl p-6 overflow-x-auto">
            <div className="flex items-center gap-2 mb-6">
              <Bot className="w-5 h-5 text-brand-400" />
              <span className="text-sm text-dark-300">
                Active Agent:{' '}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={activeAgent}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-white font-medium"
                  >
                    {activeAgent || 'Waiting...'}
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>

            <div className="flex gap-4 min-w-max">
              {lanes.map((lane, laneIndex) => (
                <motion.div
                  key={lane.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: laneIndex * 0.1 }}
                  className="w-48 flex-shrink-0"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${lane.color}`}>
                      {lane.icon}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">Lane {lane.id}</span>
                      <span className="text-xs text-dark-400 block">{lane.name}</span>
                    </div>
                  </div>

                  <div className="space-y-3 min-h-[200px]">
                    <AnimatePresence mode="popLayout">
                      {cards
                        .filter((card) => card.lane === lane.id)
                        .map((card) => (
                          <motion.div
                            key={card.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -20 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            transition={{
                              type: 'spring',
                              stiffness: 300,
                              damping: 25,
                            }}
                            className={`p-4 rounded-xl border transition-all ${
                              card.status === 'active'
                                ? 'bg-brand-500/20 border-brand-500/50 shadow-lg shadow-brand-500/20'
                                : card.status === 'done'
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-dark-800/50 border-white/5'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="text-sm font-medium text-white">
                                {card.title}
                              </span>
                              {card.status === 'active' && (
                                <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                              )}
                              {card.status === 'done' && (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              )}
                            </div>
                            {card.agent && (
                              <div className="flex items-center gap-1 text-xs text-dark-400">
                                <Zap className="w-3 h-3" />
                                <span>{card.agent}</span>
                                <span className="text-dark-500">•</span>
                                <span className="text-brand-400">{card.provider}</span>
                              </div>
                            )}
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

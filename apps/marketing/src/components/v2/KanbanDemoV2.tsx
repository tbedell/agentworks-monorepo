import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, User, Clock } from 'lucide-react'

// Lane colors matching web app KanbanBoard.tsx
const lanes = [
  { id: 0, name: 'Vision', color: '#3B82F6', wipLimit: 3 },
  { id: 1, name: 'Frontend', color: '#10B981', wipLimit: 5 },
  { id: 2, name: 'Database', color: '#8B5CF6', wipLimit: 4 },
  { id: 3, name: 'Workflow', color: '#F59E0B', wipLimit: 4 },
  { id: 4, name: 'Test', color: '#EF4444', wipLimit: 6 },
  { id: 5, name: 'Deploy', color: '#06B6D4', wipLimit: 3 },
  { id: 6, name: 'Complete', color: '#6366F1', wipLimit: 10 },
]

// Card types matching web app styling
const cardTypes = {
  feature: { label: 'Feature', bg: 'bg-green-100', text: 'text-green-700' },
  bug: { label: 'Bug', bg: 'bg-red-100', text: 'text-red-700' },
  task: { label: 'Task', bg: 'bg-blue-100', text: 'text-blue-700' },
  epic: { label: 'Epic', bg: 'bg-purple-100', text: 'text-purple-700' },
}

const priorities = {
  low: { label: 'Low', bg: 'bg-slate-100', text: 'text-slate-600' },
  medium: { label: 'Med', bg: 'bg-blue-100', text: 'text-blue-600' },
  high: { label: 'High', bg: 'bg-orange-100', text: 'text-orange-600' },
  critical: { label: 'Crit', bg: 'bg-red-100', text: 'text-red-600' },
}

interface Card {
  id: string
  title: string
  type: keyof typeof cardTypes
  priority: keyof typeof priorities
  lane: number
  assignee: string
  agentActive?: boolean
}

// All cards start in Vision lane (lane 0) - as if project just started
const initialCards: Card[] = [
  { id: '1', title: 'User Auth Flow', type: 'feature', priority: 'high', lane: 0, assignee: 'Vision Agent', agentActive: true },
  { id: '2', title: 'DB Schema', type: 'task', priority: 'critical', lane: 0, assignee: 'Vision Agent' },
  { id: '3', title: 'API Rate Limit', type: 'feature', priority: 'medium', lane: 0, assignee: 'Vision Agent' },
  { id: '4', title: 'Login Bug Fix', type: 'bug', priority: 'high', lane: 0, assignee: 'Vision Agent' },
  { id: '5', title: 'Deploy Config', type: 'task', priority: 'medium', lane: 0, assignee: 'Vision Agent' },
]

function KanbanCard({ card, laneColor }: { card: Card; laneColor: string }) {
  const typeStyle = cardTypes[card.type]
  const priorityStyle = priorities[card.priority]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden"
      style={{ borderTopWidth: '3px', borderTopColor: laneColor }}
    >
      <div className="p-2">
        {/* Card Title */}
        <h4 className="text-xs font-medium text-slate-800 mb-1.5 line-clamp-1">
          {card.title}
        </h4>

        {/* Type and Priority Badges */}
        <div className="flex items-center gap-1 mb-2">
          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeStyle.bg} ${typeStyle.text}`}>
            {typeStyle.label}
          </span>
          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${priorityStyle.bg} ${priorityStyle.text}`}>
            {priorityStyle.label}
          </span>
        </div>

        {/* Footer: Agent Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {card.agentActive ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center"
              >
                <Bot className="w-3 h-3 text-blue-600" />
              </motion.div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-3 h-3 text-slate-500" />
              </div>
            )}
          </div>
          {card.agentActive && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-0.5 text-[10px] text-blue-600"
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Working</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function KanbanDemoV2() {
  const [cards, setCards] = useState(initialCards)

  // Simulate card movement animation - cards move from left to right
  useEffect(() => {
    const interval = setInterval(() => {
      setCards(prevCards => {
        const newCards = [...prevCards]

        // Find the card with the smallest lane that's not in Complete (6)
        const movableCards = newCards.filter(c => c.lane < 6).sort((a, b) => a.lane - b.lane)
        if (movableCards.length === 0) return prevCards

        // Move a card from the earliest lane first (prioritize left-to-right flow)
        const cardToMove = movableCards[0]
        const cardIndex = newCards.findIndex(c => c.id === cardToMove.id)

        if (cardIndex !== -1) {
          // Move card to next lane
          const nextLane = newCards[cardIndex].lane + 1
          newCards[cardIndex] = {
            ...newCards[cardIndex],
            lane: nextLane,
            agentActive: nextLane < 6,
            assignee: lanes[nextLane]?.name.replace('Complete', 'Done') + ' Agent' || 'Complete',
          }
        }

        return newCards
      })
    }, 2500)

    return () => clearInterval(interval)
  }, [])

  // Reset cards periodically to restart the demo
  useEffect(() => {
    const resetInterval = setInterval(() => {
      setCards(initialCards)
    }, 25000)

    return () => clearInterval(resetInterval)
  }, [])

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-slate-900 mb-3"
          >
            Visual Progress Tracking
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-slate-600 max-w-2xl mx-auto"
          >
            Watch AI agents move cards through your development pipeline in real-time.
          </motion.p>
        </div>

        {/* Kanban Board - All lanes fit in viewport */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-slate-50 rounded-xl p-4 border border-slate-200"
        >
          {/* CSS Grid - 7 equal columns that fit on screen */}
          <div className="grid grid-cols-7 gap-2">
            {lanes.map((lane) => {
              const laneCards = cards.filter(c => c.lane === lane.id)
              return (
                <div key={lane.id} className="min-w-0">
                  {/* Lane Header - Compact */}
                  <div className="flex items-center gap-1 mb-2 px-1">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: lane.color }}
                    >
                      {lane.id}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {lane.name}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-200 px-1 rounded flex-shrink-0">
                      {laneCards.length}
                    </span>
                  </div>

                  {/* Lane Content */}
                  <div
                    className="bg-slate-100/50 rounded-lg p-1.5 min-h-[220px] space-y-1.5"
                    style={{ borderTop: `2px solid ${lane.color}` }}
                  >
                    <AnimatePresence mode="popLayout">
                      {laneCards.map((card) => (
                        <KanbanCard
                          key={card.id}
                          card={card}
                          laneColor={lane.color}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-slate-500"
        >
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center"
            >
              <Bot className="w-2.5 h-2.5 text-blue-600" />
            </motion.div>
            <span>Agent Working</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="w-2.5 h-2.5 text-slate-500" />
            </div>
            <span>Awaiting Review</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

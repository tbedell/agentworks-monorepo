import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Calendar, Webhook, Filter, GitBranch, Clock, Bot, Globe, Bell, RefreshCw } from 'lucide-react'

// Workflow block types matching the actual app
const triggerBlocks = [
  { id: 'event', name: 'Event', icon: Zap, color: '#F59E0B' },
  { id: 'schedule', name: 'Schedule', icon: Calendar, color: '#8B5CF6' },
  { id: 'webhook', name: 'Webhook', icon: Webhook, color: '#3B82F6' },
]

const conditionBlocks = [
  { id: 'filter', name: 'Filter', icon: Filter, color: '#6366F1' },
  { id: 'branch', name: 'Branch', icon: GitBranch, color: '#EC4899' },
  { id: 'delay', name: 'Delay', icon: Clock, color: '#14B8A6' },
]

const actionBlocks = [
  { id: 'run_agent', name: 'Run Agent', icon: Bot, color: '#10B981' },
  { id: 'api_call', name: 'API Call', icon: Globe, color: '#3B82F6' },
  { id: 'notify', name: 'Notify', icon: Bell, color: '#F59E0B' },
  { id: 'update_card', name: 'Update Card', icon: RefreshCw, color: '#8B5CF6' },
]

interface WorkflowNode {
  id: string
  type: string
  name: string
  icon: typeof Zap
  color: string
  x: number
  y: number
}

// Animation sequence
const nodeSequence: WorkflowNode[] = [
  { id: '1', type: 'trigger', name: 'Card Created', icon: Zap, color: '#F59E0B', x: 60, y: 120 },
  { id: '2', type: 'condition', name: 'Is Feature?', icon: Filter, color: '#6366F1', x: 200, y: 120 },
  { id: '3', type: 'action', name: 'Run Agent', icon: Bot, color: '#10B981', x: 340, y: 120 },
  { id: '4', type: 'action', name: 'Notify Team', icon: Bell, color: '#F59E0B', x: 480, y: 120 },
]

function WorkflowNode({ node, index, isActive }: { node: WorkflowNode; index: number; isActive: boolean }) {
  const Icon = node.icon
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.3, type: 'spring', damping: 15 }}
      className="absolute flex flex-col items-center"
      style={{ left: node.x, top: node.y }}
    >
      <motion.div
        className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md border-2 ${
          isActive ? 'border-blue-400' : 'border-transparent'
        }`}
        style={{ backgroundColor: node.color + '20' }}
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        <Icon className="w-6 h-6" style={{ color: node.color }} />
      </motion.div>
      <span className="text-[10px] font-medium text-slate-600 mt-1.5 whitespace-nowrap">
        {node.name}
      </span>

      {/* Execution indicator */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500"
        />
      )}
    </motion.div>
  )
}

export default function WorkflowBuilderShowcase() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [activeNodeIndex, setActiveNodeIndex] = useState(-1)
  const [nodeIndex, setNodeIndex] = useState(0)

  // Build workflow animation
  useEffect(() => {
    if (nodeIndex >= nodeSequence.length) {
      // Start execution animation
      if (activeNodeIndex < nodes.length - 1) {
        const execTimeout = setTimeout(() => {
          setActiveNodeIndex(prev => prev + 1)
        }, 1000)
        return () => clearTimeout(execTimeout)
      } else {
        // Reset after completing
        const resetTimeout = setTimeout(() => {
          setNodes([])
          setNodeIndex(0)
          setActiveNodeIndex(-1)
        }, 3000)
        return () => clearTimeout(resetTimeout)
      }
    }

    const delay = nodeIndex === 0 ? 1500 : 1200

    const timeout = setTimeout(() => {
      setNodes(prev => [...prev, nodeSequence[nodeIndex]])
      setNodeIndex(prev => prev + 1)
    }, delay)

    return () => clearTimeout(timeout)
  }, [nodeIndex, activeNodeIndex, nodes.length])

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium mb-4"
          >
            <Zap className="w-4 h-4" />
            Workflow Builder
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-slate-900 mb-3"
          >
            Automate Your Development Pipeline
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-slate-600 max-w-2xl mx-auto"
          >
            Create powerful automations with a visual workflow builder. Connect triggers, conditions, and actions to orchestrate agents.
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
              Manual coordination of development tasks is time-consuming and error-prone. Teams lose productivity managing handoffs between stages.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <h4 className="font-semibold text-green-800 mb-2">Our Solution</h4>
            <p className="text-sm text-green-700">
              Visual workflow automation that triggers agents automatically. Cards move through your pipeline without manual intervention.
            </p>
          </div>
        </motion.div>

        {/* Workflow Builder Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto rounded-xl overflow-hidden shadow-xl border border-slate-200 bg-slate-50"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-slate-700">Workflow Canvas</span>
              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-medium">
                Automation Builder
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {nodes.length > 0 && activeNodeIndex >= 0 ? 'Running...' : nodes.length > 0 ? 'Ready' : 'Building...'}
              </span>
              <div className={`w-2 h-2 rounded-full ${
                activeNodeIndex >= 0 ? 'bg-green-500' : 'bg-slate-300'
              }`} />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex h-[350px]">
            {/* Blocks Sidebar */}
            <div className="w-44 bg-white border-r border-slate-200 p-3 overflow-y-auto">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Triggers
              </div>
              <div className="space-y-1 mb-4">
                {triggerBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 cursor-grab"
                  >
                    <block.icon className="w-3.5 h-3.5" style={{ color: block.color }} />
                    <span className="text-xs text-slate-700">{block.name}</span>
                  </div>
                ))}
              </div>

              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Conditions
              </div>
              <div className="space-y-1 mb-4">
                {conditionBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 cursor-grab"
                  >
                    <block.icon className="w-3.5 h-3.5" style={{ color: block.color }} />
                    <span className="text-xs text-slate-700">{block.name}</span>
                  </div>
                ))}
              </div>

              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Actions
              </div>
              <div className="space-y-1">
                {actionBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 cursor-grab"
                  >
                    <block.icon className="w-3.5 h-3.5" style={{ color: block.color }} />
                    <span className="text-xs text-slate-700">{block.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 p-6 relative overflow-hidden">
              {/* Grid Pattern */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />

              {/* Empty State */}
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <Zap className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No Workflows Yet</p>
                  <p className="text-xs mt-1">Drag blocks to create automations</p>
                </div>
              )}

              {/* Connection Lines */}
              <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                {nodes.map((node, idx) => {
                  if (idx === 0) return null
                  const prevNode = nodes[idx - 1]
                  const isConnectionActive = activeNodeIndex >= idx
                  return (
                    <motion.g key={`line-${idx}`}>
                      <motion.line
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.3 + 0.2, duration: 0.3 }}
                        x1={prevNode.x + 60}
                        y1={prevNode.y + 24}
                        x2={node.x}
                        y2={node.y + 24}
                        stroke={isConnectionActive ? '#10B981' : '#CBD5E1'}
                        strokeWidth="2"
                        strokeDasharray={isConnectionActive ? '0' : '4'}
                      />
                      <motion.circle
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isConnectionActive ? 1 : 0 }}
                        cx={(prevNode.x + 60 + node.x) / 2}
                        cy={node.y + 24}
                        r="4"
                        fill="#10B981"
                      />
                    </motion.g>
                  )
                })}
              </svg>

              {/* Workflow Nodes */}
              <AnimatePresence>
                {nodes.map((node, index) => (
                  <WorkflowNode
                    key={node.id}
                    node={node}
                    index={index}
                    isActive={activeNodeIndex === index}
                  />
                ))}
              </AnimatePresence>

              {/* Data Flow Animation */}
              {activeNodeIndex >= 0 && activeNodeIndex < nodes.length && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md border border-slate-200 p-3"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <RefreshCw className="w-3 h-3 text-green-500" />
                    </motion.div>
                    <span>Executing: {nodes[activeNodeIndex]?.name}</span>
                  </div>
                </motion.div>
              )}
            </div>
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
              title: 'Event-Driven',
              description: 'Trigger workflows on card creation, status change, or schedule.',
            },
            {
              title: 'Conditional Logic',
              description: 'Branch workflows based on card type, priority, or custom rules.',
            },
            {
              title: 'Agent Integration',
              description: 'Automatically run AI agents as part of your workflow.',
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

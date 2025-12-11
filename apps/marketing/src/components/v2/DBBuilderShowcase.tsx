import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, Plus, Key, Link2, Settings, Download, Bot } from 'lucide-react'

// Database table definitions
interface TableField {
  name: string
  type: string
  isPrimary?: boolean
  isRequired?: boolean
  isForeign?: boolean
  foreignRef?: string
}

interface TableDef {
  name: string
  fields: TableField[]
  color: string
}

const initialTables: TableDef[] = []

const tableSequence: TableDef[] = [
  {
    name: 'users',
    color: '#3B82F6',
    fields: [
      { name: 'id', type: 'uuid', isPrimary: true },
      { name: 'email', type: 'string', isRequired: true },
      { name: 'name', type: 'string' },
      { name: 'created_at', type: 'timestamp' },
    ],
  },
  {
    name: 'projects',
    color: '#10B981',
    fields: [
      { name: 'id', type: 'uuid', isPrimary: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'owner_id', type: 'uuid', isForeign: true, foreignRef: 'users' },
      { name: 'created_at', type: 'timestamp' },
    ],
  },
  {
    name: 'cards',
    color: '#8B5CF6',
    fields: [
      { name: 'id', type: 'uuid', isPrimary: true },
      { name: 'title', type: 'string', isRequired: true },
      { name: 'project_id', type: 'uuid', isForeign: true, foreignRef: 'projects' },
      { name: 'lane', type: 'integer' },
    ],
  },
]

function TableCard({ table, index }: { table: TableDef; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.2, type: 'spring', damping: 20 }}
      className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden w-48"
      style={{ borderTopWidth: '3px', borderTopColor: table.color }}
    >
      {/* Table Header */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5" style={{ color: table.color }} />
          <span className="text-xs font-semibold text-slate-700">{table.name}</span>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.2 + 0.3 }}
          className="w-2 h-2 rounded-full bg-green-400"
        />
      </div>

      {/* Fields */}
      <div className="p-2 space-y-1">
        {table.fields.map((field, fieldIdx) => (
          <motion.div
            key={field.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 + 0.1 * fieldIdx + 0.2 }}
            className="flex items-center justify-between px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              {field.isPrimary && <Key className="w-2.5 h-2.5 text-yellow-500" />}
              {field.isForeign && <Link2 className="w-2.5 h-2.5 text-blue-500" />}
              <span className="text-[10px] font-medium text-slate-700">{field.name}</span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">{field.type}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default function DBBuilderShowcase() {
  const [tables, setTables] = useState<TableDef[]>(initialTables)
  const [tableIndex, setTableIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  // Animate tables appearing one by one
  useEffect(() => {
    if (tableIndex >= tableSequence.length) {
      // Reset after completing
      const timeout = setTimeout(() => {
        setTables([])
        setTableIndex(0)
        setIsGenerating(false)
      }, 5000)
      return () => clearTimeout(timeout)
    }

    // Start generation animation
    if (tableIndex === 0 && tables.length === 0) {
      setIsGenerating(true)
      const startTimeout = setTimeout(() => {
        setIsGenerating(false)
        setTables([tableSequence[0]])
        setTableIndex(1)
      }, 1500)
      return () => clearTimeout(startTimeout)
    }

    // Add next table
    const timeout = setTimeout(() => {
      setTables(prev => [...prev, tableSequence[tableIndex]])
      setTableIndex(prev => prev + 1)
    }, 2000)

    return () => clearTimeout(timeout)
  }, [tableIndex, tables.length])

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-4"
          >
            <Database className="w-4 h-4" />
            DB Builder
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-slate-900 mb-3"
          >
            AI-Powered Database Design
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-slate-600 max-w-2xl mx-auto"
          >
            Describe your data needs in plain English. AI generates optimized schemas with proper relationships and indexes.
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
              Database design requires deep expertise. Poor schema decisions lead to performance issues and technical debt that's expensive to fix.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <h4 className="font-semibold text-green-800 mb-2">Our Solution</h4>
            <p className="text-sm text-green-700">
              AI architects analyze your Blueprint and PRD to generate normalized schemas with optimal indexes and relationships.
            </p>
          </div>
        </motion.div>

        {/* DB Builder Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto rounded-xl overflow-hidden shadow-xl border border-slate-200 bg-white"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Database Schema</span>
              <button className="px-2 py-1 rounded bg-blue-500 text-white text-xs flex items-center gap-1">
                <Plus className="w-3 h-3" />
                Add Table
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded hover:bg-slate-100">
                <Download className="w-4 h-4 text-slate-500" />
              </button>
              <button className="p-1.5 rounded hover:bg-slate-100">
                <Settings className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex h-[350px]">
            {/* Sidebar */}
            <div className="w-44 bg-slate-50 border-r border-slate-200 p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Tables
              </div>
              <div className="space-y-1">
                {tables.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center">
                    No tables defined yet
                  </div>
                ) : (
                  tables.map((table, idx) => (
                    <motion.div
                      key={table.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      <div className="w-2 h-2 rounded" style={{ backgroundColor: table.color }} />
                      <span className="text-xs font-medium text-slate-700">{table.name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{table.fields.length}</span>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                <button className="w-full text-xs text-slate-500 hover:text-slate-700 flex items-center gap-2 px-2 py-1.5">
                  <Download className="w-3 h-3" />
                  Export Schema
                </button>
                <button className="w-full text-xs text-slate-500 hover:text-slate-700 flex items-center gap-2 px-2 py-1.5">
                  <Settings className="w-3 h-3" />
                  Database Settings
                </button>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 p-6 relative overflow-hidden bg-slate-50/50">
              {/* Grid Pattern Background */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />

              {/* Empty State / Generating State */}
              {tables.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {isGenerating ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3"
                      >
                        <Bot className="w-6 h-6 text-blue-600" />
                      </motion.div>
                      <p className="text-sm text-slate-600 font-medium">Generating schema...</p>
                      <p className="text-xs text-slate-400 mt-1">Analyzing project requirements</p>
                    </motion.div>
                  ) : (
                    <div className="text-center text-slate-400">
                      <Database className="w-8 h-8 mb-2 mx-auto opacity-50" />
                      <p className="text-sm">No Database Schema Yet</p>
                      <p className="text-xs mt-1">Use CoPilot to generate your schema</p>
                      <button className="mt-3 px-3 py-1.5 bg-blue-500 text-white rounded text-xs flex items-center gap-1 mx-auto">
                        <Bot className="w-3 h-3" />
                        Open CoPilot
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tables Grid */}
              <div className="flex flex-wrap gap-4 relative z-10">
                <AnimatePresence>
                  {tables.map((table, index) => (
                    <TableCard key={table.name} table={table} index={index} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Relationship Lines (simplified) */}
              {tables.length >= 2 && (
                <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: '100%', height: '100%' }}>
                  {tables.length >= 2 && (
                    <motion.line
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.3 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      x1="200" y1="80"
                      x2="260" y2="80"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                  )}
                  {tables.length >= 3 && (
                    <motion.line
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.3 }}
                      transition={{ delay: 1.5, duration: 0.5 }}
                      x1="410" y1="80"
                      x2="470" y2="80"
                      stroke="#10B981"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                  )}
                </svg>
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
              title: 'Auto-Generated',
              description: 'AI creates schemas from your project requirements.',
            },
            {
              title: 'Smart Relations',
              description: 'Automatic foreign keys and indexes for performance.',
            },
            {
              title: 'Prisma Export',
              description: 'Export to Prisma schema for instant migrations.',
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

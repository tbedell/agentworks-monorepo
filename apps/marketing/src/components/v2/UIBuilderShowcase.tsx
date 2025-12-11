import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Monitor, Tablet, Smartphone, Save, Eye, Code, Layout, Square, Type, MousePointer, Table2, Layers } from 'lucide-react'

// Component library items
const components = [
  { id: 'container', name: 'Container', icon: Square, desc: 'Basic container' },
  { id: 'grid', name: 'Grid', icon: Layout, desc: 'Grid layout' },
  { id: 'button', name: 'Button', icon: MousePointer, desc: 'Interactive button' },
  { id: 'input', name: 'Input', icon: Type, desc: 'Text input field' },
  { id: 'card', name: 'Card', icon: Layers, desc: 'Content card' },
  { id: 'table', name: 'Table', icon: Table2, desc: 'Data table' },
]

// Simulated drag sequence
const dragSequence = [
  { component: 'card', targetX: 180, targetY: 80, delay: 0 },
  { component: 'input', targetX: 200, targetY: 140, delay: 3000 },
  { component: 'button', targetX: 200, targetY: 200, delay: 6000 },
]

export default function UIBuilderShowcase() {
  const [droppedComponents, setDroppedComponents] = useState<{ id: string; x: number; y: number }[]>([])
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [sequenceIndex, setSequenceIndex] = useState(0)

  // Run the drag animation sequence
  useEffect(() => {
    if (sequenceIndex >= dragSequence.length) {
      // Reset after completing sequence
      const timeout = setTimeout(() => {
        setDroppedComponents([])
        setSequenceIndex(0)
      }, 4000)
      return () => clearTimeout(timeout)
    }

    const seq = dragSequence[sequenceIndex]
    const delay = sequenceIndex === 0 ? 1500 : 2500

    // Start dragging
    const dragTimeout = setTimeout(() => {
      setDragging(seq.component)
      setDragPosition({ x: 20, y: components.findIndex(c => c.id === seq.component) * 50 + 80 })

      // Animate to target
      setTimeout(() => {
        setDragPosition({ x: seq.targetX, y: seq.targetY })
      }, 100)

      // Drop
      setTimeout(() => {
        setDroppedComponents(prev => [...prev, { id: seq.component, x: seq.targetX, y: seq.targetY }])
        setDragging(null)
        setSequenceIndex(prev => prev + 1)
      }, 800)
    }, delay)

    return () => clearTimeout(dragTimeout)
  }, [sequenceIndex])

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4"
          >
            <Layout className="w-4 h-4" />
            UI Builder
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-slate-900 mb-3"
          >
            Visual Interface Design
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-slate-600 max-w-2xl mx-auto"
          >
            Drag and drop components to build your UI. No coding required - AI agents generate production-ready React code.
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
              Building UIs from scratch requires extensive frontend expertise. Designers create mockups that developers struggle to implement accurately.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <h4 className="font-semibold text-green-800 mb-2">Our Solution</h4>
            <p className="text-sm text-green-700">
              Visual builder with real-time preview. AI agents convert your design to clean, responsive React components instantly.
            </p>
          </div>
        </motion.div>

        {/* UI Builder Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto rounded-xl overflow-hidden shadow-xl border border-slate-200 bg-slate-50"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">UI Builder</span>
              <div className="flex items-center gap-1 ml-4">
                <button className="p-1 rounded hover:bg-slate-100">
                  <motion.div whileHover={{ scale: 1.1 }}>
                    <Save className="w-4 h-4 text-slate-500" />
                  </motion.div>
                </button>
                <button className="p-1 rounded hover:bg-slate-100">
                  <Code className="w-4 h-4 text-slate-500" />
                </button>
                <button className="px-2 py-1 rounded bg-blue-500 text-white text-xs flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {[
                { id: 'desktop', icon: Monitor },
                { id: 'tablet', icon: Tablet },
                { id: 'mobile', icon: Smartphone },
              ].map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveDevice(id as typeof activeDevice)}
                  className={`p-1.5 rounded ${
                    activeDevice === id ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <Icon className={`w-4 h-4 ${activeDevice === id ? 'text-blue-500' : 'text-slate-400'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex h-[350px]">
            {/* Component Library Sidebar */}
            <div className="w-40 bg-white border-r border-slate-200 p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Components
              </div>
              <div className="space-y-1">
                {components.map((comp) => (
                  <motion.div
                    key={comp.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-grab hover:bg-slate-100 transition-colors ${
                      dragging === comp.id ? 'opacity-50' : ''
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <comp.icon className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-xs font-medium text-slate-700">{comp.name}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 p-4 relative overflow-hidden">
              {/* Browser Preview Frame */}
              <div className="bg-white rounded-lg shadow-lg border border-slate-200 h-full overflow-hidden">
                {/* Browser Bar */}
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded px-2 py-0.5 text-xs text-slate-400 text-center">
                    localhost:3010/ui-builder
                  </div>
                </div>

                {/* Canvas */}
                <div className="p-4 h-[calc(100%-36px)] relative bg-slate-50/50">
                  {/* Empty state */}
                  {droppedComponents.length === 0 && !dragging && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                      <Layout className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">Drag components here</p>
                    </div>
                  )}

                  {/* Dropped Components */}
                  <AnimatePresence>
                    {droppedComponents.map((comp, index) => {
                      const compDef = components.find(c => c.id === comp.id)
                      return (
                        <motion.div
                          key={`${comp.id}-${index}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute bg-white rounded border-2 border-blue-400 p-2 shadow-sm"
                          style={{ left: comp.x - 140, top: comp.y - 60 }}
                        >
                          {comp.id === 'card' && (
                            <div className="w-32 bg-slate-50 rounded p-2">
                              <div className="w-full h-12 bg-slate-200 rounded mb-2" />
                              <div className="h-2 bg-slate-300 rounded w-3/4 mb-1" />
                              <div className="h-2 bg-slate-200 rounded w-1/2" />
                            </div>
                          )}
                          {comp.id === 'input' && (
                            <div className="w-28">
                              <div className="text-[10px] text-slate-500 mb-1">Email</div>
                              <div className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-400 bg-white">
                                Enter email...
                              </div>
                            </div>
                          )}
                          {comp.id === 'button' && (
                            <button className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded font-medium">
                              Submit
                            </button>
                          )}
                          {!['card', 'input', 'button'].includes(comp.id) && (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              {compDef && <compDef.icon className="w-3 h-3" />}
                              {compDef?.name}
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Dragging Ghost */}
              <AnimatePresence>
                {dragging && (
                  <motion.div
                    initial={{ opacity: 0.8, scale: 0.9 }}
                    animate={{
                      opacity: 0.9,
                      scale: 1,
                      x: dragPosition.x,
                      y: dragPosition.y
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    className="absolute top-0 left-0 bg-blue-500 text-white px-3 py-1.5 rounded shadow-lg text-xs font-medium pointer-events-none z-50"
                  >
                    {components.find(c => c.id === dragging)?.name}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Properties Panel */}
            <div className="w-48 bg-white border-l border-slate-200 p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Properties
              </div>
              {droppedComponents.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Styles</label>
                    <select className="w-full text-xs border border-slate-200 rounded px-2 py-1">
                      <option>Default</option>
                      <option>Primary</option>
                      <option>Secondary</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Padding</label>
                    <input
                      type="range"
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      defaultValue={16}
                      min={0}
                      max={32}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Data Binding</label>
                    <div className="text-xs text-slate-400 bg-slate-50 rounded p-2 border border-dashed border-slate-300">
                      Connect to API...
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-8">
                  Select a component to edit properties
                </div>
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
              title: 'Drag & Drop',
              description: 'Build interfaces visually without writing code.',
            },
            {
              title: 'Responsive Preview',
              description: 'Test on desktop, tablet, and mobile instantly.',
            },
            {
              title: 'Code Generation',
              description: 'Export clean React/TypeScript components.',
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

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// Terminal color scheme matching web app XTerminal.tsx
const terminalColors = {
  bg: '#1a1b26',
  toolbar: '#15161e',
  text: '#a9b1d6',
  info: '#64748b',
  warn: '#f59e0b',
  error: '#ef4444',
  debug: '#8b5cf6',
  success: '#22c55e',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  comment: '#565f89',
  string: '#9ece6a',
  keyword: '#bb9af7',
  function: '#7aa2f7',
  prompt: '#22c55e',
  promptPath: '#3b82f6',
}

// Tabs matching the actual app terminal
const tabs = ['Details', 'Agents', 'Terminal', 'Review', 'History', 'Context']

interface TerminalLine {
  id: number
  type: 'prompt' | 'command' | 'output' | 'success' | 'error' | 'info' | 'code'
  content: string
  delay?: number
}

// Script simulating realistic terminal interaction
const terminalScript: TerminalLine[] = [
  { id: 1, type: 'prompt', content: '', delay: 0 },
  { id: 2, type: 'command', content: 'cd /project && npm run dev', delay: 500 },
  { id: 3, type: 'output', content: '', delay: 1000 },
  { id: 4, type: 'info', content: '  VITE v5.0.0  ready in 312ms', delay: 1200 },
  { id: 5, type: 'output', content: '', delay: 1400 },
  { id: 6, type: 'info', content: '  > Local:   http://localhost:5173/', delay: 1600 },
  { id: 7, type: 'info', content: '  > Network: http://192.168.1.100:5173/', delay: 1800 },
  { id: 8, type: 'output', content: '', delay: 2200 },
  { id: 9, type: 'success', content: '[CoPilot] Analyzing card context...', delay: 2500 },
  { id: 10, type: 'info', content: '  Card: "User Authentication Flow"', delay: 2800 },
  { id: 11, type: 'info', content: '  Type: Feature | Priority: High', delay: 3000 },
  { id: 12, type: 'output', content: '', delay: 3400 },
  { id: 13, type: 'success', content: '[Frontend Agent] Generating component...', delay: 3600 },
  { id: 14, type: 'info', content: '  Creating src/components/auth/LoginForm.tsx', delay: 4000 },
  { id: 15, type: 'code', content: "import { useState } from 'react'", delay: 4400 },
  { id: 16, type: 'code', content: "import { useAuth } from '@/hooks/useAuth'", delay: 4600 },
  { id: 17, type: 'code', content: '', delay: 4800 },
  { id: 18, type: 'code', content: 'export function LoginForm() {', delay: 5000 },
  { id: 19, type: 'code', content: "  const [email, setEmail] = useState('')", delay: 5200 },
  { id: 20, type: 'code', content: '  const { login, isLoading } = useAuth()', delay: 5400 },
  { id: 21, type: 'code', content: '  // ...', delay: 5600 },
  { id: 22, type: 'code', content: '}', delay: 5800 },
  { id: 23, type: 'output', content: '', delay: 6200 },
  { id: 24, type: 'success', content: '[SUCCESS] Component created', delay: 6400 },
  { id: 25, type: 'output', content: '', delay: 6800 },
  { id: 26, type: 'success', content: '[QA Agent] Running tests...', delay: 7000 },
  { id: 27, type: 'info', content: '  PASS  LoginForm.test.tsx (3 tests)', delay: 7400 },
  { id: 28, type: 'success', content: '[COMPLETE] All tests passed', delay: 7800 },
]

function PromptLine() {
  return (
    <span>
      <span style={{ color: terminalColors.prompt }}>user@agentworks</span>
      <span style={{ color: terminalColors.text }}>:</span>
      <span style={{ color: terminalColors.promptPath }}>~/project</span>
      <span style={{ color: terminalColors.text }}>$ </span>
    </span>
  )
}

function getLineColor(type: TerminalLine['type']): string {
  switch (type) {
    case 'success': return terminalColors.success
    case 'error': return terminalColors.error
    case 'info': return terminalColors.info
    case 'code': return terminalColors.string
    case 'command': return terminalColors.text
    default: return terminalColors.text
  }
}

function formatCodeLine(content: string): JSX.Element {
  const keywords = ['import', 'export', 'function', 'const', 'let', 'var', 'from', 'return', 'async', 'await']
  const parts = content.split(/(\s+)/)

  return (
    <>
      {parts.map((part, i) => {
        if (keywords.includes(part)) {
          return <span key={i} style={{ color: terminalColors.keyword }}>{part}</span>
        }
        if (part.startsWith("'") || part.startsWith('"') || part.startsWith('`')) {
          return <span key={i} style={{ color: terminalColors.string }}>{part}</span>
        }
        if (part.startsWith('@')) {
          return <span key={i} style={{ color: terminalColors.cyan }}>{part}</span>
        }
        if (part.includes('(') || part.includes(')')) {
          return <span key={i} style={{ color: terminalColors.function }}>{part}</span>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default function TerminalDemoV2() {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('Terminal')
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentIndex >= terminalScript.length) {
      // Reset after completing
      const timeout = setTimeout(() => {
        setLines([])
        setCurrentIndex(0)
      }, 4000)
      return () => clearTimeout(timeout)
    }

    const line = terminalScript[currentIndex]
    const delay = line.delay || 500

    const timeout = setTimeout(() => {
      setLines(prev => [...prev, line])
      setCurrentIndex(prev => prev + 1)
    }, currentIndex === 0 ? 1000 : delay - (terminalScript[currentIndex - 1]?.delay || 0))

    return () => clearTimeout(timeout)
  }, [currentIndex])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-slate-900 mb-3"
          >
            Watch AI Write Code
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base text-slate-600 max-w-2xl mx-auto"
          >
            Real-time terminal output shows exactly what each agent is doing.
          </motion.p>
        </div>

        {/* Terminal Window */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-slate-700"
        >
          {/* Tab Bar - Matching actual app */}
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ backgroundColor: terminalColors.toolbar }}
          >
            {/* Left: Connection Status */}
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-green-500"
              />
              <span className="text-xs text-slate-400">Connected</span>
            </div>

            {/* Center: Tabs */}
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    tab === activeTab
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Right: Clear Button */}
            <button className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
              Clear
            </button>
          </div>

          {/* Terminal Content */}
          <div
            ref={terminalRef}
            className="p-4 h-[350px] overflow-y-auto font-mono text-sm"
            style={{ backgroundColor: terminalColors.bg }}
          >
            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="leading-relaxed"
                style={{ color: getLineColor(line.type) }}
              >
                {line.type === 'prompt' ? (
                  <PromptLine />
                ) : line.type === 'command' ? (
                  <>
                    <PromptLine />
                    <span>{line.content}</span>
                  </>
                ) : line.type === 'code' ? (
                  <span className="pl-4">{formatCodeLine(line.content)}</span>
                ) : (
                  <span>{line.content}</span>
                )}
              </motion.div>
            ))}

            {/* Cursor */}
            {currentIndex < terminalScript.length && (
              <div className="flex items-center">
                <PromptLine />
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block w-2 h-4 ml-0.5"
                  style={{ backgroundColor: terminalColors.text }}
                />
              </div>
            )}
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
              title: 'Real-Time Output',
              description: 'See every command and file creation as it happens.',
            },
            {
              title: 'Full Transparency',
              description: 'No black boxes. Every agent action is visible.',
            },
            {
              title: 'Instant Replay',
              description: 'Review any session to understand what was built.',
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

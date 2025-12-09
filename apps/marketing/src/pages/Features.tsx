import { motion } from 'framer-motion'
import { 
  Layers, Bot, Terminal,
  Lightbulb, FileText, Search, Boxes, Code2, TestTube, Rocket, BookOpen,
  RefreshCw, Zap, ArrowRight
} from 'lucide-react'

const lanes = [
  { id: 0, name: 'Vision & CoPilot', icon: <Lightbulb />, agents: ['CEO CoPilot', 'Strategy Agent', 'Storyboard Agent'], description: 'Define your Blueprint through guided Q&A. Transform vision into actionable strategy.' },
  { id: 1, name: 'PRD & MVP', icon: <FileText />, agents: ['PRD Agent', 'MVP Scope Agent'], description: 'Generate comprehensive requirements and define your minimal viable product.' },
  { id: 2, name: 'Research', icon: <Search />, agents: ['Research Agent'], description: 'Competitive analysis, technology research, and pattern investigation.' },
  { id: 3, name: 'Architecture', icon: <Boxes />, agents: ['Architect Agent'], description: 'Design system architecture, choose tech stack, define interfaces.' },
  { id: 4, name: 'Planning', icon: <Layers />, agents: ['Planner Agent'], description: 'Break features into dev-sized tasks with dependencies and acceptance criteria.' },
  { id: 5, name: 'Scaffolding', icon: <Terminal />, agents: ['DevOps Agent'], description: 'Infrastructure-as-code, CI/CD, Docker configs, deployment setup.' },
  { id: 6, name: 'Build', icon: <Code2 />, agents: ['Dev Agent - Backend', 'Dev Agent - Frontend'], description: 'Implement APIs, services, React components, and state management.' },
  { id: 7, name: 'Test & QA', icon: <TestTube />, agents: ['QA Agent', 'Troubleshooter Agent'], description: 'Generate test plans, E2E tests, debug failures, classify bugs.' },
  { id: 8, name: 'Deploy', icon: <Rocket />, agents: ['Deployment Agent'], description: 'Production deployment, monitoring setup, health checks.' },
  { id: 9, name: 'Documentation', icon: <BookOpen />, agents: ['Documentation Agent'], description: 'User guides, API docs, runbooks, and training materials.' },
  { id: 10, name: 'Optimize', icon: <RefreshCw />, agents: ['Refactor Agent'], description: 'Code quality improvements, performance optimization, tech debt reduction.' },
]

export default function Features() {
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
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6">
            <Zap className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-medium text-dark-300">
              11 Lanes. 11+ Agents. One Blueprint.
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            The Complete{' '}
            <span className="gradient-text">Development Pipeline</span>
          </h1>
          <p className="text-xl text-dark-300 max-w-3xl mx-auto">
            Every lane has specialist agents optimized for that stage of development. 
            From vision to optimization, your project flows through a visual production line.
          </p>
        </motion.div>

        <div className="space-y-6">
          {lanes.map((lane, index) => (
            <motion.div
              key={lane.id}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className="glass rounded-2xl p-8 group"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white">
                    {lane.icon}
                  </div>
                  <div>
                    <span className="text-sm text-brand-400 font-medium">Lane {lane.id}</span>
                    <h3 className="text-xl font-bold text-white">{lane.name}</h3>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-dark-300 mb-4">{lane.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {lane.agents.map((agent) => (
                      <span
                        key={agent}
                        className="px-3 py-1.5 rounded-full bg-dark-800 text-sm text-dark-300 flex items-center gap-2"
                      >
                        <Bot className="w-3 h-3 text-brand-400" />
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>

                <ArrowRight className="w-6 h-6 text-dark-600 hidden md:block group-hover:text-brand-400 group-hover:translate-x-2 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary text-lg"
          >
            Start Your First Blueprint
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  )
}

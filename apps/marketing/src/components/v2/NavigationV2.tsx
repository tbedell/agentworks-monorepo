import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, Sparkles, ChevronDown,
  Kanban, Terminal, Palette, Database, Zap, Bot, BarChart2
} from 'lucide-react'

// Features for the mega dropdown
const features = [
  {
    name: 'Visual Tracking',
    description: 'Track progress through 11 lanes',
    icon: Kanban,
    href: '/features#kanban'
  },
  {
    name: 'Realtime Terminal',
    description: 'Watch agents execute live',
    icon: Terminal,
    href: '/features#terminal'
  },
  {
    name: 'Visual Design',
    description: 'Drag-drop UI builder',
    icon: Palette,
    href: '/features#design'
  },
  {
    name: 'Visual Database',
    description: 'AI-powered schema design',
    icon: Database,
    href: '/features#database'
  },
  {
    name: 'Visual Workflow',
    description: 'Automation pipeline builder',
    icon: Zap,
    href: '/features#workflow'
  },
  {
    name: 'Specialized Agents',
    description: '15 AI agents with provider mixing',
    icon: Bot,
    href: '/features#agents'
  },
  {
    name: 'Usage & Analytics',
    description: 'Track costs and performance',
    icon: BarChart2,
    href: '/features#analytics'
  },
]

const navLinks = [
  { name: 'Pricing', href: '/pricing' },
  { name: 'Compare', href: '/compare' },
  { name: 'BYOA', href: '/byoa' },
]

export default function NavigationV2() {
  const [isOpen, setIsOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const location = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-800">AgentWorks</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Features Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setFeaturesOpen(true)}
              onMouseLeave={() => setFeaturesOpen(false)}
            >
              <button
                className="flex items-center gap-1 text-base font-medium text-slate-600 hover:text-slate-900 transition-colors py-2"
              >
                Features
                <ChevronDown className={`w-4 h-4 transition-transform ${featuresOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mega Menu */}
              <AnimatePresence>
                {featuresOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-white shadow-xl rounded-xl border border-slate-200 p-6 mt-2"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {features.map((feature) => (
                        <Link
                          key={feature.name}
                          to={feature.href}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                            <feature.icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{feature.name}</div>
                            <div className="text-sm text-slate-500">{feature.description}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <Link
                        to="/features"
                        className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View all features
                        <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Other Nav Links */}
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`text-base font-medium transition-colors ${
                  location.pathname === link.href
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="px-5 py-2.5 text-base font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 text-base font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200"
          >
            <div className="px-4 py-4 space-y-2">
              {/* Features Section */}
              <div className="border-b border-slate-100 pb-3 mb-3">
                <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Features
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {features.map((feature) => (
                    <Link
                      key={feature.name}
                      to={feature.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      <feature.icon className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-slate-700">{feature.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Other Links */}
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg"
                >
                  {link.name}
                </Link>
              ))}

              {/* CTA */}
              <div className="mt-4 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-base font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-center"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-base font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg text-center"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Bot, Terminal, FileCode, GitBranch, Key, Zap, Settings, ArrowRight, Check, Shield, DollarSign, Code2 } from 'lucide-react'
import { NavigationV2, FooterV2 } from '../components/v2'

const providers = [
  {
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, GPT-4o-mini',
    color: '#10A37F',
    models: ['GPT-4 Turbo', 'GPT-4o', 'GPT-4o-mini', 'GPT-3.5 Turbo'],
  },
  {
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus',
    color: '#D4A27F',
    models: ['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3 Haiku'],
  },
  {
    name: 'Google AI',
    description: 'Gemini 1.5 Pro, Gemini 1.5 Flash',
    color: '#4285F4',
    models: ['Gemini 1.5 Pro', 'Gemini 1.5 Flash', 'Gemini 1.0 Pro'],
  },
]

const claudeCodeFeatures = [
  {
    icon: Terminal,
    title: 'Direct Terminal Access',
    description: 'Full command line control within your development environment.',
  },
  {
    icon: FileCode,
    title: 'File System Operations',
    description: 'Create, read, edit, and manage files across your entire project.',
  },
  {
    icon: GitBranch,
    title: 'Git Integration',
    description: 'Commit, branch, merge - full version control at your fingertips.',
  },
  {
    icon: Code2,
    title: 'Multi-File Editing',
    description: 'Make coordinated changes across multiple files simultaneously.',
  },
]

const benefits = [
  {
    icon: Shield,
    title: 'Full Control',
    description: 'Your API keys, your usage, your data. No middleman.',
  },
  {
    icon: DollarSign,
    title: 'Cost Transparency',
    description: 'Pay providers directly. See exactly what you spend.',
  },
  {
    icon: Settings,
    title: 'Custom Configuration',
    description: 'Fine-tune model parameters for each agent type.',
  },
]

export default function BYOA() {
  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationV2 />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-purple-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold mb-4"
          >
            <Bot className="w-4 h-4" />
            Bring Your Own Agent
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-slate-900 mb-4"
          >
            Your Agents, Your Keys, Your Control
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Connect Claude Code, configure your own API keys, and bring your preferred AI tools to AgentWorks.
          </motion.p>
        </div>
      </section>

      {/* Claude Code Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Terminal className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Claude Code</h2>
                  <p className="text-slate-500">Anthropic's AI coding assistant</p>
                </div>
              </div>

              <p className="text-lg text-slate-600 mb-8">
                Integrate Claude Code directly into your AgentWorks workflow. Get the power of Anthropic's most capable coding model with full terminal access, file operations, and git integration.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {claudeCodeFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-slate-50 rounded-lg"
                  >
                    <feature.icon className="w-6 h-6 text-purple-500 mb-2" />
                    <h3 className="font-semibold text-slate-800 text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-slate-500">{feature.description}</p>
                  </motion.div>
                ))}
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900">Seamless Integration</h4>
                    <p className="text-sm text-purple-700">
                      Claude Code works alongside AgentWorks' 15 specialized agents, enhancing your development workflow.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-slate-900 rounded-xl p-6 shadow-2xl"
            >
              {/* Terminal Header */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-400 text-sm ml-2">claude-code</span>
              </div>

              {/* Terminal Content */}
              <div className="font-mono text-sm space-y-2">
                <div className="text-green-400">$ claude</div>
                <div className="text-slate-300">Claude Code initialized...</div>
                <div className="text-slate-400">&gt; Analyzing your project structure</div>
                <div className="text-slate-400">&gt; Found 12 files in src/</div>
                <div className="text-blue-400">&gt; Ready for commands</div>
                <div className="text-slate-300 mt-4">
                  <span className="text-purple-400">You:</span> Create a new React component for user authentication
                </div>
                <div className="text-slate-300 mt-2">
                  <span className="text-green-400">Claude:</span> I'll create an AuthProvider component with login, logout, and session management...
                </div>
                <div className="text-slate-500 mt-2">
                  <span className="text-yellow-400">Creating:</span> src/components/AuthProvider.tsx
                </div>
                <div className="text-slate-500">
                  <span className="text-yellow-400">Creating:</span> src/hooks/useAuth.ts
                </div>
                <div className="text-slate-500">
                  <span className="text-yellow-400">Updating:</span> src/App.tsx
                </div>
                <div className="flex items-center gap-2 text-green-400 mt-4">
                  <Check className="w-4 h-4" />
                  <span>3 files modified successfully</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* API Keys Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-4"
            >
              <Key className="w-4 h-4" />
              Your Own API Keys
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
            >
              Configure Your Own Providers
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              Use your own API keys for full cost control and transparency. Mix and match providers across different agents.
            </motion.p>
          </div>

          {/* Provider Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {providers.map((provider, index) => (
              <motion.div
                key={provider.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: provider.color + '20' }}
                  >
                    <Zap className="w-5 h-5" style={{ color: provider.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{provider.name}</h3>
                    <p className="text-xs text-slate-500">{provider.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {provider.models.map((model) => (
                    <div
                      key={model}
                      className="flex items-center gap-2 text-sm text-slate-600"
                    >
                      <Check className="w-4 h-4 text-green-500" />
                      {model}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6"
              >
                <div className="w-12 h-12 mx-auto rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-slate-500">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-slate-900 mb-4"
            >
              How BYOA Works
            </motion.h2>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '1',
                title: 'Connect Your API Keys',
                description: 'Add your OpenAI, Anthropic, or Google API keys in the project settings. Your keys are encrypted and stored securely.',
              },
              {
                step: '2',
                title: 'Configure Per-Agent',
                description: 'Assign different providers and models to each of the 15 agents. Use Claude for coding, GPT-4 for planning, Gemini for analysis.',
              },
              {
                step: '3',
                title: 'Monitor Usage',
                description: 'Track costs in real-time. See exactly which agent used which model and how much it cost.',
              },
              {
                step: '4',
                title: 'Optional: Connect Claude Code',
                description: 'Link your Claude Code installation for enhanced terminal-based development alongside your agents.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-purple-500 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-white mb-4"
          >
            Ready to Bring Your Own Agents?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-purple-100 mb-8"
          >
            Join the waitlist and be among the first to experience full BYOA support.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/waitlist"
              className="w-full sm:w-auto px-8 py-4 bg-white text-purple-600 font-medium rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            >
              Join the Waitlist
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto px-8 py-4 text-white border-2 border-white/30 hover:border-white/50 font-medium rounded-xl transition-colors"
            >
              View Pricing
            </Link>
          </motion.div>
        </div>
      </section>

      <FooterV2 />
    </div>
  )
}

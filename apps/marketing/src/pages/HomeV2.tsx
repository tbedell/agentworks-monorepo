import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Bot, Layers, Terminal, Zap, Shield, Clock, GitBranch, Cloud, Server, Code2 } from 'lucide-react'
import { NavigationV2, HeroV2, KanbanDemoV2, TerminalDemoV2, FooterV2 } from '../components/v2'
import UIBuilderShowcase from '../components/v2/UIBuilderShowcase'
import DBBuilderShowcase from '../components/v2/DBBuilderShowcase'
import WorkflowBuilderShowcase from '../components/v2/WorkflowBuilderShowcase'
import AgentsShowcase from '../components/v2/AgentsShowcase'
import UsageShowcase from '../components/v2/UsageShowcase'

const features = [
  {
    icon: Bot,
    title: '11 Specialist Agents',
    description: 'From vision to deployment, dedicated AI agents handle every stage of development.',
  },
  {
    icon: Layers,
    title: 'Visual Kanban Board',
    description: 'Watch your project progress through lanes with real-time card movements.',
  },
  {
    icon: Terminal,
    title: 'Live Terminal Output',
    description: 'See exactly what agents are doing with full transparency into every action.',
  },
  {
    icon: Zap,
    title: 'Multi-Provider LLMs',
    description: 'Mix OpenAI, Anthropic, and Google models for optimal performance.',
  },
  {
    icon: Shield,
    title: 'Production Ready',
    description: 'Generated code follows best practices with tests and documentation.',
  },
  {
    icon: Clock,
    title: 'Fast Iteration',
    description: 'From idea to deployed feature in hours, not weeks.',
  },
]

const benefits = [
  'Automated code generation with full test coverage',
  'Real-time progress tracking on visual Kanban',
  'Multiple AI providers for optimal results',
  'Full transparency into agent decisions',
  'Seamless deployment to production',
  'Detailed documentation auto-generated',
]

export default function HomeV2() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationV2 />

      {/* Hero Section */}
      <HeroV2 />

      {/* Kanban Demo Section */}
      <KanbanDemoV2 />

      {/* Terminal Demo Section */}
      <TerminalDemoV2 />

      {/* UI Builder Showcase */}
      <UIBuilderShowcase />

      {/* DB Builder Showcase */}
      <DBBuilderShowcase />

      {/* Workflow Builder Showcase */}
      <WorkflowBuilderShowcase />

      {/* Agents Showcase */}
      <AgentsShowcase />

      {/* Usage & Analytics Showcase */}
      <UsageShowcase />

      {/* Cloud Deployment Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold mb-4"
            >
              <GitBranch className="w-4 h-4" />
              Your GitHub, YOUR CODE!
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
            >
              Deploy to Your Favorite Cloud
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              AI agents automatically create deployment procedures. Push to GitHub, deploy anywhere. Your code stays in YOUR repository.
            </motion.p>
          </div>

          {/* Cloud Provider Logos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-12"
          >
            {[
              { name: 'AWS', color: '#FF9900' },
              { name: 'Google Cloud', color: '#4285F4' },
              { name: 'Azure', color: '#0078D4' },
            ].map((provider) => (
              <div
                key={provider.name}
                className="flex items-center gap-3 px-6 py-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <Cloud className="w-8 h-8" style={{ color: provider.color }} />
                <span className="text-lg font-semibold text-slate-700">{provider.name}</span>
              </div>
            ))}
          </motion.div>

          {/* Key Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          >
            {[
              { icon: GitBranch, title: 'Your Repository', description: 'Code stays in your GitHub' },
              { icon: Server, title: 'Auto Infrastructure', description: 'IaC generated automatically' },
              { icon: Code2, title: 'CI/CD Pipelines', description: 'Auto-configured workflows' },
              { icon: Cloud, title: 'One-Click Deploy', description: 'Push and go live' },
            ].map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-4"
              >
                <div className="w-12 h-12 mx-auto rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <benefit.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{benefit.title}</h3>
                <p className="text-sm text-slate-500">{benefit.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
            >
              Everything You Need to Ship Faster
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              A complete AI-powered development platform that handles the entire software lifecycle.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Ship Quality Software{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600">
                  10x Faster
                </span>
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                AgentWorks combines the power of multiple AI models with a visual project management
                system. Every line of code is traceable, testable, and production-ready.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">
                  Simple, Transparent Pricing
                </h3>
                <p className="text-slate-600 text-center mb-6">
                  Choose the plan that fits your needs. Scale as you grow.
                </p>

                {/* Monthly/Yearly Toggle */}
                <div className="flex justify-center items-center gap-2 mb-6">
                  <button
                    onClick={() => setIsYearly(false)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      !isYearly ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setIsYearly(true)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                      isYearly ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Yearly
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Save 20%
                    </span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">Starter</span>
                    <span className="font-bold text-slate-900">Free</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div>
                      <span className="text-slate-700">Pro</span>
                      <span className="text-xs text-blue-600 ml-2 bg-blue-100 px-2 py-0.5 rounded">Most Popular</span>
                    </div>
                    <span className="font-bold text-slate-900">{isYearly ? '$39' : '$49'}/mo</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">Enterprise</span>
                    <span className="font-bold text-slate-900">{isYearly ? '$159' : '$199'}/mo</span>
                  </div>
                </div>
                <Link
                  to="/waitlist"
                  className="mt-6 w-full px-6 py-4 text-lg font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Join the Waitlist
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <p className="text-xs text-slate-500 text-center mt-3">
                  <Link to="/pricing" className="text-blue-500 hover:underline">View full pricing details</Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-500 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Ready to Transform Your Development?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-blue-100 mb-8"
          >
            Join thousands of developers already building with AI agents.
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
              className="w-full sm:w-auto px-8 py-4 text-lg font-medium text-blue-600 bg-white hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Join the Waitlist
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/features"
              className="w-full sm:w-auto px-8 py-4 text-lg font-medium text-white border-2 border-white/30 hover:border-white/50 rounded-xl transition-colors"
            >
              Learn More
            </Link>
          </motion.div>
        </div>
      </section>

      <FooterV2 />
    </div>
  )
}

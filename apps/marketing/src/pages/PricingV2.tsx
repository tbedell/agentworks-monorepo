import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Check, ArrowRight, Bot, Key, Terminal, GitBranch, FileCode, Zap, HelpCircle } from 'lucide-react'
import { NavigationV2, FooterV2 } from '../components/v2'

const tiers = [
  {
    name: 'Starter',
    description: 'Perfect for exploring AgentWorks',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '3 projects',
      '5 agent runs per day',
      'Basic Kanban board',
      'Community support',
      '1 workspace member',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    description: 'For serious builders and small teams',
    monthlyPrice: 49,
    yearlyPrice: 39,
    features: [
      'Unlimited projects',
      '100 agent runs per day',
      'Full Kanban with all lanes',
      'CEO CoPilot access',
      'Multi-provider LLM mixing',
      'Priority support',
      '5 workspace members',
      'Usage analytics dashboard',
    ],
    cta: 'Join Waitlist',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'For teams that need more control',
    monthlyPrice: 199,
    yearlyPrice: 159,
    features: [
      'Everything in Pro',
      'Unlimited agent runs',
      'SSO & advanced security',
      'Custom agent configurations',
      'Dedicated support',
      'Unlimited workspace members',
      'SLA guarantee',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

const faqs = [
  {
    q: 'What counts as an "agent run"?',
    a: 'An agent run is a single execution of any AI agent in your project. For example, when the Architect agent designs your system or the Dev agent writes code, each execution counts as one run.',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes! You can change your plan at any time. When upgrading, you\'ll be prorated for the remaining period. When downgrading, the change takes effect at the next billing cycle.',
  },
  {
    q: 'What\'s included in the free tier?',
    a: 'The Starter tier includes access to all basic features: 3 projects, 5 agent runs per day, and the core Kanban board. It\'s perfect for trying out AgentWorks.',
  },
  {
    q: 'Do you offer discounts for startups?',
    a: 'Yes! We offer special pricing for early-stage startups. Contact us with your company details and we\'ll work out a plan that fits your needs.',
  },
]

export default function PricingV2() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationV2 />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-blue-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-slate-900 mb-4"
          >
            Simple, Transparent Pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-600 max-w-2xl mx-auto mb-8"
          >
            Choose the plan that fits your needs. All plans include core features. Scale as you grow.
          </motion.p>

          {/* Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center items-center gap-3"
          >
            <button
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                !isYearly ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                isYearly ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Yearly
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">
                Save 20%
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-2xl shadow-lg border-2 p-8 relative ${
                  tier.highlighted ? 'border-blue-500' : 'border-slate-200'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                <p className="text-slate-500 mb-6">{tier.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">
                    ${isYearly ? tier.yearlyPrice : tier.monthlyPrice}
                  </span>
                  {tier.monthlyPrice > 0 && (
                    <span className="text-slate-500">/month</span>
                  )}
                  {isYearly && tier.monthlyPrice > 0 && (
                    <div className="text-sm text-slate-400 line-through">
                      ${tier.monthlyPrice}/month
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/waitlist"
                  className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    tier.highlighted
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BYOA Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold mb-4"
            >
              <Bot className="w-4 h-4" />
              Bring Your Own Agent
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
            >
              Use Your Own AI Tools
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              Connect Claude Code, configure your own API keys, and bring your preferred AI tools to AgentWorks.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Claude Code Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Terminal className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Claude Code</h3>
                  <p className="text-slate-500">Anthropic's AI coding assistant</p>
                </div>
              </div>

              <p className="text-slate-600 mb-6">
                Integrate Claude Code directly into your AgentWorks workflow for powerful terminal-based development.
              </p>

              <ul className="space-y-3 mb-6">
                {[
                  { icon: Terminal, text: 'Direct terminal access' },
                  { icon: FileCode, text: 'File system operations' },
                  { icon: GitBranch, text: 'Git integration' },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-3 text-slate-600">
                    <item.icon className="w-4 h-4 text-purple-500" />
                    {item.text}
                  </li>
                ))}
              </ul>

              <Link
                to="/byoa"
                className="text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1"
              >
                Learn more about Claude Code
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* API Keys Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Key className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Your Own API Keys</h3>
                  <p className="text-slate-500">Full cost control</p>
                </div>
              </div>

              <p className="text-slate-600 mb-6">
                Configure your own provider keys for complete transparency and control over your AI costs.
              </p>

              <div className="flex items-center gap-4 mb-6">
                {[
                  { name: 'OpenAI', color: '#10A37F' },
                  { name: 'Anthropic', color: '#D4A27F' },
                  { name: 'Google', color: '#4285F4' },
                ].map((provider) => (
                  <div
                    key={provider.name}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg"
                  >
                    <Zap className="w-4 h-4" style={{ color: provider.color }} />
                    <span className="text-sm font-medium text-slate-700">{provider.name}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/byoa"
                className="text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
              >
                Configure your API keys
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          <div className="text-center mt-10">
            <Link
              to="/byoa"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
            >
              <Bot className="w-5 h-5" />
              Explore BYOA Options
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-slate-900 mb-4"
            >
              Frequently Asked Questions
            </motion.h2>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-50 rounded-xl p-6"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                    <p className="text-slate-600">{faq.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-blue-500 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-white mb-4"
          >
            Ready to Get Started?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-blue-100 mb-8"
          >
            Join the waitlist and be among the first to experience AI-powered development.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link
              to="/waitlist"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors"
            >
              Join the Waitlist
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <FooterV2 />
    </div>
  )
}

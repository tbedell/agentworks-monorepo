import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles, Zap } from 'lucide-react'

interface PricingTier {
  name: string
  description: string
  price: { monthly: number; yearly: number }
  features: string[]
  highlight?: boolean
  cta: string
}

const tiers: PricingTier[] = [
  {
    name: 'Starter',
    description: 'Perfect for side projects and learning',
    price: { monthly: 0, yearly: 0 },
    features: [
      '3 Projects',
      '5 Agent runs/day',
      'Basic Kanban board',
      'Community support',
      'Public projects only',
    ],
    cta: 'Get Started Free',
  },
  {
    name: 'Pro',
    description: 'For professional developers and teams',
    price: { monthly: 49, yearly: 39 },
    features: [
      'Unlimited projects',
      '100 Agent runs/day',
      'Full Kanban + 11 lanes',
      'CEO CoPilot oversight',
      'Provider mixing (GPT-4, Claude)',
      'Private projects',
      'Priority support',
      'Usage analytics',
    ],
    highlight: true,
    cta: 'Start Pro Trial',
  },
  {
    name: 'Enterprise',
    description: 'For organizations with advanced needs',
    price: { monthly: 199, yearly: 159 },
    features: [
      'Everything in Pro',
      'Unlimited agent runs',
      'Custom agent configurations',
      'SSO & SAML',
      'Audit logs',
      'Dedicated success manager',
      'SLA guarantee',
      'On-premise option',
    ],
    cta: 'Contact Sales',
  },
]

export default function PricingCards() {
  const [isYearly, setIsYearly] = useState(true)

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/30 to-transparent" />

      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-medium text-dark-300">
              Simple, transparent pricing
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Choose Your{' '}
            <span className="gradient-text">Plan</span>
          </h2>
          <p className="text-xl text-dark-300 max-w-2xl mx-auto mb-8">
            Start free, upgrade when you're ready. No hidden fees, cancel anytime.
          </p>

          <div className="inline-flex items-center gap-4 p-1.5 glass rounded-full">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? 'bg-white text-dark-900'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly
                  ? 'bg-white text-dark-900'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{
                y: -8,
                transition: { type: 'spring', stiffness: 300 },
              }}
              className={`relative rounded-2xl p-8 ${
                tier.highlight
                  ? 'bg-gradient-to-b from-brand-500/20 to-purple-500/10 border-2 border-brand-500/50'
                  : 'glass'
              }`}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {tier.highlight && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2"
                >
                  <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 text-sm font-medium text-white flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    Most Popular
                  </span>
                </motion.div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-dark-400 text-sm">{tier.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">
                    ${isYearly ? tier.price.yearly : tier.price.monthly}
                  </span>
                  {tier.price.monthly > 0 && (
                    <span className="text-dark-400">/month</span>
                  )}
                </div>
                {isYearly && tier.price.monthly > 0 && (
                  <p className="text-sm text-dark-500 mt-1">
                    Billed annually (${(isYearly ? tier.price.yearly : tier.price.monthly) * 12}/year)
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, i) => (
                  <motion.li
                    key={feature}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + i * 0.05 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-brand-400" />
                    </div>
                    <span className="text-sm text-dark-300">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-4 rounded-xl font-semibold transition-all ${
                  tier.highlight
                    ? 'bg-gradient-to-r from-brand-500 to-purple-500 text-white hover:shadow-lg hover:shadow-brand-500/25'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {tier.cta}
              </motion.button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-dark-400 text-sm">
            All plans include 14-day free trial. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'
import { Users, ArrowRight, Shuffle, Wallet, Sparkles, TrendingUp } from 'lucide-react'

interface RotatorExplainerProps {
  className?: string
}

export default function RotatorExplainer({ className = '' }: RotatorExplainerProps) {
  const steps = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Organic Traffic',
      description: 'Visitors discover AgentWorks through search, social, or direct visits',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Shuffle className="w-6 h-6" />,
      title: 'Round-Robin Rotator',
      description: 'Each signup is fairly distributed among founding members in rotation',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: <Wallet className="w-6 h-6" />,
      title: 'Your Referral',
      description: 'You get credited as the referrer without lifting a finger',
      color: 'from-green-500 to-emerald-500',
    },
  ]

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/20 border border-brand-500/30 mb-4"
        >
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-medium text-brand-400">Founding Member Exclusive</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          Earn from{' '}
          <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
            Every Organic Signup
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-dark-300 max-w-2xl mx-auto"
        >
          As a founding member, you're automatically enrolled in our rotator system.
          When anyone signs up without a referral code, you get credited - no marketing required.
        </motion.p>
      </div>

      {/* Flow Diagram */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        {/* Connection Lines (desktop) */}
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/0 via-purple-500/50 to-green-500/0 -translate-y-1/2 z-0" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative z-10">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="relative"
            >
              <div className="glass rounded-2xl p-6 h-full">
                {/* Step Number */}
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-dark-900 border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white mb-4`}>
                  {step.icon}
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-dark-400 text-sm">{step.description}</p>
              </div>

              {/* Arrow (between cards on mobile) */}
              {index < steps.length - 1 && (
                <div className="flex justify-center my-4 md:hidden">
                  <ArrowRight className="w-6 h-6 text-dark-600" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7 }}
        className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-brand-500/10 border border-brand-500/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-white">What This Means For You</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: 'Passive Income',
              description: 'Earn commissions without active marketing',
            },
            {
              title: 'Fair Distribution',
              description: 'Algorithm ensures equal opportunity for all founders',
            },
            {
              title: 'Lifetime Benefit',
              description: 'Your position in the rotator is permanent',
            },
          ].map((benefit) => (
            <div key={benefit.title} className="text-center">
              <p className="font-medium text-white text-sm">{benefit.title}</p>
              <p className="text-dark-400 text-xs mt-1">{benefit.description}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Visual Flow */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="mt-8 p-4 rounded-xl bg-dark-900/50 border border-white/5"
      >
        <p className="text-center text-sm text-dark-400 mb-3">How the rotator distributes leads</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium">
            Organic Visitor
          </div>
          <ArrowRight className="w-4 h-4 text-dark-600" />
          <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium">
            Rotator Queue
          </div>
          <ArrowRight className="w-4 h-4 text-dark-600" />
          <div className="flex gap-1">
            {['F1', 'F2', 'F3', '...'].map((founder, i) => (
              <motion.div
                key={founder}
                animate={i === 0 ? { scale: [1, 1.1, 1], borderColor: ['rgba(168,85,247,0.3)', 'rgba(168,85,247,0.8)', 'rgba(168,85,247,0.3)'] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  i === 0
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-dark-800 text-dark-400 border border-white/10'
                }`}
              >
                {founder}
              </motion.div>
            ))}
          </div>
        </div>
        <p className="text-center text-xs text-dark-500 mt-3">
          Founder 1 receives this signup, then moves to the back of the queue
        </p>
      </motion.div>
    </div>
  )
}

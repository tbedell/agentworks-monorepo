import { motion } from 'framer-motion'
import { Check, Diamond, Award, Medal, Zap } from 'lucide-react'

export interface FounderTier {
  id: string
  name: string
  icon: 'diamond' | 'award' | 'medal'
  price: number
  totalSpots: number
  remainingSpots: number
  apiCalls: number
  overageRate: number
  affiliateTier: string
  affiliateCommission: number
  saleBonus: number
  supportSla: string
  features: string[]
  highlight?: boolean
  badge?: string
}

interface FounderTierCardProps {
  tier: FounderTier
  index: number
  onSelect: (tier: FounderTier) => void
}

const iconMap = {
  diamond: Diamond,
  award: Award,
  medal: Medal,
}

const tierColors = {
  diamond: {
    bg: 'from-cyan-500/20 to-blue-500/10',
    border: 'border-cyan-500/50',
    icon: 'text-cyan-400',
    badge: 'bg-cyan-500',
  },
  award: {
    bg: 'from-yellow-500/20 to-amber-500/10',
    border: 'border-yellow-500/50',
    icon: 'text-yellow-400',
    badge: 'bg-yellow-500',
  },
  medal: {
    bg: 'from-gray-400/20 to-slate-500/10',
    border: 'border-gray-400/50',
    icon: 'text-gray-300',
    badge: 'bg-gray-400',
  },
}

export default function FounderTierCard({ tier, index, onSelect }: FounderTierCardProps) {
  const Icon = iconMap[tier.icon]
  const colors = tierColors[tier.icon]
  const spotsFilled = tier.totalSpots - tier.remainingSpots
  const percentFilled = (spotsFilled / tier.totalSpots) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, transition: { type: 'spring', stiffness: 300 } }}
      className={`relative rounded-2xl p-8 ${
        tier.highlight
          ? `bg-gradient-to-b ${colors.bg} border-2 ${colors.border}`
          : 'glass'
      }`}
    >
      {tier.badge && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-4 left-1/2 -translate-x-1/2"
        >
          <span className={`px-4 py-1.5 rounded-full ${colors.badge} text-sm font-medium text-white flex items-center gap-1`}>
            <Zap className="w-4 h-4" />
            {tier.badge}
          </span>
        </motion.div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-dark-800/50 flex items-center justify-center ${colors.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
          <p className="text-dark-400 text-sm">{tier.totalSpots} total spots</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">${tier.price}</span>
          <span className="text-dark-400">one-time</span>
        </div>
        <p className="text-sm text-green-400 mt-1">
          Lifetime access • Never pay again
        </p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-dark-400">{tier.remainingSpots} spots left</span>
          <span className="text-white font-medium">{percentFilled.toFixed(0)}% claimed</span>
        </div>
        <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${percentFilled}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 1 }}
            className={`h-full bg-gradient-to-r ${
              tier.icon === 'diamond' ? 'from-cyan-500 to-blue-500' :
              tier.icon === 'award' ? 'from-yellow-500 to-amber-500' :
              'from-gray-400 to-slate-500'
            }`}
          />
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between p-3 rounded-lg bg-dark-800/50">
          <span className="text-dark-300">Monthly API Calls</span>
          <span className="text-white font-bold">{tier.apiCalls.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-dark-800/50">
          <span className="text-dark-300">Extra Call Rate</span>
          <span className="text-green-400 font-bold">${tier.overageRate}/call</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-dark-800/50">
          <span className="text-dark-300">Affiliate Commission</span>
          <span className="text-brand-400 font-bold">{tier.affiliateCommission}%</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-dark-800/50">
          <span className="text-dark-300">Sale Bonus</span>
          <span className="text-yellow-400 font-bold">+${tier.saleBonus}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {tier.features.map((feature, i) => (
          <motion.li
            key={feature}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 + i * 0.05 }}
            className="flex items-start gap-3"
          >
            <div className={`w-5 h-5 rounded-full ${colors.icon.replace('text-', 'bg-')}/20 flex items-center justify-center flex-shrink-0 mt-0.5`}>
              <Check className={`w-3 h-3 ${colors.icon}`} />
            </div>
            <span className="text-sm text-dark-300">{feature}</span>
          </motion.li>
        ))}
      </ul>

      <motion.button
        onClick={() => onSelect(tier)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={tier.remainingSpots === 0}
        className={`w-full py-4 rounded-xl font-semibold transition-all ${
          tier.remainingSpots === 0
            ? 'bg-dark-700 text-dark-400 cursor-not-allowed'
            : tier.highlight
              ? `bg-gradient-to-r ${
                  tier.icon === 'diamond' ? 'from-cyan-500 to-blue-500' :
                  tier.icon === 'award' ? 'from-yellow-500 to-amber-500' :
                  'from-gray-400 to-slate-500'
                } text-white hover:shadow-lg`
              : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        {tier.remainingSpots === 0 ? 'Sold Out' : `Claim ${tier.name} Spot`}
      </motion.button>

      <p className="text-center text-xs text-dark-500 mt-4">
        vs. $49/mo regular price ({Math.ceil(tier.price / 49)} months to break even)
      </p>
    </motion.div>
  )
}

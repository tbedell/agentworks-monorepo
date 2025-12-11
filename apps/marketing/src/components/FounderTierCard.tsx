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
    bg: 'from-cyan-50 to-blue-50',
    border: 'border-cyan-300',
    icon: 'text-cyan-500',
    badge: 'bg-cyan-500',
    gradient: 'from-cyan-500 to-blue-500',
  },
  award: {
    bg: 'from-yellow-50 to-amber-50',
    border: 'border-yellow-300',
    icon: 'text-yellow-500',
    badge: 'bg-yellow-500',
    gradient: 'from-yellow-500 to-amber-500',
  },
  medal: {
    bg: 'from-slate-50 to-slate-100',
    border: 'border-slate-300',
    icon: 'text-slate-500',
    badge: 'bg-slate-500',
    gradient: 'from-slate-400 to-slate-500',
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
          ? `bg-gradient-to-b ${colors.bg} border-2 ${colors.border} shadow-lg`
          : 'bg-white border border-slate-200 shadow-lg'
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
        <div className={`w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center ${colors.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-900">{tier.name}</h3>
          <p className="text-slate-500 text-sm">{tier.totalSpots} total spots</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-slate-900">${tier.price}</span>
          <span className="text-slate-500">one-time</span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          Lifetime access - Never pay again
        </p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-500">{tier.remainingSpots} spots left</span>
          <span className="text-slate-900 font-medium">{percentFilled.toFixed(0)}% claimed</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${percentFilled}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 1 }}
            className={`h-full bg-gradient-to-r ${colors.gradient}`}
          />
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100">
          <span className="text-slate-600">Monthly API Calls</span>
          <span className="text-slate-900 font-bold">{tier.apiCalls.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100">
          <span className="text-slate-600">Extra Call Rate</span>
          <span className="text-green-600 font-bold">${tier.overageRate}/call</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100">
          <span className="text-slate-600">Affiliate Commission</span>
          <span className="text-blue-600 font-bold">{tier.affiliateCommission}%</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100">
          <span className="text-slate-600">Sale Bonus</span>
          <span className="text-yellow-600 font-bold">+${tier.saleBonus}</span>
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
            <span className="text-sm text-slate-600">{feature}</span>
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
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : tier.highlight
              ? `bg-gradient-to-r ${colors.gradient} text-white hover:shadow-lg`
              : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {tier.remainingSpots === 0 ? 'Sold Out' : `Claim ${tier.name} Spot`}
      </motion.button>

      <p className="text-center text-xs text-slate-400 mt-4">
        vs. $49/mo regular price ({Math.ceil(tier.price / 49)} months to break even)
      </p>
    </motion.div>
  )
}

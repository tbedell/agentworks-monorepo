import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, AlertTriangle } from 'lucide-react'

interface LaunchStats {
  isLive: boolean
  phase: string
  showSpotsRemaining: boolean
  spots: {
    total: number
    remaining: number
    sold: number
    percentSold: number
  } | null
  fomo: {
    milestone: number
    message: string
  } | null
  tiers: {
    tier: string
    name: string
    price: number
    available: boolean
    remainingSpots?: number
    soldOut: boolean
  }[]
}

interface LiveCounterProps {
  className?: string
  compact?: boolean
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010'

export default function LiveCounter({ className = '', compact = false }: LiveCounterProps) {
  const [stats, setStats] = useState<LaunchStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch launch stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/launch/stats`)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching launch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Poll every 10 seconds
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className={`animate-pulse bg-dark-800/50 rounded-xl p-4 ${className}`}>
        <div className="h-8 bg-dark-700 rounded w-32 mb-2" />
        <div className="h-4 bg-dark-700 rounded w-24" />
      </div>
    )
  }

  if (!stats?.showSpotsRemaining || !stats.spots) {
    return null
  }

  const { spots, fomo, tiers } = stats
  const urgencyLevel = spots.percentSold >= 90 ? 'critical' : spots.percentSold >= 75 ? 'warning' : 'normal'

  const urgencyColors = {
    normal: 'from-brand-500 to-purple-500',
    warning: 'from-yellow-500 to-orange-500',
    critical: 'from-red-500 to-pink-500',
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-3 px-4 py-2 rounded-full bg-dark-800/80 border border-white/10 ${className}`}
      >
        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${urgencyColors[urgencyLevel]} animate-pulse`} />
        <span className="text-sm font-medium text-white">
          <AnimatePresence mode="wait">
            <motion.span
              key={spots.remaining}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="inline-block"
            >
              {spots.remaining.toLocaleString()}
            </motion.span>
          </AnimatePresence>
          {' '}spots left
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass rounded-2xl p-6 ${className}`}
    >
      {/* FOMO Alert */}
      <AnimatePresence>
        {fomo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${urgencyColors[urgencyLevel]}/20 border border-${urgencyLevel === 'critical' ? 'red' : urgencyLevel === 'warning' ? 'yellow' : 'brand'}-500/30`}>
              <AlertTriangle className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-sm font-medium text-white">{fomo.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Counter */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Users className="w-5 h-5 text-brand-400" />
          <span className="text-sm font-medium text-dark-300">Founding Member Spots</span>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={spots.remaining}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="text-5xl font-bold text-white"
            >
              {spots.remaining.toLocaleString()}
            </motion.div>
          </AnimatePresence>
          <p className="text-dark-400 text-sm mt-1">
            of {spots.total.toLocaleString()} remaining
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-dark-400 mb-2">
          <span>{spots.sold.toLocaleString()} sold</span>
          <span>{spots.percentSold}% filled</span>
        </div>
        <div className="h-3 bg-dark-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${spots.percentSold}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${urgencyColors[urgencyLevel]} rounded-full`}
          />
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">By Tier</p>
        {tiers.map((tier) => (
          <div
            key={tier.tier}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              tier.soldOut
                ? 'bg-dark-800/30 border-dark-700 opacity-60'
                : 'bg-dark-800/50 border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                tier.tier === 'diamond' ? 'bg-cyan-500/20 text-cyan-400' :
                tier.tier === 'gold' ? 'bg-amber-500/20 text-amber-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {tier.tier.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-white text-sm">{tier.name}</p>
                <p className="text-xs text-dark-400">${tier.price}</p>
              </div>
            </div>
            <div className="text-right">
              {tier.soldOut ? (
                <span className="text-xs font-medium text-red-400 uppercase">Sold Out</span>
              ) : tier.remainingSpots !== undefined ? (
                <span className="text-sm font-medium text-brand-400">
                  {tier.remainingSpots} left
                </span>
              ) : (
                <span className="text-xs text-green-400">Available</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Live Indicator */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-dark-400">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-green-500"
        />
        Live counter - updates automatically
      </div>
    </motion.div>
  )
}

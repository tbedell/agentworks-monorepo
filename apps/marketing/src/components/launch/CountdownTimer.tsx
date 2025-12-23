import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Rocket, PartyPopper } from 'lucide-react'

interface CountdownData {
  enabled: boolean
  launchDate?: string
  timeToLaunch?: number
  isLive?: boolean
}

interface CountdownTimerProps {
  className?: string
  compact?: boolean
  onLaunch?: () => void
}

interface TimeUnit {
  value: number
  label: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010'

export default function CountdownTimer({ className = '', compact = false, onLaunch }: CountdownTimerProps) {
  const [countdown, setCountdown] = useState<CountdownData | null>(null)
  const [timeUnits, setTimeUnits] = useState<TimeUnit[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch countdown info
  const fetchCountdown = async () => {
    try {
      const res = await fetch(`${API_URL}/api/launch/countdown`)
      const data = await res.json()
      setCountdown(data)
    } catch (error) {
      console.error('Error fetching countdown:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCountdown()
  }, [])

  // Update countdown timer
  useEffect(() => {
    if (!countdown?.enabled || !countdown.timeToLaunch) return

    const updateTimer = () => {
      const now = Date.now()
      const launchTime = countdown.launchDate ? new Date(countdown.launchDate).getTime() : now
      const remaining = Math.max(0, launchTime - now)

      if (remaining <= 0) {
        setTimeUnits([
          { value: 0, label: 'days' },
          { value: 0, label: 'hours' },
          { value: 0, label: 'mins' },
          { value: 0, label: 'secs' },
        ])
        onLaunch?.()
        return
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((remaining % (1000 * 60)) / 1000)

      setTimeUnits([
        { value: days, label: 'days' },
        { value: hours, label: 'hours' },
        { value: mins, label: 'mins' },
        { value: secs, label: 'secs' },
      ])
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [countdown, onLaunch])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex gap-4 justify-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-16 h-20 bg-dark-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!countdown?.enabled) {
    return null
  }

  // Launch is live!
  if (countdown.isLive || (timeUnits.length > 0 && timeUnits.every(u => u.value === 0))) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`text-center ${className}`}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500"
        >
          <PartyPopper className="w-6 h-6 text-white" />
          <span className="text-xl font-bold text-white">Launch is LIVE!</span>
          <Rocket className="w-6 h-6 text-white" />
        </motion.div>
        <p className="text-dark-300 mt-3">Founding member spots available now</p>
      </motion.div>
    )
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800/80 border border-white/10 ${className}`}
      >
        <Clock className="w-4 h-4 text-brand-400" />
        <span className="text-sm font-mono text-white">
          {timeUnits.map((unit, i) => (
            <span key={unit.label}>
              {String(unit.value).padStart(2, '0')}
              {i < timeUnits.length - 1 && ':'}
            </span>
          ))}
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center ${className}`}
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-brand-400" />
        <span className="text-sm font-medium text-dark-300">Launch Countdown</span>
      </div>

      <div className="flex gap-3 sm:gap-4 justify-center">
        {timeUnits.map((unit, index) => (
          <div key={unit.label} className="relative">
            <motion.div
              className="w-16 sm:w-20 h-20 sm:h-24 rounded-2xl bg-gradient-to-b from-dark-800 to-dark-900 border border-white/10 flex flex-col items-center justify-center"
              initial={{ rotateX: -90 }}
              animate={{ rotateX: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={unit.value}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="text-2xl sm:text-3xl font-bold text-white font-mono"
                >
                  {String(unit.value).padStart(2, '0')}
                </motion.span>
              </AnimatePresence>
              <span className="text-xs text-dark-400 uppercase tracking-wider mt-1">
                {unit.label}
              </span>
            </motion.div>

            {/* Separator */}
            {index < timeUnits.length - 1 && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute -right-2 top-1/2 -translate-y-1/2 text-2xl text-brand-400 font-bold hidden sm:block"
              >
                :
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {countdown.launchDate && (
        <p className="text-dark-400 text-sm mt-4">
          Launching{' '}
          <span className="text-brand-400 font-medium">
            {new Date(countdown.launchDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </p>
      )}
    </motion.div>
  )
}

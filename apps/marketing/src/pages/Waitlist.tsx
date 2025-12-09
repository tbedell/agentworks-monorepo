import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, ArrowRight, Check, Copy, 
  Crown, Star, Trophy, Twitter, Linkedin,
  Clock, Rocket, Diamond, Award, Medal
} from 'lucide-react'
import FounderTierCard, { FounderTier } from '../components/FounderTierCard'
import FounderBenefits from '../components/FounderBenefits'
import FounderAffiliate from '../components/FounderAffiliate'
import EarningsCalculator from '../components/EarningsCalculator'
import FounderTerms from '../components/FounderTerms'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010'

interface WaitlistPosition {
  email: string
  position: number
  effectivePosition?: number
  referralCode: string
  referralCount: number
  status: string
}

const defaultTiers: FounderTier[] = [
  {
    id: 'diamond',
    name: 'Diamond Founder',
    icon: 'diamond',
    price: 299,
    totalSpots: 100,
    remainingSpots: 67,
    apiCalls: 2000,
    overageRate: 0.10,
    affiliateTier: 'Gold',
    affiliateCommission: 40,
    saleBonus: 100,
    supportSla: '24hr',
    highlight: false,
    features: [
      'Lifetime platform access',
      '2,000 API calls/month',
      '$0.10 per extra call (60% off)',
      '40% affiliate commission + $100 bonus',
      '24-hour priority support SLA',
      'First access to beta features',
      'Monthly founder calls',
      'VIP Discord channel',
    ],
  },
  {
    id: 'gold',
    name: 'Gold Founder',
    icon: 'award',
    price: 249,
    totalSpots: 300,
    remainingSpots: 189,
    apiCalls: 1500,
    overageRate: 0.12,
    affiliateTier: 'Silver',
    affiliateCommission: 35,
    saleBonus: 75,
    supportSla: '48hr',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Lifetime platform access',
      '1,500 API calls/month',
      '$0.12 per extra call (52% off)',
      '35% affiliate commission + $75 bonus',
      '48-hour priority support SLA',
      'Early access to beta features',
      'Quarterly founder calls',
      'Founder Discord channel',
    ],
  },
  {
    id: 'silver',
    name: 'Silver Founder',
    icon: 'medal',
    price: 199,
    totalSpots: 600,
    remainingSpots: 412,
    apiCalls: 1000,
    overageRate: 0.15,
    affiliateTier: 'Standard',
    affiliateCommission: 30,
    saleBonus: 50,
    supportSla: '72hr',
    highlight: false,
    features: [
      'Lifetime platform access',
      '1,000 API calls/month',
      '$0.15 per extra call (40% off)',
      '30% affiliate commission + $50 bonus',
      '72-hour priority support SLA',
      'Standard beta access',
      'Annual founder call',
      'Founder Discord channel',
    ],
  },
]

function ParticleField() {
  const [particles, setParticles] = useState<Array<{
    id: number; x: number; y: number; size: number; color: string; duration: number; delay: number
  }>>([])

  useEffect(() => {
    const colors = ['#06b6d4', '#eab308', '#94a3b8', '#8b5cf6']
    const newParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            filter: 'blur(1px)',
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export default function Waitlist() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [position, setPosition] = useState<WaitlistPosition | null>(null)
  const [copied, setCopied] = useState(false)
  const [totalSignups, setTotalSignups] = useState(0)
  const [founderTiers, setFounderTiers] = useState<FounderTier[]>(defaultTiers)
  const [error, setError] = useState('')
  const [selectedTier, setSelectedTier] = useState<FounderTier | null>(null)

  const totalSpots = founderTiers.reduce((sum, t) => sum + t.totalSpots, 0)
  const remainingSpots = founderTiers.reduce((sum, t) => sum + t.remainingSpots, 0)
  const claimedSpots = totalSpots - remainingSpots

  useEffect(() => {
    const stored = localStorage.getItem('agentworks_waitlist')
    if (stored) {
      const data = JSON.parse(stored)
      fetchPosition(data.referralCode)
    }
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/waitlist/stats`)
      const data = await res.json()
      setTotalSignups(data.totalSignups || 2847)
      if (data.founderTiers) {
        setFounderTiers(data.founderTiers)
      }
    } catch {
      setTotalSignups(2847)
    }
  }

  const fetchPosition = async (code: string) => {
    try {
      const res = await fetch(`${API_URL}/api/waitlist/position/${code}`)
      if (res.ok) {
        const data = await res.json()
        setPosition(data)
        setIsSubmitted(true)
      }
    } catch {
      // Ignore errors
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    setError('')

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const res = await fetch(`${API_URL}/api/waitlist/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          referredByCode: urlParams.get('ref'),
          affiliateCode: urlParams.get('aff'),
          utmSource: urlParams.get('utm_source'),
          utmMedium: urlParams.get('utm_medium'),
          utmCampaign: urlParams.get('utm_campaign'),
          selectedTier: selectedTier?.id,
        }),
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join waitlist')
      }

      const newPosition: WaitlistPosition = {
        email: data.email,
        position: data.position,
        referralCode: data.referralCode,
        referralCount: data.referralCount,
        status: data.status,
      }

      localStorage.setItem('agentworks_waitlist', JSON.stringify(newPosition))
      setPosition(newPosition)
      setIsSubmitted(true)
      setTotalSignups(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join waitlist')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyReferralLink = () => {
    if (!position) return
    const link = `https://agentworks.dev/waitlist?ref=${position.referralCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOnTwitter = () => {
    if (!position) return
    const text = `I just joined @AgentWorks as a Founding Supporter! 🚀\n\n11 specialist AI agents on a Kanban board - lifetime access + affiliate earnings.\n\nOnly ${remainingSpots} founder spots left: https://agentworks.dev/waitlist?ref=${position.referralCode}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareOnLinkedIn = () => {
    if (!position) return
    const url = `https://agentworks.dev/waitlist?ref=${position.referralCode}`
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
  }

  const handleTierSelect = (tier: FounderTier) => {
    setSelectedTier(tier)
    const formElement = document.getElementById('waitlist-form')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      <section className="relative pt-32 pb-20 overflow-hidden">
        <ParticleField />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-yellow-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-96 bg-purple-500/10 rounded-full blur-[128px]" />

        <div className="section-container relative z-10">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-4xl mx-auto text-center mb-16">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6"
                  >
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-dark-300">
                      {claimedSpots.toLocaleString()} of {totalSpots.toLocaleString()} founder spots claimed
                    </span>
                  </motion.div>

                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
                    Become a{' '}
                    <span className="gradient-text">Founding Supporter</span>
                  </h1>

                  <p className="text-xl md:text-2xl text-dark-300 mb-8 max-w-3xl mx-auto">
                    Lock in lifetime access at special rates. Every founder gets
                    built-in affiliate status to earn while you share.
                  </p>

                  <div className="flex flex-wrap justify-center gap-6 mb-8">
                    <div className="flex items-center gap-2 text-dark-300">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-400" />
                      </div>
                      <span>Lifetime Access</span>
                    </div>
                    <div className="flex items-center gap-2 text-dark-300">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Rocket className="w-4 h-4 text-blue-400" />
                      </div>
                      <span>Reserved API Calls</span>
                    </div>
                    <div className="flex items-center gap-2 text-dark-300">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Star className="w-4 h-4 text-yellow-400" />
                      </div>
                      <span>30-40% Commission</span>
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-6 max-w-lg mx-auto mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-dark-400">Founder spots remaining</span>
                      <span className="text-2xl font-bold text-white">{remainingSpots.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(claimedSpots / totalSpots) * 100}%` }}
                        transition={{ delay: 0.5, duration: 1.5 }}
                        className="h-full bg-gradient-to-r from-cyan-500 via-yellow-500 to-purple-500"
                      />
                    </div>
                    <p className="text-dark-500 text-sm mt-2">
                      {((claimedSpots / totalSpots) * 100).toFixed(1)}% claimed • Limited to 1,000 founding members
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
                  {founderTiers.map((tier, index) => (
                    <FounderTierCard
                      key={tier.id}
                      tier={tier}
                      index={index}
                      onSelect={handleTierSelect}
                    />
                  ))}
                </div>

                <motion.div
                  id="waitlist-form"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-xl mx-auto glass rounded-2xl p-8"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {selectedTier ? `Reserve Your ${selectedTier.name} Spot` : 'Join the Waitlist'}
                    </h2>
                    <p className="text-dark-400">
                      {selectedTier 
                        ? `$${selectedTier.price} one-time • ${selectedTier.remainingSpots} spots left`
                        : 'Get notified when founder spots open up'
                      }
                    </p>
                  </div>

                  {selectedTier && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 mb-6">
                      <div className="flex items-center gap-3">
                        {selectedTier.icon === 'diamond' && <Diamond className="w-6 h-6 text-cyan-400" />}
                        {selectedTier.icon === 'award' && <Award className="w-6 h-6 text-yellow-400" />}
                        {selectedTier.icon === 'medal' && <Medal className="w-6 h-6 text-gray-300" />}
                        <div>
                          <p className="font-semibold text-white">{selectedTier.name}</p>
                          <p className="text-sm text-dark-400">${selectedTier.price} lifetime</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTier(null)}
                        className="text-dark-400 hover:text-white transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="flex-1 px-6 py-4 rounded-xl bg-dark-800 border border-white/10 
                                 text-white placeholder:text-dark-400 focus:outline-none 
                                 focus:border-brand-500 transition-colors"
                      />
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                        ) : (
                          <>
                            {selectedTier ? 'Reserve' : 'Join'} <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </motion.button>
                    </div>
                    {error && (
                      <p className="mt-2 text-red-400 text-sm">{error}</p>
                    )}
                  </form>

                  <p className="text-center text-dark-500 text-sm mt-4">
                    {totalSignups.toLocaleString()} developers already on the waitlist
                  </p>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-10 h-10 text-green-400" />
                </motion.div>

                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  You're In! 🎉
                </h1>

                <p className="text-xl text-dark-300 mb-2">
                  You're <span className="text-white font-bold">#{position?.effectivePosition || position?.position?.toLocaleString()}</span> on the waitlist
                </p>

                <p className="text-dark-400 mb-8">
                  We'll email you at <span className="text-white">{position?.email}</span> when it's your turn
                </p>

                <div className="glass rounded-2xl p-8 mb-8">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Share & Earn Your Spot Faster
                  </h2>

                  <p className="text-dark-300 mb-6">
                    Each referral moves you up the waitlist and earns you rewards
                  </p>

                  <div className="flex gap-3 mb-6">
                    <div className="flex-1 px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-left">
                      <span className="text-sm text-dark-400 block mb-1">Your referral link</span>
                      <span className="text-white font-mono text-sm truncate block">
                        agentworks.dev/waitlist?ref={position?.referralCode}
                      </span>
                    </div>
                    <motion.button
                      onClick={copyReferralLink}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-6 rounded-xl font-medium transition-colors ${
                        copied 
                          ? 'bg-green-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </motion.button>
                  </div>

                  <div className="flex justify-center gap-4 mb-8">
                    <motion.button
                      onClick={shareOnTwitter}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1DA1F2] text-white font-medium"
                    >
                      <Twitter className="w-5 h-5" />
                      Share on X
                    </motion.button>
                    <motion.button
                      onClick={shareOnLinkedIn}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0A66C2] text-white font-medium"
                    >
                      <Linkedin className="w-5 h-5" />
                      Share on LinkedIn
                    </motion.button>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <p className="text-dark-400">
                      Your referrals: <span className="text-white font-bold">{position?.referralCount || 0}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 text-sm text-dark-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Updates every week
                  </span>
                  <span>•</span>
                  <span>No spam, unsubscribe anytime</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {!isSubmitted && (
        <>
          <FounderBenefits />
          <FounderAffiliate />
          <EarningsCalculator />
          <FounderTerms />

          <section className="py-20">
            <div className="section-container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-3xl mx-auto glass rounded-2xl p-8 md:p-12 text-center"
              >
                <Sparkles className="w-12 h-12 text-brand-400 mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Become a Founder?
                </h2>
                <p className="text-dark-300 mb-8 max-w-xl mx-auto">
                  Join {claimedSpots.toLocaleString()} others who've already claimed their lifetime access.
                  Only {remainingSpots.toLocaleString()} spots remaining.
                </p>
                <motion.button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary text-lg px-8 py-4"
                >
                  Claim Your Founder Spot <ArrowRight className="w-5 h-5 inline ml-2" />
                </motion.button>
              </motion.div>
            </div>
          </section>
        </>
      )}
    </motion.div>
  )
}

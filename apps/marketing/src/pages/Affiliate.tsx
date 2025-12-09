import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, Users, TrendingUp, Gift, Check, ArrowRight,
  Percent, Award, Clock, CreditCard, Link, BarChart3
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010'

interface AffiliateTier {
  id: string
  name: string
  commissionRate: number
  minReferrals: number
}

interface FounderBonus {
  tier: string
  bonus: number
}

interface ProgramInfo {
  name: string
  description: string
  tiers: AffiliateTier[]
  founderBonuses: FounderBonus[]
  features: string[]
}

interface AffiliateDashboard {
  affiliate: {
    id: string
    name: string
    code: string
    tier: string
    tierName: string
    commissionRate: number
  }
  stats: {
    totalReferrals: number
    totalConversions: number
    lifetimeEarnings: number
    pendingEarnings: number
    paidEarnings: number
  }
  recentLeads: Array<{
    id: string
    email: string
    status: string
    date: string
  }>
  recentConversions: Array<{
    id: string
    plan: string
    amount: number
    commission: number
    bonus: number
    status: string
    date: string
  }>
  links: {
    waitlist: string
    signup: string
  }
}

export default function Affiliate() {
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null)
  const [dashboard, setDashboard] = useState<AffiliateDashboard | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applicationSubmitted, setApplicationSubmitted] = useState(false)
  const [affiliateCode, setAffiliateCode] = useState('')
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    website: '',
    twitter: '',
    youtube: '',
    paypalEmail: '',
    notes: '',
  })

  useEffect(() => {
    fetchProgramInfo()
    const storedCode = localStorage.getItem('agentworks_affiliate_code')
    if (storedCode) {
      setAffiliateCode(storedCode)
      fetchDashboard(storedCode)
    }
  }, [])

  const fetchProgramInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/affiliate/program`)
      const data = await res.json()
      setProgramInfo(data)
    } catch {
      setProgramInfo({
        name: 'AgentWorks Affiliate Program',
        description: 'Earn generous commissions promoting AgentWorks',
        tiers: [
          { id: 'standard', name: 'Standard', commissionRate: 0.30, minReferrals: 0 },
          { id: 'silver', name: 'Silver', commissionRate: 0.35, minReferrals: 10 },
          { id: 'gold', name: 'Gold', commissionRate: 0.40, minReferrals: 25 },
          { id: 'platinum', name: 'Platinum', commissionRate: 0.50, minReferrals: 50 },
        ],
        founderBonuses: [
          { tier: 'Founding 50', bonus: 150 },
          { tier: 'Early Bird', bonus: 100 },
          { tier: 'Launch Week', bonus: 50 },
        ],
        features: [
          '30-50% recurring commission on all subscriptions',
          'Up to $150 bonus per Founder plan sale',
          '30-day cookie window',
          'Real-time dashboard',
          'Monthly payouts via PayPal or Stripe',
          'Dedicated affiliate support',
        ],
      })
    }
  }

  const fetchDashboard = async (code: string) => {
    try {
      const res = await fetch(`${API_URL}/api/affiliate/dashboard/${code}`)
      if (res.ok) {
        const data = await res.json()
        setDashboard(data)
      }
    } catch {
      // Ignore errors
    }
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsApplying(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/affiliate/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          website: formData.website || undefined,
          socialLinks: {
            twitter: formData.twitter || undefined,
            youtube: formData.youtube || undefined,
          },
          paypalEmail: formData.paypalEmail || undefined,
          notes: formData.notes || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      if (data.status === 'approved' && data.code) {
        localStorage.setItem('agentworks_affiliate_code', data.code)
        setAffiliateCode(data.code)
        fetchDashboard(data.code)
      } else {
        setApplicationSubmitted(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setIsApplying(false)
    }
  }

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!affiliateCode) return
    
    try {
      const res = await fetch(`${API_URL}/api/affiliate/dashboard/${affiliateCode}`)
      if (res.ok) {
        const data = await res.json()
        setDashboard(data)
        localStorage.setItem('agentworks_affiliate_code', affiliateCode)
      } else {
        setError('Invalid affiliate code')
      }
    } catch {
      setError('Failed to load dashboard')
    }
  }

  if (dashboard) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-32 pb-20 min-h-screen"
      >
        <div className="section-container">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome back, {dashboard.affiliate.name}
                </h1>
                <p className="text-dark-400">
                  {dashboard.affiliate.tierName} Affiliate • {(dashboard.affiliate.commissionRate * 100).toFixed(0)}% commission
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('agentworks_affiliate_code')
                  setDashboard(null)
                }}
                className="text-dark-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-dark-400 text-sm">Total Referrals</span>
                </div>
                <p className="text-3xl font-bold text-white">{dashboard.stats.totalReferrals}</p>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-dark-400 text-sm">Conversions</span>
                </div>
                <p className="text-3xl font-bold text-white">{dashboard.stats.totalConversions}</p>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                  <span className="text-dark-400 text-sm">Pending</span>
                </div>
                <p className="text-3xl font-bold text-white">${dashboard.stats.pendingEarnings.toFixed(2)}</p>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  <span className="text-dark-400 text-sm">Lifetime Earnings</span>
                </div>
                <p className="text-3xl font-bold text-white">${dashboard.stats.lifetimeEarnings.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Link className="w-5 h-5 text-brand-400" />
                  Your Affiliate Links
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-dark-400 block mb-1">Waitlist Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={dashboard.links.waitlist}
                        className="flex-1 px-4 py-2 rounded-lg bg-dark-800 border border-white/10 text-white text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(dashboard.links.waitlist)}
                        className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-dark-400 block mb-1">Signup Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={dashboard.links.signup}
                        className="flex-1 px-4 py-2 rounded-lg bg-dark-800 border border-white/10 text-white text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(dashboard.links.signup)}
                        className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-400" />
                  Commission Tiers
                </h3>
                <div className="space-y-2">
                  {programInfo?.tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        dashboard.affiliate.tier === tier.id
                          ? 'bg-brand-500/20 border border-brand-500/50'
                          : 'bg-dark-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {dashboard.affiliate.tier === tier.id && (
                          <Check className="w-4 h-4 text-brand-400" />
                        )}
                        <span className="text-white">{tier.name}</span>
                      </div>
                      <span className="text-brand-400 font-semibold">
                        {(tier.commissionRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              {dashboard.recentConversions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-dark-400 text-sm">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Plan</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Commission</th>
                        <th className="pb-3">Bonus</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recentConversions.map((conv) => (
                        <tr key={conv.id} className="border-t border-white/5">
                          <td className="py-3 text-dark-300">
                            {new Date(conv.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-white">{conv.plan}</td>
                          <td className="py-3 text-white">${conv.amount}</td>
                          <td className="py-3 text-green-400">${conv.commission.toFixed(2)}</td>
                          <td className="py-3 text-yellow-400">
                            {conv.bonus > 0 ? `+$${conv.bonus}` : '-'}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              conv.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                              conv.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-dark-700 text-dark-400'
                            }`}>
                              {conv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-dark-400 text-center py-8">
                  No conversions yet. Share your link to start earning!
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (applicationSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-32 pb-20 min-h-screen"
      >
        <div className="section-container">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Application Submitted!</h1>
            <p className="text-dark-300 mb-8">
              Thanks for applying to the AgentWorks Affiliate Program. We'll review your application and get back to you within 24-48 hours.
            </p>
            <p className="text-dark-400">
              Check your email for confirmation and next steps.
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-32 pb-20 min-h-screen"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-green-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brand-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="section-container relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-dark-300">
                Earn up to 50% commission
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Become an{' '}
              <span className="gradient-text">Affiliate</span>
            </h1>

            <p className="text-xl text-dark-300 max-w-2xl mx-auto">
              Promote AgentWorks and earn generous commissions on every sale. 
              Plus up to $150 bonus for Founder plan sales.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="glass rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Percent className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">30-50%</h3>
              <p className="text-dark-400">Recurring commission on all subscriptions</p>
            </div>
            <div className="glass rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <Gift className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">$50-$150</h3>
              <p className="text-dark-400">Bonus per Founder plan sale</p>
            </div>
            <div className="glass rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">30 Days</h3>
              <p className="text-dark-400">Cookie window for attribution</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Commission Tiers</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {programInfo?.tiers.map((tier, index) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-6 rounded-xl text-center ${
                    index === 3 ? 'bg-brand-500/20 border border-brand-500/50' : 'bg-dark-800/50 border border-white/5'
                  }`}
                >
                  <h3 className="font-bold text-white mb-1">{tier.name}</h3>
                  <p className="text-3xl font-bold text-brand-400 mb-2">
                    {(tier.commissionRate * 100).toFixed(0)}%
                  </p>
                  <p className="text-sm text-dark-400">
                    {tier.minReferrals === 0 ? 'Starting tier' : `${tier.minReferrals}+ referrals`}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Founder Plan Bonuses</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {programInfo?.founderBonuses.map((bonus, index) => (
                <motion.div
                  key={bonus.tier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="p-6 rounded-xl bg-dark-800/50 border border-white/5 text-center"
                >
                  <h3 className="font-bold text-white mb-2">{bonus.tier}</h3>
                  <p className="text-2xl font-bold text-yellow-400">+${bonus.bonus}</p>
                  <p className="text-sm text-dark-400 mt-1">per sale</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass rounded-2xl p-8">
              <h2 className="text-xl font-bold text-white mb-6">Already an Affiliate?</h2>
              <form onSubmit={handleCodeLogin}>
                <label className="text-sm text-dark-400 block mb-2">Enter your affiliate code</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={affiliateCode}
                    onChange={(e) => setAffiliateCode(e.target.value)}
                    placeholder="your-code"
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white"
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Login
                  </button>
                </div>
              </form>
            </div>

            <div className="glass rounded-2xl p-8">
              <h2 className="text-xl font-bold text-white mb-6">Apply to Join</h2>
              <form onSubmit={handleApply} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-dark-400 block mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-dark-400 block mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-white/10 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-dark-400 block mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://"
                    className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-white/10 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-dark-400 block mb-1">Twitter/X</label>
                    <input
                      type="text"
                      value={formData.twitter}
                      onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                      placeholder="@username"
                      className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-dark-400 block mb-1">YouTube</label>
                    <input
                      type="text"
                      value={formData.youtube}
                      onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                      placeholder="Channel URL"
                      className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-white/10 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-dark-400 block mb-1">PayPal Email (for payouts)</label>
                  <input
                    type="email"
                    value={formData.paypalEmail}
                    onChange={(e) => setFormData({ ...formData, paypalEmail: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-dark-400 block mb-1">How will you promote AgentWorks?</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg bg-dark-800 border border-white/10 text-white resize-none"
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <motion.button
                  type="submit"
                  disabled={isApplying}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {isApplying ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      Apply Now <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </div>

          <div className="mt-12 glass rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-400" />
              Program Benefits
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {programInfo?.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-dark-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

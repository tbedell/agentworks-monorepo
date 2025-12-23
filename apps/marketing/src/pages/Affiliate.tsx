import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  DollarSign, Users, TrendingUp, Check, ArrowRight,
  Percent, Award, Clock, Link as LinkIcon, BarChart3,
  Star, Copy, CheckCircle
} from 'lucide-react'
import { NavigationV2, FooterV2 } from '../components/v2'

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

const defaultProgramInfo: ProgramInfo = {
  name: 'Code & Cash Affiliate Program',
  description: 'Earn 25% lifetime recurring commission on every referral',
  tiers: [
    { id: 'partner', name: 'Partner', commissionRate: 0.25, minReferrals: 0 },
  ],
  founderBonuses: [],
  features: [
    '25% recurring lifetime commission on all subscriptions',
    '90-day cookie window for attribution',
    'Last-click attribution model',
    'Real-time dashboard with analytics',
    '$50 minimum payout threshold',
    'Monthly payouts via PayPal or Stripe Connect',
    'Dedicated affiliate support team',
    'Custom promotional materials and assets',
  ],
}

const earningScenarios = [
  { level: 'Free Software', referrals: 4, description: 'Cover your $49 subscription', monthly: 49, annual: 588 },
  { level: 'Side Hustle', referrals: 20, description: 'Earn real monthly income', monthly: 245, annual: 2940 },
  { level: 'Influencer', referrals: 100, description: 'Build a content business', monthly: 1225, annual: 14700 },
  { level: 'Agency Partner', referrals: 500, description: 'Scale to full-time income', monthly: 6125, annual: 73500 },
]

const benefits = [
  {
    icon: Percent,
    title: '25% Commission',
    description: 'Earn 25% lifetime recurring commission on every subscription your referrals purchase.',
    color: 'green',
  },
  {
    icon: TrendingUp,
    title: 'Lifetime Recurring',
    description: 'Earn commission every month your referrals stay subscribed. Build passive income.',
    color: 'yellow',
  },
  {
    icon: Clock,
    title: '90-Day Cookie',
    description: 'Your referrals are tracked for 90 days after clicking your link.',
    color: 'blue',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track clicks, conversions, and earnings in your affiliate dashboard.',
    color: 'purple',
  },
]

const getColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; icon: string }> = {
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
    yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
  }
  return colors[color] || colors.blue
}

export default function Affiliate() {
  const [programInfo, setProgramInfo] = useState<ProgramInfo>(defaultProgramInfo)
  const [dashboard, setDashboard] = useState<AffiliateDashboard | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applicationSubmitted, setApplicationSubmitted] = useState(false)
  const [affiliateCode, setAffiliateCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

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
      if (res.ok) {
        const data = await res.json()
        setProgramInfo(data)
      }
    } catch {
      // Use defaults
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  // Dashboard View
  if (dashboard) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationV2 />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pt-32 pb-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Welcome back, {dashboard.affiliate.name}
                </h1>
                <p className="text-slate-600">
                  {dashboard.affiliate.tierName} Affiliate • {(dashboard.affiliate.commissionRate * 100).toFixed(0)}% commission
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('agentworks_affiliate_code')
                  setDashboard(null)
                }}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                Sign out
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-slate-600 text-sm">Total Referrals</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{dashboard.stats.totalReferrals}</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-slate-600 text-sm">Conversions</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{dashboard.stats.totalConversions}</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="text-slate-600 text-sm">Pending</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">${dashboard.stats.pendingEarnings.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-slate-600 text-sm">Lifetime Earnings</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">${dashboard.stats.lifetimeEarnings.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Affiliate Links */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-blue-600" />
                  Your Affiliate Links
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-600 block mb-1">Waitlist Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={dashboard.links.waitlist}
                        className="flex-1 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(dashboard.links.waitlist, 'waitlist')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          copied === 'waitlist'
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {copied === 'waitlist' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 block mb-1">Signup Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={dashboard.links.signup}
                        className="flex-1 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(dashboard.links.signup, 'signup')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          copied === 'signup'
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {copied === 'signup' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission Tiers */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Commission Tiers
                </h3>
                <div className="space-y-2">
                  {programInfo.tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        dashboard.affiliate.tier === tier.id
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'bg-slate-50 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {dashboard.affiliate.tier === tier.id && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="text-slate-900 font-medium">{tier.name}</span>
                      </div>
                      <span className="text-blue-600 font-bold">
                        {(tier.commissionRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
              {dashboard.recentConversions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-600 text-sm border-b border-slate-200">
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Plan</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Commission</th>
                        <th className="pb-3 font-medium">Bonus</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recentConversions.map((conv) => (
                        <tr key={conv.id} className="border-b border-slate-100">
                          <td className="py-3 text-slate-600">
                            {new Date(conv.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-slate-900 font-medium">{conv.plan}</td>
                          <td className="py-3 text-slate-900">${conv.amount}</td>
                          <td className="py-3 text-green-600 font-medium">${conv.commission.toFixed(2)}</td>
                          <td className="py-3 text-yellow-600 font-medium">
                            {conv.bonus > 0 ? `+$${conv.bonus}` : '-'}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              conv.status === 'paid' ? 'bg-green-100 text-green-700' :
                              conv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-600'
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
                <p className="text-slate-500 text-center py-8">
                  No conversions yet. Share your link to start earning!
                </p>
              )}
            </div>
          </div>
        </motion.div>
        <FooterV2 />
      </div>
    )
  }

  // Application Submitted View
  if (applicationSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationV2 />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pt-32 pb-20"
        >
          <div className="max-w-lg mx-auto px-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
            >
              <Check className="w-10 h-10 text-green-600" />
            </motion.div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Application Submitted!</h1>
            <p className="text-slate-600 mb-8">
              Thanks for applying to the AgentWorks Affiliate Program. We'll review your application and get back to you within 24-48 hours.
            </p>
            <p className="text-slate-500">
              Check your email for confirmation and next steps.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
            >
              Back to Home
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
        <FooterV2 />
      </div>
    )
  }

  // Main Affiliate Page
  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationV2 />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-green-50 to-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-200 rounded-full mb-6"
              >
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-slate-700">
                  25% Lifetime Recurring Commission
                </span>
              </motion.div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-slate-900">
                <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Code & Cash</span>
                <br />
                Affiliate Program
              </h1>

              <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto">
                Monetize your influence. Earn 25% lifetime recurring commission
                on every developer you refer to AgentWorks.
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {[
                  { icon: Percent, text: '25% Commission', color: 'green' },
                  { icon: Clock, text: '90-Day Cookie', color: 'yellow' },
                  { icon: Star, text: 'Lifetime Recurring', color: 'blue' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-slate-700">
                    <div className={`w-8 h-8 rounded-full ${getColorClasses(item.color).bg} flex items-center justify-center`}>
                      <item.icon className={`w-4 h-4 ${getColorClasses(item.color).icon}`} />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
              >
                Why Partner With AgentWorks?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg text-slate-600 max-w-2xl mx-auto"
              >
                Join our affiliate program and start earning with every referral you make.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, i) => {
                const colors = getColorClasses(benefit.color)
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center mb-4`}>
                      <benefit.icon className={`w-6 h-6 ${colors.icon}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-slate-600">
                      {benefit.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Earning Scenarios */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
              >
                Your Earning Potential
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg text-slate-600 max-w-2xl mx-auto"
              >
                See how much you could earn with 25% lifetime recurring commission.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {earningScenarios.map((scenario, index) => (
                <motion.div
                  key={scenario.level}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-6 rounded-xl text-center ${
                    index === 3
                      ? 'bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg'
                      : 'bg-white border border-slate-200 shadow-sm'
                  }`}
                >
                  <h3 className={`font-bold mb-1 ${index === 3 ? 'text-white' : 'text-slate-900'}`}>
                    {scenario.level}
                  </h3>
                  <p className={`text-sm mb-3 ${index === 3 ? 'text-green-100' : 'text-slate-500'}`}>
                    {scenario.referrals} referrals
                  </p>
                  <p className={`text-3xl font-bold mb-1 ${index === 3 ? 'text-white' : 'text-green-600'}`}>
                    ${scenario.monthly.toLocaleString()}/mo
                  </p>
                  <p className={`text-sm ${index === 3 ? 'text-green-100' : 'text-slate-500'}`}>
                    ${scenario.annual.toLocaleString()}/year
                  </p>
                  <p className={`text-xs mt-2 ${index === 3 ? 'text-blue-100' : 'text-slate-400'}`}>
                    {scenario.description}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-center text-slate-500 text-sm mt-6"
            >
              * Based on Pro plan subscriptions at $49/month. Actual earnings vary based on plan mix.
            </motion.p>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
              >
                How It Works
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg text-slate-600 max-w-2xl mx-auto"
              >
                Start earning in three simple steps.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: '1', title: 'Apply & Get Approved', description: 'Fill out the application form below. We review and approve partners within 24-48 hours.' },
                { step: '2', title: 'Share Your Link', description: 'Get your unique affiliate link and share it with your audience via content, social media, or email.' },
                { step: '3', title: 'Earn 25% Forever', description: 'Every time someone signs up through your link, you earn 25% of their subscription - forever.' },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-12 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 max-w-2xl mx-auto text-center"
            >
              <p className="text-slate-700">
                <span className="font-semibold">$50 minimum payout</span> via PayPal or Stripe Connect.
                Payouts processed monthly for approved commissions.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Program Features */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                  Everything You Need to{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500">
                    Succeed
                  </span>
                </h2>
                <p className="text-lg text-slate-600 mb-8">
                  We provide all the tools and support you need to promote AgentWorks effectively
                  and maximize your earnings.
                </p>
                <ul className="space-y-4">
                  {programInfo.features.map((feature, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{feature}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              {/* Application Forms */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Already an Affiliate?</h2>
                  <form onSubmit={handleCodeLogin}>
                    <label className="text-sm text-slate-600 block mb-2">Enter your affiliate code</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={affiliateCode}
                        onChange={(e) => setAffiliateCode(e.target.value)}
                        placeholder="your-code"
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
                      >
                        Login
                      </button>
                    </div>
                  </form>
                </div>

                {/* Apply Form */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Apply to Join</h2>
                  <form onSubmit={handleApply} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-600 block mb-1">Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600 block mb-1">Email *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 block mb-1">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://"
                        className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-600 block mb-1">Twitter/X</label>
                        <input
                          type="text"
                          value={formData.twitter}
                          onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                          placeholder="@username"
                          className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600 block mb-1">YouTube</label>
                        <input
                          type="text"
                          value={formData.youtube}
                          onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                          placeholder="Channel URL"
                          className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 block mb-1">PayPal Email (for payouts)</label>
                      <input
                        type="email"
                        value={formData.paypalEmail}
                        onChange={(e) => setFormData({ ...formData, paypalEmail: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 block mb-1">How will you promote AgentWorks?</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <motion.button
                      type="submit"
                      disabled={isApplying}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
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
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-green-500 to-blue-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-white mb-4"
            >
              Ready to Monetize Your Influence?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xl text-green-100 mb-8"
            >
              Join Code & Cash today and earn 25% lifetime recurring on every developer you refer.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => {
                  const form = document.querySelector('form')
                  form?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                className="w-full sm:w-auto px-8 py-4 text-lg font-medium text-green-600 bg-white hover:bg-green-50 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Apply Now
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link
                to="/pricing"
                className="w-full sm:w-auto px-8 py-4 text-lg font-medium text-white border-2 border-white/30 hover:border-white/50 rounded-xl transition-colors"
              >
                View Pricing
              </Link>
            </motion.div>
          </div>
        </section>
      </motion.div>
      <FooterV2 />
    </div>
  )
}

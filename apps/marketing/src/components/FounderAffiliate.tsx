import { motion } from 'framer-motion'
import { 
  Users, DollarSign, TrendingUp, Gift, 
  Percent, Zap, CheckCircle
} from 'lucide-react'

const affiliateTiers = [
  {
    founderTier: 'Diamond',
    affiliateTier: 'Gold',
    commission: 40,
    bonus: 100,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
  },
  {
    founderTier: 'Gold',
    affiliateTier: 'Silver',
    commission: 35,
    bonus: 75,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  {
    founderTier: 'Silver',
    affiliateTier: 'Standard',
    commission: 30,
    bonus: 50,
    color: 'text-gray-300',
    bgColor: 'bg-gray-500/20',
  },
]

const earningExamples = [
  {
    scenario: 'Refer 5 Silver Founders',
    calculation: '5 × ($199 × 30% + $50 bonus)',
    total: '$548.50',
  },
  {
    scenario: 'Refer 3 Gold Founders',
    calculation: '3 × ($249 × 35% + $75 bonus)',
    total: '$486.45',
  },
  {
    scenario: 'Refer 2 Diamond Founders',
    calculation: '2 × ($299 × 40% + $100 bonus)',
    total: '$439.20',
  },
  {
    scenario: 'Refer 10 mixed (4S, 4G, 2D)',
    calculation: 'Mixed calculations',
    total: '$1,474.16',
  },
]

const benefits = [
  'No application required - instant activation',
  'Real-time dashboard to track clicks and conversions',
  '30-day cookie window for attribution',
  'Monthly payouts via PayPal or Stripe',
  'Dedicated affiliate support channel',
  'Custom promo materials provided',
]

export default function FounderAffiliate() {
  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-950/20 to-transparent" />
      
      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-dark-300">
              Built-in earning potential
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Every Founder is an{' '}
            <span className="gradient-text">Affiliate</span>
          </h2>
          <p className="text-dark-300 max-w-2xl mx-auto">
            No application. No waiting. The moment you become a founder, you can start earning
            30-40% commission plus bonuses on every sale you refer.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          {affiliateTiers.map((tier, index) => (
            <motion.div
              key={tier.founderTier}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl ${tier.bgColor} flex items-center justify-center ${tier.color}`}>
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className={`font-bold ${tier.color}`}>{tier.founderTier} Founder</p>
                  <p className="text-dark-400 text-sm">→ {tier.affiliateTier} Affiliate</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-dark-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="w-4 h-4 text-green-400" />
                    <span className="text-dark-400 text-sm">Commission</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{tier.commission}%</p>
                </div>
                <div className="p-4 rounded-lg bg-dark-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-4 h-4 text-yellow-400" />
                    <span className="text-dark-400 text-sm">Bonus/Sale</span>
                  </div>
                  <p className="text-2xl font-bold text-white">+${tier.bonus}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Example Earnings
            </h3>
            <div className="space-y-4">
              {earningExamples.map((example, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-dark-800/50"
                >
                  <div>
                    <p className="text-white font-medium">{example.scenario}</p>
                    <p className="text-dark-400 text-sm">{example.calculation}</p>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{example.total}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-dark-500 mt-4">
              * Plus recurring commission on any subscription conversions post-launch
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-400" />
              How It Works
            </h3>
            
            <div className="space-y-6 mb-8">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-white font-medium">Become a Founder</p>
                  <p className="text-dark-400 text-sm">Purchase any founder tier to activate your affiliate account instantly</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-white font-medium">Share Your Link</p>
                  <p className="text-dark-400 text-sm">Get your unique referral link from the dashboard and share it</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-white font-medium">Earn on Every Sale</p>
                  <p className="text-dark-400 text-sm">Commission + bonus paid monthly. Track everything in real-time</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-dark-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-8 text-center"
        >
          <h3 className="text-2xl font-bold text-white mb-4">
            Perfect for Influencers & Content Creators
          </h3>
          <p className="text-dark-300 max-w-2xl mx-auto mb-6">
            YouTubers, Twitter/X creators, newsletter authors, and tech bloggers - 
            become a founder and earn while sharing AgentWorks with your audience.
            Your founder tier pays for itself with just 2-3 referrals.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-4 py-2 rounded-full bg-dark-800/50 text-dark-300 text-sm">
              YouTube Tech Reviews
            </div>
            <div className="px-4 py-2 rounded-full bg-dark-800/50 text-dark-300 text-sm">
              AI/Dev Twitter
            </div>
            <div className="px-4 py-2 rounded-full bg-dark-800/50 text-dark-300 text-sm">
              Tech Newsletters
            </div>
            <div className="px-4 py-2 rounded-full bg-dark-800/50 text-dark-300 text-sm">
              Dev Blogs
            </div>
            <div className="px-4 py-2 rounded-full bg-dark-800/50 text-dark-300 text-sm">
              Discord Communities
            </div>
            <div className="px-4 py-2 rounded-full bg-dark-800/50 text-dark-300 text-sm">
              Indie Hackers
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

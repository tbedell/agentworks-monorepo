import { motion } from 'framer-motion'
import {
  Infinity, Cpu, TrendingDown, Users, Award,
  MessageSquare, Sparkles, Lock, Headphones,
  Rocket, Calendar, Shield
} from 'lucide-react'

const benefits = [
  {
    icon: Infinity,
    title: 'Lifetime Access',
    description: 'One payment, forever access. No monthly fees, ever.',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: Cpu,
    title: 'Reserved API Allocation',
    description: 'Guaranteed monthly API calls that never expire or decrease.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: TrendingDown,
    title: 'Reduced Overage Rates',
    description: '40-60% off standard rates when you need extra API calls.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Users,
    title: 'Auto-Enrolled Affiliate',
    description: 'Start earning 30-40% commission immediately. No application needed.',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    icon: Award,
    title: 'Founder Badge',
    description: 'Permanent Diamond, Gold, or Silver badge on your profile.',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  {
    icon: MessageSquare,
    title: 'Private Discord',
    description: 'Exclusive founder-only channel with direct access to the team.',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  {
    icon: Sparkles,
    title: 'Early Features',
    description: 'First access to new features, agents, and capabilities.',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  {
    icon: Lock,
    title: 'Grandfathered Terms',
    description: 'Your pricing and benefits are locked in forever.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    icon: Headphones,
    title: 'Priority Support',
    description: '24-72 hour response SLA based on your tier.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    icon: Rocket,
    title: 'Shape the Product',
    description: 'Your feedback directly influences the roadmap.',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    icon: Calendar,
    title: 'Founder Calls',
    description: 'Regular calls with the founding team (frequency by tier).',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  {
    icon: Shield,
    title: 'Shutdown Protection',
    description: '12-month pro-rata refund if we ever shut down.',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
  },
]

const tierComparison = [
  { feature: 'Monthly API Calls', diamond: '2,000', gold: '1,500', silver: '1,000', regular: '~3,000*' },
  { feature: 'Extra Call Rate', diamond: '$0.10', gold: '$0.12', silver: '$0.15', regular: '$0.25' },
  { feature: 'Affiliate Commission', diamond: '40%', gold: '35%', silver: '30%', regular: 'Apply required' },
  { feature: 'Sale Bonus', diamond: '+$100', gold: '+$75', silver: '+$50', regular: '-' },
  { feature: 'Support SLA', diamond: '24hr', gold: '48hr', silver: '72hr', regular: 'Best effort' },
  { feature: 'Beta Access', diamond: 'First', gold: 'Early', silver: 'Standard', regular: 'Public' },
  { feature: 'Founder Calls', diamond: 'Monthly', gold: 'Quarterly', silver: 'Annual', regular: '-' },
  { feature: 'Discord Channel', diamond: 'VIP + General', gold: 'General', silver: 'General', regular: 'Public' },
]

export default function FounderBenefits() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
            What You Get as a{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Founding Supporter</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            More than just early access. You're getting lifetime value that compounds over time.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-16">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
            >
              <div className={`w-10 h-10 rounded-lg ${benefit.bgColor} flex items-center justify-center ${benefit.color} mb-3`}>
                <benefit.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{benefit.title}</h3>
              <p className="text-sm text-slate-500">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg"
        >
          <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            Tier Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-4 text-slate-500 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-cyan-600 font-bold">Diamond</th>
                  <th className="text-center py-4 px-4 text-yellow-600 font-bold">Gold</th>
                  <th className="text-center py-4 px-4 text-slate-500 font-bold">Silver</th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">Regular ($49/mo)</th>
                </tr>
              </thead>
              <tbody>
                {tierComparison.map((row, index) => (
                  <motion.tr
                    key={row.feature}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-slate-100"
                  >
                    <td className="py-4 px-4 text-slate-600">{row.feature}</td>
                    <td className="py-4 px-4 text-center text-slate-900 font-medium">{row.diamond}</td>
                    <td className="py-4 px-4 text-center text-slate-900 font-medium">{row.gold}</td>
                    <td className="py-4 px-4 text-center text-slate-900 font-medium">{row.silver}</td>
                    <td className="py-4 px-4 text-center text-slate-400">{row.regular}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">
            * Regular plan: 100 runs/day = 3,000/month at $49/mo. Founders get lifetime access for 4-6 months equivalent.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

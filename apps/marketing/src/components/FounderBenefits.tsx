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
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  {
    icon: Cpu,
    title: 'Reserved API Allocation',
    description: 'Guaranteed monthly API calls that never expire or decrease.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  {
    icon: TrendingDown,
    title: 'Reduced Overage Rates',
    description: '40-60% off standard rates when you need extra API calls.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  {
    icon: Users,
    title: 'Auto-Enrolled Affiliate',
    description: 'Start earning 30-40% commission immediately. No application needed.',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  {
    icon: Award,
    title: 'Founder Badge',
    description: 'Permanent Diamond, Gold, or Silver badge on your profile.',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Private Discord',
    description: 'Exclusive founder-only channel with direct access to the team.',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
  },
  {
    icon: Sparkles,
    title: 'Early Features',
    description: 'First access to new features, agents, and capabilities.',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
  },
  {
    icon: Lock,
    title: 'Grandfathered Terms',
    description: 'Your pricing and benefits are locked in forever.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  {
    icon: Headphones,
    title: 'Priority Support',
    description: '24-72 hour response SLA based on your tier.',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  {
    icon: Rocket,
    title: 'Shape the Product',
    description: 'Your feedback directly influences the roadmap.',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  {
    icon: Calendar,
    title: 'Founder Calls',
    description: 'Regular calls with the founding team (frequency by tier).',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
  },
  {
    icon: Shield,
    title: 'Shutdown Protection',
    description: '12-month pro-rata refund if we ever shut down.',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
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
    <section className="py-20">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What You Get as a{' '}
            <span className="gradient-text">Founding Supporter</span>
          </h2>
          <p className="text-dark-300 max-w-2xl mx-auto">
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
              className="glass rounded-xl p-5"
            >
              <div className={`w-10 h-10 rounded-lg ${benefit.bgColor} flex items-center justify-center ${benefit.color} mb-3`}>
                <benefit.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
              <p className="text-sm text-dark-400">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            Tier Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-dark-400 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-bold">Diamond</th>
                  <th className="text-center py-4 px-4 text-yellow-400 font-bold">Gold</th>
                  <th className="text-center py-4 px-4 text-gray-300 font-bold">Silver</th>
                  <th className="text-center py-4 px-4 text-dark-500 font-medium">Regular ($49/mo)</th>
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
                    className="border-b border-white/5"
                  >
                    <td className="py-4 px-4 text-dark-300">{row.feature}</td>
                    <td className="py-4 px-4 text-center text-white font-medium">{row.diamond}</td>
                    <td className="py-4 px-4 text-center text-white font-medium">{row.gold}</td>
                    <td className="py-4 px-4 text-center text-white font-medium">{row.silver}</td>
                    <td className="py-4 px-4 text-center text-dark-500">{row.regular}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-dark-500 mt-4 text-center">
            * Regular plan: 100 runs/day ≈ 3,000/month at $49/mo. Founders get lifetime access for 4-6 months equivalent.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

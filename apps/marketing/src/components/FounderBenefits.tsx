import { motion } from 'framer-motion'
import {
  Infinity, Cpu, TrendingDown, Users, Award,
  MessageSquare, Sparkles, Lock, Headphones,
  Rocket, Calendar, Shield, Bot
} from 'lucide-react'

const benefits = [
  {
    icon: Infinity,
    title: 'Lifetime Platform Access',
    description: 'One payment, forever access to the #1 vibe coding platform.',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: Bot,
    title: '11 Specialist AI Agents',
    description: 'CEO CoPilot, Architect, Dev, QA, DevOps, and more working for your team.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Cpu,
    title: 'Reserved Agent Runs',
    description: 'Guaranteed monthly agent runs that never expire or decrease.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Sparkles,
    title: 'Early Feature Access',
    description: 'First access to new features, agents, and capabilities.',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  {
    icon: Headphones,
    title: 'Priority Support',
    description: '4-72 hour response SLA based on your tier.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    icon: Award,
    title: 'Founder Badge',
    description: 'Permanent Bronze, Silver, Gold, or Diamond badge on your profile.',
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
    icon: Lock,
    title: 'Grandfathered Terms',
    description: 'Your pricing and benefits are locked in forever.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    icon: Calendar,
    title: 'Founder Calls',
    description: 'Regular calls with the founding team (frequency by tier).',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  {
    icon: Rocket,
    title: 'Shape the Product',
    description: 'Your feedback directly influences the roadmap.',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    icon: TrendingDown,
    title: 'Reduced Overage Rates',
    description: '40-60% off standard rates when you need extra agent runs.',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    icon: Users,
    title: 'Share in Our Profits',
    description: 'Earn 1-4% passive revenue as the platform grows. Your reward for believing early.',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
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
  { feature: 'One-Time Price', diamond: '$799', gold: '$549', silver: '$349', bronze: '$249', regular: '$49/mo' },
  { feature: 'Agent Runs/Month', diamond: '2,500', gold: '1,500', silver: '1,000', bronze: '500', regular: '~3,000*' },
  { feature: 'Passive Revenue', diamond: '4%', gold: '3%', silver: '2%', bronze: '1%', regular: '-' },
  { feature: 'Support Response', diamond: '4hr', gold: '24hr', silver: '48hr', bronze: '72hr', regular: 'Best effort' },
  { feature: 'Beta Access', diamond: 'Direct', gold: 'First', silver: 'Early', bronze: 'Standard', regular: 'Public' },
  { feature: 'Founder Calls', diamond: 'Weekly', gold: 'Monthly', silver: 'Quarterly', bronze: 'Annual', regular: '-' },
  { feature: 'Discord Channel', diamond: 'VIP', gold: 'VIP', silver: 'Founder', bronze: 'Founder', regular: 'Public' },
  { feature: '30-Day Upgrade', diamond: '-', gold: 'To Diamond', silver: 'To Any', bronze: 'To Any', regular: '-' },
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
            Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Founding Developer</span>{' '}
            Benefits
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Lifetime access to the best vibe coding platform, plus your reward for believing in us early.
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
                  <th className="text-left py-4 px-3 text-slate-500 font-medium">Feature</th>
                  <th className="text-center py-4 px-2 text-amber-600 font-bold">Bronze</th>
                  <th className="text-center py-4 px-2 text-slate-500 font-bold">Silver</th>
                  <th className="text-center py-4 px-2 text-yellow-600 font-bold">Gold</th>
                  <th className="text-center py-4 px-2 text-cyan-600 font-bold">Diamond</th>
                  <th className="text-center py-4 px-2 text-slate-400 font-medium">Pro ($49/mo)</th>
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
                    <td className="py-4 px-3 text-slate-600">{row.feature}</td>
                    <td className="py-4 px-2 text-center text-slate-900 font-medium">{row.bronze}</td>
                    <td className="py-4 px-2 text-center text-slate-900 font-medium">{row.silver}</td>
                    <td className="py-4 px-2 text-center text-slate-900 font-medium">{row.gold}</td>
                    <td className="py-4 px-2 text-center text-slate-900 font-medium">{row.diamond}</td>
                    <td className="py-4 px-2 text-center text-slate-400">{row.regular}</td>
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

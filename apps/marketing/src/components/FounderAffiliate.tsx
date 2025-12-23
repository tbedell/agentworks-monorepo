import { motion } from 'framer-motion'
import {
  Users, Plus, ArrowRight,
  RotateCw, Target, TrendingUp
} from 'lucide-react'

const founderTiers = [
  {
    tier: 'Bronze',
    commission: 1,
    price: 249,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    tier: 'Silver',
    commission: 2,
    price: 349,
    color: 'text-slate-500',
    bgColor: 'bg-slate-200',
  },
  {
    tier: 'Gold',
    commission: 3,
    price: 549,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    tier: 'Diamond',
    commission: 4,
    price: 799,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
]

// ROI Projections based on customer growth
const roiProjections = [
  { customers: 10000, perFounder: 10, label: '10K Customers' },
  { customers: 100000, perFounder: 100, label: '100K Customers' },
  { customers: 1000000, perFounder: 1000, label: '1M+ Customers' },
]

export default function FounderAffiliate() {
  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-50/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm mb-6">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-slate-600">
              Your Reward for Believing Early
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
            Share in Our{' '}
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Profits as We Grow</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            As a Founding Developer, you don't just get lifetime platform access—you earn passive revenue
            as we scale. Every new subscriber is assigned to a founder via <strong>Round Robin</strong>,
            and you earn 1-4% of their subscription for life.
          </p>
        </motion.div>

        {/* How It Works - Visual */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg mb-12"
        >
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            How the Round Robin Works
          </h3>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="text-center p-6 bg-slate-50 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl mx-auto mb-4">
                1
              </div>
              <p className="text-slate-900 font-medium mb-2">Customer Signs Up</p>
              <p className="text-slate-500 text-sm">A new user subscribes to AgentWorks at $49/mo</p>
            </div>
            <div className="text-center p-6 bg-slate-50 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-4">
                <RotateCw className="w-8 h-8" />
              </div>
              <p className="text-slate-900 font-medium mb-2">Round Robin Assigns</p>
              <p className="text-slate-500 text-sm">The algorithm assigns them to the next founder in sequence</p>
            </div>
            <div className="text-center p-6 bg-slate-50 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl mx-auto mb-4">
                $
              </div>
              <p className="text-slate-900 font-medium mb-2">You Earn Forever</p>
              <p className="text-slate-500 text-sm">You earn 1-4% of their subscription every month, for life</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-4 text-center">Example: Customer #105 is Assigned to You</h4>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-slate-500 text-sm mb-1">Diamond Founder (4%)</p>
                <p className="text-3xl font-bold text-green-600">$1.96/mo</p>
                <p className="text-slate-400 text-xs">4% of $49</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-slate-500 text-sm mb-1">Bronze Founder (1%)</p>
                <p className="text-3xl font-bold text-amber-600">$0.49/mo</p>
                <p className="text-slate-400 text-xs">1% of $49</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">
              This happens for every customer assigned to your slot via Round Robin.
            </p>
          </div>
        </motion.div>

        {/* ROI Projections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white mb-12"
        >
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            As We Scale to 1 Million+ Customers
          </h3>
          <p className="text-slate-300 mb-6">Your slot fills up with assigned customers, building recurring monthly income.</p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Platform Size</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Customers / Founder</th>
                  <th className="text-center py-3 px-4 text-amber-400 font-medium">Bronze (1%)</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-medium">Silver (2%)</th>
                  <th className="text-center py-3 px-4 text-yellow-400 font-medium">Gold (3%)</th>
                  <th className="text-center py-3 px-4 text-cyan-400 font-medium">Diamond (4%)</th>
                </tr>
              </thead>
              <tbody>
                {roiProjections.map((proj) => (
                  <tr key={proj.customers} className="border-b border-slate-700/50">
                    <td className="py-4 px-4 text-white font-medium">{proj.label}</td>
                    <td className="py-4 px-4 text-center text-slate-300">{proj.perFounder.toLocaleString()}</td>
                    <td className="py-4 px-4 text-center text-amber-400">
                      ${(proj.perFounder * 49 * 0.01).toFixed(2)}/mo
                    </td>
                    <td className="py-4 px-4 text-center text-slate-300">
                      ${(proj.perFounder * 49 * 0.02).toFixed(2)}/mo
                    </td>
                    <td className="py-4 px-4 text-center text-yellow-400">
                      ${(proj.perFounder * 49 * 0.03).toFixed(2)}/mo
                    </td>
                    <td className="py-4 px-4 text-center text-cyan-400 font-bold">
                      ${(proj.perFounder * 49 * 0.04).toFixed(2)}/mo
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-300">
              <strong className="text-white">Diamond Package:</strong> At 10K customers, you're assigned 10 = $19.60/mo ($235/year).
              At 1M customers, you're assigned 1,000 = <span className="text-green-400 font-bold">$1,960/mo ($23,520/year)</span>.
            </p>
          </div>
        </motion.div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {founderTiers.map((tier, index) => (
            <motion.div
              key={tier.tier}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg text-center"
            >
              <div className={`w-12 h-12 rounded-xl ${tier.bgColor} flex items-center justify-center ${tier.color} mx-auto mb-4`}>
                <Users className="w-6 h-6" />
              </div>
              <p className={`font-bold ${tier.color} mb-1`}>{tier.tier} Package</p>
              <p className="text-2xl font-bold text-slate-900 mb-1">${tier.price}</p>
              <p className="text-green-600 font-semibold">{tier.commission}% per customer</p>
            </motion.div>
          ))}
        </div>

        {/* Double Dip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-center text-white mb-12"
        >
          <h3 className="text-2xl font-bold mb-4">
            The "Double Dip" Strategy
          </h3>
          <p className="text-blue-100 max-w-2xl mx-auto mb-6">
            You earn passive revenue via Round Robin assignment. But you can ALSO refer developers directly
            and earn an additional 25% affiliate commission. Stack up to 29% total on each customer.
          </p>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-3xl font-bold">1-4%</p>
              <p className="text-sm text-blue-200">Passive (auto)</p>
            </div>
            <Plus className="w-8 h-8 text-blue-200" />
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-3xl font-bold">25%</p>
              <p className="text-sm text-blue-200">Affiliate (referrals)</p>
            </div>
            <ArrowRight className="w-8 h-8 text-blue-200" />
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 border-2 border-white/30">
              <p className="text-3xl font-bold">29%</p>
              <p className="text-sm text-blue-200">Max CAC Stack</p>
            </div>
          </div>
        </motion.div>

        {/* 30-Day Upgrade */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg"
        >
          <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">
            30-Day Upgrade Guarantee
          </h3>
          <p className="text-slate-600 text-center max-w-2xl mx-auto mb-6">
            Start at any tier. Within 30 days, you can upgrade to Diamond by paying the difference.
            Lock in the maximum 4% passive revenue rate for life.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-slate-500 text-sm">Bronze → Diamond</p>
              <p className="text-xl font-bold text-slate-900">Pay $550</p>
              <p className="text-xs text-slate-400">($799 - $249)</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-slate-500 text-sm">Silver → Diamond</p>
              <p className="text-xl font-bold text-slate-900">Pay $450</p>
              <p className="text-xs text-slate-400">($799 - $349)</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-slate-500 text-sm">Gold → Diamond</p>
              <p className="text-xl font-bold text-slate-900">Pay $250</p>
              <p className="text-xs text-slate-400">($799 - $549)</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

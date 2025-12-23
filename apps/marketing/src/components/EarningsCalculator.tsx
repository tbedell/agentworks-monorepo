import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Sparkles, TrendingUp, Clock } from 'lucide-react'

const founderTiers = [
  { id: 'bronze', name: 'Bronze Package', price: 249, passiveRate: 0.01 },
  { id: 'silver', name: 'Silver Package', price: 349, passiveRate: 0.02 },
  { id: 'gold', name: 'Gold Package', price: 549, passiveRate: 0.03 },
  { id: 'diamond', name: 'Diamond Package', price: 799, passiveRate: 0.04 },
]

export default function EarningsCalculator() {
  const [yourTier, setYourTier] = useState('diamond')
  const [platformCustomers, setPlatformCustomers] = useState(10000)
  const [affiliateReferrals, setAffiliateReferrals] = useState(0)
  const avgSubscriptionPrice = 49

  const yourTierData = founderTiers.find(t => t.id === yourTier)!

  // Calculate customers per founder (1000 founders)
  const customersPerFounder = platformCustomers / 1000

  // Calculate monthly passive revenue from assigned customers
  const monthlyPassiveEarnings = customersPerFounder * avgSubscriptionPrice * yourTierData.passiveRate

  // Calculate affiliate earnings (25% on direct referrals)
  const monthlyAffiliateEarnings = affiliateReferrals * avgSubscriptionPrice * 0.25

  // Total monthly earnings
  const totalMonthlyEarnings = monthlyPassiveEarnings + monthlyAffiliateEarnings
  const annualEarnings = totalMonthlyEarnings * 12

  // Break-even calculation
  const yearsToBreakeven = totalMonthlyEarnings > 0 ? (yourTierData.price / annualEarnings) : Infinity

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm mb-6">
            <Calculator className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-600">
              Earning Potential Calculator
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
            Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Earning Potential</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            In addition to lifetime platform access, you earn passive revenue as we grow.
            See how your earnings scale as we reach 1 Million+ customers.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Package</h3>
                <div className="grid grid-cols-4 gap-2 mb-8">
                  {founderTiers.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setYourTier(tier.id)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        yourTier === tier.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-slate-100 border-2 border-transparent hover:border-slate-300'
                      }`}
                    >
                      <p className="font-bold text-slate-900 text-sm">{tier.name.split(' ')[0]}</p>
                      <p className="text-xs text-slate-500">${tier.price}</p>
                      <p className="text-xs text-green-600 font-semibold">{(tier.passiveRate * 100).toFixed(0)}%</p>
                    </button>
                  ))}
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-4">Platform Growth Scenario</h3>
                <div className="space-y-4 mb-8">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Total Platform Customers</span>
                      <span className="text-slate-900 font-medium">{platformCustomers.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="10000"
                      max="1000000"
                      step="10000"
                      value={platformCustomers}
                      onChange={(e) => setPlatformCustomers(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>10K</span>
                      <span>100K</span>
                      <span>1M</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Direct Referrals (Optional)</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Monthly Affiliate Referrals</span>
                      <span className="text-slate-900 font-medium">{affiliateReferrals}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={affiliateReferrals}
                      onChange={(e) => setAffiliateReferrals(Number(e.target.value))}
                      className="w-full accent-green-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      +25% commission on each direct referral (stacks with passive)
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:border-l lg:border-slate-200 lg:pl-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Earning Potential</h3>

                <div className="space-y-3 mb-6">
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-600">Customers Assigned to You</span>
                      <span className="text-blue-600 font-bold">{customersPerFounder.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {platformCustomers.toLocaleString()} ÷ 1,000 founders = {customersPerFounder.toLocaleString()} per founder
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-700 font-medium">Passive Revenue</span>
                      <span className="text-blue-600 font-bold">${monthlyPassiveEarnings.toFixed(2)}/mo</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {customersPerFounder.toLocaleString()} customers × ${avgSubscriptionPrice} × {(yourTierData.passiveRate * 100).toFixed(0)}%
                    </p>
                  </div>

                  {affiliateReferrals > 0 && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-700 font-medium">Affiliate Earnings</span>
                        <span className="text-green-600 font-bold">${monthlyAffiliateEarnings.toFixed(2)}/mo</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {affiliateReferrals} referrals × ${avgSubscriptionPrice} × 25%
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-300">Monthly Total</span>
                    <span className="text-3xl font-bold text-white">${totalMonthlyEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-300">Annual Total</span>
                    <span className="text-2xl font-bold text-green-400">${annualEarnings.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300">Your Investment</span>
                      <span className="text-lg text-slate-400">${yourTierData.price}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Break-even
                      </span>
                      <span className="text-blue-400 font-bold">
                        {yearsToBreakeven === Infinity
                          ? 'N/A'
                          : yearsToBreakeven < 1
                            ? `${Math.ceil(yearsToBreakeven * 12)} months`
                            : `~${yearsToBreakeven.toFixed(1)} years`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {yearsToBreakeven <= 3 && yearsToBreakeven !== Infinity && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200"
                  >
                    <div className="flex items-center gap-2 text-green-700">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-medium">
                        Realistic, safe, and profitable!
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm mt-1">
                      As we scale past {platformCustomers.toLocaleString()} customers, your earnings compound.
                    </p>
                  </motion.div>
                )}

                {annualEarnings > yourTierData.price * 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200"
                  >
                    <div className="flex items-center gap-2 text-blue-700">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-medium">
                        {((annualEarnings / yourTierData.price) * 100).toFixed(0)}% annual ROI
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-center text-slate-600 text-sm">
              <strong>Diamond Package at 10K customers:</strong> You're assigned 10 customers via Round Robin.
              10 × $49 × 4% = <span className="text-green-600 font-semibold">$19.60/mo ($235/year)</span>.
              As we scale to 1M customers: <span className="text-green-600 font-semibold">$1,960/mo</span>.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

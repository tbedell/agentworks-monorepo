import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Sparkles } from 'lucide-react'

const founderTiers = [
  { id: 'diamond', name: 'Diamond', price: 299, commission: 0.40, bonus: 100 },
  { id: 'gold', name: 'Gold', price: 249, commission: 0.35, bonus: 75 },
  { id: 'silver', name: 'Silver', price: 199, commission: 0.30, bonus: 50 },
]

export default function EarningsCalculator() {
  const [yourTier, setYourTier] = useState('gold')
  const [diamondReferrals, setDiamondReferrals] = useState(1)
  const [goldReferrals, setGoldReferrals] = useState(2)
  const [silverReferrals, setSilverReferrals] = useState(3)

  const yourTierData = founderTiers.find(t => t.id === yourTier)!

  const calculateEarnings = () => {
    const commission = yourTierData.commission
    const bonus = yourTierData.bonus

    const diamondEarnings = diamondReferrals * (299 * commission + bonus)
    const goldEarnings = goldReferrals * (249 * commission + bonus)
    const silverEarnings = silverReferrals * (199 * commission + bonus)

    return {
      diamond: diamondEarnings,
      gold: goldEarnings,
      silver: silverEarnings,
      total: diamondEarnings + goldEarnings + silverEarnings,
    }
  }

  const earnings = calculateEarnings()
  const totalReferrals = diamondReferrals + goldReferrals + silverReferrals
  const yourInvestment = yourTierData.price
  const netProfit = earnings.total - yourInvestment
  const roi = ((earnings.total / yourInvestment) * 100).toFixed(0)

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
              See your potential
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
            Earnings <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Calculator</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Calculate how much you could earn as a founder affiliate.
            Most founders pay off their membership with just 2-3 referrals.
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
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Founder Tier</h3>
                <div className="grid grid-cols-3 gap-2 mb-8">
                  {founderTiers.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setYourTier(tier.id)}
                      className={`p-4 rounded-xl text-center transition-all ${
                        yourTier === tier.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-slate-100 border-2 border-transparent hover:border-slate-300'
                      }`}
                    >
                      <p className="font-bold text-slate-900">{tier.name}</p>
                      <p className="text-sm text-slate-500">${tier.price}</p>
                      <p className="text-xs text-blue-600">{(tier.commission * 100).toFixed(0)}% comm.</p>
                    </button>
                  ))}
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-4">Referrals You'll Make</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-cyan-600">Diamond Referrals</span>
                      <span className="text-slate-900">{diamondReferrals}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={diamondReferrals}
                      onChange={(e) => setDiamondReferrals(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-yellow-600">Gold Referrals</span>
                      <span className="text-slate-900">{goldReferrals}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={goldReferrals}
                      onChange={(e) => setGoldReferrals(Number(e.target.value))}
                      className="w-full accent-yellow-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">Silver Referrals</span>
                      <span className="text-slate-900">{silverReferrals}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={silverReferrals}
                      onChange={(e) => setSilverReferrals(Number(e.target.value))}
                      className="w-full accent-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:border-l lg:border-slate-200 lg:pl-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Earnings</h3>

                <div className="space-y-3 mb-6">
                  {diamondReferrals > 0 && (
                    <div className="flex justify-between p-3 rounded-lg bg-slate-100">
                      <span className="text-slate-600">
                        {diamondReferrals}× Diamond (${299} × {(yourTierData.commission * 100).toFixed(0)}% + ${yourTierData.bonus})
                      </span>
                      <span className="text-cyan-600 font-medium">${earnings.diamond.toFixed(2)}</span>
                    </div>
                  )}
                  {goldReferrals > 0 && (
                    <div className="flex justify-between p-3 rounded-lg bg-slate-100">
                      <span className="text-slate-600">
                        {goldReferrals}× Gold (${249} × {(yourTierData.commission * 100).toFixed(0)}% + ${yourTierData.bonus})
                      </span>
                      <span className="text-yellow-600 font-medium">${earnings.gold.toFixed(2)}</span>
                    </div>
                  )}
                  {silverReferrals > 0 && (
                    <div className="flex justify-between p-3 rounded-lg bg-slate-100">
                      <span className="text-slate-600">
                        {silverReferrals}× Silver (${199} × {(yourTierData.commission * 100).toFixed(0)}% + ${yourTierData.bonus})
                      </span>
                      <span className="text-slate-500 font-medium">${earnings.silver.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-600">Total Referrals</span>
                    <span className="text-2xl font-bold text-slate-900">{totalReferrals}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-600">Total Earnings</span>
                    <span className="text-3xl font-bold text-green-600">${earnings.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-600">Your Investment</span>
                    <span className="text-lg text-slate-500">-${yourInvestment}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-900 font-medium">Net Profit</span>
                      <span className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">ROI</span>
                      <span className="text-blue-600 font-bold">{roi}%</span>
                    </div>
                  </div>
                </div>

                {totalReferrals >= 2 && netProfit > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200"
                  >
                    <div className="flex items-center gap-2 text-green-700">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-medium">
                        Your founder membership paid for itself!
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm mt-1">
                      Plus you get lifetime access to the platform.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          <p className="text-center text-slate-400 text-sm mt-4">
            * Calculations based on one-time founder sales. You'll also earn recurring commission
            on any monthly subscriptions after launch.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

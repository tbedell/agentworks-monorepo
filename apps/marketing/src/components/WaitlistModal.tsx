import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, ArrowRight, Check, Rocket, Mail, Gift, Users } from 'lucide-react'

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
}

const perks = [
  { icon: <Rocket className="w-4 h-4" />, text: 'Early beta access' },
  { icon: <Mail className="w-4 h-4" />, text: 'Weekly dev updates' },
  { icon: <Gift className="w-4 h-4" />, text: '$199 lifetime (vs $49/mo)' },
  { icon: <Users className="w-4 h-4" />, text: 'Shape the roadmap' },
]

export default function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const position = Math.floor(Math.random() * 500) + 1500
    const referralCode = 'AW-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    
    localStorage.setItem('agentworks_waitlist', JSON.stringify({
      email,
      position,
      referralCode,
      referralCount: 0,
    }))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setIsSubmitted(false)
      setEmail('')
    }, 300)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="glass rounded-2xl p-8 mx-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500" />
              
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-dark-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-brand-400" />
                      <span className="text-sm font-medium text-brand-400">Limited spots available</span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                      Join the Waitlist
                    </h2>

                    <p className="text-dark-300 mb-6">
                      Be first to experience AI-powered development with 11+ specialist agents.
                    </p>

                    <form onSubmit={handleSubmit} className="mb-6">
                      <div className="flex gap-3">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          className="flex-1 px-4 py-3 rounded-xl bg-dark-800 border border-white/10 
                                   text-white placeholder:text-dark-400 focus:outline-none 
                                   focus:border-brand-500 transition-colors"
                        />
                        <motion.button
                          type="submit"
                          disabled={isSubmitting}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="px-6 py-3 bg-gradient-to-r from-brand-500 to-purple-500 
                                   rounded-xl font-semibold text-white flex items-center gap-2
                                   disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                          ) : (
                            <>
                              Join <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </motion.button>
                      </div>
                    </form>

                    <div className="grid grid-cols-2 gap-3">
                      {perks.map((perk) => (
                        <div key={perk.text} className="flex items-center gap-2 text-sm text-dark-300">
                          <span className="text-brand-400">{perk.icon}</span>
                          {perk.text}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
                    >
                      <Check className="w-8 h-8 text-green-400" />
                    </motion.div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                      You're on the list! 🎉
                    </h2>

                    <p className="text-dark-300 mb-6">
                      Check your email for confirmation and your referral link to move up.
                    </p>

                    <motion.a
                      href="/waitlist"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500/20 
                               rounded-xl text-brand-400 font-medium hover:bg-brand-500/30 transition-colors"
                    >
                      View your position
                      <ArrowRight className="w-4 h-4" />
                    </motion.a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

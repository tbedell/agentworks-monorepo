import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertTriangle, Shield, FileText } from 'lucide-react'

interface TermSection {
  id: string
  title: string
  icon: typeof AlertTriangle
  content: string[]
}

const terms: TermSection[] = [
  {
    id: 'non-transferable',
    title: 'Non-Transferable Accounts',
    icon: AlertTriangle,
    content: [
      'Founder accounts are permanently tied to the original purchaser and the email used at purchase.',
      'Founder benefits, including lifetime access and reduced rates, cannot be sold, gifted, assigned, or transferred to any other person or entity.',
      'Any attempt to transfer or sell a founder account will result in immediate termination of all founder benefits.',
      'In cases of business acquisition, founder benefits remain with the original individual, not the company.',
    ],
  },
  {
    id: 'account-requirements',
    title: 'Account Requirements',
    icon: Shield,
    content: [
      'One founder account per individual. Duplicate accounts will be merged or terminated.',
      'Account must be registered with a valid, personal email address that you control.',
      'We may require identity verification to confirm founder status.',
      'Business use is permitted, but the account must be used by the individual founder.',
      'You may not use founder accounts to provide services to third parties or resell access.',
    ],
  },
  {
    id: 'fair-use',
    title: 'Fair Use Policy',
    icon: FileText,
    content: [
      'Monthly API allocations are for reasonable development and business use.',
      'Unused API calls do not roll over to the following month.',
      'Excessive automation, abuse, or patterns inconsistent with normal development use may result in throttling.',
      'We reserve the right to investigate unusual usage patterns and may request explanation.',
      'Violation of fair use may result in temporary suspension pending review.',
    ],
  },
  {
    id: 'platform-rights',
    title: 'Platform Rights & Changes',
    icon: Shield,
    content: [
      'AgentWorks reserves the right to modify these terms with 90 days written notice.',
      'Core founder benefits (lifetime access, API allocation, reduced rates) are guaranteed.',
      'Additional perks (Discord, founder calls, etc.) may be modified based on operational needs.',
      'New features and agents will be included in founder access at no additional cost.',
      'In the event of platform shutdown, founders will receive a 12-month pro-rata refund based on average monthly value.',
    ],
  },
  {
    id: 'refund-policy',
    title: 'Refund Policy',
    icon: FileText,
    content: [
      '14-day money-back guarantee from date of purchase, no questions asked.',
      'After 14 days, founder purchases are non-refundable as they represent lifetime value.',
      'If you experience technical issues preventing platform use, contact support for resolution.',
      'Chargebacks or payment disputes will result in immediate account termination.',
    ],
  },
]

const faqs = [
  {
    question: 'What happens if I exceed my monthly API allocation?',
    answer: 'You can purchase additional API calls at your discounted founder rate ($0.10-$0.15/call vs $0.25 standard). There\'s no hard cap - you\'ll just be billed for overages at your tier\'s rate.',
  },
  {
    question: 'Can I upgrade between founder tiers?',
    answer: 'Yes, during the founding period you can upgrade by paying the difference. For example, Silver ($199) to Gold ($249) = $50 upgrade fee. Downgrades are not available.',
  },
  {
    question: 'Are founder benefits really lifetime?',
    answer: 'Yes. As long as AgentWorks exists as a platform, your founder benefits remain active. We\'ve structured the pricing to be sustainable long-term. You\'re getting ~6-12 months equivalent value upfront.',
  },
  {
    question: 'What if AgentWorks gets acquired or shuts down?',
    answer: 'In case of acquisition, we\'ll work with the acquiring company to honor founder terms. If that\'s not possible, or if we shut down, you\'ll receive a 12-month pro-rata refund based on the equivalent monthly value.',
  },
  {
    question: 'Can I use my founder account for client work?',
    answer: 'Yes, you can use AgentWorks for client projects. However, you cannot resell access or let clients use your account directly. Each user needs their own account.',
  },
  {
    question: 'How do affiliate commissions work for founders?',
    answer: 'You\'re auto-enrolled at your tier\'s affiliate level (30-40%). When someone purchases through your link, you earn commission on their purchase plus a bonus ($50-$100). Commissions are paid monthly via PayPal or Stripe.',
  },
  {
    question: 'What\'s included in "lifetime access"?',
    answer: 'All current and future features, agents, and capabilities. As we add new LLM providers, agents, and tools, they\'re automatically included. Your API allocation stays the same, but you get access to everything.',
  },
  {
    question: 'Is there a limit to how many projects I can create?',
    answer: 'No. Founders get unlimited projects and workspaces. The only limit is your monthly API allocation, which you can exceed at your reduced overage rate.',
  },
]

export default function FounderTerms() {
  const [openTerms, setOpenTerms] = useState<string[]>([])
  const [openFaqs, setOpenFaqs] = useState<number[]>([])

  const toggleTerm = (id: string) => {
    setOpenTerms(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const toggleFaq = (index: number) => {
    setOpenFaqs(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
              Terms & <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Restrictions</span>
            </h2>
            <p className="text-slate-600">
              We believe in transparency. Here's exactly what you're agreeing to.
            </p>
          </motion.div>

          <div className="space-y-3 mb-16">
            {terms.map((term, index) => (
              <motion.div
                key={term.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm"
              >
                <button
                  onClick={() => toggleTerm(term.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <term.icon className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-900">{term.title}</span>
                  </div>
                  <motion.div
                    animate={{ rotate: openTerms.includes(term.id) ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openTerms.includes(term.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 pt-0">
                        <ul className="space-y-2">
                          {term.content.map((item, i) => (
                            <li key={i} className="text-slate-600 text-sm flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold mb-4 text-slate-900">
              Frequently Asked <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Questions</span>
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-medium text-slate-900 pr-4">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFaqs.includes(index) ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaqs.includes(index) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 pt-0">
                        <p className="text-slate-600 text-sm">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

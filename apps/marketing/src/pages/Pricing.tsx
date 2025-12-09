import { motion } from 'framer-motion'
import PricingCards from '../components/PricingCards'
import { HelpCircle } from 'lucide-react'

const faqs = [
  {
    question: 'What counts as an "agent run"?',
    answer: 'Each time an agent executes a task (e.g., generating code, reviewing PRD, running tests), it counts as one run. Complex tasks may require multiple runs across different agents.',
  },
  {
    question: 'Can I mix and match LLM providers?',
    answer: 'Yes! AgentWorks automatically routes tasks to the best provider. Strategy tasks use GPT-4, development uses Claude, and troubleshooting uses Gemini. You can also customize provider preferences.',
  },
  {
    question: 'How is usage billed?',
    answer: 'We use transparent 2× markup pricing with $0.25 increments. You see real-time costs in the dashboard. Pro plan includes 100 runs/day, Enterprise is unlimited.',
  },
  {
    question: 'Can I self-host AgentWorks?',
    answer: 'Enterprise plan includes an on-premise option. Contact our sales team for infrastructure requirements and licensing.',
  },
  {
    question: 'What happens if I exceed my daily limit?',
    answer: 'You can purchase additional runs on-demand at the same rate, or upgrade to a higher tier. We\'ll notify you at 80% usage.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes, we offer a 14-day money-back guarantee. If AgentWorks doesn\'t work for your workflow, we\'ll refund your subscription.',
  },
]

export default function Pricing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-32"
    >
      <PricingCards />

      <section className="py-20">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6">
              <HelpCircle className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-medium text-dark-300">
                Frequently Asked Questions
              </span>
            </div>
            <h2 className="text-4xl font-bold mb-6">
              Got <span className="gradient-text">Questions</span>?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-3">{faq.question}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  )
}

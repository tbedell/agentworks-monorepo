import { motion } from 'framer-motion'
import Hero from '../components/Hero'
import KanbanDemo from '../components/KanbanDemo'
import AgentWorkflow from '../components/AgentWorkflow'
import Features from '../components/Features'
import ComparisonTable from '../components/ComparisonTable'
import PricingCards from '../components/PricingCards'
import CTASection from '../components/CTASection'

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Hero />
      <KanbanDemo />
      <AgentWorkflow />
      <Features />
      <ComparisonTable />
      <PricingCards />
      <CTASection />
    </motion.div>
  )
}

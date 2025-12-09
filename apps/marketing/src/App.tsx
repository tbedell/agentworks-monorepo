import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { WaitlistProvider } from './hooks/useWaitlist'
import Layout from './components/Layout'
import Home from './pages/Home'
import Features from './pages/Features'
import Pricing from './pages/Pricing'
import Compare from './pages/Compare'
import Waitlist from './pages/Waitlist'
import Affiliate from './pages/Affiliate'

export default function App() {
  return (
    <WaitlistProvider>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="features" element={<Features />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="compare" element={<Compare />} />
            <Route path="waitlist" element={<Waitlist />} />
            <Route path="affiliate" element={<Affiliate />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </WaitlistProvider>
  )
}

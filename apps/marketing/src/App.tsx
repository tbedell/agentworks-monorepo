import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { WaitlistProvider } from './hooks/useWaitlist'
import HomeV2 from './pages/HomeV2'
import Waitlist from './pages/Waitlist'
import PricingV2 from './pages/PricingV2'
import CompareV2 from './pages/CompareV2'
import BYOA from './pages/BYOA'
import FeaturesV2 from './pages/FeaturesV2'

export default function App() {
  return (
    <WaitlistProvider>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Marketing page - light mode matching web app */}
          <Route path="/" element={<HomeV2 />} />
          {/* Features */}
          <Route path="/features" element={<FeaturesV2 />} />
          {/* Pricing */}
          <Route path="/pricing" element={<PricingV2 />} />
          {/* Compare */}
          <Route path="/compare" element={<CompareV2 />} />
          {/* BYOA */}
          <Route path="/byoa" element={<BYOA />} />
          {/* Waitlist */}
          <Route path="/waitlist" element={<Waitlist />} />
        </Routes>
      </AnimatePresence>
    </WaitlistProvider>
  )
}

import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { WaitlistProvider } from './hooks/useWaitlist'
import HomeV2 from './pages/HomeV2'
import Waitlist from './pages/Waitlist'
import PricingV2 from './pages/PricingV2'
import CompareV2 from './pages/CompareV2'
import BYOA from './pages/BYOA'
import FeaturesV2 from './pages/FeaturesV2'
import Login from './pages/Login'
import Register from './pages/Register'
import Affiliate from './pages/Affiliate'

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
          {/* Founders (was waitlist) */}
          <Route path="/founders" element={<Waitlist />} />
          <Route path="/waitlist" element={<Waitlist />} />
          {/* Affiliates / Partners */}
          <Route path="/affiliates" element={<Affiliate />} />
          <Route path="/affiliate" element={<Affiliate />} />
          <Route path="/partners" element={<Affiliate />} />
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </AnimatePresence>
    </WaitlistProvider>
  )
}

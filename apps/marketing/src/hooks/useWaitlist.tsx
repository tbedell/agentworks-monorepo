import { createContext, useContext, useState, ReactNode } from 'react'
import WaitlistModal from '../components/WaitlistModal'

interface WaitlistContextType {
  openWaitlist: () => void
  closeWaitlist: () => void
  isOpen: boolean
}

const WaitlistContext = createContext<WaitlistContextType | undefined>(undefined)

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openWaitlist = () => setIsOpen(true)
  const closeWaitlist = () => setIsOpen(false)

  return (
    <WaitlistContext.Provider value={{ openWaitlist, closeWaitlist, isOpen }}>
      {children}
      <WaitlistModal isOpen={isOpen} onClose={closeWaitlist} />
    </WaitlistContext.Provider>
  )
}

export function useWaitlist() {
  const context = useContext(WaitlistContext)
  if (context === undefined) {
    throw new Error('useWaitlist must be used within a WaitlistProvider')
  }
  return context
}

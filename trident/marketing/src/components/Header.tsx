import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <nav className="container-wide flex items-center justify-between py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="text-3xl">🔱</div>
          <span className="text-xl font-bold text-trident-navy">
            AgentWorks <span className="text-trident-gold">Trident</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-gray-600 hover:text-trident-navy transition-colors">
            Home
          </Link>
          <a href="#industries" className="text-gray-600 hover:text-trident-navy transition-colors">
            Industries
          </a>
          <a href="#how-it-works" className="text-gray-600 hover:text-trident-navy transition-colors">
            How It Works
          </a>
          <Link to="/agency" className="text-gray-600 hover:text-trident-navy transition-colors">
            For Agencies
          </Link>
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://app.agentworksstudio.com"
            className="text-trident-navy font-medium hover:text-trident-blue-700 transition-colors"
          >
            Sign In
          </a>
          <a href="#waitlist" className="btn-primary">
            Get Early Access
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-trident-navy" />
          ) : (
            <Menu className="w-6 h-6 text-trident-navy" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4">
          <div className="container-wide flex flex-col gap-4">
            <Link
              to="/"
              className="text-gray-600 hover:text-trident-navy transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <a
              href="#industries"
              className="text-gray-600 hover:text-trident-navy transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Industries
            </a>
            <a
              href="#how-it-works"
              className="text-gray-600 hover:text-trident-navy transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </a>
            <Link
              to="/agency"
              className="text-gray-600 hover:text-trident-navy transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              For Agencies
            </Link>
            <a href="#waitlist" className="btn-primary text-center mt-2">
              Get Early Access
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

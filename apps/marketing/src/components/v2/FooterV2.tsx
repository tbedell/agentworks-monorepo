import { Link } from 'react-router-dom'
import { Sparkles, Twitter, Linkedin, Github } from 'lucide-react'

const footerLinks = {
  product: [
    { name: 'Features', href: '/v2/features' },
    { name: 'Pricing', href: '/v2/pricing' },
    { name: 'Compare', href: '/v2/compare' },
    { name: 'Waitlist', href: '/waitlist' },
  ],
  company: [
    { name: 'About', href: '/v2/about' },
    { name: 'Blog', href: '/v2/blog' },
    { name: 'Careers', href: '/v2/careers' },
    { name: 'Contact', href: '/v2/contact' },
  ],
  legal: [
    { name: 'Privacy', href: '/v2/privacy' },
    { name: 'Terms', href: '/v2/terms' },
  ],
}

const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/agentworks' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/agentworks' },
  { name: 'GitHub', icon: Github, href: 'https://github.com/agentworks' },
]

export default function FooterV2() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/v2" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-800">AgentWorks</span>
            </Link>
            <p className="text-sm text-slate-500 mb-4">
              AI-powered development on a visual Kanban board. 11 specialist agents working in harmony.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-500 text-center">
            &copy; {new Date().getFullYear()} AgentWorks. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  Package,
  BarChart3,
  DollarSign,
  Users,
  Zap,
  CheckCircle,
  ArrowRight,
  Building2,
  Laptop,
  Headphones,
  TrendingUp,
  Shield,
  Clock,
} from 'lucide-react';
import { useState } from 'react';

// Pricing tiers
const pricingTiers = [
  {
    name: 'Starter',
    price: 297,
    description: 'For agencies just getting started',
    features: [
      'Up to 10 client sub-accounts',
      'Basic white-label branding',
      'Email support',
      'Access to Workflow Store',
      'Insight Dashboard',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Growth',
    price: 497,
    description: 'For scaling agencies',
    features: [
      'Unlimited client sub-accounts',
      'Full white-label branding',
      'Priority support',
      'Custom domain support',
      'Advanced analytics',
      'Workflow Store access',
      'API access',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: null,
    description: 'For large agencies & MSPs',
    features: [
      'Everything in Growth',
      'Dedicated success manager',
      'Custom development',
      'SLA guarantee',
      'On-premise option',
      'Volume discounts',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

// The 3 Hooks
const hooks = [
  {
    icon: Package,
    title: 'Productize Your Services',
    description:
      'Turn your manual services (SEO, lead gen, reporting) into automated Asset Workflows. Build once, deploy to hundreds of clients.',
  },
  {
    icon: BarChart3,
    title: 'Client Insight Portal',
    description:
      'Give clients a login where they can see the work happening (Kanban) and track the KPIs (Dashboard). No more "what did I pay for?"',
  },
  {
    icon: DollarSign,
    title: 'Keep 100% of the Upsell',
    description:
      'We charge you a flat monthly fee. You charge your clients whatever you want. 10 clients at $100/mo = $1,000 revenue on your $497 cost.',
  },
];

// Comparison table
const comparison = [
  { metric: 'Productivity', before: '1x (manual fulfillment)', after: '10x improvement' },
  { metric: 'ROI Visibility', before: '"Trust me, we\'re working"', after: 'Dashboard with proof' },
  { metric: 'Effort', before: 'High (hiring, training)', after: 'Low (deploy workflows)' },
  { metric: 'Resources', before: 'Large fulfillment teams', after: 'Lean operations' },
  { metric: 'Client Retention', before: 'Churn from uncertainty', after: 'Retention from results' },
];

// Agency profiles
const agencyProfiles = [
  { icon: TrendingUp, name: 'Marketing Agencies', description: 'Automate lead gen, reporting, client communication' },
  { icon: Laptop, name: 'IT Consultancies', description: 'Deploy AI assistants for SMB clients' },
  { icon: Headphones, name: 'MSPs', description: 'Bundle with managed IT services' },
  { icon: Users, name: 'Fractional Executives', description: 'Implement operational AI for clients' },
  { icon: Building2, name: 'Industry Specialists', description: 'Vertical-specific (dental, legal, construction)' },
];

export default function AgencyPage() {
  const [formData, setFormData] = useState({
    email: '',
    agencyName: '',
    size: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit to API
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 gradient-bg text-white relative overflow-hidden">
        <div className="container-wide relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <Building2 className="w-4 h-4 text-trident-gold" />
              <span className="text-sm font-medium">AgentWorks AgencyOS</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Your Agency.
              <br />
              <span className="text-trident-gold">Powered by an AI Workforce.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Stop hiring more humans to scale your agency. Deploy white-labeled AI Agents
              to handle fulfillment, reporting, and operations for your clients.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#waitlist" className="btn-gold text-lg px-8 py-4">
                Join the Agency Waitlist
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
              <a href="#pricing" className="btn-secondary border-white text-white hover:bg-white hover:text-trident-navy text-lg px-8 py-4">
                View Pricing
              </a>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-trident-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
      </section>

      {/* The 3 Hooks */}
      <section className="section bg-white">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-trident-navy mb-4">
              The Agency Advantage
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three reasons agencies are switching to AgentWorks Trident.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {hooks.map((hook) => {
              const Icon = hook.icon;
              return (
                <div key={hook.title} className="card text-center">
                  <div className="inline-flex p-4 rounded-xl bg-trident-blue-100 text-trident-navy mb-6">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-trident-navy mb-3">
                    {hook.title}
                  </h3>
                  <p className="text-gray-600">
                    {hook.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10x Comparison */}
      <section className="section bg-gray-50">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-trident-navy mb-4">
              The 10x Productivity Promise
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See how agencies transform their operations with AgencyOS.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="grid grid-cols-3 bg-trident-navy text-white font-semibold">
                <div className="p-4">Metric</div>
                <div className="p-4 text-center">Before AgencyOS</div>
                <div className="p-4 text-center bg-trident-gold text-trident-navy">With AgencyOS</div>
              </div>
              {comparison.map((row, index) => (
                <div
                  key={row.metric}
                  className={`grid grid-cols-3 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <div className="p-4 font-medium text-trident-navy">{row.metric}</div>
                  <div className="p-4 text-center text-gray-500">{row.before}</div>
                  <div className="p-4 text-center text-trident-navy font-semibold bg-trident-gold/10">
                    {row.after}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Agency Profiles */}
      <section className="section bg-white">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-trident-navy mb-4">
              Built for Agencies Like Yours
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {agencyProfiles.map((profile) => {
              const Icon = profile.icon;
              return (
                <div key={profile.name} className="card-hover text-center">
                  <div className="inline-flex p-3 rounded-xl bg-trident-blue-100 text-trident-navy mb-3">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-trident-navy text-sm mb-1">
                    {profile.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {profile.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="section bg-gray-50">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-trident-navy mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Flat monthly fee. Unlimited upside for your agency.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`card relative ${
                  tier.popular ? 'border-2 border-trident-gold shadow-xl scale-105' : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-trident-gold text-trident-navy px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-bold text-trident-navy mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-500 text-sm mb-4">{tier.description}</p>

                <div className="mb-6">
                  {tier.price ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-trident-navy">
                        ${tier.price}
                      </span>
                      <span className="text-gray-500">/month</span>
                    </div>
                  ) : (
                    <span className="text-4xl font-bold text-trident-navy">
                      Custom
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-5 h-5 text-trident-gold flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full ${
                    tier.popular ? 'btn-gold' : 'btn-secondary'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Value Prop */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 bg-trident-blue-100 text-trident-navy rounded-full px-6 py-3">
              <Zap className="w-5 h-5" />
              <span className="font-medium">
                10 clients at $100/mo = $1,000 revenue on your $497 cost = $503 profit
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="section bg-white">
        <div className="container-wide">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <Shield className="w-12 h-12 text-trident-gold mx-auto mb-4" />
              <h3 className="font-bold text-trident-navy mb-2">Enterprise Security</h3>
              <p className="text-gray-600 text-sm">
                SOC 2 compliant. All data encrypted at rest and in transit.
              </p>
            </div>
            <div>
              <Clock className="w-12 h-12 text-trident-gold mx-auto mb-4" />
              <h3 className="font-bold text-trident-navy mb-2">Quick Setup</h3>
              <p className="text-gray-600 text-sm">
                Deploy your first client workflow in under 30 minutes.
              </p>
            </div>
            <div>
              <Headphones className="w-12 h-12 text-trident-gold mx-auto mb-4" />
              <h3 className="font-bold text-trident-navy mb-2">Priority Support</h3>
              <p className="text-gray-600 text-sm">
                Dedicated support for agency partners. We help you succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Agency Waitlist CTA */}
      <section id="waitlist" className="section gradient-bg text-white">
        <div className="container-narrow">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Agency?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-xl mx-auto">
              Join the agency waitlist. Be among the first to get access to AgencyOS.
            </p>

            {submitted ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 max-w-md mx-auto">
                <CheckCircle className="w-16 h-16 text-trident-gold mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Welcome to the Agency Partner Program!</h3>
                <p className="text-blue-100">
                  We'll reach out within 24 hours to discuss your agency's needs.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
                <div className="space-y-4">
                  <input
                    type="email"
                    required
                    placeholder="Work email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-trident-gold"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Agency name"
                    value={formData.agencyName}
                    onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-trident-gold"
                  />
                  <select
                    required
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-trident-gold"
                  >
                    <option value="">Number of clients</option>
                    <option value="1-10">1-10 clients</option>
                    <option value="11-50">11-50 clients</option>
                    <option value="51-100">51-100 clients</option>
                    <option value="100+">100+ clients</option>
                  </select>
                  <button type="submit" className="w-full btn-gold text-lg py-4">
                    Join the Agency Waitlist
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
                <p className="text-sm text-blue-200 mt-4">
                  Priority access for agencies with 50+ clients.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

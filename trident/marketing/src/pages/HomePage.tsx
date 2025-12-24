import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  Zap,
  Users,
  Target,
  DollarSign,
  Heart,
  HardHat,
  Scale,
  Home,
  ShoppingCart,
  Building2,
  ArrowRight,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

// Industry data
const industries = [
  { id: 'finance', name: 'Finance', icon: DollarSign, color: 'bg-emerald-100 text-emerald-700', count: 8 },
  { id: 'sales', name: 'Sales', icon: TrendingUp, color: 'bg-amber-100 text-amber-700', count: 8 },
  { id: 'hr', name: 'HR', icon: Users, color: 'bg-violet-100 text-violet-700', count: 6 },
  { id: 'healthcare', name: 'Healthcare', icon: Heart, color: 'bg-red-100 text-red-700', count: 6 },
  { id: 'construction', name: 'Construction', icon: HardHat, color: 'bg-orange-100 text-orange-700', count: 6 },
  { id: 'legal', name: 'Legal', icon: Scale, color: 'bg-indigo-100 text-indigo-700', count: 5 },
  { id: 'realEstate', name: 'Real Estate', icon: Home, color: 'bg-teal-100 text-teal-700', count: 5 },
  { id: 'ecommerce', name: 'E-Commerce', icon: ShoppingCart, color: 'bg-pink-100 text-pink-700', count: 4 },
  { id: 'professional', name: 'Professional', icon: Building2, color: 'bg-slate-100 text-slate-700', count: 4 },
];

// Featured blueprints
const featuredBlueprints = [
  {
    name: 'Invoice Chaser Bot',
    industry: 'Finance',
    description: 'Automated AR collection with escalating reminders',
    velocity: '45 → 7 days AR',
    leverage: '500 accounts/manager',
    precision: '99.9% follow-up',
  },
  {
    name: 'Lead Resurrection',
    industry: 'Sales',
    description: 'Re-engage cold leads with personalized outreach',
    velocity: 'Re-engage in 24hrs',
    leverage: '1000 leads/rep',
    precision: '100% sequence',
  },
  {
    name: 'Patient Adherence',
    industry: 'Healthcare',
    description: 'Medication and appointment reminders',
    velocity: 'Same-day reminders',
    leverage: '5000 patients/staff',
    precision: '95% show rate',
  },
];

export default function HomePage() {
  const [email, setEmail] = useState('');
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
      <section className="pt-32 pb-20 gradient-bg text-white">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <span className="text-trident-gold">🔱</span>
              <span className="text-sm font-medium">Service-as-Software Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Your AI Workforce.
              <br />
              <span className="text-trident-gold">Deployed in One Click.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Stop hiring humans for repeatable processes. Install pre-built AI workflows
              that run your business operations 24/7.
            </p>

            {/* Trident Values */}
            <div className="flex flex-wrap justify-center gap-6 mb-10">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-trident-gold" />
                <span className="font-semibold">VELOCITY</span>
                <span className="text-blue-200">100x faster</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-trident-gold" />
                <span className="font-semibold">LEVERAGE</span>
                <span className="text-blue-200">1:100 ratio</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-trident-gold" />
                <span className="font-semibold">PRECISION</span>
                <span className="text-blue-200">Zero errors</span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#waitlist" className="btn-gold text-lg px-8 py-4">
                Get Early Access
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
              <a href="#how-it-works" className="btn-secondary border-white text-white hover:bg-white hover:text-trident-navy text-lg px-8 py-4">
                See How It Works
              </a>
            </div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="section bg-white">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-trident-navy mb-4">
              50+ Workflows Across 9 Industries
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Pre-built AI workflows for every business process. One-click install.
              No coding required.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {industries.map((industry) => {
              const Icon = industry.icon;
              return (
                <div
                  key={industry.id}
                  className="card-hover text-center group"
                >
                  <div className={`inline-flex p-3 rounded-xl ${industry.color} mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-trident-navy mb-1">
                    {industry.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {industry.count} workflows
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Blueprints */}
      <section className="section bg-gray-50">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-trident-navy mb-4">
              Featured Workflows
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Install in minutes. Run forever.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredBlueprints.map((blueprint) => (
              <div key={blueprint.name} className="card">
                <div className="flex items-center gap-2 mb-4">
                  <span className="industry-badge bg-trident-blue-100 text-trident-navy">
                    {blueprint.industry}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-trident-navy mb-2">
                  {blueprint.name}
                </h3>
                <p className="text-gray-600 mb-6">
                  {blueprint.description}
                </p>

                {/* Trident Metrics */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-trident-gold" />
                    <span className="font-medium">VELOCITY:</span>
                    <span className="text-gray-600">{blueprint.velocity}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-trident-gold" />
                    <span className="font-medium">LEVERAGE:</span>
                    <span className="text-gray-600">{blueprint.leverage}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-trident-gold" />
                    <span className="font-medium">PRECISION:</span>
                    <span className="text-gray-600">{blueprint.precision}</span>
                  </div>
                </div>

                <button className="w-full btn-primary">
                  Install Workflow
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="section bg-white">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-trident-navy mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From install to running in under 10 minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-trident-navy text-white text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-trident-navy mb-3">
                Choose a Workflow
              </h3>
              <p className="text-gray-600">
                Browse 50+ industry-specific workflows. Find the one that matches
                your business process.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-trident-navy text-white text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-trident-navy mb-3">
                Connect Your Tools
              </h3>
              <p className="text-gray-600">
                One-click OAuth connection to your existing tools. QuickBooks, Gmail,
                Stripe, and more.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-trident-navy text-white text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-trident-navy mb-3">
                Watch It Run
              </h3>
              <p className="text-gray-600">
                Your AI agent handles the process 24/7. Track progress and ROI
                on your dashboard.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-8 text-gray-500">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>10 min setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>No coding required</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>ROI in week 1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist CTA */}
      <section id="waitlist" className="section gradient-bg text-white">
        <div className="container-narrow">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Deploy Your AI Workforce?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-xl mx-auto">
              Join the waitlist for early access. Be among the first to automate
              your business operations.
            </p>

            {submitted ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 max-w-md mx-auto">
                <CheckCircle className="w-16 h-16 text-trident-gold mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">You're on the list!</h3>
                <p className="text-blue-100">
                  We'll notify you when Trident is ready for early access.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-trident-gold"
                  />
                  <button type="submit" className="btn-gold whitespace-nowrap">
                    Get Early Access
                  </button>
                </div>
                <p className="text-sm text-blue-200 mt-3">
                  No spam. Unsubscribe anytime.
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

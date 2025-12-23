import { useState } from 'react';
import {
  TrendingUp,
  Target,
  Users,
  DollarSign,
  Rocket,
  Building2,
  Shield,
  Zap,
  Crown,
  ArrowRight,
  Lock,
  Bot,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from 'recharts';

// Market growth data (Vibe Coding market in billions)
const marketGrowthData = [
  { year: 2025, value: 3.9, label: '$3.9B' },
  { year: 2026, value: 5.2, label: '$5.2B' },
  { year: 2027, value: 6.9, label: '$6.9B' },
  { year: 2028, value: 9.1, label: '$9.1B' },
  { year: 2029, value: 16.0, label: '$16B' },
  { year: 2030, value: 42.0, label: '$42B' },
  { year: 2031, value: 120.0, label: '$120B' },
  { year: 2032, value: 325.0, label: '$325B' },
];

// AgentWorks projections
const projectionData = [
  { year: 2025, users: 5, subscribers: 0.5, arr: 0.5, valuation: 25, phase: 1 },
  { year: 2026, users: 150, subscribers: 25, arr: 12, valuation: 120, phase: 1 },
  { year: 2027, users: 750, subscribers: 100, arr: 60, valuation: 600, phase: 1 },
  { year: 2028, users: 2500, subscribers: 400, arr: 250, valuation: 3000, phase: 2 },
  { year: 2029, users: 8000, subscribers: 1200, arr: 800, valuation: 10000, phase: 2 },
  { year: 2030, users: 20000, subscribers: 3500, arr: 2500, valuation: 35000, phase: 2 },
  { year: 2031, users: 45000, subscribers: 8000, arr: 5500, valuation: 75000, phase: 3 },
  { year: 2032, users: 80000, subscribers: 15000, arr: 10000, valuation: 120000, phase: 3 },
];

// Phase definitions
const phases = [
  {
    id: 1,
    name: 'Build & Breach',
    years: '2025-2027',
    focus: 'Converting the Waitlist, finding Product-Market Fit (PMF), and poaching dissatisfied Bubble/Replit users.',
    color: 'from-blue-500 to-cyan-500',
    milestones: [
      { year: 2025, label: 'Launch', users: '5K', subscribers: '500', arr: '$0.5M', valuation: '$25M', status: 'Niche Player' },
      { year: 2026, label: 'Growth', users: '150K', subscribers: '25K', arr: '$12M', valuation: '$120M', status: 'Rising Star' },
      { year: 2027, label: 'Scale', users: '750K', subscribers: '100K', arr: '$60M', valuation: '$600M', status: 'Top 5 Platform' },
    ],
  },
  {
    id: 2,
    name: 'Hyper-Growth',
    years: '2028-2030',
    focus: 'Overtaking incumbents. The "Vibe Coding" market matures; AgentWorks becomes the standard for "Agentic SaaS Development."',
    color: 'from-purple-500 to-pink-500',
    milestones: [
      { year: 2028, label: 'Unicorn', users: '2.5M', subscribers: '400K', arr: '$250M', valuation: '$3B', status: 'Major Challenger' },
      { year: 2029, label: 'Decacorn', users: '8M', subscribers: '1.2M', arr: '$800M', valuation: '$10B', status: '#2 Player' },
      { year: 2030, label: 'The Flip', users: '20M', subscribers: '3.5M', arr: '$2.5B', valuation: '$35B', status: '#1 Global Leader' },
    ],
  },
  {
    id: 3,
    name: 'Dominance & Exit',
    years: '2031-2032',
    focus: 'Institutional adoption, massive margins, and preparation for liquidity event.',
    color: 'from-amber-500 to-orange-500',
    milestones: [
      { year: 2031, label: 'Dominance', users: '45M', subscribers: '8M', arr: '$5.5B', valuation: '$75B', status: 'Market Leader' },
      { year: 2032, label: 'Exit Year', users: '80M', subscribers: '15M', arr: '$10B', valuation: '$120B', status: 'IPO Ready' },
    ],
  },
];

// Competitor data
const competitors = [
  {
    name: 'Replit',
    logo: '🔄',
    moat: 'Community & Deployment. They own the "newbie" market and hosting.',
    killerMove: 'Enterprise-Grade Architecture. Replit scales poorly for complex apps. AgentWorks will offer "Day 1 Scalability" with multi-agent architecture.',
    color: 'bg-orange-100 border-orange-300',
  },
  {
    name: 'Cursor',
    logo: '▶️',
    moat: 'Professional Workflow. They own the VS Code fork for pros.',
    killerMove: 'Abstracting the IDE. Cursor requires you to be a coder. AgentWorks will target the "Product Owner" who manages agents, not syntax.',
    color: 'bg-purple-100 border-purple-300',
  },
  {
    name: 'Bubble',
    logo: '🫧',
    moat: 'Visual Building. They own the legacy no-code drag-and-drop.',
    killerMove: 'AI-Native Flexibility. Bubble is rigid and proprietary. AgentWorks will export clean, standard code (React/Node/Python), eliminating vendor lock-in.',
    color: 'bg-blue-100 border-blue-300',
  },
];

// Strategy pillars
const strategyPillars = [
  {
    icon: Lock,
    title: 'The "No-Lock-In" Promise',
    description: 'Unlike Bubble (where you are stuck), AgentWorks promises that users own their code. Agents generate standard GitHub repositories. This is the #1 objection to current vibe coding tools.',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: Bot,
    title: 'The "Manager" Interface',
    description: "Don't build a better text editor. Build a better Project Manager. The user should chat with a 'Product Manager Agent' who then directs a 'Coding Agent' and a 'Design Agent.'",
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Users,
    title: 'Community-Led Growth',
    description: "Use the 'Founding Members' bankroll to subsidize heavy compute for the first 100,000 users. Free tier must be better than Replit's paid tier to drain their user base.",
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
];

// Exit routes
const exitRoutes = [
  {
    type: 'Primary',
    name: 'IPO (NASDAQ: AGNT)',
    description: 'At $10B ARR, AgentWorks would be one of the largest software IPOs of the decade.',
    icon: TrendingUp,
    highlight: true,
  },
  {
    type: 'Strategic',
    name: 'Microsoft',
    description: 'To replace/augment GitHub Copilot.',
    icon: Building2,
  },
  {
    type: 'Strategic',
    name: 'Salesforce',
    description: 'To own the application layer of the Agentic web.',
    icon: Building2,
  },
  {
    type: 'Strategic',
    name: 'Google',
    description: 'To integrate deeply with Gemini/GCP infrastructure.',
    icon: Building2,
  },
];

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700">
        <p className="font-semibold text-lg">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('$') || entry.dataKey === 'value' || entry.dataKey === 'arr' || entry.dataKey === 'valuation'
              ? `$${entry.value}${entry.dataKey === 'value' ? 'B' : entry.dataKey === 'arr' ? 'M' : 'M'}`
              : `${entry.value}K`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MarketReport() {
  const [activePhase, setActivePhase] = useState(1);

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
          <Shield className="w-4 h-4" />
          CONFIDENTIAL - FOUNDING MEMBERS ONLY
        </div>
        <h1 className="text-3xl font-bold mb-2">
          Executive Strategic Report: AgentWorks Studio vs. The Market
        </h1>
        <p className="text-slate-400 text-lg">
          Market Positioning & Financial Roadmap to Market Leadership (2025-2032)
        </p>
        <div className="flex items-center gap-6 mt-6">
          <div className="text-sm">
            <span className="text-slate-400">From:</span>{' '}
            <span className="text-white">Strategy & Forecasting Team</span>
          </div>
          <div className="text-sm">
            <span className="text-slate-400">Date:</span>{' '}
            <span className="text-white">December 22, 2025</span>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Executive Summary
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <p className="text-sm text-blue-600 font-medium mb-1">Market 2025</p>
            <p className="text-4xl font-bold text-slate-900">$3.9B</p>
            <p className="text-sm text-slate-500 mt-1">Vibe Coding Market</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <p className="text-sm text-purple-600 font-medium mb-1">Market 2032</p>
            <p className="text-4xl font-bold text-slate-900">$325B</p>
            <p className="text-sm text-slate-500 mt-1">Projected Market Size</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <p className="text-sm text-green-600 font-medium mb-1">CAGR</p>
            <p className="text-4xl font-bold text-slate-900">32.5%</p>
            <p className="text-sm text-slate-500 mt-1">Annual Growth Rate</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">The AgentWorks Thesis</h3>
          <p className="text-slate-600 leading-relaxed">
            The next phase of Vibe Coding is not just "writing code" but <strong>orchestrating products</strong>.
            As competitors fight over autocomplete and chat interfaces, AgentWorks Studio will position itself as the
            <span className="text-blue-600 font-semibold"> "Orchestration Layer"</span>—the first platform designed to
            manage teams of agents (Designers, Architects, Coders, QA) rather than just a single coding assistant.
          </p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 font-medium">
              <Rocket className="w-4 h-4 inline mr-2" />
              Goal: Leverage founding capital to aggressively capture market share, surpassing legacy No-Code (Bubble) by 2027
              and current AI-Native leaders (Replit) by 2030, culminating in a <strong>$50B+ IPO or Strategic Exit by 2032</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Market Growth Chart */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Vibe Coding Market Growth (2025-2032)
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={marketGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="marketGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" stroke="#64748b" />
              <YAxis stroke="#64748b" tickFormatter={(v) => `$${v}B`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#marketGradient)"
                name="Market Size"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-slate-500 text-sm mt-4">
          Source: Industry projections based on current AI development trends and market analysis
        </p>
      </div>

      {/* Competitive Positioning */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600" />
          Comparative Positioning
        </h2>
        <p className="text-slate-600 mb-6">
          We are entering a crowded but fragmented market. Here is how AgentWorks displaces the "Big Three":
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-4 font-semibold text-slate-700">Competitor</th>
                <th className="text-left p-4 font-semibold text-slate-700">Their Current "Moat"</th>
                <th className="text-left p-4 font-semibold text-slate-700">The AgentWorks "Killer Move"</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((comp, idx) => (
                <tr key={comp.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{comp.logo}</span>
                      <span className="font-semibold text-slate-900">{comp.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{comp.moat}</td>
                  <td className="p-4">
                    <span className="text-green-700 font-medium">{comp.killerMove}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Projections */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Financial Projections (2025-2032)
        </h2>

        {/* Phase Tabs */}
        <div className="flex gap-2 mb-6">
          {phases.map((phase) => (
            <button
              key={phase.id}
              onClick={() => setActivePhase(phase.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activePhase === phase.id
                  ? `bg-gradient-to-r ${phase.color} text-white shadow-lg`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Phase {phase.id}: {phase.name}
            </button>
          ))}
        </div>

        {/* Active Phase Content */}
        {phases.filter(p => p.id === activePhase).map((phase) => (
          <div key={phase.id}>
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  Phase {phase.id}: {phase.name} ({phase.years})
                </h3>
              </div>
              <p className="text-slate-600">{phase.focus}</p>
            </div>

            {/* Milestone Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {phase.milestones.map((milestone) => (
                <div
                  key={milestone.year}
                  className={`rounded-xl p-6 bg-gradient-to-br ${phase.color} text-white`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold">{milestone.year}</span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                      {milestone.label}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/80">Active Users</span>
                      <span className="font-semibold">{milestone.users}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Subscribers</span>
                      <span className="font-semibold">{milestone.subscribers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">ARR</span>
                      <span className="font-semibold">{milestone.arr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Valuation</span>
                      <span className="font-semibold">{milestone.valuation}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <span className="text-sm font-medium">{milestone.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Combined Chart */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">ARR & Valuation Trajectory</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="arrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#64748b" />
                <YAxis yAxisId="left" stroke="#10b981" tickFormatter={(v) => `$${v}M`} />
                <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" tickFormatter={(v) => `$${v}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="arr" fill="#10b981" name="ARR ($M)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="valuation" stroke="#8b5cf6" strokeWidth={3} name="Valuation ($M)" dot={{ fill: '#8b5cf6', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">User & Subscriber Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="subscribersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(v) => `${v}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#usersGradient)" name="Active Users (K)" />
                <Area type="monotone" dataKey="subscribers" stroke="#06b6d4" fillOpacity={1} fill="url(#subscribersGradient)" name="Subscribers (K)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strategic Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-blue-800">
            <strong>Strategic Note:</strong> By 2030, we project overtaking Replit (currently ~$252M ARR in 2025) as they
            struggle to pivot from "education/hobbyist" to "enterprise production," a gap AgentWorks fills from Day 1.
          </p>
        </div>
      </div>

      {/* Path to Number One */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-600" />
          The Path to Number One (Execution Strategy)
        </h2>
        <p className="text-slate-600 mb-6">
          To achieve these numbers, AgentWorks must execute on three pillars:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {strategyPillars.map((pillar) => (
            <div key={pillar.title} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 ${pillar.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                <pillar.icon className={`w-6 h-6 ${pillar.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{pillar.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exit Routes */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Rocket className="w-5 h-5 text-green-600" />
          Potential Exit Routes (2032)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {exitRoutes.map((route) => (
            <div
              key={route.name}
              className={`rounded-xl p-6 ${
                route.highlight
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                  : 'bg-slate-100 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <route.icon className={`w-5 h-5 ${route.highlight ? 'text-white' : 'text-slate-500'}`} />
                <span className={`text-xs font-medium ${route.highlight ? 'text-green-100' : 'text-slate-500'}`}>
                  {route.type}
                </span>
              </div>
              <h3 className={`text-lg font-bold mb-2 ${route.highlight ? 'text-white' : 'text-slate-900'}`}>
                {route.name}
              </h3>
              <p className={`text-sm ${route.highlight ? 'text-green-100' : 'text-slate-600'}`}>
                {route.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Immediate Next Steps */}
      <div className="admin-card p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-400" />
          Immediate Next Steps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold mb-2">Waitlist Activation</h3>
            <p className="text-slate-300 text-sm">
              Aggressively onboard the waitlist into a closed Alpha.
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold mb-2">Differentiation Marketing</h3>
            <p className="text-slate-300 text-sm">
              Launch a campaign targeting "Replit limitation" and "Bubble lock-in" pain points.
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mb-4">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold mb-2">Capital Allocation</h3>
            <p className="text-slate-300 text-sm">
              Direct founding capital toward Compute Subsidies (User Acquisition) and Model Fine-Tuning (Product Differentiation).
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-slate-500 text-sm">
        <p>Confidential Document - AgentWorks Studio Strategy Team</p>
        <p className="mt-1">Last Updated: December 22, 2025</p>
      </div>
    </div>
  );
}

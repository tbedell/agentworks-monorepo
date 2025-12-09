import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { KPICard, KPIGrid } from '@/components/kpi/KPICard';
import { kpiApi } from '@/lib/api';

interface EstimateParams {
  tenants: number;
  apiCallsPerTenant: number;
  modelMix: { economy: number; standard: number; premium: number };
  planMix: { starter: number; pro: number; enterprise: number };
  utilization: number;
}

interface EstimateResult {
  revenue: number;
  costs: { llm: number; infra: number; total: number };
  margin: number;
  profitable: boolean;
  breakEvenTenants: number;
}

export function CostEstimator() {
  const [params, setParams] = useState<EstimateParams>({
    tenants: 500,
    apiCallsPerTenant: 1500,
    modelMix: { economy: 40, standard: 40, premium: 20 },
    planMix: { starter: 20, pro: 60, enterprise: 20 },
    utilization: 50,
  });

  const [result, setResult] = useState<EstimateResult | null>(null);

  const { data: pricing } = useQuery({
    queryKey: ['kpi', 'pricing'],
    queryFn: kpiApi.getPricing,
  });

  const estimateMutation = useMutation({
    mutationFn: (p: EstimateParams) =>
      kpiApi.estimate({
        tenants: p.tenants,
        avgCallsPerTenant: p.apiCallsPerTenant,
        modelMix: p.modelMix,
        planMix: p.planMix,
        utilization: p.utilization,
      }),
    onSuccess: (data) => {
      setResult({
        revenue: data.estimates.monthlyRevenue,
        costs: {
          llm: data.estimates.monthlyCost * 0.7,
          infra: data.estimates.monthlyCost * 0.3,
          total: data.estimates.monthlyCost,
        },
        margin: data.estimates.margin,
        profitable: data.estimates.margin >= 40,
        breakEvenTenants: Math.ceil(data.estimates.monthlyCost / (data.estimates.monthlyRevenue / params.tenants || 1)),
      });
    },
  });

  useEffect(() => {
    const debounce = setTimeout(() => {
      estimateMutation.mutate(params);
    }, 300);
    return () => clearTimeout(debounce);
  }, [params.tenants, params.apiCallsPerTenant, params.modelMix, params.planMix, params.utilization]);

  const updateModelMix = (key: keyof typeof params.modelMix, value: number) => {
    const remaining = 100 - value;
    const others = Object.keys(params.modelMix).filter((k) => k !== key) as Array<
      keyof typeof params.modelMix
    >;
    const otherTotal = others.reduce((sum, k) => sum + params.modelMix[k], 0);

    const newMix = { ...params.modelMix, [key]: value };
    if (otherTotal > 0) {
      others.forEach((k) => {
        newMix[k] = Math.round((params.modelMix[k] / otherTotal) * remaining);
      });
    } else {
      others.forEach((k, i) => {
        newMix[k] = i === 0 ? remaining : 0;
      });
    }

    const total = Object.values(newMix).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      newMix[others[0]] += 100 - total;
    }

    setParams({ ...params, modelMix: newMix });
  };

  const updatePlanMix = (key: keyof typeof params.planMix, value: number) => {
    const remaining = 100 - value;
    const others = Object.keys(params.planMix).filter((k) => k !== key) as Array<
      keyof typeof params.planMix
    >;
    const otherTotal = others.reduce((sum, k) => sum + params.planMix[k], 0);

    const newMix = { ...params.planMix, [key]: value };
    if (otherTotal > 0) {
      others.forEach((k) => {
        newMix[k] = Math.round((params.planMix[k] / otherTotal) * remaining);
      });
    } else {
      others.forEach((k, i) => {
        newMix[k] = i === 0 ? remaining : 0;
      });
    }

    const total = Object.values(newMix).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      newMix[others[0]] += 100 - total;
    }

    setParams({ ...params, planMix: newMix });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/kpi"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Cost Estimator</h1>
          <p className="text-slate-400">Project revenue and costs for different scenarios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-400" />
              Scenario Parameters
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Number of Tenants: <span className="text-white font-bold">{params.tenants}</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="5000"
                  step="10"
                  value={params.tenants}
                  onChange={(e) =>
                    setParams({ ...params, tenants: parseInt(e.target.value) })
                  }
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>10</span>
                  <span>5,000</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Utilization Rate: <span className="text-white font-bold">{params.utilization}%</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={params.utilization}
                  onChange={(e) =>
                    setParams({ ...params, utilization: parseInt(e.target.value) })
                  }
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>10%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-3">Model Mix</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm text-slate-300">Economy</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={params.modelMix.economy}
                      onChange={(e) => updateModelMix('economy', parseInt(e.target.value))}
                      className="flex-1 accent-green-500"
                    />
                    <span className="w-12 text-right text-white">{params.modelMix.economy}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm text-slate-300">Standard</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={params.modelMix.standard}
                      onChange={(e) => updateModelMix('standard', parseInt(e.target.value))}
                      className="flex-1 accent-yellow-500"
                    />
                    <span className="w-12 text-right text-white">{params.modelMix.standard}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm text-slate-300">Premium</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={params.modelMix.premium}
                      onChange={(e) => updateModelMix('premium', parseInt(e.target.value))}
                      className="flex-1 accent-purple-500"
                    />
                    <span className="w-12 text-right text-white">{params.modelMix.premium}%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Economy: ~$0.005/call • Standard: ~$0.025/call • Premium: ~$0.075/call
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-3">Plan Distribution</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm text-slate-300">Starter ($0)</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={params.planMix.starter}
                      onChange={(e) => updatePlanMix('starter', parseInt(e.target.value))}
                      className="flex-1 accent-slate-500"
                    />
                    <span className="w-12 text-right text-white">{params.planMix.starter}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm text-slate-300">Pro ($79)</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={params.planMix.pro}
                      onChange={(e) => updatePlanMix('pro', parseInt(e.target.value))}
                      className="flex-1 accent-blue-500"
                    />
                    <span className="w-12 text-right text-white">{params.planMix.pro}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm text-slate-300">Enterprise ($349)</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={params.planMix.enterprise}
                      onChange={(e) => updatePlanMix('enterprise', parseInt(e.target.value))}
                      className="flex-1 accent-purple-500"
                    />
                    <span className="w-12 text-right text-white">{params.planMix.enterprise}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {pricing && (
            <div className="admin-card">
              <h2 className="text-lg font-semibold text-white mb-4">Reference Pricing</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Plans</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Starter</span>
                      <span className="text-white">$0 (100 calls)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Pro</span>
                      <span className="text-white">$79 (1,500 calls)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Enterprise</span>
                      <span className="text-white">$349 (8,000 calls)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Founder Tiers</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Diamond</span>
                      <span className="text-white">$299 lifetime</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Gold</span>
                      <span className="text-white">$249 lifetime</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Silver</span>
                      <span className="text-white">$199 lifetime</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Thresholds</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Target Margin</span>
                      <span className="text-green-400">≥50%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Warning</span>
                      <span className="text-yellow-400">40-50%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Critical</span>
                      <span className="text-red-400">&lt;40%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div
            className={`admin-card border ${
              result?.profitable
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-red-500/30 bg-red-500/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              {result?.profitable ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
              <h2 className="text-lg font-semibold text-white">
                {result?.profitable ? 'Profitable Scenario' : 'Unprofitable Scenario'}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Monthly Revenue</span>
                <span className="text-green-400 font-bold">
                  ${(result?.revenue || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">LLM Costs</span>
                <span className="text-white">
                  ${(result?.costs.llm || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Infrastructure</span>
                <span className="text-white">
                  ${(result?.costs.infra || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Total Costs</span>
                <span className="text-red-400 font-bold">
                  ${(result?.costs.total || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold">
                <span className="text-white">Net Income</span>
                <span
                  className={
                    (result?.revenue || 0) - (result?.costs.total || 0) >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  ${((result?.revenue || 0) - (result?.costs.total || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <KPIGrid columns={2}>
            <KPICard
              title="Gross Margin"
              value={result?.margin || 0}
              format="percent"
              status={
                (result?.margin || 0) >= 50
                  ? 'healthy'
                  : (result?.margin || 0) >= 40
                  ? 'warning'
                  : 'critical'
              }
              target={50}
            />
            <KPICard
              title="Break-Even"
              value={`${result?.breakEvenTenants || 0} tenants`}
              status={
                (result?.breakEvenTenants || 0) <= params.tenants ? 'healthy' : 'critical'
              }
            />
          </KPIGrid>

          <div className="admin-card">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Scenario Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Total Tenants</span>
                <span className="text-white">{params.tenants}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Paying Tenants</span>
                <span className="text-white">
                  {Math.round(params.tenants * ((params.planMix.pro + params.planMix.enterprise) / 100))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Free Tier</span>
                <span className="text-white">
                  {Math.round(params.tenants * (params.planMix.starter / 100))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Utilization</span>
                <span className="text-white">{params.utilization}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Blended Cost/Call</span>
                <span className="text-white">
                  ${(
                    0.005 * (params.modelMix.economy / 100) +
                    0.025 * (params.modelMix.standard / 100) +
                    0.075 * (params.modelMix.premium / 100)
                  ).toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Recommendations</h3>
            <ul className="space-y-2 text-sm">
              {result && result.margin < 50 && (
                <li className="flex items-start gap-2 text-yellow-400">
                  <TrendingDown className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Increase economy model usage to improve margins</span>
                </li>
              )}
              {params.planMix.starter > 40 && (
                <li className="flex items-start gap-2 text-yellow-400">
                  <TrendingDown className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>High free tier percentage reducing revenue</span>
                </li>
              )}
              {result && result.profitable && (
                <li className="flex items-start gap-2 text-green-400">
                  <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Scenario is sustainable at current parameters</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

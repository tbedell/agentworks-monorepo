import { AlertTriangle, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TenantProfitability {
  tenantId: string;
  tenantName: string;
  plan: string;
  revenue: number;
  llmCost: number;
  infraCost: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  status: 'healthy' | 'warning' | 'critical';
  anomalies: string[];
}

interface ProfitabilityTableProps {
  tenants: TenantProfitability[];
  showAnomaliesOnly?: boolean;
}

export function ProfitabilityTable({ tenants, showAnomaliesOnly = false }: ProfitabilityTableProps) {
  const displayTenants = showAnomaliesOnly
    ? tenants.filter((t) => t.status !== 'healthy')
    : tenants;

  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
    },
    warning: {
      icon: AlertCircle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
    },
    critical: {
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/20',
    },
  };

  return (
    <div className="overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Plan</th>
            <th className="text-right">Revenue</th>
            <th className="text-right">LLM Cost</th>
            <th className="text-right">Infra Cost</th>
            <th className="text-right">Profit</th>
            <th className="text-right">Margin</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {displayTenants.map((tenant) => {
            const config = statusConfig[tenant.status];
            const StatusIcon = config.icon;

            return (
              <tr key={tenant.tenantId}>
                <td>
                  <div>
                    <p className="font-medium text-white">{tenant.tenantName}</p>
                    <p className="text-xs text-slate-500">
                      {tenant.tenantId.slice(0, 8)}...
                    </p>
                  </div>
                </td>
                <td>
                  <span className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-300">
                    {tenant.plan}
                  </span>
                </td>
                <td className="text-right text-slate-300">
                  ${tenant.revenue.toFixed(2)}
                </td>
                <td className="text-right text-slate-300">
                  ${tenant.llmCost.toFixed(2)}
                </td>
                <td className="text-right text-slate-300">
                  ${tenant.infraCost.toFixed(2)}
                </td>
                <td className="text-right">
                  <span
                    className={
                      tenant.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'
                    }
                  >
                    ${tenant.grossProfit.toFixed(2)}
                  </span>
                </td>
                <td className="text-right">
                  <span className={config.color}>{tenant.margin.toFixed(1)}%</span>
                </td>
                <td>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${config.bg}`}>
                    <StatusIcon className={`w-3 h-3 ${config.color}`} />
                    <span className={`text-xs ${config.color} capitalize`}>
                      {tenant.status}
                    </span>
                  </div>
                </td>
                <td>
                  <Link
                    to={`/tenants/${tenant.tenantId}`}
                    className="text-slate-400 hover:text-blue-400"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
          {displayTenants.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center text-slate-400">
                {showAnomaliesOnly
                  ? 'No tenants with anomalies'
                  : 'No tenant data available'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {displayTenants.length > 0 && (
        <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Total Tenants</p>
              <p className="text-white font-bold">{displayTenants.length}</p>
            </div>
            <div>
              <p className="text-slate-400">Total Revenue</p>
              <p className="text-white font-bold">
                ${displayTenants.reduce((sum, t) => sum + t.revenue, 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Total Cost</p>
              <p className="text-white font-bold">
                ${displayTenants.reduce((sum, t) => sum + t.totalCost, 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Avg Margin</p>
              <p className="text-white font-bold">
                {(
                  displayTenants.reduce((sum, t) => sum + t.margin, 0) /
                  displayTenants.length
                ).toFixed(1)}
                %
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

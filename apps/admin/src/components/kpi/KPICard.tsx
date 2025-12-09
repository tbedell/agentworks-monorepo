import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'healthy' | 'warning' | 'critical';
  target?: number;
  format?: 'currency' | 'percent' | 'number';
}

export function KPICard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  trend,
  status,
  target,
  format = 'number',
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'currency':
        return `$${val.toLocaleString()}`;
      case 'percent':
        return `${val}%`;
      default:
        return val.toLocaleString();
    }
  };

  const statusColors = {
    healthy: 'bg-green-500/20 border-green-500/30',
    warning: 'bg-yellow-500/20 border-yellow-500/30',
    critical: 'bg-red-500/20 border-red-500/30',
  };

  const statusTextColors = {
    healthy: 'text-green-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400',
  };

  return (
    <div
      className={`admin-card ${
        status ? `border ${statusColors[status]}` : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${
            status ? statusTextColors[status] : 'text-white'
          }`}>
            {formatValue(value)}
          </p>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : trend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : (
                <Minus className="w-4 h-4 text-slate-400" />
              )}
              <span
                className={`text-sm ${
                  trend === 'up'
                    ? 'text-green-400'
                    : trend === 'down'
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {change > 0 ? '+' : ''}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-sm text-slate-500">{changeLabel}</span>
              )}
            </div>
          )}
          {target !== undefined && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Target: {target}%</span>
                <span className={
                  Number(value) >= target ? 'text-green-400' : 'text-yellow-400'
                }>
                  {Number(value) >= target ? 'On track' : 'Below target'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    Number(value) >= target ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(100, (Number(value) / target) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${
            status 
              ? statusColors[status]
              : 'bg-blue-500/20'
          }`}>
            <Icon className={`w-6 h-6 ${
              status
                ? statusTextColors[status]
                : 'text-blue-400'
            }`} />
          </div>
        )}
      </div>
    </div>
  );
}

interface KPIGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function KPIGrid({ children, columns = 4 }: KPIGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid grid-cols-1 ${gridCols[columns]} gap-4`}>
      {children}
    </div>
  );
}

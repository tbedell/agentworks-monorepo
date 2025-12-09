import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useState } from 'react';

interface Anomaly {
  type: 'margin' | 'usage' | 'cost' | 'churn';
  severity: 'low' | 'medium' | 'high';
  tenantId?: string;
  tenantName?: string;
  message: string;
  value: number;
  threshold: number;
}

interface AnomalyAlertProps {
  anomaly: Anomaly;
  onDismiss?: () => void;
  onViewTenant?: (tenantId: string) => void;
}

export function AnomalyAlert({ anomaly, onDismiss, onViewTenant }: AnomalyAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const severityConfig = {
    high: {
      icon: AlertTriangle,
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      iconColor: 'text-red-400',
      label: 'Critical',
      labelBg: 'bg-red-500/20',
    },
    medium: {
      icon: AlertCircle,
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      iconColor: 'text-yellow-400',
      label: 'Warning',
      labelBg: 'bg-yellow-500/20',
    },
    low: {
      icon: Info,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      iconColor: 'text-blue-400',
      label: 'Info',
      labelBg: 'bg-blue-500/20',
    },
  };

  const config = severityConfig[anomaly.severity];
  const Icon = config.icon;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`${config.bg} border ${config.border} rounded-lg p-4 flex items-start gap-3`}
    >
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${config.labelBg} ${config.iconColor}`}
          >
            {config.label}
          </span>
          <span className="text-xs text-slate-500 capitalize">{anomaly.type}</span>
        </div>
        <p className="text-sm text-white">{anomaly.message}</p>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs text-slate-400">
            Value: <span className="text-white">{anomaly.value.toFixed(1)}%</span>
          </span>
          <span className="text-xs text-slate-400">
            Threshold: <span className="text-white">{anomaly.threshold}%</span>
          </span>
          {anomaly.tenantId && onViewTenant && (
            <button
              onClick={() => onViewTenant(anomaly.tenantId!)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View tenant →
            </button>
          )}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-400 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface AnomalyListProps {
  anomalies: Anomaly[];
  maxItems?: number;
  onViewTenant?: (tenantId: string) => void;
}

export function AnomalyList({ anomalies, maxItems = 5, onViewTenant }: AnomalyListProps) {
  const displayAnomalies = anomalies.slice(0, maxItems);
  const remainingCount = anomalies.length - maxItems;

  if (anomalies.length === 0) {
    return (
      <div className="admin-card">
        <div className="flex items-center gap-3 text-green-400">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium">No anomalies detected</p>
            <p className="text-sm text-slate-400">All metrics within normal ranges</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayAnomalies.map((anomaly, index) => (
        <AnomalyAlert
          key={`${anomaly.type}-${anomaly.tenantId || index}`}
          anomaly={anomaly}
          onViewTenant={onViewTenant}
        />
      ))}
      {remainingCount > 0 && (
        <p className="text-sm text-slate-400 text-center">
          +{remainingCount} more anomalies
        </p>
      )}
    </div>
  );
}

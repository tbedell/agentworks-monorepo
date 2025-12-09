import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { auditApi, type AuditLog } from '@/lib/api';

function LogDetails({ log }: { log: AuditLog }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <tr>
      <td colSpan={6} className="p-0">
        <div className="border-b border-slate-700">
          <div className="flex items-center px-4 py-3">
            <div className="flex-1 grid grid-cols-6 gap-4 items-center">
              <div>
                <span className="text-xs text-slate-500">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="text-white">{log.adminEmail}</div>
              <div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    log.action.includes('delete')
                      ? 'bg-red-500/20 text-red-400'
                      : log.action.includes('create')
                      ? 'bg-green-500/20 text-green-400'
                      : log.action.includes('update')
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {log.action}
                </span>
              </div>
              <div className="text-slate-300">{log.resourceType}</div>
              <div className="text-slate-400 font-mono text-xs">
                {log.resourceId.slice(0, 8)}...
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
          {isExpanded && (
            <div className="px-4 pb-3 bg-slate-900">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Admin ID</p>
                  <p className="text-slate-300 font-mono">{log.adminId}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">IP Address</p>
                  <p className="text-slate-300 font-mono">{log.ipAddress}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Resource ID</p>
                  <p className="text-slate-300 font-mono">{log.resourceId}</p>
                </div>
                {log.tenantId && (
                  <div>
                    <p className="text-slate-500 mb-1">Tenant ID</p>
                    <p className="text-slate-300 font-mono">{log.tenantId}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-slate-500 mb-1">Details</p>
                  <pre className="text-slate-300 bg-slate-800 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export function AuditLogs() {
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { action: actionFilter, page, limit }],
    queryFn: () => auditApi.list({ action: actionFilter || undefined, page, limit }),
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-slate-400">Track all administrative actions</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="admin-input w-48"
          >
            <option value="">All Actions</option>
            <option value="tenant.create">Tenant Create</option>
            <option value="tenant.update">Tenant Update</option>
            <option value="tenant.suspend">Tenant Suspend</option>
            <option value="tenant.activate">Tenant Activate</option>
            <option value="tenant.delete">Tenant Delete</option>
            <option value="provider.create">Provider Create</option>
            <option value="provider.update">Provider Update</option>
            <option value="provider.delete">Provider Delete</option>
            <option value="provider.rotate_key">Provider Key Rotation</option>
            <option value="subscription.cancel">Subscription Cancel</option>
          </select>
        </div>
      </div>

      <div className="admin-card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No audit logs found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Resource Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Resource ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <LogDetails key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="admin-btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="admin-btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

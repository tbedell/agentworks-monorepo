import { Github, Loader2, LogOut, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { useGitHub } from '../../hooks/useGitHub';

interface GitHubConnectProps {
  onConnected?: () => void;
  compact?: boolean;
  className?: string;
}

export default function GitHubConnect({
  onConnected,
  compact = false,
  className
}: GitHubConnectProps) {
  const { status, isLoading, error, connect, disconnect, checkStatus } = useGitHub();

  const handleConnect = () => {
    connect();
    // The popup flow will trigger checkStatus when done
    // Also call onConnected after status changes
    const interval = setInterval(async () => {
      await checkStatus();
      if (status?.connected) {
        clearInterval(interval);
        onConnected?.();
      }
    }, 1000);

    // Clear interval after 2 minutes (timeout)
    setTimeout(() => clearInterval(interval), 120000);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  if (isLoading && !status) {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        {!compact && <span className="text-sm text-slate-500">Checking GitHub...</span>}
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className={clsx('flex items-center gap-3', className)}>
        <div className="flex items-center gap-2">
          {status.avatarUrl ? (
            <img
              src={status.avatarUrl}
              alt={status.username}
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center">
              <Github className="h-4 w-4 text-slate-600" />
            </div>
          )}
          {!compact && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-sm font-medium text-slate-700">
                {status.username}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md',
            'text-slate-600 hover:text-red-600 hover:bg-red-50',
            'transition-colors duration-150',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          {!compact && <span>Disconnect</span>}
        </button>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <button
        onClick={handleConnect}
        disabled={isLoading}
        className={clsx(
          'flex items-center justify-center gap-2',
          'px-4 py-2.5 rounded-lg',
          'bg-slate-900 text-white',
          'hover:bg-slate-800',
          'transition-colors duration-150',
          'text-sm font-medium',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Github className="h-4 w-4" />
        )}
        <span>Connect GitHub</span>
      </button>

      {error && (
        <p className="text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}

// Smaller inline version for headers/toolbars
export function GitHubConnectBadge({ className }: { className?: string }) {
  const { status, isLoading, connect } = useGitHub();

  if (isLoading && !status) {
    return (
      <div className={clsx('flex items-center gap-1.5 text-slate-400', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className={clsx(
        'flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50',
        className
      )}>
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs font-medium text-green-700">
          {status.username}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className={clsx(
        'flex items-center gap-1.5 px-2 py-1 rounded-md',
        'text-xs font-medium',
        'bg-slate-100 text-slate-700 hover:bg-slate-200',
        'transition-colors duration-150',
        className
      )}
    >
      <Github className="h-3.5 w-3.5" />
      <span>Connect</span>
    </button>
  );
}

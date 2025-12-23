import { useLocation } from 'react-router-dom';
import UsageAnalytics from '../components/usage/UsageAnalytics';

export default function UsagePage() {
  const location = useLocation();

  // Key forces remount when navigating to this page, ensuring fresh data load
  return (
    <div key={location.key} className="h-full flex flex-col bg-slate-50">
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <UsageAnalytics />
        </div>
      </div>
    </div>
  );
}

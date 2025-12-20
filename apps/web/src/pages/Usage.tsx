import { useLocation } from 'react-router-dom';
import UsageAnalytics from '../components/usage/UsageAnalytics';

export default function UsagePage() {
  const location = useLocation();
  // Key forces remount when navigating to this page, ensuring fresh data load
  return (
    <div key={location.key} className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-auto p-6">
        <UsageAnalytics />
      </div>
    </div>
  );
}

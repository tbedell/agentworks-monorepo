import UsageAnalytics from '../components/usage/UsageAnalytics';

export default function UsagePage() {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-auto p-6">
        <UsageAnalytics />
      </div>
    </div>
  );
}

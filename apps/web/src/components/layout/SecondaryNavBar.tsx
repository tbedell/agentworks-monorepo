import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { useTour } from '../../contexts/TourContext';
import { Play } from 'lucide-react';

interface SecondaryNavBarProps {
  currentProject?: {
    name: string;
    id: string;
  } | null;
}

export default function SecondaryNavBar({ currentProject }: SecondaryNavBarProps) {
  const { tenant } = useAuthStore();
  const { restartTour, isCompleted, isDismissed } = useTour();

  const quickLinks = [
    { label: 'Blueprint', href: '/planning?doc=blueprint' },
    { label: 'PRD', href: '/planning?doc=prd' },
    { label: 'MVP', href: '/planning?doc=mvp' },
    { label: 'Agents', href: '/agents' },
    { label: 'Terminal', href: '/terminal' },
    { label: 'Usage', href: '/usage' },
  ];

  const handleStartTour = () => {
    restartTour();
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-slate-600">
        <span className="font-medium text-slate-700">{tenant?.name || 'My Organization'}</span>
        <span className="text-slate-400">›</span>
        <span className="text-slate-900 font-medium">
          {currentProject?.name || 'No Project Selected'}
        </span>
      </div>

      <div className="hidden md:flex items-center gap-4">
        {(isCompleted || isDismissed) && (
          <button
            onClick={handleStartTour}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
          >
            <Play className="h-3 w-3" />
            Start Tour
          </button>
        )}
        {quickLinks.map((link) => (
          <NavLink
            key={link.label}
            to={link.href}
            className="text-slate-600 hover:text-blue-600 hover:bg-slate-50 px-3 py-1 rounded transition-colors"
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
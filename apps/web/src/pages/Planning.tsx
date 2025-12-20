import { useLocation } from 'react-router-dom';
import PlanningWorkspace from '../components/planning/PlanningWorkspace';

export default function PlanningPage() {
  const location = useLocation();
  // Key forces remount when navigating to this page, ensuring fresh data load
  return <PlanningWorkspace key={location.key} />;
}

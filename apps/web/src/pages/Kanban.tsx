import { useLocation } from 'react-router-dom';
import KanbanBoard from '../components/kanban/KanbanBoard';

export default function KanbanPage() {
  const location = useLocation();
  // Key forces remount when navigating to this page, ensuring fresh data load
  return <KanbanBoard key={location.key} />;
}
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// TasksList is now deprecated - redirect to MyKanban with list view
export default function TasksList() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to MyKanban with list view
    navigate('/work/kanban?view=list', { replace: true });
  }, [navigate]);

  return (
    <div className="p-6 flex items-center justify-center">
      <p className="text-gray-500">Redirecting to Kanban...</p>
    </div>
  );
}

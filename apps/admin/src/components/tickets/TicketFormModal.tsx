import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { ticketsApi, type SupportTicket } from '@/lib/api';
import { AssigneeSelector, type Assignee } from '@/components/shared/AssigneeSelector';

interface TicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<SupportTicket>) => Promise<void>;
  ticket?: SupportTicket | null;
  isLoading?: boolean;
  defaultStatus?: string;
}

export function TicketFormModal({
  isOpen,
  onClose,
  onSubmit,
  ticket,
  isLoading = false,
  defaultStatus,
}: TicketFormModalProps) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('new');
  const [categoryId, setCategoryId] = useState('');
  const [queueId, setQueueId] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [assignee, setAssignee] = useState<Assignee | null>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ['tickets', 'categories'],
    queryFn: ticketsApi.listCategories,
    enabled: isOpen,
  });

  const { data: queuesData } = useQuery({
    queryKey: ['tickets', 'queues'],
    queryFn: ticketsApi.listQueues,
    enabled: isOpen,
  });

  useEffect(() => {
    if (ticket) {
      setSubject(ticket.subject);
      setDescription(ticket.description);
      setPriority(ticket.priority);
      setStatus(ticket.status);
      setCategoryId(ticket.categoryId || '');
      setQueueId(ticket.queueId || '');
      setReporterName(ticket.reporterName || '');
      setReporterEmail(ticket.reporterEmail || '');
      setAssignee(
        ticket.assigneeId
          ? { id: ticket.assigneeId, type: 'user', name: ticket.assignee?.name }
          : null
      );
    } else {
      setSubject('');
      setDescription('');
      setPriority('medium');
      setStatus(defaultStatus || 'new');
      setCategoryId('');
      setQueueId('');
      setReporterName('');
      setReporterEmail('');
      setAssignee(null);
    }
  }, [ticket, isOpen, defaultStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    await onSubmit({
      subject: subject.trim(),
      description: description.trim(),
      priority,
      status,
      categoryId: categoryId || undefined,
      queueId: queueId || undefined,
      reporterName: reporterName.trim() || undefined,
      reporterEmail: reporterEmail.trim() || undefined,
      assigneeId: assignee?.id || undefined,
    });
  };

  if (!isOpen) return null;

  const categories = categoriesData?.categories || [];
  const queues = queuesData?.queues || [];
  const isEditing = !!ticket;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Ticket' : 'Create Ticket'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the issue..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="new">New</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Queue</label>
              <select
                value={queueId}
                onChange={(e) => setQueueId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No queue</option>
                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
            <AssigneeSelector
              value={assignee}
              onChange={setAssignee}
              placeholder="Select assignee..."
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Reporter Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Reporter name..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="reporter@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!subject.trim() || !description.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

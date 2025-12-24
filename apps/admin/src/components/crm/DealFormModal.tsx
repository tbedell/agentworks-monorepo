import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { crmApi, type CrmDeal } from '@/lib/api';

interface DealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CrmDeal>) => Promise<void>;
  deal?: CrmDeal | null;
  isLoading?: boolean;
}

export function DealFormModal({
  isOpen,
  onClose,
  onSubmit,
  deal,
  isLoading = false,
}: DealFormModalProps) {
  const [name, setName] = useState('');
  const [stage, setStage] = useState('discovery');
  const [value, setValue] = useState(0);
  const [probability, setProbability] = useState(10);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [companyId, setCompanyId] = useState('');

  const { data: companiesData } = useQuery({
    queryKey: ['crm', 'companies', 'list'],
    queryFn: () => crmApi.listCompanies({ limit: 100 }),
    enabled: isOpen,
  });

  useEffect(() => {
    if (deal) {
      setName(deal.name);
      setStage(deal.stage);
      setValue(deal.value);
      setProbability(deal.probability);
      setExpectedCloseDate(deal.expectedCloseDate ? deal.expectedCloseDate.split('T')[0] : '');
      setCompanyId(deal.companyId || '');
    } else {
      setName('');
      setStage('discovery');
      setValue(0);
      setProbability(10);
      setExpectedCloseDate('');
      setCompanyId('');
    }
  }, [deal, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSubmit({
      name: name.trim(),
      stage,
      value,
      probability,
      expectedCloseDate: expectedCloseDate || undefined,
      companyId: companyId || undefined,
    });
  };

  // Auto-adjust probability based on stage
  useEffect(() => {
    const stageProbabilities: Record<string, number> = {
      discovery: 10,
      qualification: 20,
      proposal: 50,
      negotiation: 75,
      closed_won: 100,
      closed_lost: 0,
    };
    if (stageProbabilities[stage] !== undefined) {
      setProbability(stageProbabilities[stage]);
    }
  }, [stage]);

  if (!isOpen) return null;

  const companies = companiesData?.companies || [];
  const isEditing = !!deal;

  const weightedValue = value * (probability / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Deal' : 'Create Deal'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enterprise License Deal"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No company linked</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="discovery">Discovery</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Weighted Value:</span>
              <span className="font-medium text-gray-900">
                ${weightedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
            <input
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
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
            disabled={!name.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Deal'}
          </button>
        </div>
      </div>
    </div>
  );
}

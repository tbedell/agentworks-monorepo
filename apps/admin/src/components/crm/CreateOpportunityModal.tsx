import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, DollarSign } from 'lucide-react';
import { crmApi, type CrmDeal, type CrmContact, type CrmCompany } from '@/lib/api';

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CrmDeal>) => Promise<void>;
  isLoading?: boolean;
  // Source context - either a contact or company
  contact?: CrmContact | null;
  company?: CrmCompany | null;
}

export function CreateOpportunityModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  contact,
  company,
}: CreateOpportunityModalProps) {
  const [name, setName] = useState('');
  const [stage, setStage] = useState('discovery');
  const [value, setValue] = useState(0);
  const [probability, setProbability] = useState(10);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Fetch companies for the dropdown if not pre-selected
  const { data: companiesData } = useQuery({
    queryKey: ['crm', 'companies', 'list'],
    queryFn: () => crmApi.listCompanies({ limit: 100 }),
    enabled: isOpen && !company,
  });

  // Initialize form based on source context
  useEffect(() => {
    if (isOpen) {
      // Pre-fill company from source
      if (company) {
        setCompanyId(company.id);
        setName(`${company.name} - Opportunity`);
      } else if (contact?.company) {
        setCompanyId(contact.company.id);
        setName(`${contact.company.name} - Opportunity`);
      } else if (contact) {
        setName(`${contact.firstName} ${contact.lastName} - Opportunity`);
        setCompanyId('');
      } else {
        setName('');
        setCompanyId('');
      }

      // Reset other fields
      setStage('discovery');
      setValue(0);
      setProbability(10);
      setExpectedCloseDate('');
    }
  }, [isOpen, contact, company]);

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

  if (!isOpen) return null;

  const companies = companiesData?.companies || [];
  const weightedValue = value * (probability / 100);

  // Determine source label
  const sourceLabel = company
    ? `From company: ${company.name}`
    : contact
    ? `From contact: ${contact.firstName} ${contact.lastName}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Create Opportunity
            </h3>
            {sourceLabel && (
              <p className="text-sm text-gray-500">{sourceLabel}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opportunity Name <span className="text-red-500">*</span>
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
            {company ? (
              // If company is passed, show read-only
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {company.name}
              </div>
            ) : (
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No company linked</option>
                {contact?.company && (
                  <option value={contact.company.id}>{contact.company.name}</option>
                )}
                {companies
                  .filter((c) => c.id !== contact?.company?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            )}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probability (%)
              </label>
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

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Weighted Value</div>
            <div className="text-2xl font-bold text-green-600">
              ${weightedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500">{probability}% of ${value.toLocaleString()}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Close Date
            </label>
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
            disabled={!name.trim() || value <= 0 || isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Opportunity'}
          </button>
        </div>
      </div>
    </div>
  );
}

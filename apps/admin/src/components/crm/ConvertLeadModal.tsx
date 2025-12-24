import { useState } from 'react';
import { X, User, Building2, DollarSign, ChevronRight, Check } from 'lucide-react';
import { type CrmLead } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ConversionData {
  createContact: boolean;
  contactData?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
  };
  createCompany: boolean;
  companyData?: {
    name: string;
    industry?: string;
    website?: string;
    phone?: string;
  };
  createDeal: boolean;
  dealData?: {
    name: string;
    value: number;
    probability: number;
    expectedCloseDate?: string;
  };
}

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: (data: ConversionData) => Promise<void>;
  lead: CrmLead | null;
  isLoading?: boolean;
}

type Step = 'select' | 'contact' | 'company' | 'deal' | 'review';

export function ConvertLeadModal({
  isOpen,
  onClose,
  onConvert,
  lead,
  isLoading = false,
}: ConvertLeadModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [createContact, setCreateContact] = useState(true);
  const [createCompany, setCreateCompany] = useState(true);
  const [createDeal, setCreateDeal] = useState(true);

  // Contact form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Company form
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Deal form
  const [dealName, setDealName] = useState('');
  const [dealValue, setDealValue] = useState(0);
  const [probability, setProbability] = useState(50);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  // Initialize form with lead data when opened
  useState(() => {
    if (lead) {
      // Pre-fill contact data from lead's existing contact
      if (lead.contact) {
        setFirstName(lead.contact.firstName || '');
        setLastName(lead.contact.lastName || '');
        setEmail(lead.contact.email || '');
      }
      // Pre-fill company data from lead's existing company
      if (lead.company) {
        setCompanyName(lead.company.name || '');
      }
      // Pre-fill deal name from lead title
      setDealName(lead.title || '');
    }
  });

  const handleNext = () => {
    if (step === 'select') {
      if (createContact) setStep('contact');
      else if (createCompany) setStep('company');
      else if (createDeal) setStep('deal');
      else setStep('review');
    } else if (step === 'contact') {
      if (createCompany) setStep('company');
      else if (createDeal) setStep('deal');
      else setStep('review');
    } else if (step === 'company') {
      if (createDeal) setStep('deal');
      else setStep('review');
    } else if (step === 'deal') {
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'contact') setStep('select');
    else if (step === 'company') {
      if (createContact) setStep('contact');
      else setStep('select');
    } else if (step === 'deal') {
      if (createCompany) setStep('company');
      else if (createContact) setStep('contact');
      else setStep('select');
    } else if (step === 'review') {
      if (createDeal) setStep('deal');
      else if (createCompany) setStep('company');
      else if (createContact) setStep('contact');
      else setStep('select');
    }
  };

  const handleConvert = async () => {
    const data: ConversionData = {
      createContact,
      createCompany,
      createDeal,
    };

    if (createContact) {
      data.contactData = {
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        jobTitle: jobTitle || undefined,
      };
    }

    if (createCompany) {
      data.companyData = {
        name: companyName,
        industry: industry || undefined,
        website: website || undefined,
        phone: companyPhone || undefined,
      };
    }

    if (createDeal) {
      data.dealData = {
        name: dealName,
        value: dealValue,
        probability,
        expectedCloseDate: expectedCloseDate || undefined,
      };
    }

    await onConvert(data);
  };

  const canProceed = () => {
    if (step === 'select') return createContact || createCompany || createDeal;
    if (step === 'contact') return firstName.trim() && lastName.trim();
    if (step === 'company') return companyName.trim();
    if (step === 'deal') return dealName.trim() && dealValue > 0;
    return true;
  };

  if (!isOpen || !lead) return null;

  const steps: { key: Step; label: string }[] = [
    { key: 'select', label: 'Select' },
    ...(createContact ? [{ key: 'contact' as Step, label: 'Contact' }] : []),
    ...(createCompany ? [{ key: 'company' as Step, label: 'Company' }] : []),
    ...(createDeal ? [{ key: 'deal' as Step, label: 'Opportunity' }] : []),
    { key: 'review', label: 'Review' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Convert Lead</h3>
            <p className="text-sm text-gray-500">{lead.title}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm',
                step === s.key
                  ? 'bg-blue-100 text-blue-800'
                  : steps.indexOf(steps.find((x) => x.key === step)!) > i
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              )}>
                {steps.indexOf(steps.find((x) => x.key === step)!) > i && (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300 mx-1 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {/* Step 1: Select what to create */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                Select what you want to create from this lead:
              </p>

              <label className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={createContact}
                  onChange={(e) => setCreateContact(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <User className="w-4 h-4 text-blue-500" />
                    Create Contact
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Create a contact record for the lead person
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={createCompany}
                  onChange={(e) => setCreateCompany(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <Building2 className="w-4 h-4 text-purple-500" />
                    Create Company
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Create a company/organization record
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={createDeal}
                  onChange={(e) => setCreateDeal(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Create Opportunity
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Create a sales opportunity with value and probability
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {step === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Company Details */}
          {step === 'company' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select industry...</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="education">Education</option>
                  <option value="consulting">Consulting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Deal/Opportunity Details */}
          {step === 'deal' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opportunity Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dealName}
                  onChange={(e) => setDealName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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
                      value={dealValue}
                      onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
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
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Weighted Value</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${((dealValue * probability) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500">{probability}% of ${dealValue.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <p className="text-gray-600">Review and confirm the conversion:</p>

              {createContact && (
                <div className="p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Contact
                  </div>
                  <div className="text-sm text-gray-600">
                    {firstName} {lastName}
                    {email && <span className="ml-2 text-gray-400">({email})</span>}
                  </div>
                </div>
              )}

              {createCompany && (
                <div className="p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                    <Building2 className="w-4 h-4 text-purple-500" />
                    Company
                  </div>
                  <div className="text-sm text-gray-600">
                    {companyName}
                    {industry && <span className="ml-2 text-gray-400">({industry})</span>}
                  </div>
                </div>
              )}

              {createDeal && (
                <div className="p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Opportunity
                  </div>
                  <div className="text-sm text-gray-600">{dealName}</div>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span className="font-medium text-green-600">${dealValue.toLocaleString()}</span>
                    <span className="text-gray-400">|</span>
                    <span>{probability}% probability</span>
                    {expectedCloseDate && (
                      <>
                        <span className="text-gray-400">|</span>
                        <span>Close: {new Date(expectedCloseDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex items-center justify-between gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={step === 'select' ? onClose : handleBack}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {step === 'select' ? 'Cancel' : 'Back'}
          </button>
          {step === 'review' ? (
            <button
              onClick={handleConvert}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Converting...' : 'Convert Lead'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

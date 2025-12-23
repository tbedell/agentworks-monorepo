import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Save,
  Send,
  Clock,
  ChevronLeft,
  Users,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  subject: string;
  description: string;
}

interface RecipientPreview {
  count: number;
  sample: { email: string; name?: string | null }[];
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  template: string;
  targetAudience: string;
  filters: {
    founderTier?: string;
    hasReferrals?: boolean;
    minReferrals?: number;
    affiliateOnly?: boolean;
  } | null;
  status: string;
  scheduledFor: string | null;
  totalRecipients: number;
}

export default function EmailCampaignEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const templateId = searchParams.get('template');

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    template: '',
    targetAudience: 'waitlist' as 'waitlist' | 'founders' | 'affiliates' | 'all',
    filters: {
      founderTier: '',
      hasReferrals: false,
      minReferrals: 0,
      affiliateOnly: false,
    },
    scheduledFor: '',
  });
  const [showSchedule, setShowSchedule] = useState(false);
  const [previewCount, setPreviewCount] = useState<RecipientPreview | null>(null);

  // Fetch templates
  const { data: templates } = useQuery<Template[]>({
    queryKey: ['campaigns', 'templates'],
    queryFn: () => api.get('/campaigns/templates'),
  });

  // Fetch campaign if editing
  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`),
    enabled: !!id,
  });

  // Initialize form when campaign loads
  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        subject: campaign.subject,
        template: campaign.template,
        targetAudience: campaign.targetAudience as 'waitlist' | 'founders' | 'affiliates' | 'all',
        filters: {
          founderTier: campaign.filters?.founderTier || '',
          hasReferrals: campaign.filters?.hasReferrals || false,
          minReferrals: campaign.filters?.minReferrals || 0,
          affiliateOnly: campaign.filters?.affiliateOnly || false,
        },
        scheduledFor: campaign.scheduledFor || '',
      });
    }
  }, [campaign]);

  // Initialize from template
  useEffect(() => {
    if (templateId && templates) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormData(prev => ({
          ...prev,
          name: template.name,
          subject: template.subject,
          template: templateId,
        }));
      }
    }
  }, [templateId, templates]);

  // Preview recipients
  const previewMutation = useMutation({
    mutationFn: (data: { targetAudience: string; filters?: Record<string, unknown> }) =>
      api.post<RecipientPreview>('/campaigns/preview-recipients', data),
    onSuccess: (data) => {
      setPreviewCount(data);
    },
  });

  // Update preview when audience/filters change
  useEffect(() => {
    const hasFilters = formData.filters.founderTier || formData.filters.hasReferrals || formData.filters.minReferrals || formData.filters.affiliateOnly;
    previewMutation.mutate({
      targetAudience: formData.targetAudience,
      filters: hasFilters ? {
        founderTier: formData.filters.founderTier || undefined,
        hasReferrals: formData.filters.hasReferrals || undefined,
        minReferrals: formData.filters.minReferrals || undefined,
        affiliateOnly: formData.filters.affiliateOnly || undefined,
      } : undefined,
    });
  }, [formData.targetAudience, formData.filters]);

  // Create campaign
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.post('/campaigns', {
        name: data.name,
        subject: data.subject,
        template: data.template,
        targetAudience: data.targetAudience,
        filters: Object.values(data.filters).some(v => v) ? data.filters : undefined,
        scheduledFor: data.scheduledFor || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      navigate('/campaigns');
    },
  });

  // Update campaign
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.put(`/campaigns/${id}`, {
        name: data.name,
        subject: data.subject,
        template: data.template,
        targetAudience: data.targetAudience,
        filters: Object.values(data.filters).some(v => v) ? data.filters : undefined,
        scheduledFor: data.scheduledFor || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      navigate('/campaigns');
    },
  });

  // Send campaign
  const sendMutation = useMutation({
    mutationFn: () => api.post(`/campaigns/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      navigate('/campaigns');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSendNow = () => {
    if (!id) {
      // Create first, then send
      createMutation.mutate(formData, {
        onSuccess: (data) => {
          const newCampaign = data as Campaign;
          api.post(`/campaigns/${newCampaign.id}/send`).then(() => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            navigate('/campaigns');
          });
        },
      });
    } else {
      sendMutation.mutate();
    }
  };

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Mail className="w-7 h-7 text-blue-600" />
            {isEditing ? 'Edit Campaign' : 'New Campaign'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditing ? 'Update your email campaign' : 'Create a new email campaign for your launch'}
          </p>
        </div>
        <Link
          to="/campaigns"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Campaign Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Pre-Launch Day 10"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g., Why most affiliate programs FAIL..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Template
                  </label>
                  <select
                    value={formData.template}
                    onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a template...</option>
                    {templates?.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {formData.template && templates && (
                    <p className="text-xs text-slate-500 mt-1">
                      {templates.find(t => t.id === formData.template)?.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Audience */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Target Audience</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'waitlist', label: 'Waitlist', desc: 'All waitlist leads' },
                    { value: 'founders', label: 'Founders', desc: 'Founding members only' },
                    { value: 'affiliates', label: 'Affiliates', desc: 'Approved affiliates' },
                    { value: 'all', label: 'All', desc: 'Everyone' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        targetAudience: option.value as typeof formData.targetAudience,
                      }))}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        formData.targetAudience === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <p className="font-medium text-slate-900">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Filters */}
                {(formData.targetAudience === 'waitlist' || formData.targetAudience === 'founders') && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <p className="text-sm font-medium text-slate-700">Additional Filters</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Founder Tier</label>
                        <select
                          value={formData.filters.founderTier}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            filters: { ...prev.filters, founderTier: e.target.value },
                          }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Any tier</option>
                          <option value="diamond">Diamond</option>
                          <option value="gold">Gold</option>
                          <option value="silver">Silver</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Min Referrals</label>
                        <input
                          type="number"
                          value={formData.filters.minReferrals || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            filters: { ...prev.filters, minReferrals: parseInt(e.target.value) || 0 },
                          }))}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.filters.hasReferrals}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            filters: { ...prev.filters, hasReferrals: e.target.checked },
                          }))}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">Has referrals</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.filters.affiliateOnly}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            filters: { ...prev.filters, affiliateOnly: e.target.checked },
                          }))}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">From affiliates only</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule */}
            {showSchedule && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Schedule Send
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Send Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recipient Preview */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                Recipients
              </h3>
              {previewMutation.isPending ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : previewCount ? (
                <div>
                  <p className="text-3xl font-bold text-slate-900">{previewCount.count}</p>
                  <p className="text-sm text-slate-500 mb-3">recipients will receive this email</p>
                  {previewCount.sample.length > 0 && (
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-500 mb-2">Sample recipients:</p>
                      <div className="space-y-1">
                        {previewCount.sample.map((r, i) => (
                          <p key={i} className="text-sm text-slate-600 truncate">
                            {r.name || r.email}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Select an audience to see recipients</p>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Update Draft' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"
                >
                  <Clock className="w-4 h-4" />
                  {showSchedule ? 'Hide Schedule' : 'Schedule Send'}
                </button>
                <button
                  type="button"
                  onClick={handleSendNow}
                  disabled={sendMutation.isPending || !formData.name || !formData.subject || !formData.template}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  Send Now
                </button>
              </div>

              {/* Validation Status */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">Checklist</p>
                <div className="space-y-1">
                  {[
                    { label: 'Campaign name', valid: !!formData.name },
                    { label: 'Subject line', valid: !!formData.subject },
                    { label: 'Template selected', valid: !!formData.template },
                    { label: 'Has recipients', valid: (previewCount?.count || 0) > 0 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      {item.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-300" />
                      )}
                      <span className={item.valid ? 'text-slate-700' : 'text-slate-400'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

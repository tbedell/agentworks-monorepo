import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Plus,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Calendar,
  Users,
  BarChart3,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  template: string;
  targetAudience: string;
  filters: Record<string, unknown> | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  scheduledFor: string | null;
  sentAt: string | null;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  description: string;
}

export default function EmailCampaigns() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Fetch campaigns
  const { data, isLoading } = useQuery<{ campaigns: Campaign[]; total: number }>({
    queryKey: ['campaigns', statusFilter],
    queryFn: () => api.get('/campaigns', { status: statusFilter || undefined }),
  });

  // Fetch templates
  const { data: templates } = useQuery<Template[]>({
    queryKey: ['campaigns', 'templates'],
    queryFn: () => api.get('/campaigns/templates'),
  });

  // Delete campaign
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Send campaign
  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const statusColors: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Edit },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
    sending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: RefreshCw },
    sent: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  };

  const audienceLabels: Record<string, string> = {
    waitlist: 'Waitlist',
    founders: 'Founders',
    affiliates: 'Affiliates',
    all: 'All Contacts',
  };

  if (isLoading) {
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
            Email Campaigns
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage email campaigns for your launch
          </p>
        </div>
        <Link
          to="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Campaigns</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data?.total || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Mail className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Sent</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data?.campaigns?.filter(c => c.status === 'sent').length || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Scheduled</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data?.campaigns?.filter(c => c.status === 'scheduled').length || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Drafts</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data?.campaigns?.filter(c => c.status === 'draft').length || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 text-slate-600">
              <Edit className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Pre-built Templates */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Pre-Built Launch Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {templates?.slice(0, 8).map((template) => (
            <button
              key={template.id}
              onClick={() => navigate(`/campaigns/new?template=${template.id}`)}
              className="text-left p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <p className="font-medium text-slate-900 text-sm">{template.name}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{template.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="sending">Sending</option>
          <option value="sent">Sent</option>
        </select>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="divide-y divide-slate-100">
          {data?.campaigns?.length ? (
            data.campaigns.map((campaign) => {
              const StatusIcon = statusColors[campaign.status]?.icon || AlertCircle;
              return (
                <div
                  key={campaign.id}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {campaign.name}
                        </Link>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                          statusColors[campaign.status]?.bg,
                          statusColors[campaign.status]?.text
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {campaign.status}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {audienceLabels[campaign.targetAudience] || campaign.targetAudience}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 truncate mb-2">
                        Subject: {campaign.subject}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {campaign.totalRecipients} recipients
                        </span>
                        {campaign.status === 'sent' && (
                          <>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {campaign.openCount} opens
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" />
                              {campaign.sentCount > 0
                                ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1)
                                : 0}% open rate
                            </span>
                          </>
                        )}
                        {campaign.status === 'scheduled' && campaign.scheduledFor && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Scheduled: {formatDateTime(campaign.scheduledFor)}
                          </span>
                        )}
                        {campaign.sentAt && (
                          <span>Sent {formatRelativeTime(campaign.sentAt)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {campaign.status === 'draft' && (
                        <>
                          <button
                            onClick={() => sendMutation.mutate(campaign.id)}
                            disabled={sendMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" />
                            Send
                          </button>
                          <Link
                            to={`/campaigns/${campaign.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm('Delete this campaign?')) {
                                deleteMutation.mutate(campaign.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {campaign.status === 'scheduled' && (
                        <>
                          <Link
                            to={`/campaigns/${campaign.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        </>
                      )}
                      {campaign.status === 'sent' && (
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200"
                        >
                          <BarChart3 className="w-3 h-3" />
                          Stats
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500">
              <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No campaigns yet</p>
              <p className="text-sm mt-1">Create your first email campaign to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

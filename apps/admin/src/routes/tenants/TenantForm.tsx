import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { tenantsApi, type Tenant } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export function TenantForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    status: 'active' as Tenant['status'],
    planId: '',
    tokenLimit: '',
  });
  const [error, setError] = useState('');

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.get(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        planId: tenant.planId || '',
        tokenLimit: tenant.tokenLimit?.toString() || '',
      });
    }
  }, [tenant]);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string; planId?: string }) =>
      tenantsApi.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant created successfully');
      navigate(`/tenants/${result.id}`);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to create tenant';
      setError(message);
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Tenant>) => tenantsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      toast.success('Tenant updated successfully');
      navigate(`/tenants/${id}`);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to update tenant';
      setError(message);
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.slug.trim()) {
      setError('Slug is required');
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        name: formData.name,
        slug: formData.slug,
        status: formData.status,
        planId: formData.planId || undefined,
        tokenLimit: formData.tokenLimit ? parseInt(formData.tokenLimit, 10) : undefined,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        slug: formData.slug,
        planId: formData.planId || undefined,
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  if (isEditing && isLoading) {
    return (
      <div className="p-6">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={isEditing ? `/tenants/${id}` : '/tenants'}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing ? 'Edit Tenant' : 'New Tenant'}
          </h1>
          <p className="text-slate-400">
            {isEditing ? 'Update tenant details' : 'Create a new tenant'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="admin-card max-w-2xl space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="admin-label">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => {
              const name = e.target.value;
              setFormData((prev) => ({
                ...prev,
                name,
                slug: isEditing ? prev.slug : generateSlug(name),
              }));
            }}
            className="admin-input"
            placeholder="Acme Corporation"
            required
          />
        </div>

        <div>
          <label htmlFor="slug" className="admin-label">
            Slug
          </label>
          <input
            id="slug"
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
            className="admin-input"
            placeholder="acme-corp"
            pattern="[a-z0-9-]+"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            URL-friendly identifier. Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        {isEditing && (
          <>
            <div>
              <label htmlFor="status" className="admin-label">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as Tenant['status'],
                  }))
                }
                className="admin-input"
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            <div>
              <label htmlFor="tokenLimit" className="admin-label">
                Token Limit
              </label>
              <input
                id="tokenLimit"
                type="number"
                value={formData.tokenLimit}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tokenLimit: e.target.value }))
                }
                className="admin-input"
                placeholder="Leave empty for unlimited"
                min="0"
              />
              <p className="text-xs text-slate-500 mt-1">
                Maximum tokens per month. Leave empty for unlimited.
              </p>
            </div>
          </>
        )}

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="admin-btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : isEditing
              ? 'Save Changes'
              : 'Create Tenant'}
          </button>
          <Link
            to={isEditing ? `/tenants/${id}` : '/tenants'}
            className="admin-btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

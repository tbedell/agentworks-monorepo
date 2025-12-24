import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UsersRound,
  Plus,
  Edit,
  Trash2,
  X,
  Users,
  Shield,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { rbacApi } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface GroupFormData {
  name: string;
  displayName: string;
  description: string;
  parentId?: string;
  color: string;
}

function GroupFormModal({
  isOpen,
  onClose,
  group,
  groups,
}: {
  isOpen: boolean;
  onClose: () => void;
  group?: any;
  groups: any[];
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<GroupFormData>({
    name: group?.name || '',
    displayName: group?.displayName || '',
    description: group?.description || '',
    parentId: group?.parentId || '',
    color: group?.color || '#3B82F6',
  });

  const createMutation = useMutation({
    mutationFn: (data: GroupFormData) => rbacApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac', 'groups'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: GroupFormData) => rbacApi.updateGroup(group.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac', 'groups'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      parentId: formData.parentId || undefined,
    };
    if (group) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (!isOpen) return null;

  // Filter out current group and its children from parent options
  const availableParents = groups.filter((g) => g.id !== group?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {group ? 'Edit Group' : 'Create Group'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name (ID)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., engineering"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
              placeholder="e.g., Engineering Team"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Group</label>
            <select
              value={formData.parentId || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, parentId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No parent (top-level)</option>
              {availableParents.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
              className="w-full h-10 px-1 py-1 border border-gray-200 rounded-lg"
            />
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupMembersModal({
  isOpen,
  onClose,
  group,
}: {
  isOpen: boolean;
  onClose: () => void;
  group: any;
}) {
  const queryClient = useQueryClient();
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['rbac', 'users', 'all'],
    queryFn: () => rbacApi.listUsers({ page: 1, limit: 100 }),
    enabled: showAddMember,
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => rbacApi.addGroupMember(group.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac', 'groups'] });
      setShowAddMember(false);
      setMemberEmail('');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => rbacApi.removeGroupMember(group.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac', 'groups'] });
    },
  });

  if (!isOpen) return null;

  const availableUsers = usersData?.users?.filter(
    (u: any) => !group.members?.some((m: any) => m.adminId === u.id)
  ) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Members of {group.displayName}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          {!showAddMember ? (
            <button
              onClick={() => setShowAddMember(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <button
                onClick={() => memberEmail && addMemberMutation.mutate(memberEmail)}
                disabled={!memberEmail || addMemberMutation.isPending}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setMemberEmail('');
                }}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {group.members?.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No members in this group</p>
          ) : (
            <div className="space-y-2">
              {group.members?.map((member: any) => (
                <div
                  key={member.adminId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{member.admin?.name}</div>
                    <div className="text-sm text-gray-500">{member.admin?.email}</div>
                  </div>
                  <button
                    onClick={() => removeMemberMutation.mutate(member.adminId)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Remove member"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupRolesModal({
  isOpen,
  onClose,
  group,
  roles,
}: {
  isOpen: boolean;
  onClose: () => void;
  group: any;
  roles: any[];
}) {
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    group?.roles?.map((r: any) => r.roleId) || []
  );

  const updateRolesMutation = useMutation({
    mutationFn: (roleIds: string[]) => rbacApi.assignGroupRole(group.id, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac', 'groups'] });
      onClose();
    },
  });

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Roles for {group.displayName}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto">
          <p className="text-sm text-gray-500 mb-4">
            Select roles to assign to all members of this group.
          </p>
          <div className="space-y-2">
            {roles.map((role) => (
              <label
                key={role.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{role.displayName}</div>
                  {role.description && (
                    <div className="text-xs text-gray-500">{role.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => updateRolesMutation.mutate(selectedRoles)}
            disabled={updateRolesMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {updateRolesMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GroupsDashboard() {
  const queryClient = useQueryClient();
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [membersGroup, setMembersGroup] = useState<any>(null);
  const [rolesGroup, setRolesGroup] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['rbac', 'groups'],
    queryFn: rbacApi.listGroups,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['rbac', 'roles'],
    queryFn: rbacApi.listRoles,
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => rbacApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac', 'groups'] });
      setDeleteConfirm(null);
    },
  });

  const groups = groupsData?.groups || [];
  const roles = rolesData?.roles || [];

  // Build hierarchy
  const topLevelGroups = groups.filter((g: any) => !g.parentId);

  const renderGroup = (group: any, level = 0) => (
    <div key={group.id} style={{ marginLeft: level * 20 }}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: group.color ? `${group.color}20` : '#E5E7EB' }}
            >
              <UsersRound
                className="w-5 h-5"
                style={{ color: group.color || '#6B7280' }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{group.displayName}</h3>
              <p className="text-xs text-gray-500">{group.name}</p>
            </div>
          </div>
        </div>

        {group.description && (
          <p className="text-sm text-gray-500 mt-3">{group.description}</p>
        )}

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => setMembersGroup(group)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
          >
            <Users className="w-4 h-4" />
            <span>{group.members?.length || 0} members</span>
          </button>
          <button
            onClick={() => setRolesGroup(group)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
          >
            <Shield className="w-4 h-4" />
            <span>{group.roles?.length || 0} roles</span>
          </button>
          <div className="flex-1" />
          <button
            onClick={() => {
              setEditingGroup(group);
              setShowGroupForm(true);
            }}
            className="p-1 text-gray-400 hover:text-blue-600"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteConfirm(group.id)}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Render children */}
      {groups
        .filter((g: any) => g.parentId === group.id)
        .map((child: any) => renderGroup(child, level + 1))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-500">Organize users into teams and departments</p>
        </div>
        <button
          onClick={() => {
            setEditingGroup(null);
            setShowGroupForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500">
              <UsersRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Groups</p>
              <p className="text-2xl font-bold text-gray-900">{groups.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {groups.reduce((acc: number, g: any) => acc + (g.members?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Group Roles</p>
              <p className="text-2xl font-bold text-gray-900">
                {groups.reduce((acc: number, g: any) => acc + (g.roles?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Groups List */}
      <div>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No groups found. Create one to get started!
          </div>
        ) : (
          topLevelGroups.map((group: any) => renderGroup(group))
        )}
      </div>

      {/* Group Form Modal */}
      <GroupFormModal
        isOpen={showGroupForm}
        onClose={() => {
          setShowGroupForm(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
        groups={groups}
      />

      {/* Members Modal */}
      <GroupMembersModal
        isOpen={!!membersGroup}
        onClose={() => setMembersGroup(null)}
        group={membersGroup}
      />

      {/* Roles Modal */}
      <GroupRolesModal
        isOpen={!!rolesGroup}
        onClose={() => setRolesGroup(null)}
        group={rolesGroup}
        roles={roles}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deleteGroupMutation.mutate(deleteConfirm)}
        title="Delete Group"
        message="Are you sure you want to delete this group? Members will be removed from the group."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteGroupMutation.isPending}
      />
    </div>
  );
}

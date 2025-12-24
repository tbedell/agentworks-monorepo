import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Users, X, ChevronDown, Search } from 'lucide-react';
import { rbacApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface Assignee {
  id: string;
  type: 'user' | 'group';
  name?: string;
  avatarUrl?: string;
}

interface AssigneeSelectorProps {
  value: Assignee | null;
  onChange: (assignee: Assignee | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AssigneeSelector({
  value,
  onChange,
  placeholder = 'Assign to...',
  disabled = false,
  className,
}: AssigneeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'users' | 'groups'>('users');
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch users and groups
  const { data: usersData } = useQuery({
    queryKey: ['rbac', 'users', 'selector'],
    queryFn: () => rbacApi.listUsers({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: groupsData } = useQuery({
    queryKey: ['rbac', 'groups', 'selector'],
    queryFn: rbacApi.listGroups,
    enabled: isOpen,
  });

  const users = usersData?.users || [];
  const groups = groupsData?.groups || [];

  // Filter based on search
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    g.displayName.toLowerCase().includes(search.toLowerCase()) ||
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string, type: 'user' | 'group', name: string, avatarUrl?: string) => {
    onChange({ id, type, name, avatarUrl });
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-left transition-colors',
          'border-gray-200 bg-white',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300',
          isOpen && 'border-blue-500 ring-2 ring-blue-100'
        )}
      >
        {value ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0',
              value.type === 'user' ? 'bg-blue-500' : 'bg-purple-500'
            )}>
              {value.type === 'user' ? (
                value.avatarUrl ? (
                  <img src={value.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )
              ) : (
                <Users className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="truncate text-gray-900">{value.name || 'Unknown'}</span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-auto p-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronDown className={cn('w-4 h-4 text-gray-400 flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => setTab('users')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                tab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <User className="w-4 h-4 inline-block mr-1.5" />
              Users ({filteredUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('groups')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                tab === 'groups'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Users className="w-4 h-4 inline-block mr-1.5" />
              Groups ({filteredGroups.length})
            </button>
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {tab === 'users' ? (
              filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No users found</div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user.id, 'user', user.name, user.avatarUrl)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors',
                      value?.id === user.id && value?.type === 'user' && 'bg-blue-50'
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  </button>
                ))
              )
            ) : (
              filteredGroups.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No groups found</div>
              ) : (
                filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleSelect(group.id, 'group', group.displayName)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors',
                      value?.id === group.id && value?.type === 'group' && 'bg-purple-50'
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: group.color ? `${group.color}20` : '#F3E8FF' }}
                    >
                      <Users
                        className="w-4 h-4"
                        style={{ color: group.color || '#9333EA' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{group.displayName}</div>
                      {group.memberCount !== undefined && (
                        <div className="text-xs text-gray-500">{group.memberCount} members</div>
                      )}
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

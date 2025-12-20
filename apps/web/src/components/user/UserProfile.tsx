import { useState, useEffect, useRef } from 'react';
import { User, Settings, Key, Camera, Check, X, Loader2, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../lib/api';
import clsx from 'clsx';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileData {
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
}

interface PreferencesData {
  emailNotifications: boolean;
  desktopNotifications: boolean;
  agentStatusUpdates: boolean;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    avatarUrl: null,
    createdAt: null,
    lastLoginAt: null,
  });

  const [preferences, setPreferences] = useState<PreferencesData>({
    emailNotifications: true,
    desktopNotifications: true,
    agentStatusUpdates: true,
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Load profile data on mount
  useEffect(() => {
    if (isOpen) {
      loadProfileData();
    }
  }, [isOpen]);

  const loadProfileData = async () => {
    setDataLoading(true);
    try {
      const response = await api.user.getProfile();
      setProfileData({
        name: response.user.name,
        email: response.user.email,
        avatarUrl: response.user.avatarUrl,
        createdAt: response.user.createdAt,
        lastLoginAt: response.user.lastLoginAt,
      });
      setPreferences({
        emailNotifications: response.preferences.emailNotifications,
        desktopNotifications: response.preferences.desktopNotifications,
        agentStatusUpdates: response.preferences.agentStatusUpdates,
      });
      setActiveSessions(response.activeSessions);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.user.updateProfile({ name: profileData.name });
      setIsEditing(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.user.updatePreferences(preferences);
      setSuccess('Preferences saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setError('Passwords do not match');
      return;
    }

    if (passwords.new.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.user.changePassword(passwords.current, passwords.new);
      setPasswords({ current: '', new: '', confirm: '' });
      setSuccess('Password updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be smaller than 5MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
      return;
    }

    setPhotoUploading(true);
    setError(null);
    try {
      const result = await api.user.uploadPhoto(file);
      setProfileData({ ...profileData, avatarUrl: result.avatarUrl });
      setSuccess('Photo uploaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async () => {
    setPhotoUploading(true);
    setError(null);
    try {
      await api.user.deletePhoto();
      setProfileData({ ...profileData, avatarUrl: null });
      setSuccess('Photo removed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to remove photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">User Profile</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <div className="flex">
          {/* Sidebar */}
          <div className="w-48 border-r border-slate-200 p-4">
            <nav className="space-y-1">
              {[
                { id: 'profile' as const, label: 'Profile', icon: User },
                { id: 'preferences' as const, label: 'Preferences', icon: Settings },
                { id: 'security' as const, label: 'Security', icon: Key },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    setError(null);
                    setSuccess(null);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                    activeTab === id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <>
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {photoUploading ? (
                          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                          </div>
                        ) : profileData.avatarUrl ? (
                          <img
                            src={profileData.avatarUrl}
                            alt={profileData.name}
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xl font-semibold">
                            {profileData.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={photoUploading}
                          className="absolute -bottom-1 -right-1 h-6 w-6 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 disabled:opacity-50"
                          title="Upload photo"
                        >
                          <Camera className="h-3 w-3 text-slate-500" />
                        </button>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{profileData.name}</h3>
                        <p className="text-sm text-slate-500">{profileData.email}</p>
                        {profileData.avatarUrl && (
                          <button
                            onClick={handleDeletePhoto}
                            disabled={photoUploading}
                            className="mt-1 text-xs text-red-600 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) =>
                            setProfileData({ ...profileData, name: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          disabled
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Contact support to change your email address
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              loadProfileData();
                            }}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveProfile}
                            disabled={loading}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {loading ? 'Saving...' : 'Save Changes'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          Edit Profile
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-4">Notifications</h3>
                      <div className="space-y-4">
                        {[
                          {
                            key: 'emailNotifications' as const,
                            label: 'Email Notifications',
                            description:
                              'Receive email updates about your projects and agents',
                          },
                          {
                            key: 'desktopNotifications' as const,
                            label: 'Desktop Notifications',
                            description:
                              'Show browser notifications for important updates',
                          },
                          {
                            key: 'agentStatusUpdates' as const,
                            label: 'Agent Status Updates',
                            description:
                              'Get notified when agents complete tasks or encounter errors',
                          },
                        ].map(({ key, label, description }) => (
                          <div key={key} className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id={key}
                              checked={preferences[key]}
                              onChange={(e) =>
                                setPreferences({
                                  ...preferences,
                                  [key]: e.target.checked,
                                })
                              }
                              className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div>
                              <label
                                htmlFor={key}
                                className="font-medium text-slate-700 text-sm cursor-pointer"
                              >
                                {label}
                              </label>
                              <p className="text-xs text-slate-500">{description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSavePreferences}
                        disabled={loading}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {loading ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-4">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={passwords.current}
                            onChange={(e) =>
                              setPasswords({ ...passwords, current: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={passwords.new}
                            onChange={(e) =>
                              setPasswords({ ...passwords, new: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Must be at least 8 characters
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={passwords.confirm}
                            onChange={(e) =>
                              setPasswords({ ...passwords, confirm: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          {passwords.new &&
                            passwords.confirm &&
                            passwords.new === passwords.confirm && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                                <Check className="h-3 w-3" />
                                <span>Passwords match</span>
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={handleChangePassword}
                          disabled={
                            loading ||
                            !passwords.current ||
                            !passwords.new ||
                            passwords.new !== passwords.confirm
                          }
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                          {loading ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                      <h3 className="font-semibold text-slate-900 mb-4">
                        Account Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Account created:</span>
                          <span className="text-slate-900">
                            {formatDate(profileData.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Last login:</span>
                          <span className="text-slate-900">
                            {formatRelativeTime(profileData.lastLoginAt)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Active sessions:</span>
                          <span className="text-slate-900">
                            {activeSessions} {activeSessions === 1 ? 'device' : 'devices'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

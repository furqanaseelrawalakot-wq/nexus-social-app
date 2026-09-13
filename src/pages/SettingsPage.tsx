import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Globe,
  Users,
  ToggleLeft,
  ToggleRight,
  Key,
  Mail,
  Bell,
  UserX,
  AlertTriangle,
  Trash2,
  Power,
  Check,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserAvatar } from '../components/common/UserAvatar';
import { BlockedUser, NotificationSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    currentUser,
    updateProfile,
    updatePrivacy,
    updateNotificationSettings,
    changePassword,
    changeEmail,
    verifyChangeEmail,
    deactivateAccount,
    deleteAccount,
    getBlockedUsers,
    unblockUser,
  } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'privacy' | 'security' | 'notifications' | 'blocked' | 'account'>('privacy');

  // Privacy State
  const isPrivate = Boolean(
    currentUser.isPrivate || currentUser.privacySettings?.whoCanSeePosts === 'friends'
  );

  const privacy = currentUser.privacySettings || {
    whoCanSeePosts: isPrivate ? 'friends' : 'public',
    whoCanSendRequests: 'everyone',
    showOnlineStatus: true,
  };

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Email State
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Notification State
  const notifSettings: NotificationSettings = {
    notifyOnFriendRequest: currentUser.notificationSettings?.notifyOnFriendRequest ?? currentUser.privacySettings?.notificationSettings?.notifyOnFriendRequest ?? true,
    notifyOnComment: currentUser.notificationSettings?.notifyOnComment ?? currentUser.privacySettings?.notificationSettings?.notifyOnComment ?? true,
    notifyOnReaction: currentUser.notificationSettings?.notifyOnReaction ?? currentUser.privacySettings?.notificationSettings?.notifyOnReaction ?? true,
    notifyOnMessage: currentUser.notificationSettings?.notifyOnMessage ?? currentUser.privacySettings?.notificationSettings?.notifyOnMessage ?? true,
    notifyOnFollow: currentUser.notificationSettings?.notifyOnFollow ?? currentUser.privacySettings?.notificationSettings?.notifyOnFollow ?? true,
  };

  // Blocked Users State
  const [blockedList, setBlockedList] = useState<BlockedUser[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  // Account Danger Modals State
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Load blocked users when switching to blocked tab
  useEffect(() => {
    if (activeTab === 'blocked') {
      loadBlockedUsers();
    }
  }, [activeTab]);

  const loadBlockedUsers = async () => {
    setIsLoadingBlocked(true);
    try {
      const users = await getBlockedUsers();
      setBlockedList(users);
    } catch {
      setBlockedList([]);
    } finally {
      setIsLoadingBlocked(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    setUnblockingId(userId);
    try {
      const res = await unblockUser(userId);
      if (res.success) {
        setBlockedList((prev) => prev.filter((b) => b.userId !== userId && b.id !== userId));
      }
    } finally {
      setUnblockingId(null);
    }
  };

  const handleTogglePrivate = async () => {
    const newPrivate = !isPrivate;
    await updateProfile({
      isPrivate: newPrivate,
      privacySettings: {
        ...privacy,
        isPrivate: newPrivate,
        whoCanSeePosts: newPrivate ? 'friends' : 'public',
      },
    });

    showToast(
      newPrivate ? '🔒 Account Set to Private' : '🌍 Account Set to Public',
      newPrivate
        ? 'Only confirmed friends can view your posts and full profile.'
        : 'Anyone on Nexus can now view your posts and profile.',
      'success'
    );
  };

  const handleNotificationToggle = async (key: keyof NotificationSettings) => {
    const currentVal = notifSettings[key] ?? true;
    const newSettings = {
      ...notifSettings,
      [key]: !currentVal,
    };
    await updateNotificationSettings(newSettings);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        setPassSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassError(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setPassError(err.message || 'Error changing password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!emailCurrentPassword) {
      setEmailError('Please enter your current password.');
      return;
    }
    if (!newEmail || !newEmail.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (newEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) {
      setEmailError('New email must be different from your current email.');
      return;
    }

    setIsSendingEmailOtp(true);
    try {
      const res = await changeEmail(emailCurrentPassword, newEmail.trim());
      if (res.success) {
        setIsEmailOtpSent(true);
      } else {
        setEmailError(res.message || 'Failed to request email change.');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Error requesting email change.');
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!emailOtp.trim()) {
      setEmailError('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifyingEmail(true);
    try {
      const res = await verifyChangeEmail(newEmail.trim(), emailOtp.trim());
      if (res.success) {
        setIsEmailOtpSent(false);
        setNewEmail('');
        setEmailCurrentPassword('');
        setEmailOtp('');
      } else {
        setEmailError(res.message || 'Invalid verification code.');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Error verifying email change.');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivateError('');
    setIsDeactivating(true);
    try {
      const res = await deactivateAccount(deactivatePassword);
      if (!res.success) {
        setDeactivateError(res.message || 'Failed to deactivate account.');
        setIsDeactivating(false);
      }
    } catch (err: any) {
      setDeactivateError(err.message || 'Network error.');
      setIsDeactivating(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError('');
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm permanent deletion.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Please enter your password to authorize deletion.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAccount(deletePassword);
      if (!res.success) {
        setDeleteError(res.message || 'Failed to delete account.');
        setIsDeleting(false);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Network error.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-20 select-none">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Settings & Privacy</h1>
          <p className="text-xs text-slate-500">
            Manage your account security, privacy preferences, notifications, and connections
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'privacy'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Privacy & Visibility</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'security'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Security & Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'notifications'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('blocked')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'blocked'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Blocked Users</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'account'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-rose-600 hover:bg-rose-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Account Management</span>
        </button>
      </div>

      {/* TAB 1: PRIVACY & VISIBILITY */}
      {activeTab === 'privacy' && (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
          {/* Public vs Private */}
          <div className="p-6 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-50/70 to-white">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                {isPrivate ? (
                  <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
                    <Lock className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <Globe className="w-4 h-4" />
                  </div>
                )}
                <h4 className="text-sm font-bold text-slate-900">
                  {isPrivate ? 'Private Profile (Friends Only)' : 'Public Profile (Everyone)'}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                    isPrivate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isPrivate ? 'Private' : 'Public'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                {isPrivate ? (
                  <>
                    <strong className="font-semibold text-slate-800">Private:</strong> Only your confirmed friends can view your profile, posts, and photos. Non-friends only see your name, avatar, and an "Add Friend" option.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-slate-800">Public:</strong> Anyone on Nexus can view your profile, public posts, and stories.
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={handleTogglePrivate}
              className={`p-1.5 rounded-2xl transition-transform active:scale-95 ${
                isPrivate ? 'text-amber-600' : 'text-slate-300 hover:text-slate-400'
              }`}
              title={isPrivate ? 'Switch to Public' : 'Switch to Private'}
            >
              {isPrivate ? (
                <ToggleRight className="w-10 h-10" />
              ) : (
                <ToggleLeft className="w-10 h-10" />
              )}
            </button>
          </div>

          {/* Who can send friend requests */}
          <div className="p-6 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Who can send you friend requests</span>
              </h4>
              <p className="text-xs text-slate-500">
                Limit connection requests to mutual connections or open to everyone.
              </p>
            </div>

            <select
              value={privacy.whoCanSendRequests}
              onChange={(e) =>
                updatePrivacy({
                  whoCanSendRequests: e.target.value as 'everyone' | 'friends_of_friends',
                })
              }
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="everyone">Everyone</option>
              <option value="friends_of_friends">Friends of Friends</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="p-6 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Active Status Indicator</span>
              </h4>
              <p className="text-xs text-slate-500">
                Allow your friends to see when you are online and active on Nexus.
              </p>
            </div>

            <button
              type="button"
              onClick={() => updatePrivacy({ showOnlineStatus: !privacy.showOnlineStatus })}
              className={`p-1.5 rounded-2xl transition-colors ${
                privacy.showOnlineStatus ? 'text-indigo-600' : 'text-slate-300'
              }`}
            >
              {privacy.showOnlineStatus ? (
                <ToggleRight className="w-9 h-9" />
              ) : (
                <ToggleLeft className="w-9 h-9" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password Card */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500">
                  Update your password regularly to keep your account protected
                </p>
              </div>
            </div>

            {passError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isChangingPass ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          </div>

          {/* Change Email Card */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Change Email Address</h3>
                <p className="text-xs text-slate-500">
                  Current email:{' '}
                  <span className="font-semibold text-slate-800">{currentUser.email || 'Not set'}</span>
                </p>
              </div>
            </div>

            {emailError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            {!isEmailOtpSent ? (
              <form onSubmit={handleRequestEmailChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={emailCurrentPassword}
                    onChange={(e) => setEmailCurrentPassword(e.target.value)}
                    placeholder="Enter password to authorize change"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">New Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingEmailOtp}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSendingEmailOtp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailChange} className="space-y-4 max-w-md bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">
                    Enter Verification Code sent to <span className="text-indigo-600">{newEmail}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEmailOtpSent(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Change Email
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    placeholder="Enter 6-digit code (e.g. 123456)"
                    className="w-full text-center tracking-widest text-base font-mono font-bold px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Check your inbox or use code <code className="bg-slate-200 px-1 rounded">123456</code> in preview mode.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isVerifyingEmail}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isVerifyingEmail ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify & Update Email</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEmailOtpSent(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATION PREFERENCES */}
      {activeTab === 'notifications' && (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
          <div className="p-6 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              <span>Notification Preferences</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose which notifications and real-time alerts you would like to receive
            </p>
          </div>

          {/* Friend Requests */}
          <div className="p-6 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Friend Requests & Accepts</h4>
              <p className="text-xs text-slate-500">
                Notify when someone sends you a friend request or accepts yours
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNotificationToggle('notifyOnFriendRequest')}
              className={`p-1.5 rounded-2xl transition-colors ${
                notifSettings.notifyOnFriendRequest !== false ? 'text-indigo-600' : 'text-slate-300'
              }`}
            >
              {notifSettings.notifyOnFriendRequest !== false ? (
                <ToggleRight className="w-9 h-9" />
              ) : (
                <ToggleLeft className="w-9 h-9" />
              )}
            </button>
          </div>

          {/* Comments */}
          <div className="p-6 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Comments & Replies</h4>
              <p className="text-xs text-slate-500">
                Notify when someone comments on your post or replies to your comment
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNotificationToggle('notifyOnComment')}
              className={`p-1.5 rounded-2xl transition-colors ${
                notifSettings.notifyOnComment !== false ? 'text-indigo-600' : 'text-slate-300'
              }`}
            >
              {notifSettings.notifyOnComment !== false ? (
                <ToggleRight className="w-9 h-9" />
              ) : (
                <ToggleLeft className="w-9 h-9" />
              )}
            </button>
          </div>

          {/* Reactions */}
          <div className="p-6 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Post & Comment Reactions</h4>
              <p className="text-xs text-slate-500">
                Notify when someone likes or reacts to your posts or comments
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNotificationToggle('notifyOnReaction')}
              className={`p-1.5 rounded-2xl transition-colors ${
                notifSettings.notifyOnReaction !== false ? 'text-indigo-600' : 'text-slate-300'
              }`}
            >
              {notifSettings.notifyOnReaction !== false ? (
                <ToggleRight className="w-9 h-9" />
              ) : (
                <ToggleLeft className="w-9 h-9" />
              )}
            </button>
          </div>

          {/* Direct Messages */}
          <div className="p-6 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Direct Messages</h4>
              <p className="text-xs text-slate-500">
                Notify when you receive a new chat message or voice note
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNotificationToggle('notifyOnMessage')}
              className={`p-1.5 rounded-2xl transition-colors ${
                notifSettings.notifyOnMessage !== false ? 'text-indigo-600' : 'text-slate-300'
              }`}
            >
              {notifSettings.notifyOnMessage !== false ? (
                <ToggleRight className="w-9 h-9" />
              ) : (
                <ToggleLeft className="w-9 h-9" />
              )}
            </button>
          </div>

          {/* Follows */}
          <div className="p-6 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900">New Followers</h4>
              <p className="text-xs text-slate-500">
                Notify when someone starts following your public updates
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNotificationToggle('notifyOnFollow')}
              className={`p-1.5 rounded-2xl transition-colors ${
                notifSettings.notifyOnFollow !== false ? 'text-indigo-600' : 'text-slate-300'
              }`}
            >
              {notifSettings.notifyOnFollow !== false ? (
                <ToggleRight className="w-9 h-9" />
              ) : (
                <ToggleLeft className="w-9 h-9" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: BLOCKED USERS */}
      {activeTab === 'blocked' && (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Blocked Accounts</h3>
                <p className="text-xs text-slate-500">
                  Blocked accounts cannot view your profile, posts, stories, or message you
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadBlockedUsers}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Refresh blocked list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingBlocked ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingBlocked ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : blockedList.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Blocked Users</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Users you block will appear here. You can block any user from their profile page.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {blockedList.map((blocked) => (
                <div key={blocked.id || blocked.userId} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={blocked.avatarUrl}
                      name={blocked.fullName || blocked.username}
                      size="md"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{blocked.fullName || blocked.username}</h4>
                      <p className="text-[11px] text-slate-500">@{blocked.username}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={unblockingId === (blocked.userId || blocked.id)}
                    onClick={() => handleUnblock(blocked.userId || blocked.id)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {unblockingId === (blocked.userId || blocked.id) ? 'Unblocking...' : 'Unblock'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ACCOUNT MANAGEMENT / DANGER ZONE */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Deactivate Account */}
          <div className="rounded-3xl bg-white border border-amber-200 shadow-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-700">
                  <Power className="w-5 h-5" />
                  <h3 className="text-base font-bold">Deactivate Account</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                  Temporarily disable your account. Your profile, posts, photos, and comments will be hidden from other users.
                  You can easily reactivate and restore your account at any time simply by logging back in.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDeactivateModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shrink-0 transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                Deactivate Account
              </button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="rounded-3xl bg-white border border-rose-200 shadow-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-rose-600">
                  <Trash2 className="w-5 h-5" />
                  <h3 className="text-base font-bold">Delete Account Permanently</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                  Permanently delete your account, posts, stories, and friends list. Any remaining comments or chat messages will be anonymized as "Deleted User". This action is permanent and cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600">
                <Power className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Deactivate Account</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateModal(false);
                  setDeactivateError('');
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to deactivate your account? You will be signed out immediately. You can log back in at any time to reactivate your profile.
            </p>

            {deactivateError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {deactivateError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password (Optional)</label>
              <input
                type="password"
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeactivating}
                onClick={handleDeactivate}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isDeactivating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Yes, Deactivate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Delete Account Permanently</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError('');
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-3 rounded-xl border border-rose-200">
              ⚠️ Warning: This action cannot be reversed. All your posts, photos, and highlights will be permanently wiped.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Type <span className="font-mono text-rose-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your account password"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'DELETE' || !deletePassword}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

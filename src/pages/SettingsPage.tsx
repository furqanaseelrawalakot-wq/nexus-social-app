import React from 'react';
import {
  Shield,
  Eye,
  Lock,
  Globe,
  Users,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { currentUser, updateProfile, updatePrivacy } = useAuth();
  const { showToast } = useToast();

  const isPrivate = Boolean(
    currentUser.isPrivate || currentUser.privacySettings?.whoCanSeePosts === 'friends'
  );

  const privacy = currentUser.privacySettings || {
    whoCanSeePosts: isPrivate ? 'friends' : 'public',
    whoCanSendRequests: 'everyone',
    showOnlineStatus: true,
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

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-20 select-none">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Privacy & Settings</h1>
          <p className="text-xs text-slate-500">Manage who can view your profile, posts, and interact with you</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
        {/* 1. PUBLIC VS PRIVATE PROFILE MASTER TOGGLE */}
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
                  <strong className="font-semibold text-slate-800">Private:</strong> Only your confirmed friends can view your profile, posts, and photos. Non-friends only see your name, avatar, and a limited preview with an "Add Friend" prompt.
                </>
              ) : (
                <>
                  <strong className="font-semibold text-slate-800">Public:</strong> Anyone on the platform can view your profile, posts, and photos. Non-friends can send friend requests to chat.
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

        {/* 2. WHO CAN SEND FRIEND REQUESTS */}
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

        {/* 3. ONLINE PRESENCE INDICATOR */}
        <div className="p-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Active Status Indicator</span>
            </h4>
            <p className="text-xs text-slate-500">
              Allow friends to see when you are active on the platform.
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
    </div>
  );
};

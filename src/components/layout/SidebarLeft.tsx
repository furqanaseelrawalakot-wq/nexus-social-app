import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  MessageSquare,
  Bookmark,
  Settings,
  GraduationCap,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFeed } from '../../context/FeedContext';
import { UserAvatar } from '../common/UserAvatar';
import { UserConnectionsModal } from '../profile/UserConnectionsModal';

export const SidebarLeft: React.FC = () => {
  const { currentUser } = useAuth();
  const { friends } = useFeed();
  const location = useLocation();

  const [connectionsModalTab, setConnectionsModalTab] = useState<'friends' | 'followers' | 'following' | null>(null);

  const navItems = [
    { label: 'News Feed', icon: Home, path: '/' },
    { label: 'My Friends', icon: Users, path: '/friends' },
    { label: 'Messages', icon: MessageSquare, path: '/messages' },
    { label: 'Saved Posts', icon: Bookmark, path: '/saved' },
    { label: 'Privacy & Settings', icon: Settings, path: '/settings' },
  ];

  const liveFriendsCount = Math.max(friends.length, currentUser.friendsCount || 0);

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col gap-5 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto scrollbar-none pb-8 select-none">
      {/* User Profile Snapshot Card */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-5 space-y-4">
        <Link to="/profile" className="flex items-center gap-3 group">
          <UserAvatar
            src={currentUser.avatarUrl}
            name={currentUser.fullName}
            size="lg"
            className="group-hover:scale-105 transition-transform"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate flex items-center gap-1">
              <span>{currentUser.fullName}</span>
              {currentUser.isVerified && (
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 fill-indigo-100" />
              )}
            </h3>
            <p className="text-[11px] text-slate-500 truncate">@{currentUser.username}</p>
          </div>
        </Link>

        {/* Interactive Clickable Stats Row (Opens Connections Modal) */}
        <div className="grid grid-cols-3 gap-1 py-2 border-y border-slate-100 text-center">
          <button
            type="button"
            onClick={() => setConnectionsModalTab('friends')}
            className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
            title="View Friends"
          >
            <span className="block text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {liveFriendsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-500">Friends</span>
          </button>

          <button
            type="button"
            onClick={() => setConnectionsModalTab('followers')}
            className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
            title="View Followers"
          >
            <span className="block text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {liveFriendsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-500">Followers</span>
          </button>

          <button
            type="button"
            onClick={() => setConnectionsModalTab('following')}
            className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
            title="View Following"
          >
            <span className="block text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {liveFriendsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-500">Following</span>
          </button>
        </div>

        {/* Affiliations (Only shown if filled by user) */}
        {(currentUser.occupation || currentUser.education) && (
          <div className="space-y-2 text-xs text-slate-600">
            {currentUser.occupation && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{currentUser.occupation}</span>
              </div>
            )}
            {currentUser.education && (
              <div className="flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{currentUser.education}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User Connections Modal */}
      {connectionsModalTab && (
        <UserConnectionsModal
          isOpen={Boolean(connectionsModalTab)}
          onClose={() => setConnectionsModalTab(null)}
          userId={currentUser.id}
          userName={currentUser.fullName}
          initialTab={connectionsModalTab}
          isOwnProfile={true}
        />
      )}
    </aside>
  );
};

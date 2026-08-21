import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Home,
  Users,
  MessageSquare,
  Bookmark,
  Bell,
  PlusCircle,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  UserCheck,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useChat } from '../../context/ChatContext';
import { useFeed } from '../../context/FeedContext';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { UserAvatar } from '../common/UserAvatar';

export const Navbar: React.FC<{ onOpenCreatePost?: () => void }> = ({ onOpenCreatePost }) => {
  const { currentUser, isAuthenticated, openAuthModal, logout } = useAuth();
  const { unreadCount: notifCount } = useNotifications();
  const { unreadCount: msgCount } = useChat();
  const { pendingRequests } = useFeed();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 sm:px-8 flex items-center justify-between gap-4">
      {/* Left: Brand Logo & Search */}
      <div className="flex items-center gap-4 sm:gap-6 flex-1 max-w-md">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <span className="text-lg font-extrabold font-display tracking-tight bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent">
              Nexus
            </span>
            <span className="text-xs font-bold text-indigo-600 ml-1 font-mono uppercase tracking-wider">
              Social
            </span>
          </div>
        </Link>

        {/* Global Search Bar */}
        <div className="relative w-full max-w-xs hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people, posts, tags..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
      </div>

      {/* Center: Main App Navigation Links */}
      <nav className="flex items-center gap-1 sm:gap-2">
        <Link
          to="/"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            isActive('/')
              ? 'bg-indigo-50 text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Feed"
        >
          <Home className="w-4 h-4" />
          <span className="hidden lg:inline">Feed</span>
        </Link>

        <Link
          to="/friends"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold relative transition-all ${
            isActive('/friends')
              ? 'bg-indigo-50 text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Friends & Network"
        >
          <Users className="w-4 h-4" />
          <span className="hidden lg:inline">Friends</span>
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
              {pendingRequests.length}
            </span>
          )}
        </Link>

        <Link
          to="/messages"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold relative transition-all ${
            isActive('/messages')
              ? 'bg-indigo-50 text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Direct Messages"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden lg:inline">Messages</span>
          {msgCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
              {msgCount}
            </span>
          )}
        </Link>

        <Link
          to="/saved"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            isActive('/saved')
              ? 'bg-indigo-50 text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Saved Posts"
        >
          <Bookmark className="w-4 h-4" />
          <span className="hidden lg:inline">Saved</span>
        </Link>
      </nav>

      {/* Right: Actions, Notifications & Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenCreatePost && (
          <button
            onClick={onOpenCreatePost}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden md:inline">Create Post</span>
          </button>
        )}

        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2.5 rounded-full transition-colors relative ${
              showNotifications ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {notifCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* User Profile / Auth Button */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-slate-100 transition-colors"
            >
              <UserAvatar
                src={currentUser.avatarUrl}
                name={currentUser.fullName}
                size="sm"
                online={true}
              />
              <span className="text-xs font-bold text-slate-800 hidden md:block max-w-[120px] truncate">
                {currentUser.fullName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                className="absolute right-0 top-12 w-56 rounded-3xl bg-white border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2"
                onClick={() => setShowUserMenu(false)}
              >
                <div className="p-3 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</p>
                  <p className="text-[11px] font-mono text-indigo-600 truncate">@{currentUser.username}</p>
                  <span className="inline-block px-2 py-0.5 mt-1 text-[9px] font-mono font-bold bg-indigo-50 text-indigo-600 rounded-full">
                    {currentUser.accountStatus === 'active' ? 'Verified Member' : 'Member'}
                  </span>
                </div>

                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>My Profile</span>
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings & Privacy</span>
                </Link>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors mt-1 border-t border-slate-100 pt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

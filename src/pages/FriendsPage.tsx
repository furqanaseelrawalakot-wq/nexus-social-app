import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Check,
  X,
  MessageSquare,
  Sparkles,
  UserCheck,
  Search,
  Compass,
  Clock,
} from 'lucide-react';
import { useFeed } from '../context/FeedContext';
import { useChat } from '../context/ChatContext';
import { UserAvatarLink, UserNameLink } from '../components/common/UserLink';

export const FriendsPage: React.FC = () => {
  const {
    friends,
    pendingRequests,
    discoverList,
    searchQuery,
    setSearchQuery,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    fetchDiscoverUsers,
  } = useFeed();

  const { openChat } = useChat();

  const [activeTab, setActiveTab] = useState<'discover' | 'all' | 'requests'>('discover');
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
      fetchDiscoverUsers(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery, fetchDiscoverUsers]);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-20 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Friends & Community</span>
          </h1>
          <p className="text-xs text-slate-500">
            Discover engineers, manage requests, and chat with your connections
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'discover'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Find People</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Friends ({friends.length})
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Requests ({pendingRequests.length})
            {pendingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1" />
            )}
          </button>
        </div>
      </div>

      {/* Search Bar for Discover Tab */}
      {activeTab === 'discover' && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by name, handle (@username), or occupation..."
            className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>
      )}

      {/* Grid of Users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* ========================================================= */}
        {/* 1. DISCOVER USERS TAB */}
        {/* ========================================================= */}
        {activeTab === 'discover' &&
          (discoverList.length > 0 ? (
            discoverList.map((user) => (
              <div
                key={user.id}
                className="rounded-3xl bg-white border border-slate-200 shadow-card hover:shadow-card-hover transition-all duration-200 p-4 flex flex-col items-center text-center space-y-3 justify-between"
              >
                <div className="flex flex-col items-center space-y-2 w-full">
                  <UserAvatarLink user={user} size="xl" online={user.isOnline} />
                  <div className="min-w-0 w-full">
                    <UserNameLink user={user} className="text-sm font-bold text-slate-900" />
                    <p className="text-[11px] font-mono text-indigo-600 truncate">@{user.username}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {user.occupation || 'Software Engineer'}
                    </p>
                  </div>
                </div>

                {/* Dynamic Relationship Buttons */}
                <div className="w-full pt-1">
                  {user.relationshipStatus === 'friends' ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="flex-1 py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                        Friends ✓
                      </span>
                      <button
                        onClick={() => openChat(user.id)}
                        className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
                        title="Send Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  ) : user.relationshipStatus === 'pending_sent' ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="flex-1 py-2 text-center text-xs font-bold text-slate-500 bg-slate-100 rounded-xl">
                        Request Sent
                      </span>
                      <button
                        onClick={() => cancelFriendRequest(user.id)}
                        className="px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors"
                        title="Cancel Request"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : user.relationshipStatus === 'pending_received' ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        onClick={() => acceptFriendRequest(user.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(user.id)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Friend</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 px-4 text-center rounded-3xl bg-white border border-slate-200 shadow-card flex flex-col items-center justify-center space-y-3">
              <Compass className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No users found matching your search</p>
              <p className="text-[11px] text-slate-400">Try searching with a different name or handle.</p>
            </div>
          ))}

        {/* ========================================================= */}
        {/* 2. ALL FRIENDS TAB */}
        {/* ========================================================= */}
        {activeTab === 'all' &&
          (friends.length > 0 ? (
            friends.map((f) => (
              <div
                key={f.id}
                className="rounded-3xl bg-white border border-slate-200 shadow-card p-4 flex flex-col items-center text-center space-y-3 justify-between"
              >
                <div className="flex flex-col items-center space-y-2 w-full">
                  <UserAvatarLink user={f} size="xl" online={f.isOnline} />
                  <div className="min-w-0 w-full">
                    <UserNameLink user={f} className="text-sm font-bold text-slate-900" />
                    <p className="text-[11px] font-mono text-indigo-600 truncate">@{f.username}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {f.occupation || 'Software Engineer'}
                    </p>
                  </div>
                </div>

                <div className="w-full pt-1 flex items-center gap-2">
                  <button
                    onClick={() => openChat(f.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 px-4 text-center rounded-3xl bg-white border border-slate-200 shadow-card flex flex-col items-center justify-center space-y-3">
              <Users className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">You have no friends yet</p>
              <p className="text-[11px] text-slate-400">
                Go to the Find People tab to connect with peers!
              </p>
            </div>
          ))}

        {/* ========================================================= */}
        {/* 3. PENDING REQUESTS TAB */}
        {/* ========================================================= */}
        {activeTab === 'requests' &&
          (pendingRequests.length > 0 ? (
            pendingRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-3xl bg-white border border-slate-200 shadow-card p-4 flex flex-col items-center text-center space-y-3 justify-between"
              >
                <div className="flex flex-col items-center space-y-2 w-full">
                  <UserAvatarLink user={req.fromUser} size="xl" />
                  <div className="min-w-0 w-full">
                    <UserNameLink user={req.fromUser} className="text-sm font-bold text-slate-900" />
                    <p className="text-[11px] font-mono text-indigo-600 truncate">@{req.fromUser.username}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {req.fromUser.occupation || 'Wants to connect'}
                    </p>
                  </div>
                </div>

                <div className="w-full pt-1 flex items-center gap-2">
                  <button
                    onClick={() => acceptFriendRequest(req.fromUser.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm</span>
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(req.fromUser.id)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 px-4 text-center rounded-3xl bg-white border border-slate-200 shadow-card flex flex-col items-center justify-center space-y-3">
              <Clock className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No pending friend requests</p>
              <p className="text-[11px] text-slate-400">
                When someone sends you a friend request, it will appear here.
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

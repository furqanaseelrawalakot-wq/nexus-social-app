import React from 'react';
import { UserPlus, Check, X, MessageSquare, Sparkles, Users } from 'lucide-react';
import { useFeed } from '../../context/FeedContext';
import { useChat } from '../../context/ChatContext';
import { UserAvatarLink, UserNameLink } from '../common/UserLink';

export const SidebarRight: React.FC = () => {
  const {
    friends,
    pendingRequests,
    discoverList,
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
  } = useFeed();

  const { openChat } = useChat();

  const activeFriends = friends;
  const suggestedPeople = discoverList.filter((u) => u.relationshipStatus === 'none').slice(0, 4);

  return (
    <aside className="w-80 shrink-0 hidden xl:flex flex-col gap-5 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto scrollbar-none pb-8 select-none">
      {/* 1. Friend Requests Widget */}
      {pendingRequests.length > 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Friend Requests</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold font-mono">
              {pendingRequests.length}
            </span>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <UserAvatarLink user={req.fromUser} size="md" />
                  <div className="min-w-0 flex-1">
                    <UserNameLink user={req.fromUser} className="text-xs font-bold text-slate-900" />
                    <p className="text-[10px] text-slate-500 font-mono">@{req.fromUser.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => acceptFriendRequest(req.fromUser.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm</span>
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(req.fromUser.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Suggested People to Connect */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>People You May Know</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{discoverList.length} total</span>
        </div>

        <div className="space-y-3">
          {suggestedPeople.length > 0 ? (
            suggestedPeople.map((person) => (
              <div key={person.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatarLink user={person} size="md" />
                  <div className="min-w-0">
                    <UserNameLink user={person} className="text-xs font-bold text-slate-900" />
                    <p className="text-[10px] text-slate-400 truncate">{person.occupation || 'Member'}</p>
                  </div>
                </div>

                <button
                  onClick={() => sendFriendRequest(person.id)}
                  className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold transition-colors shrink-0"
                  title="Add Friend"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-slate-400 text-center py-2">
              No new suggestions right now.
            </p>
          )}
        </div>
      </div>

      {/* 3. Active Contacts / Direct WhatsApp Chat */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-4 space-y-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Friends & Contacts</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {activeFriends.length} Connected
          </span>
        </div>

        <div className="space-y-1 overflow-y-auto flex-1 divide-y divide-slate-50">
          {activeFriends.length > 0 ? (
            activeFriends.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatarLink user={f} size="sm" online={f.isOnline} />
                  <div className="min-w-0">
                    <UserNameLink user={f} className="text-xs font-bold text-slate-800" />
                    <p className="text-[10px] text-slate-400 truncate">{f.occupation || 'Friend'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openChat(f.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Open Chat"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-slate-400 space-y-1.5">
              <Users className="w-6 h-6 mx-auto text-slate-300" />
              <p className="text-xs font-medium text-slate-600">No active friends yet</p>
              <p className="text-[10px] text-slate-400">Add connections to start chatting!</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

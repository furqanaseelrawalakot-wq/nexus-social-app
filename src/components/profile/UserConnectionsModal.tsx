import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Search,
  Lock,
  UserCheck,
  UserPlus,
  MessageSquare,
  UserMinus,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFeed } from '../../context/FeedContext';
import { useChat } from '../../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import { UserAvatarLink, UserNameLink } from '../common/UserLink';

interface ConnectionUser {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string;
  occupation?: string;
  location?: string;
  bio?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  friendsCount?: number;
  relationshipStatus?: 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none';
  isFriend?: boolean;
}

interface UserConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  initialTab?: 'friends' | 'followers' | 'following';
  isOwnProfile?: boolean;
}

export const UserConnectionsModal: React.FC<UserConnectionsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  initialTab = 'friends',
  isOwnProfile = false,
}) => {
  const { currentUser } = useAuth();
  const { unfriendUser, sendFriendRequest, acceptFriendRequest, cancelFriendRequest } = useFeed();
  const { openChat } = useChat();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'friends' | 'followers' | 'following'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<ConnectionUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivateRestricted, setIsPrivateRestricted] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;
    const fetchConnections = async () => {
      setIsLoading(true);
      setIsPrivateRestricted(false);

      try {
        const viewerId = currentUser?.id || '';
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}/${activeTab}?viewerId=${viewerId}`, {
          headers: { 'x-user-id': viewerId },
        });

        const data = await res.json();
        if (!isMounted) return;

        if (res.status === 403 && data.isPrivate) {
          setIsPrivateRestricted(true);
          setUsers([]);
          setTotalCount(0);
        } else if (res.ok && data.success) {
          setUsers(data.users || []);
          setTotalCount(data.total || (data.users || []).length);
        } else {
          setUsers([]);
          setTotalCount(0);
        }
      } catch (err) {
        console.warn('Error fetching connections:', err);
        if (isMounted) {
          setUsers([]);
          setTotalCount(0);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchConnections();

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId, activeTab, currentUser?.id]);

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.occupation && u.occupation.toLowerCase().includes(q))
    );
  });

  const handleMessage = (targetUserId: string) => {
    openChat(targetUserId);
    onClose();
    navigate('/messages');
  };

  const handleUnfriend = async (targetUser: ConnectionUser) => {
    const confirm = window.confirm(`Remove ${targetUser.fullName} from your friends list?`);
    if (!confirm) return;

    await unfriendUser(targetUser.id);
    setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
    setTotalCount((prev) => Math.max(0, prev - 1));
  };

  const handleFriendAction = async (targetUser: ConnectionUser) => {
    const status = targetUser.relationshipStatus;
    if (status === 'none' || !status) {
      await sendFriendRequest(targetUser.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, relationshipStatus: 'pending_sent' } : u))
      );
    } else if (status === 'pending_received') {
      await acceptFriendRequest(targetUser.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, relationshipStatus: 'friends', isFriend: true } : u))
      );
    } else if (status === 'pending_sent') {
      await cancelFriendRequest(targetUser.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, relationshipStatus: 'none' } : u))
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isOwnProfile ? 'Your Network' : `${userName}'s Network`}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Mutual connections & community
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-100 bg-slate-50/60 px-6 pt-2">
          {(['friends', 'followers', 'following'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSearchQuery('');
                }}
                className={`flex-1 py-3 text-xs font-bold capitalize border-b-2 transition-all text-center relative ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab}</span>
                {!isLoading && !isPrivateRestricted && activeTab === tab && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-600 font-mono">
                    {totalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar (When not private restricted) */}
        {!isPrivateRestricted && users.length > 0 && (
          <div className="p-3 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${activeTab}...`}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Connections List Body */}
        <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100">
          {isLoading ? (
            <div className="space-y-4 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-200" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-3.5 bg-slate-200 rounded-md" />
                      <div className="w-20 h-2.5 bg-slate-200 rounded-md" />
                    </div>
                  </div>
                  <div className="w-20 h-8 bg-slate-200 rounded-xl" />
                </div>
              ))}
            </div>
          ) : isPrivateRestricted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                <Lock className="w-7 h-7 text-slate-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">This Information is Private</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Add {userName} as a friend to view their friends, followers, and connections.
                </p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                {searchQuery ? 'No matching people found' : `No ${activeTab} yet`}
              </h4>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? 'Try searching with a different name or handle.'
                  : isOwnProfile
                  ? 'Connect with friends on Nexus to build your network.'
                  : `${userName} does not have any confirmed ${activeTab} yet.`}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelf = user.id === currentUser?.id;
              const isFriend = user.isFriend || user.relationshipStatus === 'friends';

              return (
                <div
                  key={user.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatarLink
                      user={user}
                      size="md"
                      className="group-hover:scale-105 transition-transform shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <UserNameLink
                          user={user}
                          className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors truncate"
                        />
                        {user.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 fill-indigo-100 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {user.occupation || `@${user.username}`}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isSelf && (
                    <div className="flex items-center gap-2 shrink-0">
                      {isOwnProfile && activeTab === 'friends' ? (
                        <button
                          type="button"
                          onClick={() => handleUnfriend(user)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition-colors"
                          title="Unfriend"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Unfriend</span>
                        </button>
                      ) : isFriend ? (
                        <button
                          type="button"
                          onClick={() => handleMessage(user.id)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleFriendAction(user)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm ${
                            user.relationshipStatus === 'pending_sent'
                              ? 'bg-amber-50 border border-amber-200 text-amber-700'
                              : user.relationshipStatus === 'pending_received'
                              ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                          }`}
                        >
                          {user.relationshipStatus === 'pending_sent' ? (
                            <span>Requested</span>
                          ) : user.relationshipStatus === 'pending_received' ? (
                            <span>Accept</span>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

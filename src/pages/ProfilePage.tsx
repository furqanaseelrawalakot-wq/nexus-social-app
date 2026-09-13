import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Edit3,
  MapPin,
  Briefcase,
  GraduationCap,
  Globe,
  Calendar,
  ShieldCheck,
  Image as ImageIcon,
  Users,
  FileText,
  Camera,
  MessageSquare,
  UserPlus,
  UserCheck,
  Clock,
  Lock,
  Plus,
  Sparkles,
  UserX,
} from 'lucide-react';
import { useAuth, getAuthHeaders } from '../context/AuthContext';
import { useFeed } from '../context/FeedContext';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import { PostCard } from '../components/feed/PostCard';
import { PostComposer } from '../components/feed/PostComposer';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { StoryViewerModal } from '../components/feed/StoryViewerModal';
import { StoryCreateModal } from '../components/feed/StoryCreateModal';
import { UserAvatar } from '../components/common/UserAvatar';
import { UserAvatarLink, UserNameLink } from '../components/common/UserLink';
import { UserConnectionsModal } from '../components/profile/UserConnectionsModal';
import { User, StoryHighlightGroup } from '../types';

export const ProfilePage: React.FC = () => {
  const { id: routeParam } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { currentUser, updateProfile, blockUser } = useAuth();
  const {
    posts,
    friends,
    sendFriendRequest,
    acceptFriendRequest,
    cancelFriendRequest,
    unfriendUser,
    followUser,
    unfollowUser,
    getUserHighlights,
  } = useFeed();
  const { openChat } = useChat();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'friends' | 'photos'>('posts');
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileRelationship, setProfileRelationship] = useState<
    'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none'
  >('self');
  const [profilePosts, setProfilePosts] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<StoryHighlightGroup[]>([]);
  const [selectedHighlightGroup, setSelectedHighlightGroup] = useState<StoryHighlightGroup | null>(null);
  const [showStoryCreateModal, setShowStoryCreateModal] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionsModalTab, setConnectionsModalTab] = useState<'friends' | 'followers' | 'following' | null>(null);

  const directAvatarRef = useRef<HTMLInputElement | null>(null);
  const directCoverRef = useRef<HTMLInputElement | null>(null);

  const isOwnProfile =
    !routeParam ||
    routeParam === currentUser.id ||
    routeParam === currentUser.username ||
    (profileUser && profileUser.id === currentUser.id);

  // Fetch Profile Data
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setIsLoading(true);

      if (isOwnProfile) {
        setProfileUser(currentUser);
        setProfileRelationship('self');
        try {
          const hls = await getUserHighlights(currentUser.id);
          if (isMounted) setHighlights(hls);
        } catch {}
        setIsLoading(false);
        return;
      }

      try {
        const url = `/api/users/${encodeURIComponent(routeParam!)}/profile?viewerId=${currentUser.id}`;
        const res = await fetch(url, {
          headers: { ...getAuthHeaders() },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && isMounted) {
            setProfileUser(data.user);
            setProfileRelationship(data.relationshipStatus || 'none');
            setProfilePosts(data.posts || []);
            try {
              const hls = await getUserHighlights(data.user.id);
              if (isMounted) setHighlights(hls);
            } catch {}
          }
        } else if (res.status === 403 || res.status === 404) {
          if (isMounted) setIsUnavailable(true);
        } else {
          // Fallback to searching in friends/discover lists
          const matched = friends.find((f) => f.id === routeParam || f.username === routeParam);
          if (matched && isMounted) {
            setProfileUser(matched);
            setProfileRelationship('friends');
            try {
              const hls = await getUserHighlights(matched.id);
              if (isMounted) setHighlights(hls);
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Error loading profile:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [routeParam, currentUser, isOwnProfile, friends, getUserHighlights]);

  const targetUser = isOwnProfile ? currentUser : profileUser || currentUser;
  const userPosts = isOwnProfile
    ? posts.filter((p) => p.author.id === currentUser.id)
    : profilePosts.length > 0
    ? profilePosts
    : posts.filter((p) => p.author.id === targetUser.id || p.author.username === targetUser.username);

  const activeFriends = isOwnProfile ? friends.filter((f) => f.status === 'friends') : [];
  const hasCover = Boolean(targetUser.coverUrl && targetUser.coverUrl.trim().length > 0);

  const isPrivate =
    targetUser.privacySettings?.whoCanSeePosts === 'friends' &&
    profileRelationship !== 'friends' &&
    !isOwnProfile;

  const handleMessageUser = () => {
    openChat(targetUser.id);
    navigate('/messages');
  };

  const handleFriendAction = async () => {
    if (profileRelationship === 'none') {
      await sendFriendRequest(targetUser.id);
      setProfileRelationship('pending_sent');
    } else if (profileRelationship === 'pending_received') {
      await acceptFriendRequest(targetUser.id);
      setProfileRelationship('friends');
      setProfileUser((prev) =>
        prev
          ? {
              ...prev,
              friendsCount: (prev.friendsCount || 0) + 1,
              followersCount: (prev.followersCount || 0) + 1,
              followingCount: (prev.followingCount || 0) + 1,
            }
          : prev
      );
    } else if (profileRelationship === 'pending_sent') {
      await cancelFriendRequest(targetUser.id);
      setProfileRelationship('none');
    } else if (profileRelationship === 'friends') {
      const confirmUnfriend = window.confirm(`Unfriend ${targetUser.fullName}?`);
      if (confirmUnfriend) {
        await unfriendUser(targetUser.id);
        setProfileRelationship('none');
        setProfileUser((prev) =>
          prev
            ? {
                ...prev,
                friendsCount: Math.max(0, (prev.friendsCount || 1) - 1),
                followersCount: Math.max(0, (prev.followersCount || 1) - 1),
                followingCount: Math.max(0, (prev.followingCount || 1) - 1),
              }
            : prev
        );
      }
    }
  };

  const handleFollowAction = async () => {
    if (!targetUser?.id) return;
    const isCurrentlyFollowing = Boolean(targetUser.isFollowing);

    if (isCurrentlyFollowing) {
      setProfileUser((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: false,
              followersCount: Math.max(0, (prev.followersCount || 1) - 1),
            }
          : prev
      );
      await unfollowUser(targetUser.id);
    } else {
      setProfileUser((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: true,
              followersCount: (prev.followersCount || 0) + 1,
            }
          : prev
      );
      await followUser(targetUser.id);
    }
  };

  const handleDirectAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        updateProfile({ avatarUrl: event.target.result as string });
        showToast('Avatar Updated!', 'Your new avatar is saved.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDirectCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        updateProfile({ coverUrl: event.target.result as string });
        showToast('Cover Photo Updated!', 'Your new cover photo is saved.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBlockAction = async () => {
    if (!targetUser?.id) return;
    if (
      window.confirm(
        `Block ${targetUser.fullName}? They will no longer be able to view your profile, posts, or message you.`
      )
    ) {
      const res = await blockUser(targetUser.id);
      if (res.success) {
        navigate('/');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto w-full space-y-6 pb-20 select-none animate-pulse">
        <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
          <div className="h-56 bg-slate-200" />
          <div className="px-6 sm:px-8 pb-6 space-y-4">
            <div className="flex items-end justify-between -mt-16 sm:-mt-20">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-slate-300 border-4 border-white" />
              <div className="w-28 h-10 bg-slate-200 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <div className="w-48 h-6 bg-slate-200 rounded-lg" />
              <div className="w-32 h-4 bg-slate-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isUnavailable) {
    return (
      <div className="max-w-md mx-auto w-full py-16 text-center space-y-4 select-none">
        <div className="p-4 rounded-full bg-slate-100 text-slate-400 inline-block shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-800">Profile Unavailable</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          This account is either deactivated, has blocked you, or is restricted by privacy settings.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-20 select-none">
      {/* Hidden File Pickers for 1-Click Upload (Own profile only) */}
      {isOwnProfile && (
        <>
          <input
            type="file"
            ref={directAvatarRef}
            onChange={handleDirectAvatar}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={directCoverRef}
            onChange={handleDirectCover}
            accept="image/*"
            className="hidden"
          />
        </>
      )}

      {/* Cover & Avatar Header Card */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-card overflow-hidden">
        {/* Cover Photo */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-r from-slate-200 via-indigo-100 to-slate-200 group overflow-hidden">
          {hasCover ? (
            <img
              src={targetUser.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <ImageIcon className="w-12 h-12 opacity-40" />
            </div>
          )}

          {isOwnProfile && (
            <button
              onClick={() => directCoverRef.current?.click()}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/70 hover:bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold shadow-lg transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Change Cover</span>
            </button>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
            {/* Avatar with Camera Overlay */}
            <div className="relative inline-block self-start sm:self-auto">
              <div className="ring-4 ring-white rounded-full overflow-hidden bg-white shadow-xl">
                <UserAvatar
                  src={targetUser.avatarUrl}
                  name={targetUser.fullName}
                  size="xl"
                  online={targetUser.isOnline}
                />
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => directAvatarRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg border-2 border-white transition-transform hover:scale-110 active:scale-95"
                  title="Upload New Avatar"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Action Buttons (Edit Profile or Add Friend / Message) */}
            <div className="flex items-center gap-2.5">
              {isOwnProfile ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <>
                  {/* Friend Status Action */}
                  <button
                    onClick={handleFriendAction}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                      profileRelationship === 'friends'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        : profileRelationship === 'pending_sent'
                        ? 'bg-amber-50 border border-amber-200 text-amber-700'
                        : profileRelationship === 'pending_received'
                        ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                    }`}
                  >
                    {profileRelationship === 'friends' ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Friends</span>
                      </>
                    ) : profileRelationship === 'pending_sent' ? (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Request Sent</span>
                      </>
                    ) : profileRelationship === 'pending_received' ? (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Accept Request</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Add Friend</span>
                      </>
                    )}
                  </button>

                  {/* Follow / Following One-Way Action Button */}
                  <button
                    type="button"
                    onClick={handleFollowAction}
                    className={`group flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                      targetUser.isFollowing
                        ? 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 text-slate-700'
                        : 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-current" />
                    <span className={targetUser.isFollowing ? 'group-hover:hidden' : ''}>
                      {targetUser.isFollowing ? 'Following' : 'Follow'}
                    </span>
                    {targetUser.isFollowing && (
                      <span className="hidden group-hover:inline text-rose-600">Unfollow</span>
                    )}
                  </button>

                  {/* Direct Message Button (Confirmed Friends Only) */}
                  {profileRelationship === 'friends' && (
                    <button
                      onClick={handleMessageUser}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Message</span>
                    </button>
                  )}

                  {/* Block User Button */}
                  <button
                    type="button"
                    onClick={handleBlockAction}
                    className="p-2.5 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-500 transition-all active:scale-95 shadow-sm"
                    title={`Block ${targetUser.fullName}`}
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name & Bio */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {targetUser.fullName}
                </h1>
                {targetUser.isVerified && (
                  <ShieldCheck className="w-5 h-5 text-indigo-600 fill-indigo-100" />
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">@{targetUser.username}</p>
            </div>

            {targetUser.bio && (
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-2xl font-medium">
                {targetUser.bio}
              </p>
            )}

            {/* Quick Details Badges */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-500 font-medium">
              {targetUser.occupation && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span>{targetUser.occupation}</span>
                </div>
              )}
              {targetUser.education && (
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  <span>{targetUser.education}</span>
                </div>
              )}
              {targetUser.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{targetUser.location}</span>
                </div>
              )}
              {targetUser.website && (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <a
                    href={targetUser.website.startsWith('http') ? targetUser.website : `https://${targetUser.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    {targetUser.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{targetUser.joinedDate || 'Member'}</span>
              </div>
            </div>

            {/* Clickable Stats Bar (Opens Connections Modal) */}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setConnectionsModalTab('friends')}
                className="hover:text-indigo-600 transition-colors text-left group cursor-pointer"
                title="View Friends"
              >
                <span className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                  {targetUser.friendsCount || 0}
                </span>{' '}
                <span className="text-slate-500 font-medium group-hover:text-indigo-500">Friends</span>
              </button>

              <button
                type="button"
                onClick={() => setConnectionsModalTab('followers')}
                className="hover:text-indigo-600 transition-colors text-left group cursor-pointer"
                title="View Followers"
              >
                <span className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                  {targetUser.followersCount || 0}
                </span>{' '}
                <span className="text-slate-500 font-medium group-hover:text-indigo-500">Followers</span>
              </button>

              <button
                type="button"
                onClick={() => setConnectionsModalTab('following')}
                className="hover:text-indigo-600 transition-colors text-left group cursor-pointer"
                title="View Following"
              >
                <span className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                  {targetUser.followingCount || 0}
                </span>{' '}
                <span className="text-slate-500 font-medium group-hover:text-indigo-500">Following</span>
              </button>
            </div>
          </div>
        </div>

        {/* Story Highlights Bubble Row */}
        {(highlights.length > 0 || isOwnProfile) && (
          <div className="px-6 sm:px-8 py-3.5 border-t border-slate-100 flex items-center gap-4 overflow-x-auto select-none">
            {/* Add Story / New Highlight for Own Profile */}
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setShowStoryCreateModal(true)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
                title="Create New Story / Highlight"
              >
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 group-hover:border-indigo-500 bg-slate-50 group-hover:bg-indigo-50/50 flex items-center justify-center transition-all">
                  <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-indigo-600 truncate max-w-[70px]">
                  New
                </span>
              </button>
            )}

            {/* Highlights Bubbles */}
            {highlights.map((hl) => {
              const coverStory = hl.stories[0];
              const isImage = coverStory && coverStory.type === 'image' && coverStory.mediaUrl;
              return (
                <button
                  key={hl.id}
                  type="button"
                  onClick={() => setSelectedHighlightGroup(hl)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
                >
                  <div className="relative w-16 h-16 rounded-full p-0.5 ring-2 ring-amber-400/80 group-hover:ring-amber-500 bg-gradient-to-tr from-amber-400 to-rose-400 shadow-sm transition-all group-hover:scale-105">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                      {isImage ? (
                        <img
                          src={coverStory.mediaUrl}
                          alt={hl.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center bg-gradient-to-tr ${
                            coverStory?.backgroundStyle || 'from-indigo-600 to-purple-600'
                          }`}
                        >
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-amber-600 truncate max-w-[74px]">
                    {hl.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 sm:px-8 border-t border-slate-100 bg-slate-50/50 overflow-x-auto">
          {[
            { id: 'posts', label: 'Posts', icon: FileText, count: userPosts.length },
            { id: 'about', label: 'About', icon: Users },
            { id: 'friends', label: 'Friends', icon: Users, count: targetUser.friendsCount || 0 },
            { id: 'photos', label: 'Photos', icon: ImageIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200/60 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile Body / Tabs */}
      {isPrivate ? (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-12 text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">This Profile is Private</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Add {targetUser.fullName} as a friend to see their posts, photos, and full profile.
            </p>
          </div>
          <button
            onClick={handleFriendAction}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 ${
              profileRelationship === 'pending_sent'
                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{profileRelationship === 'pending_sent' ? 'Friend Request Sent' : 'Add Friend'}</span>
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'posts' && (
            <div className="space-y-6">
              {isOwnProfile && <PostComposer />}

              <div className="space-y-4">
                {userPosts.length > 0 ? (
                  userPosts.map((post) => <PostCard key={post.id} post={post} />)
                ) : (
                  <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-12 text-center space-y-3">
                    <FileText className="w-10 h-10 mx-auto text-slate-300" />
                    <h4 className="text-sm font-bold text-slate-800">No Posts Yet</h4>
                    <p className="text-xs text-slate-400">
                      {isOwnProfile
                        ? 'Share your thoughts, photos, or updates with your network.'
                        : `${targetUser.fullName} hasn't posted anything yet.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>About {targetUser.fullName}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Full Name
                  </span>
                  <p className="font-bold text-slate-900">{targetUser.fullName}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Username
                  </span>
                  <p className="font-bold text-slate-900">@{targetUser.username}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Occupation
                  </span>
                  <p className="font-bold text-slate-900">{targetUser.occupation || 'Not specified'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Education
                  </span>
                  <p className="font-bold text-slate-900">{targetUser.education || 'Not specified'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Location
                  </span>
                  <p className="font-bold text-slate-900">{targetUser.location || 'Not specified'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Member Since
                  </span>
                  <p className="font-bold text-slate-900">{targetUser.joinedDate || 'Nexus Member'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Friends ({targetUser.friendsCount || activeFriends.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeFriends.length > 0 ? (
                  activeFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatarLink user={friend} size="md" />
                        <div className="min-w-0">
                          <UserNameLink user={friend} className="text-xs font-bold text-slate-900" />
                          <p className="text-[11px] text-slate-400 truncate">{friend.occupation || 'Member'}</p>
                        </div>
                      </div>
                      <Link
                        to={`/profile/${friend.username || friend.id}`}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-white transition-colors shrink-0"
                      >
                        View
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-8 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">No confirmed friends to show yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>Photos & Media</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {userPosts
                  .flatMap((p) => p.mediaUrls || [])
                  .map((url, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200"
                    >
                      <img src={url} alt="User media" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Profile Modal */}
      {isOwnProfile && showEditModal && (
        <EditProfileModal onClose={() => setShowEditModal(false)} />
      )}

      {/* User Connections Modal (Friends, Followers, Following) */}
      {connectionsModalTab && (
        <UserConnectionsModal
          isOpen={Boolean(connectionsModalTab)}
          onClose={() => setConnectionsModalTab(null)}
          userId={targetUser.id}
          userName={targetUser.fullName}
          initialTab={connectionsModalTab}
          isOwnProfile={Boolean(isOwnProfile)}
        />
      )}

      {/* Story Highlight Viewer Modal */}
      {selectedHighlightGroup && (
        <StoryViewerModal
          storyGroups={[
            {
              author: targetUser,
              stories: selectedHighlightGroup.stories,
              hasUnviewed: false,
              latestCreatedAt: selectedHighlightGroup.createdAt,
            },
          ]}
          initialGroupIndex={0}
          onClose={() => setSelectedHighlightGroup(null)}
        />
      )}

      {/* Story Create Modal */}
      {showStoryCreateModal && (
        <StoryCreateModal
          isOpen={showStoryCreateModal}
          onClose={() => {
            setShowStoryCreateModal(false);
            if (isOwnProfile) {
              getUserHighlights(currentUser.id).then(setHighlights).catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
};

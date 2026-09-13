import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Post, Story, Friend, ReactionType, Comment, User, UserStoryGroup, StoryType } from '../types';
import { initialPosts } from '../data/seedData';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export interface DiscoverUserItem extends Friend {
  relationshipStatus: 'friends' | 'pending_sent' | 'pending_received' | 'none';
  isFriend: boolean;
}

interface FeedContextType {
  posts: Post[];
  stories: Story[];
  storyGroups: UserStoryGroup[];
  myStories: Story[];
  friends: Friend[];
  pendingRequests: { id: string; fromUser: Friend; createdAt: string }[];
  discoverList: DiscoverUserItem[];
  savedPosts: Post[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  createPost: (data: { content: string; mediaUrls?: string[]; visibility?: 'public' | 'friends' | 'private'; feeling?: string; location?: string; mediaType?: 'image' | 'video' }) => Promise<void>;
  editPost: (postId: string, data: { content: string; visibility?: 'public' | 'friends' | 'private'; feeling?: string; location?: string }) => Promise<boolean>;
  reportPost: (postId: string, reason: string) => Promise<boolean>;
  sharePost: (postId: string, caption?: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  reactToPost: (postId: string, type: ReactionType) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  addReply: (postId: string, commentId: string, content: string) => Promise<boolean>;
  likeComment: (postId: string, commentId: string) => Promise<void>;
  editComment: (postId: string, commentId: string, content: string) => Promise<boolean>;
  deleteComment: (postId: string, commentId: string) => Promise<boolean>;
  toggleSavePost: (postId: string) => void;
  createStory: (data: { type: StoryType; mediaUrl?: string; textContent?: string; backgroundStyle?: string; caption?: string; mediaType?: 'image' | 'video' | 'audio'; duration?: string }) => Promise<boolean>;
  viewStory: (storyId: string) => Promise<void>;
  deleteStory: (storyId: string) => Promise<boolean>;
  replyToStory: (storyId: string, reply: { type: 'reaction' | 'text'; content?: string; emoji?: string }) => Promise<boolean>;
  sendFriendRequest: (targetUserId: string) => Promise<boolean>;
  acceptFriendRequest: (targetUserId: string) => Promise<boolean>;
  rejectFriendRequest: (targetUserId: string) => Promise<boolean>;
  cancelFriendRequest: (targetUserId: string) => Promise<boolean>;
  unfriendUser: (targetUserId: string) => Promise<boolean>;
  followUser: (targetUserId: string) => Promise<boolean>;
  unfollowUser: (targetUserId: string) => Promise<boolean>;
  fetchDiscoverUsers: (query?: string) => Promise<void>;
  refreshFriends: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  refreshStories: () => Promise<void>;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

const POSTS_KEY = 'nexus-social-posts-v5';

export const FeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem(POSTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ id: string; fromUser: Friend; createdAt: string }[]>([]);
  const [discoverList, setDiscoverList] = useState<DiscoverUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper mapping comments & reactions per viewer
  const mapCommentWithViewer = useCallback((c: Comment, uid?: string): Comment => ({
    ...c,
    isLiked: uid && Array.isArray(c.likedBy) ? c.likedBy.includes(uid) : Boolean(c.isLiked),
    likesCount: Array.isArray(c.likedBy) ? c.likedBy.length : (c.likesCount || 0),
    replies: (c.replies || []).map((r) => ({
      ...r,
      isLiked: uid && Array.isArray(r.likedBy) ? r.likedBy.includes(uid) : Boolean(r.isLiked),
      likesCount: Array.isArray(r.likedBy) ? r.likedBy.length : (r.likesCount || 0),
    })),
  }), []);

  const mapPostWithViewer = useCallback((post: Post, uid?: string): Post => ({
    ...post,
    reactions: (post.reactions || []).map((r) => ({
      ...r,
      userReacted: post.reactionsList?.some(
        (rl) => rl.userId === uid && rl.type === r.type
      ) ?? false,
    })),
    comments: (post.comments || []).map((c) => mapCommentWithViewer(c, uid)),
  }), [mapCommentWithViewer]);

  // 1. Fetch Posts from Server Database
  const fetchPosts = useCallback(async () => {
    try {
      const url = currentUser?.id ? `/api/posts?viewerId=${currentUser.id}` : '/api/posts';
      const res = await fetch(url, {
        headers: currentUser?.id ? { 'x-user-id': currentUser.id } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.posts)) {
          const mappedPosts = data.posts.map((post: Post) => mapPostWithViewer(post, currentUser?.id));

          setPosts(mappedPosts);
          try {
            localStorage.setItem(POSTS_KEY, JSON.stringify(mappedPosts));
          } catch (e) {
            console.warn('Could not cache posts in localStorage:', e);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching posts:', err);
    }
  }, [currentUser?.id, mapPostWithViewer]);

  // 2. Fetch Stories Feed from Server (Friends & Own active stories)
  const fetchStories = useCallback(async () => {
    if (!currentUser?.id) {
      setStoryGroups([]);
      setMyStories([]);
      return;
    }
    try {
      const res = await fetch(`/api/stories/feed?userId=${currentUser.id}`, {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStoryGroups(data.groups || []);
          setMyStories(data.myStories || []);
        }
      }
    } catch (err) {
      console.warn('Error fetching stories feed:', err);
    }
  }, [currentUser?.id]);

  // 3. Fetch Real Friends & Pending Requests
  const refreshFriends = useCallback(async () => {
    if (!currentUser?.id) {
      setFriends([]);
      setPendingRequests([]);
      return;
    }

    try {
      const resFriends = await fetch(`/api/friends/list?userId=${currentUser.id}`, {
        headers: { 'x-user-id': currentUser.id },
      });
      if (resFriends.ok) {
        const data = await resFriends.json();
        if (data.success && Array.isArray(data.friends)) {
          setFriends(data.friends);
          updateProfile({
            friendsCount: data.friends.length,
            followersCount: data.friends.length,
            followingCount: data.friends.length,
          });
        }
      }

      const resReqs = await fetch(`/api/friends/requests?userId=${currentUser.id}`, {
        headers: { 'x-user-id': currentUser.id },
      });
      if (resReqs.ok) {
        const data = await resReqs.json();
        if (data.success && Array.isArray(data.requests)) {
          setPendingRequests(data.requests);
        }
      }
    } catch (err) {
      console.warn('Error fetching friends:', err);
    }
  }, [currentUser?.id]);

  // 4. Discover Users
  const fetchDiscoverUsers = useCallback(
    async (query = '') => {
      if (!currentUser?.id) return;
      try {
        const url = `/api/users/discover?query=${encodeURIComponent(query)}&page=1&limit=20`;
        const res = await fetch(url, {
          headers: { 'x-user-id': currentUser.id },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.users)) {
            setDiscoverList(data.users);
          }
        }
      } catch (err) {
        console.warn('Error fetching discover users:', err);
      }
    },
    [currentUser?.id]
  );

  // 5. Initial Mount Fetch & Real-Time SSE Stream Listener (Real-Time Profile, Posts, Stories & Chats)
  useEffect(() => {
    if (!currentUser?.id) return;

    fetchPosts();
    fetchStories();
    refreshFriends();
    fetchDiscoverUsers();

    const eventSource = new EventSource(`/api/realtime/stream?userId=${currentUser.id}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // A. Real-time New Post Created
        if (payload.type === 'post_created' && payload.data?.post) {
          const newPost = mapPostWithViewer(payload.data.post, currentUser.id);

          setPosts((prev) => {
            if (prev.some((p) => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
          });
        }

        // B. Real-time Post Updated (Reactions, Comments, Likes)
        else if (payload.type === 'post_updated' && payload.data?.post) {
          const updatedPost = mapPostWithViewer(payload.data.post, currentUser.id);

          setPosts((prev) =>
            prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
          );
        }

        // C. Real-time Profile Updated (Avatar, Cover, Name, Bio)
        else if (payload.type === 'profile_updated' && payload.data?.user) {
          const updatedUser: User = payload.data.user;

          setPosts((prev) =>
            prev.map((p) => {
              let updated: Post = { ...p };
              if (p.author?.id === updatedUser.id) {
                updated = {
                  ...updated,
                  author: {
                    ...updated.author,
                    fullName: updatedUser.fullName,
                    avatarUrl: updatedUser.avatarUrl,
                    coverUrl: updatedUser.coverUrl,
                    username: updatedUser.username,
                    bio: updatedUser.bio,
                  },
                };
              }
              if (p.sharedPost && p.sharedPost.author?.id === updatedUser.id) {
                const prevShared = p.sharedPost;
                updated = {
                  ...updated,
                  sharedPost: {
                    ...prevShared,
                    author: {
                      ...prevShared.author,
                      fullName: updatedUser.fullName,
                      avatarUrl: updatedUser.avatarUrl,
                      coverUrl: updatedUser.coverUrl,
                      username: updatedUser.username,
                    },
                  },
                };
              }
              return updated;
            })
          );

          setDiscoverList((prev) =>
            prev.map((u) =>
              u.id === updatedUser.id
                ? {
                    ...u,
                    fullName: updatedUser.fullName,
                    avatarUrl: updatedUser.avatarUrl,
                    coverUrl: updatedUser.coverUrl,
                    occupation: updatedUser.occupation,
                  }
                : u
            )
          );

          setFriends((prev) =>
            prev.map((f) =>
              f.id === updatedUser.id
                ? {
                    ...f,
                    fullName: updatedUser.fullName,
                    avatarUrl: updatedUser.avatarUrl,
                    coverUrl: updatedUser.coverUrl,
                    occupation: updatedUser.occupation,
                  }
                : f
            )
          );

          fetchStories();
        }

        // D. Real-time Post Deleted
        else if (payload.type === 'post_deleted' && payload.data?.postId) {
          setPosts((prev) => prev.filter((p) => p.id !== payload.data.postId));
        }

        // E. Real-time Story Created or Deleted
        else if (payload.type === 'story_created' || payload.type === 'story_deleted') {
          fetchStories();
        }

        // F. Real-time Presence Updated (Online / Offline / Last Seen)
        else if (payload.type === 'presence_updated' && payload.data?.userId) {
          const { userId, isOnline, lastSeen } = payload.data;
          setFriends((prev) =>
            prev.map((f) =>
              f.id === userId
                ? {
                    ...f,
                    isOnline,
                    lastSeen,
                  }
                : f
            )
          );
          setDiscoverList((prev) =>
            prev.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    isOnline,
                    lastSeen,
                  }
                : u
            )
          );
        }
      } catch (err) {
        console.warn('Error parsing SSE feed event:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser?.id, fetchPosts, fetchStories, refreshFriends, fetchDiscoverUsers]);

  // Friend Request Handlers
  const sendFriendRequest = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!currentUser?.id) return false;

      setDiscoverList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, relationshipStatus: 'pending_sent' } : u))
      );

      try {
        const res = await fetch(`/api/friends/request/${targetUserId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ senderId: currentUser.id }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Request Sent', data.message || 'Friend request sent.', 'success');
          fetchDiscoverUsers(searchQuery);
          return true;
        } else {
          showToast('Request Failed', data.message || 'Could not send friend request.', 'error');
          fetchDiscoverUsers(searchQuery);
          return false;
        }
      } catch (err) {
        showToast('Network Error', 'Failed to send request.', 'error');
        fetchDiscoverUsers(searchQuery);
        return false;
      }
    },
    [currentUser?.id, fetchDiscoverUsers, searchQuery, showToast]
  );

  const acceptFriendRequest = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!currentUser?.id) return false;

      setPendingRequests((prev) => prev.filter((r) => r.fromUser.id !== targetUserId));
      setDiscoverList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, relationshipStatus: 'friends', isFriend: true } : u))
      );

      try {
        const res = await fetch(`/api/friends/accept/${targetUserId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ acceptorId: currentUser.id }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Friends Connected!', data.message || 'You can now message each other.', 'success');
          refreshFriends();
          fetchStories();
          fetchDiscoverUsers(searchQuery);
          return true;
        } else {
          showToast('Action Failed', data.message || 'Could not accept friend request.', 'error');
          refreshFriends();
          return false;
        }
      } catch (err) {
        showToast('Connection Error', 'Failed to accept request.', 'error');
        refreshFriends();
        return false;
      }
    },
    [currentUser?.id, refreshFriends, fetchStories, fetchDiscoverUsers, searchQuery, showToast]
  );

  const rejectFriendRequest = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!currentUser?.id) return false;

      setPendingRequests((prev) => prev.filter((r) => r.fromUser.id !== targetUserId));
      setDiscoverList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, relationshipStatus: 'none', isFriend: false } : u))
      );

      try {
        const res = await fetch(`/api/friends/reject/${targetUserId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ userId: currentUser.id }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Request Declined', 'Friend request was declined.', 'info');
          refreshFriends();
          fetchDiscoverUsers(searchQuery);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [currentUser?.id, refreshFriends, fetchDiscoverUsers, searchQuery, showToast]
  );

  const cancelFriendRequest = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!currentUser?.id) return false;

      setDiscoverList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, relationshipStatus: 'none' } : u))
      );

      try {
        const res = await fetch(`/api/friends/request/${targetUserId}`, {
          method: 'DELETE',
          headers: { 'x-user-id': currentUser.id },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Request Cancelled', 'Friend request was cancelled.', 'info');
          fetchDiscoverUsers(searchQuery);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [currentUser?.id, fetchDiscoverUsers, searchQuery, showToast]
  );

  const unfriendUser = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!currentUser?.id) return false;

      setFriends((prev) => prev.filter((f) => f.id !== targetUserId));
      setDiscoverList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, relationshipStatus: 'none', isFriend: false } : u))
      );

      try {
        const res = await fetch(`/api/friends/remove/${targetUserId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Unfriended', 'Removed from your friends list.', 'info');
          refreshFriends();
          fetchStories();
          fetchDiscoverUsers(searchQuery);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [currentUser?.id, refreshFriends, fetchStories, fetchDiscoverUsers, searchQuery, showToast]
  );

  const followUser = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!currentUser?.id) return false;

      // Optimistically update discoverList
      setDiscoverList((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? { ...u, isFollowing: true, followersCount: (u.followersCount || 0) + 1 }
            : u
        )
      );

      try {
        const res = await fetch(`/api/users/${targetUserId}/follow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ followerId: currentUser.id }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Following', data.message || 'You are now following this user.', 'success');
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [currentUser?.id, showToast]
  );

  const unfollowUser = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!currentUser?.id) return false;

      // Optimistically update discoverList
      setDiscoverList((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? {
                ...u,
                isFollowing: false,
                followersCount: Math.max(0, (u.followersCount || 1) - 1),
              }
            : u
        )
      );

      try {
        const res = await fetch(`/api/users/${targetUserId}/unfollow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ followerId: currentUser.id }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Unfollowed', data.message || 'You unfollowed this user.', 'info');
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [currentUser?.id, showToast]
  );

  // Safe localStorage persistence (never crashes on QuotaExceededError)
  useEffect(() => {
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts.slice(0, 30)));
    } catch (e) {
      console.warn('Quota limit for localStorage posts:', e);
    }
  }, [posts]);

  const savedPosts = useMemo(() => posts.filter((p) => p.isSaved), [posts]);

  // Create Post (With Server DB persistence & broadcast)
  const createPost = useCallback(
    async (data: {
      content: string;
      mediaUrls?: string[];
      visibility?: 'public' | 'friends' | 'private';
      feeling?: string;
      location?: string;
      mediaType?: 'image' | 'video';
    }) => {
      const tempId = `temp-post-${Date.now()}`;
      const tempPost: Post = {
        id: tempId,
        author: currentUser,
        content: data.content,
        mediaUrls: data.mediaUrls,
        visibility: data.visibility || 'public',
        feeling: data.feeling,
        location: data.location,
        createdAt: 'Just now',
        reactions: [
          { type: 'like', count: 0, userReacted: false },
          { type: 'love', count: 0, userReacted: false },
          { type: 'haha', count: 0, userReacted: false },
          { type: 'wow', count: 0, userReacted: false },
          { type: 'sad', count: 0, userReacted: false },
          { type: 'fire', count: 0, userReacted: false },
        ],
        totalReactions: 0,
        commentsCount: 0,
        sharesCount: 0,
        isSaved: false,
        comments: [],
      };

      // Optimistic update
      setPosts((prev) => [tempPost, ...prev.filter((p) => p.id !== tempId)]);

      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({
            userId: currentUser.id,
            content: data.content,
            mediaUrls: data.mediaUrls,
            mediaType: data.mediaType,
            visibility: data.visibility || 'public',
            feeling: data.feeling,
            location: data.location,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.post) {
            const serverPost: Post = {
              ...resData.post,
              reactions: (resData.post.reactions || []).map((r: any) => ({
                ...r,
                userReacted: resData.post.reactionsList?.some(
                  (rl: any) => rl.userId === currentUser.id && rl.type === r.type
                ) ?? false,
              })),
            };

            setPosts((prev) => {
              const withoutTempOrDuplicate = prev.filter(
                (p) => p.id !== tempId && p.id !== serverPost.id
              );
              return [serverPost, ...withoutTempOrDuplicate];
            });
          }
        }
        showToast('Post Published', 'Your update is now live on the feed.', 'success');
      } catch (err) {
        console.warn('Server publish error:', err);
        showToast('Post Created', 'Saved locally.', 'info');
      }
    },
    [currentUser, showToast]
  );

  // Facebook-Style Working Share Post
  const sharePost = useCallback(
    async (postId: string, caption?: string) => {
      const original = posts.find((p) => p.id === postId);
      if (!original) return;

      const tempId = `share-post-${Date.now()}`;
      const newPost: Post = {
        id: tempId,
        author: currentUser,
        content: caption || '',
        sharedPost: original.sharedPost || original,
        sharedFrom: original.id,
        mediaUrls: [],
        visibility: 'public',
        createdAt: 'Just now',
        reactions: [
          { type: 'like', count: 0, userReacted: false },
          { type: 'love', count: 0, userReacted: false },
          { type: 'haha', count: 0, userReacted: false },
          { type: 'wow', count: 0, userReacted: false },
          { type: 'sad', count: 0, userReacted: false },
          { type: 'fire', count: 0, userReacted: false },
        ],
        totalReactions: 0,
        commentsCount: 0,
        sharesCount: 0,
        isSaved: false,
        comments: [],
      };

      setPosts((prev) => [
        newPost,
        ...prev
          .map((p) => (p.id === postId ? { ...p, sharesCount: (p.sharesCount || 0) + 1 } : p))
          .filter((p) => p.id !== tempId),
      ]);

      try {
        const res = await fetch(`/api/posts/${postId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id, content: caption }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.post) {
            const serverPost = data.post;
            setPosts((prev) => {
              const withoutTempOrDuplicate = prev.filter(
                (p) => p.id !== tempId && p.id !== serverPost.id
              );
              return [serverPost, ...withoutTempOrDuplicate];
            });
          }
        }
      } catch (err) {
        console.warn('Share sync error:', err);
      }
    },
    [currentUser, posts]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast('Post Deleted', 'Your post was removed.', 'info');

      try {
        await fetch(`/api/posts/${postId}`, {
          method: 'DELETE',
          headers: { 'x-user-id': currentUser.id },
        });
      } catch {}
    },
    [currentUser.id, showToast]
  );

  // Edit Post Handler (Step 2)
  const editPost = useCallback(
    async (
      postId: string,
      data: {
        content: string;
        visibility?: 'public' | 'friends' | 'private';
        feeling?: string;
        location?: string;
      }
    ): Promise<boolean> => {
      if (!currentUser?.id) return false;
      try {
        const res = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({
            userId: currentUser.id,
            content: data.content,
            visibility: data.visibility,
            feeling: data.feeling,
            location: data.location,
          }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.post) {
            const mappedPost = mapPostWithViewer(resData.post, currentUser.id);
            setPosts((prev) => prev.map((p) => (p.id === postId ? mappedPost : p)));
            showToast('Post Updated', 'Your changes have been saved.', 'success');
            return true;
          }
        }
        showToast('Update Failed', 'Could not update post.', 'error');
        return false;
      } catch (err) {
        console.error('Error editing post:', err);
        showToast('Network Error', 'Failed to update post.', 'error');
        return false;
      }
    },
    [currentUser?.id, mapPostWithViewer, showToast]
  );

  // Report Post Handler (Step 2)
  const reportPost = useCallback(
    async (postId: string, reason: string): Promise<boolean> => {
      if (!currentUser?.id) return false;
      try {
        const res = await fetch(`/api/posts/${postId}/report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({
            userId: currentUser.id,
            reason,
          }),
        });
        if (res.ok) {
          showToast('Report Submitted', 'Thank you for your report. Our team will review this post.', 'success');
          return true;
        }
        showToast('Report Failed', 'Could not submit report.', 'error');
        return false;
      } catch (err) {
        console.error('Error reporting post:', err);
        showToast('Network Error', 'Failed to submit report.', 'error');
        return false;
      }
    },
    [currentUser?.id, showToast]
  );

  // Reaction Handler
  const reactToPost = useCallback(
    async (postId: string, type: ReactionType) => {
      if (!currentUser?.id) return;

      // Optimistic update
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;

          const existingIndex = (post.reactionsList || []).findIndex(
            (r) => r.userId === currentUser.id
          );
          let newReactionsList = [...(post.reactionsList || [])];

          if (existingIndex !== -1) {
            if (newReactionsList[existingIndex].type === type) {
              // Toggle off
              newReactionsList.splice(existingIndex, 1);
            } else {
              // Replace with new type
              newReactionsList[existingIndex] = {
                userId: currentUser.id,
                user: currentUser,
                type,
                createdAt: new Date().toISOString(),
              };
            }
          } else {
            // Add new
            newReactionsList.push({
              userId: currentUser.id,
              user: currentUser,
              type,
              createdAt: new Date().toISOString(),
            });
          }

          const validTypes: ReactionType[] = ['like', 'love', 'haha', 'wow', 'sad', 'fire'];
          const newReactions = validTypes.map((t) => ({
            type: t,
            count: newReactionsList.filter((r) => r.type === t).length,
            userReacted: newReactionsList.some((r) => r.userId === currentUser.id && r.type === t),
          }));

          return {
            ...post,
            reactionsList: newReactionsList,
            reactions: newReactions,
            totalReactions: newReactionsList.length,
          };
        })
      );

      try {
        const res = await fetch(`/api/posts/${postId}/react`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ userId: currentUser.id, type }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.post) {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId
                  ? {
                      ...data.post,
                      reactions: (data.post.reactions || []).map((r: any) => ({
                        ...r,
                        userReacted: data.post.reactionsList?.some(
                          (rl: any) => rl.userId === currentUser.id && rl.type === r.type
                        ) ?? false,
                      })),
                    }
                  : p
              )
            );
          }
        }
      } catch (err) {
        console.warn('React to post error:', err);
      }
    },
    [currentUser]
  );

  // Add Comment Handler
  const addComment = useCallback(
    async (postId: string, content: string) => {
      if (!content.trim() || !currentUser?.id) return;
      const tempId = `comment-${Date.now()}`;
      const newComment: Comment = {
        id: tempId,
        postId,
        author: currentUser,
        content: content.trim(),
        createdAt: 'Just now',
        likesCount: 0,
        likedBy: [],
        isLiked: false,
        isEdited: false,
        replies: [],
      };

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const existingComments = post.comments || [];
          return {
            ...post,
            comments: [...existingComments, newComment],
            commentsCount: (post.commentsCount || existingComments.length) + 1,
          };
        })
      );

      try {
        const res = await fetch(`/api/posts/${postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id, content: content.trim() }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.comment) {
            const mappedComment = mapCommentWithViewer(data.comment, currentUser.id);
            setPosts((prev) =>
              prev.map((post) => {
                if (post.id !== postId) return post;
                const comments = (post.comments || []).map((c) =>
                  c.id === tempId ? mappedComment : c
                );
                return {
                  ...post,
                  comments,
                  commentsCount: data.commentsCount || comments.length,
                };
              })
            );
          }
        }
      } catch (err) {
        console.warn('Comment server sync error:', err);
        showToast('Comment Failed', 'Could not post comment.', 'error');
      }
    },
    [currentUser, mapCommentWithViewer, showToast]
  );

  // Add Reply to Comment Handler
  const addReply = useCallback(
    async (postId: string, commentId: string, content: string): Promise<boolean> => {
      if (!content.trim() || !currentUser?.id) return false;
      const tempId = `reply-${Date.now()}`;
      const newReply: Comment = {
        id: tempId,
        postId,
        parentCommentId: commentId,
        author: currentUser,
        content: content.trim(),
        createdAt: 'Just now',
        likesCount: 0,
        likedBy: [],
        isLiked: false,
        isEdited: false,
      };

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const updatedComments = (post.comments || []).map((c) => {
            if (c.id !== commentId) return c;
            return {
              ...c,
              replies: [...(c.replies || []), newReply],
            };
          });
          return {
            ...post,
            commentsCount: (post.commentsCount || 0) + 1,
            comments: updatedComments,
          };
        })
      );

      try {
        const res = await fetch(`/api/posts/${postId}/comments/${commentId}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id, content: content.trim() }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.reply) {
            const mappedReply = mapCommentWithViewer(data.reply, currentUser.id);
            setPosts((prev) =>
              prev.map((post) => {
                if (post.id !== postId) return post;
                const updatedComments = (post.comments || []).map((c) => {
                  if (c.id !== commentId) return c;
                  const replies = (c.replies || []).map((r) => (r.id === tempId ? mappedReply : r));
                  return { ...c, replies };
                });
                return {
                  ...post,
                  commentsCount: data.commentsCount || post.commentsCount,
                  comments: updatedComments,
                };
              })
            );
            return true;
          }
        }
      } catch (err) {
        console.warn('Reply server sync error:', err);
        showToast('Reply Failed', 'Could not post reply.', 'error');
      }
      return false;
    },
    [currentUser, mapCommentWithViewer, showToast]
  );

  // Like Comment or Reply Handler (Per-User Likes)
  const likeComment = useCallback(
    async (postId: string, commentId: string) => {
      if (!currentUser?.id) return;
      const uid = currentUser.id;

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const updatedComments = (post.comments || []).map((c) => {
            if (c.id === commentId) {
              const prevLikedBy = Array.isArray(c.likedBy) ? [...c.likedBy] : [];
              const idx = prevLikedBy.indexOf(uid);
              if (idx > -1) prevLikedBy.splice(idx, 1);
              else prevLikedBy.push(uid);
              return {
                ...c,
                likedBy: prevLikedBy,
                isLiked: prevLikedBy.includes(uid),
                likesCount: prevLikedBy.length,
              };
            }

            if (c.replies) {
              const updatedReplies = c.replies.map((r) => {
                if (r.id === commentId) {
                  const prevLikedBy = Array.isArray(r.likedBy) ? [...r.likedBy] : [];
                  const idx = prevLikedBy.indexOf(uid);
                  if (idx > -1) prevLikedBy.splice(idx, 1);
                  else prevLikedBy.push(uid);
                  return {
                    ...r,
                    likedBy: prevLikedBy,
                    isLiked: prevLikedBy.includes(uid),
                    likesCount: prevLikedBy.length,
                  };
                }
                return r;
              });
              return { ...c, replies: updatedReplies };
            }

            return c;
          });
          return { ...post, comments: updatedComments };
        })
      );

      try {
        await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch (e) {
        console.warn('Like comment sync error:', e);
      }
    },
    [currentUser?.id]
  );

  // Edit Comment or Reply Handler
  const editComment = useCallback(
    async (postId: string, commentId: string, content: string): Promise<boolean> => {
      if (!content.trim() || !currentUser?.id) return false;

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const updatedComments = (post.comments || []).map((c) => {
            if (c.id === commentId) {
              return { ...c, content: content.trim(), isEdited: true };
            }
            if (c.replies) {
              const updatedReplies = c.replies.map((r) =>
                r.id === commentId ? { ...r, content: content.trim(), isEdited: true } : r
              );
              return { ...c, replies: updatedReplies };
            }
            return c;
          });
          return { ...post, comments: updatedComments };
        })
      );

      try {
        const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id, content: content.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            showToast('Comment Updated', 'Your comment has been edited.', 'success');
            return true;
          }
        }
      } catch (err) {
        console.warn('Edit comment error:', err);
        showToast('Edit Failed', 'Could not update comment.', 'error');
      }
      return false;
    },
    [currentUser?.id, showToast]
  );

  // Delete Comment or Reply Handler
  const deleteComment = useCallback(
    async (postId: string, commentId: string): Promise<boolean> => {
      if (!currentUser?.id) return false;

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const topLevel = (post.comments || []).find((c) => c.id === commentId);
          if (topLevel) {
            const countToSubtract = 1 + ((topLevel.replies && topLevel.replies.length) || 0);
            return {
              ...post,
              comments: (post.comments || []).filter((c) => c.id !== commentId),
              commentsCount: Math.max(0, (post.commentsCount || 0) - countToSubtract),
            };
          }

          let wasReply = false;
          const updatedComments = (post.comments || []).map((c) => {
            if (c.replies && c.replies.some((r) => r.id === commentId)) {
              wasReply = true;
              return {
                ...c,
                replies: c.replies.filter((r) => r.id !== commentId),
              };
            }
            return c;
          });

          return {
            ...post,
            comments: updatedComments,
            commentsCount: wasReply ? Math.max(0, (post.commentsCount || 0) - 1) : post.commentsCount,
          };
        })
      );

      try {
        const res = await fetch(`/api/posts/${postId}/comments/${commentId}?userId=${currentUser.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            showToast('Deleted', 'Comment deleted successfully.', 'info');
            return true;
          }
        }
      } catch (err) {
        console.warn('Delete comment error:', err);
        showToast('Delete Failed', 'Could not delete comment.', 'error');
      }
      return false;
    },
    [currentUser?.id, showToast]
  );

  const toggleSavePost = useCallback(
    (postId: string) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const isSaved = !post.isSaved;
          showToast(
            isSaved ? 'Saved to Bookmarks' : 'Removed from Bookmarks',
            isSaved ? 'Find this in your Saved Posts.' : 'Post unsaved.',
            'info'
          );
          return { ...post, isSaved };
        })
      );
    },
    [showToast]
  );

  // ----------------------------------------------------
  // STORY ACTIONS: CREATE, VIEW, REPLY, DELETE
  // ----------------------------------------------------
  const createStory = useCallback(
    async (data: {
      type: StoryType;
      mediaUrl?: string;
      textContent?: string;
      backgroundStyle?: string;
      caption?: string;
      mediaType?: 'image' | 'video' | 'audio';
      duration?: string;
    }): Promise<boolean> => {
      if (!currentUser?.id) return false;

      try {
        const res = await fetch('/api/stories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({
            userId: currentUser.id,
            type: data.type,
            mediaUrl: data.mediaUrl,
            textContent: data.textContent,
            backgroundStyle: data.backgroundStyle,
            caption: data.caption,
            mediaType: data.mediaType,
            duration: data.duration,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.story) {
            showToast('Story Published! 🌟', 'Your 24-hour status story is live.', 'success');
            await fetchStories();
            return true;
          }
        }
        showToast('Story Failed', 'Could not publish story.', 'error');
        return false;
      } catch (err) {
        console.error('Create story error:', err);
        showToast('Network Error', 'Failed to publish story.', 'error');
        return false;
      }
    },
    [currentUser?.id, fetchStories, showToast]
  );

  const viewStory = useCallback(
    async (storyId: string) => {
      if (!currentUser?.id) return;
      try {
        await fetch(`/api/stories/${storyId}/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch (err) {
        console.warn('View story error:', err);
      }
    },
    [currentUser?.id]
  );

  const deleteStory = useCallback(
    async (storyId: string): Promise<boolean> => {
      if (!currentUser?.id) return false;
      try {
        const res = await fetch(`/api/stories/${storyId}`, {
          method: 'DELETE',
          headers: { 'x-user-id': currentUser.id },
        });
        if (res.ok) {
          showToast('Story Deleted', 'Your story was removed.', 'info');
          await fetchStories();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [currentUser?.id, fetchStories, showToast]
  );

  const replyToStory = useCallback(
    async (
      storyId: string,
      reply: { type: 'reaction' | 'text'; content?: string; emoji?: string }
    ): Promise<boolean> => {
      if (!currentUser?.id) return false;
      try {
        const res = await fetch(`/api/stories/${storyId}/reply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({
            userId: currentUser.id,
            type: reply.type,
            content: reply.content,
            emoji: reply.emoji,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.success) {
            showToast(
              reply.type === 'reaction' ? 'Reaction Sent! 💬' : 'Story Reply Sent! 💬',
              'Delivered directly to private messages.',
              'success'
            );
            return true;
          }
        }
        showToast('Reply Failed', 'Could not send story reply.', 'error');
        return false;
      } catch (err) {
        console.error('Reply to story error:', err);
        showToast('Network Error', 'Failed to deliver reply.', 'error');
        return false;
      }
    },
    [currentUser?.id, showToast]
  );

  const allStoriesFlat = useMemo(() => {
    return storyGroups.flatMap((g) => g.stories);
  }, [storyGroups]);

  return (
    <FeedContext.Provider
      value={{
        posts,
        stories: allStoriesFlat,
        storyGroups,
        myStories,
        friends,
        pendingRequests,
        discoverList,
        savedPosts,
        searchQuery,
        setSearchQuery,
        createPost,
        editPost,
        reportPost,
        sharePost,
        deletePost,
        reactToPost,
        addComment,
        addReply,
        likeComment,
        editComment,
        deleteComment,
        toggleSavePost,
        createStory,
        viewStory,
        deleteStory,
        replyToStory,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        cancelFriendRequest,
        unfriendUser,
        followUser,
        unfollowUser,
        fetchDiscoverUsers,
        refreshFriends,
        refreshPosts: fetchPosts,
        refreshStories: fetchStories,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
};

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within a FeedProvider');
  }
  return context;
};

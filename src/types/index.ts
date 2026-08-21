export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'fire';

export interface UserPrivacySettings {
  isPrivate?: boolean;
  whoCanSeePosts: 'public' | 'friends' | 'only_me';
  whoCanSendRequests: 'everyone' | 'friends_of_friends';
  showOnlineStatus: boolean;
  showAge?: boolean;
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'custom' | 'prefer_not_to_say';
  genderCustom?: string;
  avatarUrl: string;
  coverUrl: string;
  bio: string;
  location: string;
  occupation: string;
  education?: string;
  website?: string;
  joinedDate: string;
  friendsCount: number;
  followersCount: number;
  followingCount: number;
  isVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  isPrivate?: boolean;
  accountStatus?: 'pending_verification' | 'active';
  privacySettings?: UserPrivacySettings;
}

export interface PostReaction {
  type: ReactionType;
  count: number;
  userReacted: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: User;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  replies?: Comment[];
}

export interface Post {
  id: string;
  author: User;
  content: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video';
  visibility: 'public' | 'friends' | 'private';
  feeling?: string;
  location?: string;
  createdAt: string;
  reactions: PostReaction[];
  totalReactions: number;
  commentsCount: number;
  sharesCount: number;
  isSaved: boolean;
  comments?: Comment[];
  reactionsList?: { userId: string; user?: User; type: ReactionType; createdAt?: string }[];
  sharedFrom?: string;
  sharedPost?: Post;
}

export type StoryType = 'image' | 'video' | 'text';

export interface StoryViewer {
  userId: string;
  user: User;
  viewedAt: string;
}

export interface Story {
  id: string;
  author: User;
  type: StoryType;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  textContent?: string;
  backgroundStyle?: string;
  caption?: string;
  createdAt: string;
  expiresAt?: string;
  isViewed?: boolean;
  viewedBy?: StoryViewer[];
}

export interface UserStoryGroup {
  author: User;
  stories: Story[];
  hasUnviewed: boolean;
  latestCreatedAt: string;
}

export interface Friend extends User {
  mutualFriends: number;
  status: 'friends' | 'pending_sent' | 'pending_received' | 'suggested';
  isOnline?: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface StoryReplyData {
  storyId: string;
  type?: StoryType;
  mediaUrl?: string;
  textContent?: string;
  backgroundStyle?: string;
  caption?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId?: string;
  text?: string;
  type?: 'text' | 'image' | 'video' | 'voice' | 'document' | 'location' | 'story_reply';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  duration?: string | number; // e.g. "0:15" for voice
  location?: LocationData;
  storyReply?: StoryReplyData;
  createdAt: string;
  timestamp?: number;
  status?: 'sent' | 'delivered' | 'read';
  deliveredAt?: string;
  readAt?: string;
  isRead?: boolean;
}

export interface Conversation {
  id: string;
  participant: User;
  participants?: string[];
  lastMessage: string;
  lastMessageType?: 'text' | 'image' | 'video' | 'voice' | 'document' | 'location' | 'story_reply';
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  isTyping?: boolean;
  messages?: Message[];
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'friend_request' | 'friend_accept' | 'mention' | 'story' | 'message' | 'share';
  actor: User;
  content: string;
  targetId?: string;
  createdAt: string;
  isRead: boolean;
}

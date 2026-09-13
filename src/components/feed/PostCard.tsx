import React, { useState } from 'react';
import {
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  MoreVertical,
  Globe,
  Users,
  Lock,
  Trash2,
  Edit2,
  Check,
  X,
  CornerDownRight,
  Send,
  Heart,
  Repeat,
} from 'lucide-react';
import { Post, ReactionType, Comment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useFeed } from '../../context/FeedContext';
import { UserAvatarLink, UserNameLink } from '../common/UserLink';
import { ShareModal } from './ShareModal';

export const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  const { currentUser } = useAuth();
  const {
    reactToPost,
    addComment,
    addReply,
    likeComment,
    editComment,
    deleteComment,
    toggleSavePost,
    deletePost,
  } = useFeed();

  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionsDrawer, setShowReactionsDrawer] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const isAuthor = post.author?.id === currentUser.id;

  const reactionEmojis: Record<ReactionType, { emoji: string; label: string; color: string }> = {
    like: { emoji: '👍', label: 'Like', color: 'text-indigo-600' },
    love: { emoji: '❤️', label: 'Love', color: 'text-rose-500' },
    haha: { emoji: '😂', label: 'Haha', color: 'text-amber-500' },
    wow: { emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
    sad: { emoji: '😢', label: 'Sad', color: 'text-sky-500' },
    fire: { emoji: '🔥', label: 'Fire', color: 'text-orange-500' },
  };

  const userReactionFromList = post.reactionsList?.find((r) => r.userId === currentUser.id);
  const userActiveReaction = userReactionFromList
    ? { type: userReactionFromList.type, userReacted: true }
    : post.reactions?.find((r) => r.userReacted);

  const activeReactionTypes = (post.reactions || [])
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((r) => reactionEmojis[r.type]?.emoji || '👍');

  const isVideoUrl = (url: string) =>
    url.startsWith('data:video') ||
    url.endsWith('.mp4') ||
    url.endsWith('.webm') ||
    url.endsWith('.mov') ||
    post.mediaType === 'video';

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;

    const textToSubmit = newCommentText.trim();
    setNewCommentText('');
    setIsSubmittingComment(true);
    setShowComments(true);

    try {
      await addComment(post.id, textToSubmit);
    } catch (err) {
      setNewCommentText(textToSubmit);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddReply = async (commentId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const text = replyText.trim();
    setReplyText('');
    setReplyingToId(null);
    await addReply(post.id, commentId, text);
  };

  const handleStartEdit = (item: { id: string; content: string }) => {
    setEditingCommentId(item.id);
    setEditCommentText(item.content);
    setOpenCommentMenuId(null);
  };

  const handleSaveEdit = async (commentId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editCommentText.trim()) return;
    const text = editCommentText.trim();
    setEditingCommentId(null);
    await editComment(post.id, commentId, text);
  };

  const handleDeleteComment = async (commentId: string) => {
    setOpenCommentMenuId(null);
    if (window.confirm('Delete this comment?')) {
      await deleteComment(post.id, commentId);
    }
  };

  return (
    <>
      <ShareModal
        post={post}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      <article className="rounded-3xl bg-white border border-slate-200 shadow-card hover:shadow-card-hover transition-all duration-300 p-4 sm:p-6 space-y-4 select-none">
        {/* Header: Author Info, Shared Indicator & Menu */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatarLink user={post.author} size="md" />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <UserNameLink user={post.author} className="text-sm font-bold text-slate-900" />
                {post.sharedPost && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Repeat className="w-3 h-3 text-indigo-600" /> shared a post
                  </span>
                )}
                {post.feeling && (
                  <span className="text-xs text-slate-500 font-normal">
                    is {post.feeling}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5">
                <span>{post.createdAt}</span>
                <span>•</span>
                {post.location && (
                  <>
                    <span>📍 {post.location}</span>
                    <span>•</span>
                  </>
                )}
                {post.visibility === 'public' && <Globe className="w-3 h-3" />}
                {post.visibility === 'friends' && <Users className="w-3 h-3" />}
                {post.visibility === 'private' && <Lock className="w-3 h-3" />}
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 z-20 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => {
                    toggleSavePost(post.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{post.isSaved ? 'Unsave Post' : 'Save Post'}</span>
                </button>
                {isAuthor && (
                  <button
                    type="button"
                    onClick={() => {
                      deletePost(post.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Post</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Post Text Content */}
        {post.content && (
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
        )}

        {/* Media Attachments */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-[450px]">
            {isVideoUrl(post.mediaUrls[0]) ? (
              <video
                src={post.mediaUrls[0]}
                controls
                preload="metadata"
                playsInline
                className="max-h-[450px] w-full object-contain"
              />
            ) : (
              <img
                src={post.mediaUrls[0]}
                alt="Post Media"
                loading="lazy"
                className="max-h-[450px] w-full object-contain bg-slate-100"
              />
            )}
          </div>
        )}

        {/* NESTED SHARED POST EMBED */}
        {post.sharedPost && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <UserAvatarLink user={post.sharedPost.author} size="sm" />
              <div>
                <UserNameLink user={post.sharedPost.author} className="text-xs font-bold text-slate-800" />
                <p className="text-[10px] text-slate-400">{post.sharedPost.createdAt}</p>
              </div>
            </div>

            {post.sharedPost.content && (
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {post.sharedPost.content}
              </p>
            )}

            {post.sharedPost.mediaUrls && post.sharedPost.mediaUrls.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-60 bg-black/5">
                {isVideoUrl(post.sharedPost.mediaUrls[0]) ? (
                  <video
                    src={post.sharedPost.mediaUrls[0]}
                    controls
                    preload="metadata"
                    playsInline
                    className="max-h-60 w-full object-contain"
                  />
                ) : (
                  <img
                    src={post.sharedPost.mediaUrls[0]}
                    alt="Shared Media"
                    loading="lazy"
                    className="max-h-60 w-full object-cover"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Counts & Reactions Summary Bar */}
        {(post.totalReactions > 0 || (post.commentsCount || 0) > 0 || (post.sharesCount || 0) > 0) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              {post.totalReactions > 0 && (
                <>
                  <span className="flex items-center -space-x-1">
                    {activeReactionTypes.length > 0 ? (
                      activeReactionTypes.map((emoji, idx) => (
                        <span
                          key={idx}
                          className="w-5 h-5 rounded-full bg-slate-100 text-xs flex items-center justify-center border border-white shadow-xs"
                        >
                          {emoji}
                        </span>
                      ))
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-xs flex items-center justify-center border border-white">
                        👍
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-slate-700 text-xs">
                    {post.totalReactions}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
              <button
                type="button"
                onClick={() => setShowComments((prev) => !prev)}
                className="hover:underline"
              >
                {post.commentsCount || (post.comments || []).length} comments
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="hover:underline"
              >
                {post.sharesCount || 0} shares
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons: Like/React, Comment, Share */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 relative">
          {/* Reaction Picker Hover Overlay */}
          {showReactionsDrawer && (
            <div
              onMouseLeave={() => setShowReactionsDrawer(false)}
              className="absolute -top-12 left-0 bg-white rounded-full border border-slate-200 shadow-2xl p-1.5 flex items-center gap-1.5 z-30 animate-in zoom-in-95 duration-100"
            >
              {(Object.keys(reactionEmojis) as ReactionType[]).map((rKey) => {
                const isSelected = userActiveReaction?.type === rKey;
                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => {
                      reactToPost(post.id, rKey);
                      setShowReactionsDrawer(false);
                    }}
                    className={`text-lg p-1.5 rounded-full hover:scale-125 transition-transform ${
                      isSelected ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'hover:bg-slate-50'
                    }`}
                    title={reactionEmojis[rKey].label}
                  >
                    {reactionEmojis[rKey].emoji}
                  </button>
                );
              })}
            </div>
          )}

          {/* Like/Reaction Button */}
          <button
            type="button"
            onMouseEnter={() => setShowReactionsDrawer(true)}
            onClick={() => reactToPost(post.id, userActiveReaction ? userActiveReaction.type : 'like')}
            className={`flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-bold transition-all ${
              userActiveReaction
                ? `${reactionEmojis[userActiveReaction.type].color} bg-indigo-50/70 shadow-xs ring-1 ring-indigo-200`
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{userActiveReaction ? reactionEmojis[userActiveReaction.type].emoji : '👍'}</span>
            <span>{userActiveReaction ? reactionEmojis[userActiveReaction.type].label : 'Like'}</span>
          </button>

          {/* Comment Toggle Button */}
          <button
            type="button"
            onClick={() => setShowComments((prev) => !prev)}
            className={`flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-bold transition-colors ${
              showComments ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Comment</span>
          </button>

          {/* Share Button (Opens Share Modal) */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in">
            {/* New Comment Input */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2.5">
              <UserAvatarLink user={currentUser} size="sm" />
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a comment... (Press Enter to post)"
                disabled={isSubmittingComment}
                className="flex-1 px-3.5 py-2 text-xs rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmittingComment}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Existing Comments List */}
            <div className="space-y-4 pt-2">
              {(post.comments || []).length > 0 ? (
                (post.comments || []).map((comment) => {
                  const isCommentAuthor = comment.author?.id === currentUser.id;
                  const canDeleteComment = isCommentAuthor || isAuthor;
                  const isEditingThisComment = editingCommentId === comment.id;

                  return (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex items-start gap-2.5 group/comment">
                        <UserAvatarLink user={comment.author} size="sm" />
                        <div className="flex-1 min-w-0">
                          {/* Comment Bubble or Edit Form */}
                          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 inline-block max-w-full relative group">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <UserNameLink user={comment.author} className="text-xs font-bold text-slate-900" />
                              
                              {/* Comment Options Dropdown (Author or Post Owner) */}
                              {canDeleteComment && !isEditingThisComment && (
                                <div className="relative inline-block">
                                  <button
                                    type="button"
                                    onClick={() => setOpenCommentMenuId(openCommentMenuId === comment.id ? null : comment.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 opacity-0 group-hover/comment:opacity-100 transition-opacity"
                                    title="Options"
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>

                                  {openCommentMenuId === comment.id && (
                                    <div className="absolute right-0 top-6 w-28 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-30 animate-in fade-in">
                                      {isCommentAuthor && (
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(comment)}
                                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                                        >
                                          <Edit2 className="w-3 h-3 text-slate-500" />
                                          <span>Edit</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Comment Content / Inline Edit Form */}
                            {isEditingThisComment ? (
                              <form onSubmit={(e) => handleSaveEdit(comment.id, e)} className="space-y-2 mt-1">
                                <input
                                  type="text"
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-indigo-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  autoFocus
                                />
                                <div className="flex items-center gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCommentId(null)}
                                    className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-200/60"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={!editCommentText.trim()}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {comment.content}
                                {comment.isEdited && (
                                  <span className="text-[10px] text-slate-400 font-normal italic ml-1.5 select-none">
                                    (edited)
                                  </span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* Comment Action Bar (Timestamp, Like, Reply) */}
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold px-2 mt-1">
                            <span>{comment.createdAt}</span>
                            <button
                              type="button"
                              onClick={() => likeComment(post.id, comment.id)}
                              className={`flex items-center gap-1 hover:text-indigo-600 transition-colors ${
                                comment.isLiked ? 'text-indigo-600 font-bold' : ''
                              }`}
                            >
                              <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-current text-rose-500' : ''}`} />
                              <span>{comment.likesCount && comment.likesCount > 0 ? comment.likesCount : 'Like'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToId(replyingToId === comment.id ? null : comment.id);
                                setReplyText('');
                              }}
                              className="hover:text-indigo-600 transition-colors"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Nested Threaded Replies (1-level deep) */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="pl-6 sm:pl-8 space-y-2.5 mt-2.5 border-l-2 border-indigo-100/80 ml-4">
                          {comment.replies.map((reply) => {
                            const isReplyAuthor = reply.author?.id === currentUser.id;
                            const canDeleteReply = isReplyAuthor || isAuthor;
                            const isEditingThisReply = editingCommentId === reply.id;

                            return (
                              <div key={reply.id} className="flex items-start gap-2 group/reply">
                                <UserAvatarLink user={reply.author} size="xs" />
                                <div className="flex-1 min-w-0">
                                  <div className="bg-slate-50/90 rounded-2xl p-2.5 border border-slate-200/60 inline-block max-w-full relative group">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <UserNameLink user={reply.author} className="text-[11px] font-bold text-slate-900" />
                                      
                                      {canDeleteReply && !isEditingThisReply && (
                                        <div className="relative inline-block">
                                          <button
                                            type="button"
                                            onClick={() => setOpenCommentMenuId(openCommentMenuId === reply.id ? null : reply.id)}
                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                                            title="Options"
                                          >
                                            <MoreHorizontal className="w-3 h-3" />
                                          </button>

                                          {openCommentMenuId === reply.id && (
                                            <div className="absolute right-0 top-5 w-28 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-30 animate-in fade-in">
                                              {isReplyAuthor && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleStartEdit(reply)}
                                                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                                                >
                                                  <Edit2 className="w-3 h-3 text-slate-500" />
                                                  <span>Edit</span>
                                                </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteComment(reply.id)}
                                                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                                <span>Delete</span>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Reply Content / Inline Edit Form */}
                                    {isEditingThisReply ? (
                                      <form onSubmit={(e) => handleSaveEdit(reply.id, e)} className="space-y-2 mt-1">
                                        <input
                                          type="text"
                                          value={editCommentText}
                                          onChange={(e) => setEditCommentText(e.target.value)}
                                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-indigo-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                          autoFocus
                                        />
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => setEditingCommentId(null)}
                                            className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-200/60"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="submit"
                                            disabled={!editCommentText.trim()}
                                            className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-50"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </form>
                                    ) : (
                                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {reply.content}
                                        {reply.isEdited && (
                                          <span className="text-[10px] text-slate-400 font-normal italic ml-1.5 select-none">
                                            (edited)
                                          </span>
                                        )}
                                      </p>
                                    )}
                                  </div>

                                  {/* Reply Action Bar */}
                                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold px-2 mt-0.5">
                                    <span>{reply.createdAt}</span>
                                    <button
                                      type="button"
                                      onClick={() => likeComment(post.id, reply.id)}
                                      className={`flex items-center gap-1 hover:text-indigo-600 transition-colors ${
                                        reply.isLiked ? 'text-indigo-600 font-bold' : ''
                                      }`}
                                    >
                                      <Heart className={`w-2.5 h-2.5 ${reply.isLiked ? 'fill-current text-rose-500' : ''}`} />
                                      <span>{reply.likesCount && reply.likesCount > 0 ? reply.likesCount : 'Like'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Reply Input Box */}
                      {replyingToId === comment.id && (
                        <form
                          onSubmit={(e) => handleAddReply(comment.id, e)}
                          className="pl-6 sm:pl-8 flex items-center gap-2 pt-1.5 animate-in fade-in"
                        >
                          <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to ${comment.author?.fullName?.split(' ')[0] || 'comment'}...`}
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(null);
                              setReplyText('');
                            }}
                            className="px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={!replyText.trim()}
                            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-xs transition-colors"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>
          </div>
        )}
      </article>
    </>
  );
};

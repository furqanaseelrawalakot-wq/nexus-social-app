import React, { useState } from 'react';
import { Share2, Link as LinkIcon, X, Send, Globe } from 'lucide-react';
import { Post } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useFeed } from '../../context/FeedContext';
import { useToast } from '../../context/ToastContext';
import { UserAvatar } from '../common/UserAvatar';

interface ShareModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ post, isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { sharePost } = useFeed();
  const { showToast } = useToast();
  const [caption, setCaption] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen) return null;

  const originalAuthor = post.sharedPost ? post.sharedPost.author : post.author;
  const originalContent = post.sharedPost ? post.sharedPost.content : post.content;
  const originalMedia = post.sharedPost ? post.sharedPost.mediaUrls : post.mediaUrls;

  const handleShareToFeed = async () => {
    setIsSharing(true);
    try {
      await sharePost(post.id, caption);
      showToast('Shared to Feed! 🚀', 'Your shared post is now visible on your profile and feed.', 'success');
      onClose();
    } catch (err) {
      showToast('Share Failed', 'Could not share post right now.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl).then(
      () => {
        showToast('Link Copied! 📋', 'Post link copied to clipboard.', 'success');
        onClose();
      },
      () => {
        showToast('Copy Failed', 'Please copy manually: ' + postUrl, 'error');
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-150 select-none">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Share Post</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* User Sharer Header */}
          <div className="flex items-center gap-3">
            <UserAvatar src={currentUser.avatarUrl} name={currentUser.fullName} size="md" />
            <div>
              <p className="text-xs font-bold text-slate-900">{currentUser.fullName}</p>
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium mt-0.5">
                <Globe className="w-2.5 h-2.5" /> Public Feed
              </span>
            </div>
          </div>

          {/* Optional Caption Input */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Say something about this post (optional)..."
            rows={2}
            className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 resize-none"
          />

          {/* Original Post Preview Card */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2.5">
              <UserAvatar src={originalAuthor.avatarUrl} name={originalAuthor.fullName} size="sm" />
              <div>
                <p className="text-xs font-bold text-slate-800">{originalAuthor.fullName}</p>
                <p className="text-[10px] text-slate-400">{post.createdAt}</p>
              </div>
            </div>
            {originalContent && <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">{originalContent}</p>}
            {originalMedia && originalMedia.length > 0 && (
              <div className="rounded-xl overflow-hidden max-h-40 bg-black/5">
                <img src={originalMedia[0]} alt="Attached" className="w-full h-40 object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-white hover:border-slate-300 transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Copy Link</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleShareToFeed}
              disabled={isSharing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSharing ? 'Sharing...' : 'Share to Feed'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

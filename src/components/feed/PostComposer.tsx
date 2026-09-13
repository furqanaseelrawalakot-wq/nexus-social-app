import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Video,
  Smile,
  Globe,
  Users,
  Lock,
  Send,
  X,
  Sparkles,
  FolderUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFeed } from '../../context/FeedContext';
import { useToast } from '../../context/ToastContext';
import { UserAvatar } from '../common/UserAvatar';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  name?: string;
  size?: number;
}

export const PostComposer: React.FC = () => {
  const { currentUser } = useAuth();
  const { createPost } = useFeed();
  const { showToast } = useToast();

  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [feeling, setFeeling] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<string | undefined>(undefined);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const feelings = [
    { label: 'celebrating 🎓', emoji: '🎓' },
    { label: 'coding ☕', emoji: '☕' },
    { label: 'excited 🚀', emoji: '🚀' },
    { label: 'happy 😊', emoji: '😊' },
    { label: 'learning 📚', emoji: '📚' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, preferredType?: 'image' | 'video') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const maxImageBytes = 15 * 1024 * 1024; // 15MB
    const maxVideoBytes = 50 * 1024 * 1024; // 50MB

    const fileList = Array.from(files);
    const hasIncomingVideo = fileList.some((f) => f.type.startsWith('video/'));
    const hasIncomingImage = fileList.some((f) => f.type.startsWith('image/'));

    // Enforce Facebook-style rule: either photos or a video, not both in the same post
    if (hasIncomingVideo && hasIncomingImage) {
      showToast('Media Note 💡', 'A post can contain either photos or a video, not both. Please select one type.', 'info');
    }

    const currentType = mediaList[0]?.type;
    const isIncomingVideo = preferredType === 'video' || (hasIncomingVideo && !hasIncomingImage);

    // If switching types, inform user that previous selection will be replaced
    if (currentType && ((currentType === 'image' && isIncomingVideo) || (currentType === 'video' && !isIncomingVideo))) {
      showToast(
        'Media Switched 🔄',
        `Switched to ${isIncomingVideo ? 'video' : 'photos'} (posts cannot mix photos and videos).`,
        'info'
      );
    }

    const validFiles = fileList.filter((f) => {
      const isVid = f.type.startsWith('video/');
      return isIncomingVideo ? isVid : !isVid;
    });

    if (validFiles.length === 0) return;

    // Videos are limited to 1 per post
    const filesToProcess = isIncomingVideo ? [validFiles[0]] : validFiles;

    filesToProcess.forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const maxAllowed = isVideo ? maxVideoBytes : maxImageBytes;

      if (file.size > maxAllowed) {
        const limitStr = isVideo ? '50MB' : '15MB';
        showToast(
          'File Too Large ⚠️',
          `"${file.name}" exceeds the ${limitStr} limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
          'error'
        );
        setErrorMessage(`"${file.name}" is too large. Max size is ${limitStr}.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newItem: MediaItem = {
            url: event.target!.result as string,
            type: isVideo ? 'video' : 'image',
            name: file.name,
            size: file.size,
          };

          if (isIncomingVideo) {
            // Replace any existing media with the single video
            setMediaList([newItem]);
          } else {
            // If previous media was video, replace with image; otherwise append
            setMediaList((prev) => (prev[0]?.type === 'video' ? [newItem] : [...prev, newItem]));
          }
          setIsExpanded(true);
        }
      };

      reader.onerror = () => {
        showToast('Read Error', `Could not read ${file.name}.`, 'error');
      };

      reader.readAsDataURL(file);
    });

    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isPublishing) return;
    if (!content.trim() && mediaList.length === 0) {
      showToast('Empty Post', 'Please write something or attach media.', 'info');
      return;
    }

    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const urls = mediaList.map((m) => m.url);
      const hasVideo = mediaList.some((m) => m.type === 'video');

      await createPost({
        content: content.trim(),
        mediaUrls: urls,
        mediaType: hasVideo ? 'video' : 'image',
        visibility,
        feeling,
        location,
      });

      setContent('');
      setMediaList([]);
      setFeeling(undefined);
      setLocation(undefined);
      setIsExpanded(false);
      showToast('Post Published 🎉', 'Your post is now live on the feed.', 'success');
    } catch (err: any) {
      console.error('Post creation error:', err);
      setErrorMessage(err?.message || 'Failed to publish post. Please try again.');
      showToast('Publish Failed', 'Could not create post right now.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-card p-4 sm:p-5 space-y-4 select-none">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleFileSelect(e, 'image')}
        accept="image/*"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={(e) => handleFileSelect(e, 'video')}
        accept="video/*"
        className="hidden"
      />

      {/* Top Input Bar */}
      <div className="flex items-center gap-3">
        <UserAvatar
          src={currentUser.avatarUrl}
          name={currentUser.fullName}
          size="md"
        />
        <div
          onClick={() => setIsExpanded(true)}
          className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100/90 hover:bg-slate-100 border border-slate-200 text-xs sm:text-sm text-slate-500 cursor-pointer transition-colors"
        >
          {content || `What's on your mind, ${(currentUser?.fullName || 'there').trim().split(' ')[0] || 'there'}?`}
        </div>
      </div>

      {/* File Upload Shortcut Bar */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 text-xs font-bold transition-colors shadow-sm"
        >
          <ImageIcon className="w-4 h-4 text-emerald-600" />
          <span>Photo</span>
        </button>
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl bg-violet-50 hover:bg-violet-100/80 text-violet-700 text-xs font-bold transition-colors shadow-sm"
        >
          <Video className="w-4 h-4 text-violet-600" />
          <span>Video</span>
        </button>
      </div>

      {/* Expanded Modal Composer */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 border-t border-slate-100">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={`Share an update, research breakthrough, or project milestone... (Ctrl+Enter to post)`}
            rows={3}
            disabled={isPublishing}
            className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none disabled:opacity-50"
            autoFocus
          />

          {/* Attached Media Previews (Images or Video) */}
          {mediaList.length > 0 && (
            <div className="space-y-2">
              {mediaList[0]?.type === 'video' ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-72">
                  <video
                    src={mediaList[0].url}
                    controls
                    preload="metadata"
                    playsInline
                    className="max-h-72 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(0)}
                    disabled={isPublishing}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white backdrop-blur-md transition-all shadow-md z-10"
                    title="Remove Video"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 text-[10px] text-white font-mono backdrop-blur-sm pointer-events-none">
                    🎬 Video Preview
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mediaList.map((item, i) => (
                    <div
                      key={i}
                      className="relative rounded-2xl overflow-hidden group h-32 border border-slate-200 bg-slate-900 flex items-center justify-center"
                    >
                      <img
                        src={item.url}
                        alt={`Attached ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(i)}
                        disabled={isPublishing}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white backdrop-blur-md transition-all shadow-md"
                        title="Remove Photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-[10px] text-white font-mono backdrop-blur-sm">
                        📷 Photo {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom Toolbar & Publish Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isPublishing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Photo</span>
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={isPublishing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Video className="w-4 h-4 text-violet-600" />
                <span>Video</span>
              </button>

              {/* Visibility Selector */}
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                disabled={isPublishing}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="public">🌍 Public</option>
                <option value="friends">👥 Friends Only</option>
                <option value="private">🔒 Only Me</option>
              </select>
            </div>

            {/* Cancel & Publish Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setErrorMessage(null);
                }}
                disabled={isPublishing}
                className="px-3 py-1.5 rounded-xl text-slate-500 text-xs font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPublishing || (!content.trim() && mediaList.length === 0)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

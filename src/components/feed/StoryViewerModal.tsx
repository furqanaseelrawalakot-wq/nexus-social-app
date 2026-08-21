import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Eye,
  Send,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Users,
} from 'lucide-react';
import { Story, UserStoryGroup } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useFeed } from '../../context/FeedContext';
import { UserAvatarLink, UserNameLink } from '../common/UserLink';

interface StoryViewerModalProps {
  storyGroups: UserStoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

const STORY_DURATION_MS = 5000; // 5 seconds per story

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  storyGroups,
  initialGroupIndex,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const { viewStory, deleteStory, replyToStory } = useFeed();

  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentGroup = storyGroups[currentGroupIdx];
  const stories = currentGroup?.stories || [];
  const currentStory: Story | undefined = stories[currentStoryIdx];
  const isOwner = currentStory?.author?.id === currentUser?.id;

  // Mark story as viewed on active change
  useEffect(() => {
    if (currentStory?.id && !isOwner) {
      viewStory(currentStory.id);
    }
  }, [currentStory?.id, isOwner, viewStory]);

  const handleNextStory = useCallback(() => {
    if (currentStoryIdx < stories.length - 1) {
      setCurrentStoryIdx((prev) => prev + 1);
      setProgress(0);
    } else if (currentGroupIdx < storyGroups.length - 1) {
      setCurrentGroupIdx((prev) => prev + 1);
      setCurrentStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentStoryIdx, stories.length, currentGroupIdx, storyGroups.length, onClose]);

  const handlePrevStory = useCallback(() => {
    if (currentStoryIdx > 0) {
      setCurrentStoryIdx((prev) => prev - 1);
      setProgress(0);
    } else if (currentGroupIdx > 0) {
      const prevGroup = storyGroups[currentGroupIdx - 1];
      setCurrentGroupIdx((prev) => prev - 1);
      setCurrentStoryIdx(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [currentStoryIdx, currentGroupIdx, storyGroups]);

  // Story Progress Timer
  useEffect(() => {
    if (isPaused || showViewersSheet || !currentStory) return;

    const intervalMs = 50;
    const step = (intervalMs / STORY_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPaused, showViewersSheet, currentStory, handleNextStory]);

  const handleQuickReaction = async (emoji: string) => {
    if (!currentStory?.id || isOwner) return;
    setIsSendingReply(true);
    await replyToStory(currentStory.id, {
      type: 'reaction',
      emoji,
    });
    setIsSendingReply(false);
  };

  const handleSendTextReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory?.id || isOwner || isSendingReply) return;

    const text = replyText.trim();
    setReplyText('');
    setIsSendingReply(true);

    await replyToStory(currentStory.id, {
      type: 'text',
      content: text,
    });

    setIsSendingReply(false);
    setIsPaused(false);
  };

  const handleDeleteCurrentStory = async () => {
    if (!currentStory?.id || !isOwner) return;
    if (window.confirm('Delete this story? It will be permanently removed.')) {
      await deleteStory(currentStory.id);
      if (stories.length <= 1) {
        onClose();
      } else {
        handleNextStory();
      }
    }
  };

  if (!currentStory) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200"
    >
      {/* Story Stage Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md h-full sm:h-[720px] bg-slate-950 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
      >
        {/* Top Progress Segment Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
          {stories.map((s, idx) => (
            <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{
                  width:
                    idx < currentStoryIdx
                      ? '100%'
                      : idx === currentStoryIdx
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Header: Author, Timestamp, Mute & Close */}
        <div className="relative z-30 pt-6 px-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatarLink user={currentStory.author} size="sm" className="ring-2 ring-white/80" />
            <div className="min-w-0">
              <UserNameLink user={currentStory.author} className="text-xs font-bold text-white leading-tight drop-shadow truncate block" />
              <span className="text-[10px] text-white/70 font-mono drop-shadow">
                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentStory.type === 'video' && (
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}

            {isOwner && (
              <button
                type="button"
                onClick={handleDeleteCurrentStory}
                className="p-2 rounded-full bg-black/40 hover:bg-rose-600 text-white backdrop-blur-md transition-colors"
                title="Delete Story"
              >
                <Trash2 className="w-4 h-4 text-rose-300 hover:text-white" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Story Center Content */}
        <div
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          {/* TYPE: PHOTO */}
          {currentStory.type === 'image' && currentStory.mediaUrl && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-125"
                style={{ backgroundImage: `url(${currentStory.mediaUrl})` }}
              />
              <img
                src={currentStory.mediaUrl}
                alt="Story"
                className="relative z-10 w-full h-full object-contain max-h-full"
              />
            </>
          )}

          {/* TYPE: VIDEO */}
          {currentStory.type === 'video' && currentStory.mediaUrl && (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              autoPlay
              playsInline
              loop
              muted={isMuted}
              className="relative z-10 w-full h-full object-contain"
            />
          )}

          {/* TYPE: TEXT STATUS */}
          {currentStory.type === 'text' && (
            <div
              className={`w-full h-full bg-gradient-to-tr ${
                currentStory.backgroundStyle || 'from-indigo-600 to-purple-600'
              } flex items-center justify-center p-8 text-center`}
            >
              <p className="text-white text-lg sm:text-xl font-bold leading-relaxed whitespace-pre-wrap drop-shadow-lg break-words max-h-[450px] overflow-y-auto px-2">
                {currentStory.textContent}
              </p>
            </div>
          )}

          {/* Left / Right Tap Zones */}
          <div className="absolute inset-0 z-20 flex">
            <div onClick={handlePrevStory} className="w-1/3 h-full cursor-pointer" />
            <div onClick={handleNextStory} className="w-2/3 h-full cursor-pointer" />
          </div>
        </div>

        {/* Bottom Section: Caption, Seen-By (Owner) OR Reply/React Bar (Friend) */}
        <div className="relative z-30 p-4 space-y-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          {/* Optional Caption */}
          {currentStory.caption && (
            <p className="text-xs sm:text-sm font-medium text-white text-center drop-shadow-md pb-1">
              {currentStory.caption}
            </p>
          )}

          {/* OWNER VIEW: "Seen by X" Drawer Trigger */}
          {isOwner ? (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowViewersSheet((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md transition-all active:scale-95 shadow-lg"
              >
                <Eye className="w-4 h-4 text-white" />
                <span>
                  Seen by {(currentStory.viewedBy || []).length}{' '}
                  {(currentStory.viewedBy || []).length === 1 ? 'friend' : 'friends'}
                </span>
              </button>
            </div>
          ) : (
            /* FRIEND VIEW: Direct Message Reply & Quick Emojis */
            <div className="space-y-2.5">
              {/* Quick Reaction Emoji Bar */}
              <div className="flex items-center justify-center gap-3">
                {['❤️', '😂', '😮', '😢', '🔥', '👍'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleQuickReaction(emoji)}
                    disabled={isSendingReply}
                    className="text-2xl hover:scale-130 active:scale-90 transition-transform p-1 filter drop-shadow-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Direct Message Input */}
              <form onSubmit={handleSendTextReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => !showViewersSheet && setIsPaused(false)}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Send direct message to ${currentStory.author.fullName.split(' ')[0]}...`}
                  disabled={isSendingReply}
                  className="flex-1 px-4 py-2.5 text-xs rounded-full bg-white/20 border border-white/30 text-white placeholder:text-white/60 focus:outline-none focus:bg-white/30 focus:border-white transition-all backdrop-blur-md"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-lg transition-transform active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* OWNER "SEEN BY" BOTTOM SHEET DRAWER */}
        {showViewersSheet && isOwner && (
          <div
            onClick={() => setShowViewersSheet(false)}
            className="absolute inset-x-0 bottom-0 z-40 bg-slate-900/95 border-t border-slate-700 rounded-t-3xl p-5 space-y-4 max-h-[360px] overflow-y-auto backdrop-blur-xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white">Story Viewers</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowViewersSheet(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {(currentStory.viewedBy || []).length > 0 ? (
                (currentStory.viewedBy || []).map((viewer, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <UserAvatarLink user={viewer.user} size="sm" />
                      <div>
                        <UserNameLink user={viewer.user} className="text-xs font-bold text-white" />
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {new Date(viewer.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">
                  No friends have viewed this story yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Left / Right Navigation Buttons */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handlePrevStory();
        }}
        disabled={currentGroupIdx === 0 && currentStoryIdx === 0}
        className="hidden sm:flex absolute left-8 p-3.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white backdrop-blur-md transition-all shadow-xl"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleNextStory();
        }}
        className="hidden sm:flex absolute right-8 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all shadow-xl"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

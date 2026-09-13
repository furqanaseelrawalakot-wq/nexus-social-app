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
  Mic,
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

const STORY_DURATION_MS = 5000; // 5 seconds per photo/text story

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  storyGroups,
  initialGroupIndex,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const { viewStory, deleteStory, replyToStory, toggleStoryHighlight } = useFeed();

  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [highlightTitleInput, setHighlightTitleInput] = useState('Highlights');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Handle audio play/pause synchronization
  useEffect(() => {
    if (!audioRef.current || currentStory?.type !== 'audio') return;
    if (isPaused || showViewersSheet || showHighlightModal) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }, [isPaused, showViewersSheet, showHighlightModal, currentStory?.id, currentStory?.type]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Story Progress Timer for image/text (audio uses onTimeUpdate / onEnded)
  useEffect(() => {
    if (isPaused || showViewersSheet || showHighlightModal || !currentStory) return;
    if (currentStory.type === 'audio') return; // Handled dynamically by audio element

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
  }, [isPaused, showViewersSheet, showHighlightModal, currentStory, handleNextStory]);

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

  const handleToggleHighlight = async () => {
    if (!currentStory?.id || !isOwner) return;
    if (currentStory.isHighlighted) {
      // Toggle off
      await toggleStoryHighlight(currentStory.id, undefined, false);
      currentStory.isHighlighted = false;
    } else {
      setIsPaused(true);
      setShowHighlightModal(true);
    }
  };

  const handleSaveHighlightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStory?.id || !isOwner) return;
    const title = highlightTitleInput.trim() || 'Highlights';
    await toggleStoryHighlight(currentStory.id, title, true);
    currentStory.isHighlighted = true;
    currentStory.highlightTitle = title;
    setShowHighlightModal(false);
    setIsPaused(false);
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
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/70 font-mono drop-shadow">
                  {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {currentStory.isHighlighted && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/80 text-[9px] font-bold text-white font-mono">
                    ⭐ {currentStory.highlightTitle || 'Highlight'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={handleToggleHighlight}
                className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                  currentStory.isHighlighted
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-black/40 hover:bg-black/60 text-amber-300'
                }`}
                title={currentStory.isHighlighted ? 'Remove from Highlights' : 'Save to Highlights'}
              >
                <Sparkles className="w-4 h-4 fill-current" />
              </button>
            )}

            {(currentStory.type === 'video' || currentStory.type === 'audio') && (
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
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

          {/* TYPE: AUDIO VOICE STORY */}
          {currentStory.type === 'audio' && (
            <div
              className={`w-full h-full bg-gradient-to-tr ${
                currentStory.backgroundStyle || 'from-indigo-600 via-purple-600 to-pink-600'
              } flex flex-col items-center justify-center p-8 text-center relative overflow-hidden`}
            >
              {currentStory.mediaUrl && (
                <audio
                  ref={audioRef}
                  src={currentStory.mediaUrl}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  onTimeUpdate={() => {
                    if (audioRef.current && audioRef.current.duration) {
                      const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                      setProgress(Math.min(100, Math.max(0, pct)));
                    }
                  }}
                  onEnded={handleNextStory}
                  className="hidden"
                />
              )}

              {/* Ambient visualizer background glows */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-72 h-72 rounded-full bg-white/10 blur-3xl ${!isPaused ? 'animate-pulse' : ''}`} />
              </div>

              {/* Pulsing visualizer & Avatar */}
              <div className="relative mb-6 flex items-center justify-center z-10">
                <div className={`absolute w-36 h-36 rounded-full bg-white/15 ${!isPaused ? 'animate-ping' : ''}`} />
                <div className={`absolute w-28 h-28 rounded-full bg-white/20 ${!isPaused ? 'animate-pulse' : ''}`} />
                <div className="relative w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-white/40 to-white/10 backdrop-blur-md shadow-2xl flex items-center justify-center">
                  <UserAvatarLink user={currentStory.author} size="xl" className="w-full h-full rounded-full ring-2 ring-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-indigo-600 text-white shadow-lg ring-2 ring-white">
                  <Mic className="w-4 h-4" />
                </div>
              </div>

              {/* Dynamic sound equalizer bars */}
              <div className="flex items-center justify-center gap-1.5 h-12 mb-4 z-10">
                {[45, 80, 60, 95, 70, 100, 75, 90, 50, 85, 65, 90, 55].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-white/90 rounded-full transition-all duration-150 shadow-sm"
                    style={{
                      height: !isPaused ? `${Math.max(20, (h * ((progress + i * 8) % 30 + 10)) / 35)}%` : '20%',
                    }}
                  />
                ))}
              </div>

              {/* Audio badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-mono mb-3 z-10">
                <Volume2 className="w-3.5 h-3.5 text-indigo-300" />
                <span>Voice Story</span>
                {currentStory.duration && <span className="text-white/70">• {currentStory.duration}</span>}
              </div>
            </div>
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

        {/* OWNER "SAVE TO HIGHLIGHTS" MODAL DRAWER */}
        {showHighlightModal && isOwner && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 z-40 bg-slate-900/95 border-t border-slate-700 rounded-t-3xl p-5 space-y-4 backdrop-blur-xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">Save to Profile Highlights</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowHighlightModal(false);
                  setIsPaused(false);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHighlightSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Highlight Collection Name
                </label>
                <input
                  type="text"
                  value={highlightTitleInput}
                  onChange={(e) => setHighlightTitleInput(e.target.value)}
                  placeholder="e.g. Summer Vibes, Memories, Travel..."
                  maxLength={25}
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowHighlightModal(false);
                    setIsPaused(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-slate-950 shadow-lg"
                >
                  Save Highlight
                </button>
              </div>
            </form>
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

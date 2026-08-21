import React, { useState, useRef } from 'react';
import {
  Sparkles,
  X,
  Image as ImageIcon,
  Type,
  Send,
  Loader2,
  FolderUp,
  AlertCircle,
  Film,
  Palette,
} from 'lucide-react';
import { useFeed } from '../../context/FeedContext';
import { useToast } from '../../context/ToastContext';
import { StoryType } from '../../types';

interface StoryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GRADIENT_PRESETS = [
  { id: 'galaxy', name: 'Deep Galaxy', class: 'from-indigo-600 via-purple-600 to-pink-600' },
  { id: 'sunset', name: 'Sunset Glow', class: 'from-rose-500 via-orange-500 to-amber-500' },
  { id: 'ocean', name: 'Ocean Depths', class: 'from-blue-600 via-cyan-600 to-teal-600' },
  { id: 'emerald', name: 'Neon Forest', class: 'from-emerald-600 via-teal-600 to-slate-900' },
  { id: 'cosmos', name: 'Dark Cosmos', class: 'from-slate-950 via-slate-900 to-indigo-950' },
  { id: 'magenta', name: 'Electric Rose', class: 'from-pink-600 via-rose-600 to-red-600' },
];

export const StoryCreateModal: React.FC<StoryCreateModalProps> = ({ isOpen, onClose }) => {
  const { createStory } = useFeed();
  const { showToast } = useToast();

  const [storyMode, setStoryMode] = useState<'media' | 'text'>('media');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0].class);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);

    const isVideo = file.type.startsWith('video/');
    const maxAllowed = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (file.size > maxAllowed) {
      const limitStr = isVideo ? '50MB' : '10MB';
      setErrorMessage(`"${file.name}" exceeds ${limitStr} limit.`);
      showToast('File Too Large ⚠️', `Story ${isVideo ? 'video' : 'photo'} must be under ${limitStr}.`, 'error');
      return;
    }

    setMediaType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setMediaUrl(event.target.result as string);
      }
    };
    reader.onerror = () => {
      showToast('Read Error', `Could not read ${file.name}.`, 'error');
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublishing) return;

    if (storyMode === 'media' && !mediaUrl) {
      setErrorMessage('Please select a photo or video to share.');
      return;
    }
    if (storyMode === 'text' && !textContent.trim()) {
      setErrorMessage('Please write some text for your story.');
      return;
    }

    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const success = await createStory({
        type: storyMode === 'media' ? (mediaType === 'video' ? 'video' : 'image') : 'text',
        mediaUrl: storyMode === 'media' ? mediaUrl : undefined,
        mediaType: storyMode === 'media' ? mediaType : undefined,
        textContent: storyMode === 'text' ? textContent.trim() : undefined,
        backgroundStyle: storyMode === 'text' ? selectedGradient : undefined,
        caption: storyMode === 'media' ? caption.trim() : undefined,
      });

      if (success) {
        setMediaUrl('');
        setCaption('');
        setTextContent('');
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to publish story.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
          className="hidden"
        />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create 24-Hour Story</h3>
              <p className="text-[11px] text-slate-500">Visible to all your friends for 24 hours</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-3 bg-slate-100/70 border-b border-slate-200/60 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStoryMode('media')}
            className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              storyMode === 'media'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span>Photo / Video</span>
          </button>

          <button
            type="button"
            onClick={() => setStoryMode('text')}
            className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              storyMode === 'text'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Type className="w-4 h-4 text-purple-600" />
            <span>Text Status</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePublish} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: MEDIA STORY (PHOTO / VIDEO) */}
          {storyMode === 'media' && (
            <div className="space-y-3">
              {mediaUrl ? (
                <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 h-64 flex items-center justify-center group">
                  {mediaType === 'video' ? (
                    <video
                      src={mediaUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Story preview"
                      className="w-full h-full object-contain"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMediaUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white backdrop-blur-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-[10px] text-white font-mono backdrop-blur-sm">
                    {mediaType === 'video' ? '🎬 Video Story' : '📷 Photo Story'}
                  </span>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 h-56 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 transition-colors">
                    <FolderUp className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to select Photo or Video from computer
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Images (JPG/PNG up to 10MB) or Videos (MP4/WebM up to 50MB)
                  </p>
                </div>
              )}

              {/* Caption Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Optional Caption
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a thought or location... ✨"
                  maxLength={120}
                  className="w-full px-3.5 py-2 text-xs rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: TEXT STATUS STORY */}
          {storyMode === 'text' && (
            <div className="space-y-4">
              {/* Live Preview Card */}
              <div
                className={`w-full h-64 rounded-3xl bg-gradient-to-tr ${selectedGradient} p-6 flex items-center justify-center text-center shadow-lg border border-white/20 relative overflow-hidden transition-all duration-300`}
              >
                <p className="text-white text-base sm:text-lg font-bold leading-relaxed whitespace-pre-wrap drop-shadow-md break-words max-h-48 overflow-y-auto px-2">
                  {textContent || 'Type your status update below...'}
                </p>
              </div>

              {/* Text Input Area */}
              <div>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="What's happening? Share a thought, announcement, or status..."
                  rows={3}
                  maxLength={250}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400 font-mono block text-right">
                  {textContent.length}/250
                </span>
              </div>

              {/* Gradient Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Choose Background Gradient</span>
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedGradient(preset.class)}
                      className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${preset.class} shrink-0 transition-transform ${
                        selectedGradient === preset.class
                          ? 'ring-3 ring-indigo-500 scale-110 shadow-md'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isPublishing ||
                (storyMode === 'media' && !mediaUrl) ||
                (storyMode === 'text' && !textContent.trim())
              }
              className="flex items-center gap-2 px-6 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Share Story</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

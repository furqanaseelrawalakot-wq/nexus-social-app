import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Search,
  ShieldCheck,
  Users,
  Image,
  Video,
  Paperclip,
  Check,
  CheckCheck,
  X,
  FileText,
  MapPin,
  Mic,
  Trash2,
  Download,
  Maximize2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/common/UserAvatar';
import { UserAvatarLink, UserNameLink } from '../components/common/UserLink';
import { VoiceMessagePlayer } from '../components/chat/VoiceMessagePlayer';

export const MessagesPage: React.FC = () => {
  const {
    conversations,
    activeConversation,
    openChat,
    sendMessage,
    sendMediaMessage,
    sendLocationMessage,
    sendTyping,
    isPartnerTyping,
  } = useChat();

  const { currentUser } = useAuth();

  const [selectedConvId, setSelectedConvId] = useState<string>(
    activeConversation?.id || conversations[0]?.id || ''
  );
  const [inputText, setInputText] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Media preview states
  const [mediaPreview, setMediaPreview] = useState<{
    base64: string;
    type: 'image' | 'video' | 'document';
    fileName: string;
    fileSize: string;
  } | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLightboxMedia, setSelectedLightboxMedia] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentConv = useMemo(() => {
    if (activeConversation?.id === selectedConvId) return activeConversation;
    return conversations.find((c) => c.id === selectedConvId) || activeConversation || conversations[0];
  }, [selectedConvId, activeConversation, conversations]);

  useEffect(() => {
    if (activeConversation?.id) {
      setSelectedConvId(activeConversation.id);
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConv?.messages, isPartnerTyping]);

  const filteredConversations = conversations.filter((c) =>
    c.participant?.fullName?.toLowerCase().includes(filterQuery.toLowerCase())
  );

  // Helper to append authenticated userId to media stream URLs
  const getMediaSrc = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const hasQuery = url.includes('?');
    const separator = hasQuery ? '&' : '?';
    return currentUser?.id ? `${url}${separator}userId=${currentUser.id}` : url;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (currentConv?.id) {
      sendTyping(currentConv.id, true);
    }
  };

  // Text send
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentConv) return;
    const text = inputText;
    setInputText('');
    setShowAttachmentMenu(false);
    if (currentConv?.id) sendTyping(currentConv.id, false);
    await sendMessage(currentConv.id, text);
  };

  // Handle Photo & Video selection
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      alert('Please upload an image (JPG, PNG, WEBP, GIF) or video (MP4, WEBM, MOV).');
      return;
    }

    const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`File size exceeds limit (${isVideo ? '50MB' : '10MB'}).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaPreview({
        base64: event.target?.result as string,
        type: isVideo ? 'video' : 'image',
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
      setMediaCaption('');
      setShowAttachmentMenu(false);
    };
    reader.readAsDataURL(file);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  // Handle Document selection
  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Document exceeds 25MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaPreview({
        base64: event.target?.result as string,
        type: 'document',
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
      setMediaCaption('');
      setShowAttachmentMenu(false);
    };
    reader.readAsDataURL(file);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  // Send attached media
  const handleSendMedia = async () => {
    if (!mediaPreview || !currentConv) return;
    setIsUploading(true);

    await sendMediaMessage(currentConv.id, {
      mediaBase64: mediaPreview.base64,
      mediaType: mediaPreview.type,
      fileName: mediaPreview.fileName,
      fileSize: mediaPreview.fileSize,
      text: mediaCaption,
    });

    setIsUploading(false);
    setMediaPreview(null);
    setMediaCaption('');
  };

  // Share Geolocation
  const handleShareLocation = () => {
    setShowAttachmentMenu(false);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!currentConv) return;
        await sendLocationMessage(currentConv.id, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: 'Live Location Pin',
        });
      },
      (err) => {
        alert(`Location access denied or unavailable: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Voice recording handlers (with precise wall-clock duration calculation)
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const elapsedSecs = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
        const m = Math.floor(elapsedSecs / 60);
        const s = elapsedSecs % 60;
        const durationFormatted = `${m}:${s < 10 ? '0' : ''}${s}`;

        if (audioBlob.size > 0 && currentConv) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const base64 = ev.target?.result as string;
            await sendMediaMessage(currentConv.id, {
              mediaBase64: base64,
              mediaType: 'voice',
              fileName: 'voice_note.webm',
              fileSize: `${(audioBlob.size / 1024).toFixed(0)} KB`,
              duration: durationFormatted,
            });
          };
          reader.readAsDataURL(audioBlob);
        }
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is required to send voice messages.');
    }
  };

  const stopAndSendVoice = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  return (
    <div className="max-w-5xl mx-auto w-full h-[calc(100vh-8rem)] rounded-3xl bg-white border border-slate-200 shadow-card overflow-hidden flex select-none relative">
      {/* Hidden File Pickers */}
      <input
        type="file"
        ref={mediaInputRef}
        onChange={handleMediaSelect}
        accept="image/*,video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={docInputRef}
        onChange={handleDocSelect}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
        className="hidden"
      />

      {/* Lightbox Overlay */}
      {selectedLightboxMedia && (
        <div
          onClick={() => setSelectedLightboxMedia(null)}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <button
            onClick={() => setSelectedLightboxMedia(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedLightboxMedia}
            alt="Expanded view"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Media Upload Preview Modal */}
      {mediaPreview && (
        <div className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                {mediaPreview.type === 'video' ? (
                  <Video className="w-4 h-4 text-indigo-600" />
                ) : mediaPreview.type === 'document' ? (
                  <FileText className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Image className="w-4 h-4 text-indigo-600" />
                )}
                <span>
                  Send {mediaPreview.type === 'video' ? 'Video' : mediaPreview.type === 'document' ? 'Document' : 'Photo'} ({mediaPreview.fileSize})
                </span>
              </h4>
              <button
                onClick={() => setMediaPreview(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 flex items-center justify-center max-h-72 overflow-hidden">
              {mediaPreview.type === 'video' ? (
                <video src={mediaPreview.base64} controls className="max-h-64 rounded-2xl shadow-sm" />
              ) : mediaPreview.type === 'document' ? (
                <div className="p-6 text-center space-y-2">
                  <FileText className="w-16 h-16 mx-auto text-indigo-600" />
                  <p className="text-sm font-bold text-slate-800">{mediaPreview.fileName}</p>
                  <p className="text-xs text-slate-400 font-mono">{mediaPreview.fileSize}</p>
                </div>
              ) : (
                <img src={mediaPreview.base64} alt="Preview" className="max-h-64 object-contain rounded-2xl shadow-sm" />
              )}
            </div>

            <div className="p-4 space-y-3">
              <input
                type="text"
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Add a caption (optional)..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMediaPreview(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMedia}
                  disabled={isUploading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>{isUploading ? 'Uploading...' : 'Send Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Left Conversations Sidebar */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <span>Messages</span>
            </h2>
            <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              {conversations.length}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* List of Active Conversations */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === currentConv?.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConvId(conv.id);
                    openChat(conv.id);
                  }}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50/80 border-r-2 border-indigo-600' : 'hover:bg-slate-100/70'
                  }`}
                >
                  <UserAvatarLink
                    user={conv.participant}
                    size="md"
                    online={conv.isOnline}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {conv.participant?.fullName}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">{conv.lastMessageTime}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-slate-500 truncate max-w-[170px]">
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">
                {filterQuery ? 'No matching chats' : 'No conversations yet'}
              </p>
              <p className="text-[11px] text-slate-400">
                {filterQuery ? 'Try a different search query.' : 'Connect with peers to start messaging!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Active Conversation Chat Pane */}
      {currentConv ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
            <div className="flex items-center gap-3">
              <UserAvatarLink
                user={currentConv.participant}
                size="md"
                online={currentConv.isOnline}
              />
              <div>
                <UserNameLink
                  user={currentConv.participant}
                  className="text-sm font-bold text-slate-900"
                />
                <span className="block text-[11px] text-slate-400">
                  {isPartnerTyping ? (
                    <span className="text-indigo-600 font-medium animate-pulse">typing...</span>
                  ) : currentConv.isOnline ? (
                    'Online'
                  ) : (
                    'Offline'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Messages Area (WhatsApp/Instagram-Style) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {(currentConv.messages || []).length > 0 ? (
              (currentConv.messages || []).map((m) => {
                const isMe = m.senderId === currentUser.id;
                const resolvedMediaUrl = getMediaSrc(m.mediaUrl);

                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] p-3 rounded-2xl text-xs space-y-1.5 ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                      }`}
                    >
                      {/* 1. REAL PHOTO MESSAGE */}
                      {m.type === 'image' && resolvedMediaUrl && (
                        <div
                          onClick={() => setSelectedLightboxMedia(resolvedMediaUrl)}
                          className="rounded-xl overflow-hidden cursor-pointer relative group bg-black/5"
                        >
                          <img
                            src={resolvedMediaUrl}
                            alt="Photo"
                            className="max-h-60 w-full object-cover rounded-xl transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="w-5 h-5 drop-shadow" />
                          </div>
                        </div>
                      )}

                      {/* 2. REAL VIDEO MESSAGE */}
                      {m.type === 'video' && resolvedMediaUrl && (
                        <div className="rounded-xl overflow-hidden bg-black max-w-[280px]">
                          <video src={resolvedMediaUrl} controls className="max-h-64 w-full rounded-xl" />
                        </div>
                      )}

                      {/* 3. VOICE MESSAGE NOTE */}
                      {m.type === 'voice' && resolvedMediaUrl && (
                        <VoiceMessagePlayer
                          src={resolvedMediaUrl}
                          duration={m.duration}
                          isMe={isMe}
                        />
                      )}

                      {/* 4. DOCUMENT MESSAGE */}
                      {m.type === 'document' && (
                        <a
                          href={resolvedMediaUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={m.fileName}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                            isMe
                              ? 'bg-indigo-700/50 border-indigo-400/40 text-white hover:bg-indigo-700'
                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-white/20 text-current">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{m.fileName || 'Document.pdf'}</p>
                            <p className="text-[10px] opacity-70 font-mono">{m.fileSize || '1.2 MB'}</p>
                          </div>
                          <Download className="w-4 h-4 opacity-70 shrink-0" />
                        </a>
                      )}

                      {/* 5. LOCATION MESSAGE */}
                      {m.type === 'location' && m.location && (
                        <a
                          href={`https://www.google.com/maps?q=${m.location.latitude},${m.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-xl overflow-hidden border border-slate-200/50 bg-slate-100 hover:opacity-90 transition-opacity"
                        >
                          <div className="h-28 bg-gradient-to-tr from-indigo-100 via-sky-100 to-emerald-100 flex flex-col items-center justify-center p-3 text-center">
                            <MapPin className="w-8 h-8 text-rose-500 animate-bounce" />
                            <span className="text-[11px] font-bold text-slate-700 mt-1">
                              {m.location.label || '📍 Shared Location'}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">
                              {m.location.latitude.toFixed(4)}, {m.location.longitude.toFixed(4)}
                            </span>
                          </div>
                          <div className="p-2 bg-white/80 text-center flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-600">
                            <span>Open in Google Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        </a>
                      )}

                      {/* 6. STORY REPLY SNAPSHOT */}
                      {(m.type === 'story_reply' || m.storyReply) && (
                        <div
                          className={`p-2.5 rounded-xl mb-1 border flex items-center gap-2.5 ${
                            isMe
                              ? 'bg-indigo-700/60 border-indigo-400/40 text-white'
                              : 'bg-slate-100 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
                            {m.storyReply?.mediaUrl ? (
                              m.storyReply.type === 'video' ? (
                                <video src={getMediaSrc(m.storyReply.mediaUrl)} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={getMediaSrc(m.storyReply.mediaUrl)} alt="Story" className="w-full h-full object-cover" />
                              )
                            ) : m.storyReply?.type === 'text' ? (
                              <div className={`w-full h-full bg-gradient-to-tr ${m.storyReply.backgroundStyle || 'from-indigo-600 to-purple-600'} flex items-center justify-center p-1`}>
                                <span className="text-[8px] font-bold text-white leading-tight line-clamp-2">{m.storyReply.textContent}</span>
                              </div>
                            ) : (
                              <Sparkles className="w-4 h-4 text-indigo-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block">
                              Replied to Story
                            </span>
                            {m.storyReply?.caption && (
                              <p className="text-[11px] truncate opacity-90">{m.storyReply.caption}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Text Content (if type is text or caption) */}
                      {m.text && <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>}

                      {/* Timestamp & WhatsApp Status Ticks */}
                      <div
                        className={`flex items-center justify-end gap-1 text-[9px] font-mono ${
                          isMe ? 'text-indigo-200' : 'text-slate-400'
                        }`}
                      >
                        <span>{m.createdAt}</span>
                        {isMe && (
                          <span>
                            {m.status === 'read' || m.isRead ? (
                              <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-cyan-300" /></span>
                            ) : m.status === 'delivered' ? (
                              <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-indigo-200" /></span>
                            ) : (
                              <span title="Sent"><Check className="w-3 h-3 text-indigo-200" /></span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">
                  Say hello to {currentConv.participant?.fullName}!
                </p>
                <p className="text-[11px] text-slate-400">
                  Send photos, videos, voice notes, documents, or location.
                </p>
              </div>
            )}

            {isPartnerTyping && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl bg-white border border-slate-200 rounded-bl-none text-xs text-slate-500 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* WhatsApp-Style Input Bar with Popup Menu & Voice Recorder */}
          <div className="p-3 border-t border-slate-200 bg-white relative">
            {/* Attachment Popup Menu */}
            {showAttachmentMenu && (
              <div className="absolute bottom-16 left-4 bg-white rounded-3xl border border-slate-200 shadow-2xl p-2.5 z-30 flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 duration-150 min-w-[170px]">
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <div className="p-1.5 rounded-xl bg-indigo-100 text-indigo-600">
                    <Image className="w-4 h-4" />
                  </div>
                  <span>Photos & Videos</span>
                </button>

                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-600 transition-colors text-left"
                >
                  <div className="p-1.5 rounded-xl bg-violet-100 text-violet-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>Document</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareLocation}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left"
                >
                  <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span>Live Location</span>
                </button>
              </div>
            )}

            {/* Voice Recording Active Bar */}
            {isRecording ? (
              <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold text-rose-600 font-mono">
                    Recording 0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="p-2 rounded-full hover:bg-rose-100 text-rose-600 transition-colors"
                    title="Cancel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={stopAndSendVoice}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex items-center gap-2">
                {/* Paperclip Attachment Menu Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu((prev) => !prev)}
                  className={`p-2.5 rounded-full transition-colors ${
                    showAttachmentMenu
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'hover:bg-slate-100 text-slate-500 hover:text-indigo-600'
                  }`}
                  title="Attach"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder={`Message ${currentConv.participant?.fullName?.split(' ')[0] || 'Friend'}...`}
                  className="flex-1 px-4 py-2.5 text-xs rounded-full bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                />

                {/* Voice Note Record Button */}
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                  title="Record Voice Message"
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-sm transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 space-y-4 select-none">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div className="max-w-xs space-y-1">
            <h3 className="text-base font-bold text-slate-800">Your Messages</h3>
            <p className="text-xs text-slate-500">
              Exchange instant messages, photos, videos, voice notes, and documents with your confirmed connections.
            </p>
          </div>
          <Link
            to="/friends"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Users className="w-4 h-4" />
            <span>Discover & Connect with Friends</span>
          </Link>
        </div>
      )}
    </div>
  );
};

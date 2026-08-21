import React, { useState, useRef, useEffect } from 'react';
import { Send, X, ShieldCheck, Check, CheckCheck, Paperclip, FileText, MapPin, Download, ExternalLink } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../common/UserAvatar';
import { UserAvatarLink, UserNameLink } from '../common/UserLink';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

export const FloatingChatWindow: React.FC = () => {
  const {
    activeConversation,
    isChatOpen,
    closeChat,
    sendMessage,
    sendMediaMessage,
    sendTyping,
    isPartnerTyping,
  } = useChat();

  const { currentUser } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isPartnerTyping]);

  if (!isChatOpen || !activeConversation) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const text = inputMessage;
    setInputMessage('');
    if (activeConversation?.id) sendTyping(activeConversation.id, false);
    await sendMessage(activeConversation.id, text);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const type = isVideo ? 'video' : isImage ? 'image' : 'document';

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      await sendMediaMessage(activeConversation.id, {
        mediaBase64: base64,
        mediaType: type,
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-96 rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
        className="hidden"
      />

      {/* Top Header */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatarLink
            user={activeConversation.participant}
            size="sm"
            online={activeConversation.isOnline}
          />
          <div className="min-w-0">
            <UserNameLink
              user={activeConversation.participant}
              className="text-xs font-bold truncate text-white hover:text-indigo-200"
            />
            <span className="block text-[10px] text-slate-300 font-mono">
              {isPartnerTyping ? (
                <span className="text-cyan-300 animate-pulse">typing...</span>
              ) : activeConversation.isOnline ? (
                'Active Now'
              ) : (
                'Offline'
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-300">
          <button
            onClick={closeChat}
            className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="p-4 h-80 overflow-y-auto space-y-3 bg-slate-50">
        {(activeConversation.messages || []).map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-1.5 ${
                  isMe
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                {/* Image */}
                {msg.type === 'image' && msg.mediaUrl && (
                  <img src={msg.mediaUrl} alt="Photo" className="rounded-xl max-h-40 w-full object-cover" />
                )}

                {/* Video */}
                {msg.type === 'video' && msg.mediaUrl && (
                  <video src={msg.mediaUrl} controls className="rounded-xl max-h-40 w-full bg-black" />
                )}

                {/* Voice */}
                {msg.type === 'voice' && msg.mediaUrl && (
                  <VoiceMessagePlayer src={msg.mediaUrl} duration={msg.duration} isMe={isMe} />
                )}

                {/* Document */}
                {msg.type === 'document' && (
                  <a
                    href={msg.mediaUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-xl bg-black/10 hover:bg-black/20 transition-colors"
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1 font-bold text-[11px]">{msg.fileName || 'File'}</span>
                    <Download className="w-3.5 h-3.5 opacity-80" />
                  </a>
                )}

                {/* Location */}
                {msg.type === 'location' && msg.location && (
                  <a
                    href={`https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded-xl bg-black/10 hover:bg-black/20 text-center transition-colors"
                  >
                    <MapPin className="w-4 h-4 mx-auto text-rose-500 mb-0.5" />
                    <p className="font-bold text-[11px] truncate">{msg.location.label || 'Shared Location'}</p>
                    <span className="text-[9px] opacity-80 flex items-center justify-center gap-0.5 mt-0.5">
                      Open Map <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </a>
                )}

                {/* Story Reply Snapshot */}
                {(msg.type === 'story_reply' || msg.storyReply) && (
                  <div
                    className={`p-2 rounded-xl mb-1 border flex items-center gap-2 ${
                      isMe
                        ? 'bg-indigo-700/60 border-indigo-400/40 text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
                      {msg.storyReply?.mediaUrl ? (
                        msg.storyReply.type === 'video' ? (
                          <video src={msg.storyReply.mediaUrl} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={msg.storyReply.mediaUrl} alt="Story" className="w-full h-full object-cover" />
                        )
                      ) : msg.storyReply?.type === 'text' ? (
                        <div className={`w-full h-full bg-gradient-to-tr ${msg.storyReply.backgroundStyle || 'from-indigo-600 to-purple-600'} flex items-center justify-center p-0.5`}>
                          <span className="text-[7px] font-bold text-white leading-tight line-clamp-1">{msg.storyReply.textContent}</span>
                        </div>
                      ) : (
                        <span className="text-xs">🌟</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-75 block truncate">
                        Replied to Story
                      </span>
                    </div>
                  </div>
                )}

                {/* Text */}
                {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}

                {/* Timestamp & Ticks */}
                <div
                  className={`flex items-center justify-end gap-1 text-[9px] font-mono mt-1 ${
                    isMe ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  <span>{msg.createdAt}</span>
                  {isMe && (
                    <span>
                      {msg.status === 'read' || msg.isRead ? (
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />
                      ) : (
                        <Check className="w-3 h-3 text-indigo-200" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Chat Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
          title="Attach Media or Document"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
            if (activeConversation?.id) sendTyping(activeConversation.id, true);
          }}
          placeholder="Type a message..."
          className="flex-1 px-3.5 py-2 text-xs rounded-full bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
        />

        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-sm transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

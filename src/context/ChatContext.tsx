import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Conversation, Message, LocationData } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  isChatOpen: boolean;
  unreadCount: number;
  isPartnerTyping: boolean;
  openChat: (userIdOrConvId: string) => void;
  closeChat: () => void;
  sendMessage: (convId: string, text: string) => Promise<boolean>;
  sendMediaMessage: (
    convId: string,
    data: {
      mediaBase64: string;
      mediaType: 'image' | 'video' | 'voice' | 'document';
      fileName?: string;
      fileSize?: string;
      duration?: string | number;
      text?: string;
    }
  ) => Promise<{ success: boolean; message?: string }>;
  sendLocationMessage: (
    convId: string,
    location: LocationData
  ) => Promise<{ success: boolean; message?: string }>;
  sendTyping: (convId: string, isTyping: boolean) => void;
  refreshConversations: () => Promise<void>;
  markConversationAsRead: (convId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimerRef = useRef<any>(null);

  // 1. Fetch conversations from server
  const refreshConversations = useCallback(async () => {
    if (!currentUser?.id) {
      setConversations([]);
      return;
    }

    try {
      const res = await fetch(`/api/conversations?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
        }
      }
    } catch (err) {
      console.warn('Could not refresh conversations:', err);
    }
  }, [currentUser?.id]);

  // Mark conversation as read API helper
  const markConversationAsRead = useCallback(
    async (convId: string) => {
      if (!currentUser?.id || !convId) return;
      try {
        await fetch(`/api/conversations/${convId}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch (err) {
        console.warn('Could not mark conversation as read:', err);
      }
    },
    [currentUser?.id]
  );

  // 2. Real-Time SSE Event Stream Listener
  useEffect(() => {
    if (!currentUser?.id) return;

    refreshConversations();

    const eventSource = new EventSource(`/api/realtime/stream?userId=${currentUser.id}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // A. New Message Received
        if (payload.type === 'new_message') {
          const { message, conversationId, sender } = payload.data;

          if (activeConversation?.id === conversationId) {
            // User is actively reading this conversation -> auto mark as read
            markConversationAsRead(conversationId);
          } else {
            const preview =
              message.type === 'video'
                ? 'Sent you a video'
                : message.type === 'image'
                ? 'Sent you a photo'
                : message.type === 'voice'
                ? 'Sent you a voice note'
                : message.type === 'document'
                ? `Sent you ${message.fileName || 'a document'}`
                : message.type === 'location'
                ? 'Shared a location with you'
                : message.text?.slice(0, 40) || 'Sent you a message';

            showToast(`💬 ${sender?.fullName || 'New Message'}`, preview, 'info');
          }

          setConversations((prev) => {
            let found = false;
            const updated = prev.map((conv) => {
              if (conv.id === conversationId) {
                found = true;
                const existingMsgs = conv.messages || [];
                const msgExists = existingMsgs.some((m) => m.id === message.id);
                const newMsgs = msgExists ? existingMsgs : [...existingMsgs, message];
                return {
                  ...conv,
                  lastMessage:
                    message.type === 'video'
                      ? '🎥 Video'
                      : message.type === 'image'
                      ? '📷 Photo'
                      : message.type === 'voice'
                      ? '🎤 Voice note'
                      : message.type === 'document'
                      ? `📄 ${message.fileName || 'Document'}`
                      : message.type === 'location'
                      ? '📍 Location'
                      : message.text,
                  lastMessageType: message.type,
                  lastMessageTime: message.createdAt,
                  messages: newMsgs,
                  unreadCount: activeConversation?.id === conversationId ? 0 : conv.unreadCount + 1,
                };
              }
              return conv;
            });

            if (!found && sender) {
              refreshConversations();
            }
            return updated;
          });

          if (activeConversation?.id === conversationId) {
            setActiveConversation((prev) => {
              if (!prev) return null;
              const existingMsgs = prev.messages || [];
              if (existingMsgs.some((m) => m.id === message.id)) return prev;
              return {
                ...prev,
                messages: [...existingMsgs, message],
                lastMessage: message.text || message.type,
              };
            });
          }
        }

        // B. Real-Time Messages Delivered Event (Grey Double Tick ✓✓)
        if (payload.type === 'messages_delivered') {
          const { updates } = payload.data; // array of { conversationId, messageId, status, deliveredAt }
          if (Array.isArray(updates)) {
            const updateMap = new Map(updates.map((u: any) => [u.messageId, u]));

            setConversations((prev) =>
              prev.map((conv) => {
                if (!conv.messages) return conv;
                return {
                  ...conv,
                  messages: conv.messages.map((m) => {
                    const u = updateMap.get(m.id);
                    if (u) {
                      return { ...m, status: 'delivered', deliveredAt: u.deliveredAt };
                    }
                    return m;
                  }),
                };
              })
            );

            setActiveConversation((prev) => {
              if (!prev || !prev.messages) return prev;
              return {
                ...prev,
                messages: prev.messages.map((m) => {
                  const u = updateMap.get(m.id);
                  if (u) {
                    return { ...m, status: 'delivered', deliveredAt: u.deliveredAt };
                  }
                  return m;
                }),
              };
            });
          }
        }

        // C. Real-Time Messages Read Event (Blue / Colored Double Tick ✓✓)
        if (payload.type === 'messages_read') {
          const { conversationId, messageIds, readAt } = payload.data;
          const readSet = new Set(messageIds || []);

          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== conversationId || !conv.messages) return conv;
              return {
                ...conv,
                messages: conv.messages.map((m) => {
                  if (readSet.has(m.id) || (m.status !== 'read' && m.senderId === currentUser.id)) {
                    return { ...m, status: 'read', isRead: true, readAt };
                  }
                  return m;
                }),
              };
            })
          );

          setActiveConversation((prev) => {
            if (!prev || prev.id !== conversationId || !prev.messages) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m) => {
                if (readSet.has(m.id) || (m.status !== 'read' && m.senderId === currentUser.id)) {
                  return { ...m, status: 'read', isRead: true, readAt };
                }
                return m;
              }),
            };
          });
        }

        // D. Typing Indicator
        if (payload.type === 'user_typing') {
          const { conversationId, isTyping } = payload.data;
          if (activeConversation?.id === conversationId) {
            setIsPartnerTyping(isTyping);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            if (isTyping) {
              typingTimerRef.current = setTimeout(() => {
                setIsPartnerTyping(false);
              }, 3000);
            }
          }
        }

        // E. Friend Request Accepted
        if (payload.type === 'friend_request_accepted') {
          refreshConversations();
        }
      } catch (e) {
        console.warn('SSE parsing error:', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser?.id, activeConversation?.id, refreshConversations, showToast, markConversationAsRead]);

  const unreadCount = useMemo(() => {
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  // 3. Open Chat
  const openChat = useCallback(
    async (userIdOrConvId: string) => {
      if (!currentUser?.id) return;

      let targetConv = conversations.find(
        (c) => c.id === userIdOrConvId || c.participant?.id === userIdOrConvId
      );

      if (!targetConv) {
        targetConv = {
          id: userIdOrConvId.startsWith('conv-')
            ? userIdOrConvId
            : `conv-${[currentUser.id, userIdOrConvId].sort().join('-')}`,
          participant: {
            id: userIdOrConvId,
            fullName: 'Friend',
            username: 'friend',
            email: '',
            avatarUrl: '',
            coverUrl: '',
            bio: '',
            location: '',
            occupation: 'Member',
            joinedDate: '',
            friendsCount: 0,
            followersCount: 0,
            followingCount: 0,
            isOnline: true,
          },
          lastMessage: '',
          lastMessageTime: 'Just now',
          unreadCount: 0,
          isOnline: true,
          messages: [],
        };
        setConversations((prev) => [targetConv!, ...prev]);
      }

      if (targetConv) {
        const active = targetConv;
        setConversations((prev) =>
          prev.map((c) => (c.id === active.id ? { ...c, unreadCount: 0 } : c))
        );

        setActiveConversation(active);
        setIsChatOpen(true);

        try {
          // Fetch full conversation messages (this marks them as read on the backend)
          const res = await fetch(`/api/conversations/${active.id}/messages?userId=${currentUser.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.messages)) {
              setActiveConversation((prev) => (prev ? { ...prev, messages: data.messages } : null));
            }
          }
        } catch (err) {
          console.warn('Error fetching messages:', err);
        }
      }
    },
    [conversations, currentUser?.id]
  );

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setActiveConversation(null);
    setIsPartnerTyping(false);
  }, []);

  // 4. Send Text Message
  const sendMessage = useCallback(
    async (convId: string, text: string): Promise<boolean> => {
      if (!text.trim() || !currentUser?.id) return false;

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const optimisticMsg: Message = {
        id: `msg-${Date.now()}`,
        conversationId: convId,
        senderId: currentUser.id,
        type: 'text',
        text: text.trim(),
        createdAt: timeStr,
        status: 'sent',
        isRead: true,
      };

      setActiveConversation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          lastMessage: text.trim(),
          lastMessageTime: timeStr,
          messages: [...(prev.messages || []), optimisticMsg],
        };
      });

      try {
        const res = await fetch(`/api/conversations/${convId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({
            senderId: currentUser.id,
            text: text.trim(),
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          // Update message with REAL status from server ('sent' or 'delivered')
          setActiveConversation((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              messages: (prev.messages || []).map((m) =>
                m.id === optimisticMsg.id ? data.message : m
              ),
            };
          });
          refreshConversations();
          return true;
        } else {
          showToast('Message Blocked', data.message || 'You can only message confirmed friends.', 'error');
          return false;
        }
      } catch (err) {
        showToast('Connection Error', 'Failed to send message.', 'error');
        return false;
      }
    },
    [currentUser?.id, refreshConversations, showToast]
  );

  // 5. Send Media Message (Photos, Videos, Voice Notes, Documents)
  const sendMediaMessage = useCallback(
    async (
      convId: string,
      data: {
        mediaBase64: string;
        mediaType: 'image' | 'video' | 'voice' | 'document';
        fileName?: string;
        fileSize?: string;
        duration?: string | number;
        text?: string;
      }
    ) => {
      if (!currentUser?.id) return { success: false, message: 'Not authenticated' };

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const optimisticMsg: Message = {
        id: `msg-${Date.now()}`,
        conversationId: convId,
        senderId: currentUser.id,
        type: data.mediaType,
        mediaUrl: data.mediaBase64,
        fileName: data.fileName,
        fileSize: data.fileSize,
        duration: data.duration,
        text: data.text,
        createdAt: timeStr,
        status: 'sent',
        isRead: true,
      };

      setActiveConversation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          lastMessage:
            data.mediaType === 'video'
              ? '🎥 Video'
              : data.mediaType === 'image'
              ? '📷 Photo'
              : data.mediaType === 'voice'
              ? '🎤 Voice note'
              : `📄 ${data.fileName || 'Document'}`,
          lastMessageTime: timeStr,
          messages: [...(prev.messages || []), optimisticMsg],
        };
      });

      try {
        const res = await fetch(`/api/conversations/${convId}/messages/media`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({
            senderId: currentUser.id,
            mediaBase64: data.mediaBase64,
            mediaType: data.mediaType,
            fileName: data.fileName,
            fileSize: data.fileSize,
            duration: data.duration,
            text: data.text,
          }),
        });

        const resData = await res.json();
        if (res.ok && resData.success) {
          // Update with real server status
          setActiveConversation((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              messages: (prev.messages || []).map((m) =>
                m.id === optimisticMsg.id ? resData.message : m
              ),
            };
          });
          refreshConversations();
          showToast(
            'Delivered',
            `${
              data.mediaType === 'voice'
                ? 'Voice note'
                : data.mediaType === 'document'
                ? 'Document'
                : data.mediaType === 'video'
                ? 'Video'
                : 'Photo'
            } sent successfully.`,
            'success'
          );
          return { success: true };
        } else {
          showToast('Upload Failed', resData.message || 'Could not upload media.', 'error');
          return { success: false, message: resData.message };
        }
      } catch (err) {
        showToast('Upload Error', 'Failed to upload media.', 'error');
        return { success: false, message: 'Server upload error' };
      }
    },
    [currentUser?.id, refreshConversations, showToast]
  );

  // 6. Send Location Message
  const sendLocationMessage = useCallback(
    async (convId: string, location: LocationData) => {
      if (!currentUser?.id) return { success: false, message: 'Not authenticated' };

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const optimisticMsg: Message = {
        id: `msg-${Date.now()}`,
        conversationId: convId,
        senderId: currentUser.id,
        type: 'location',
        location,
        createdAt: timeStr,
        status: 'sent',
        isRead: true,
      };

      setActiveConversation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          lastMessage: '📍 Location shared',
          lastMessageTime: timeStr,
          messages: [...(prev.messages || []), optimisticMsg],
        };
      });

      try {
        const res = await fetch(`/api/conversations/${convId}/messages/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({
            senderId: currentUser.id,
            latitude: location.latitude,
            longitude: location.longitude,
            label: location.label,
          }),
        });

        const resData = await res.json();
        if (res.ok && resData.success) {
          // Update with real server status
          setActiveConversation((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              messages: (prev.messages || []).map((m) =>
                m.id === optimisticMsg.id ? resData.message : m
              ),
            };
          });
          refreshConversations();
          return { success: true };
        } else {
          showToast('Location Share Failed', resData.message || 'Could not share location.', 'error');
          return { success: false, message: resData.message };
        }
      } catch (err) {
        showToast('Error', 'Failed to share location.', 'error');
        return { success: false, message: 'Server error' };
      }
    },
    [currentUser?.id, refreshConversations, showToast]
  );

  // 7. Send Typing indicator
  const sendTyping = useCallback(
    (convId: string, isTyping: boolean) => {
      if (!currentUser?.id) return;
      fetch(`/api/conversations/${convId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ senderId: currentUser.id, isTyping }),
      }).catch(console.warn);
    },
    [currentUser?.id]
  );

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        isChatOpen,
        unreadCount,
        isPartnerTyping,
        openChat,
        closeChat,
        sendMessage,
        sendMediaMessage,
        sendLocationMessage,
        sendTyping,
        refreshConversations,
        markConversationAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { NotificationItem } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notif: Partial<NotificationItem>) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const getNotifKey = (userId?: string) => `nexus_notifications_user_${userId || 'guest'}`;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    if (!currentUser?.id) return [];
    try {
      const saved = localStorage.getItem(getNotifKey(currentUser.id));
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // 1. Fetch Notifications from Server Database
  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`, {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          try {
            localStorage.setItem(getNotifKey(currentUser.id), JSON.stringify(data.notifications));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    }
  }, [currentUser?.id]);

  // 2. Real-Time SSE Notification Listener
  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }

    fetchNotifications();

    const eventSource = new EventSource(`/api/realtime/stream?userId=${currentUser.id}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'new_notification' && payload.data?.notification) {
          const newNotif: NotificationItem = {
            ...payload.data.notification,
            isRead: false,
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });

          // Show Toast notification popup
          showToast(
            `🔔 ${newNotif.actor?.fullName || 'Notification'}`,
            newNotif.content,
            'info'
          );
        }
      } catch (err) {
        console.warn('Error parsing SSE notification:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser?.id, fetchNotifications, showToast]);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    if (currentUser?.id) {
      try {
        localStorage.setItem(getNotifKey(currentUser.id), JSON.stringify(notifications));
      } catch {}
    }
  }, [notifications, currentUser?.id]);

  // 3. Unread Count: Strictly count only notifications where isRead === false
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // 4. Mark Single Notification as Read (Optimistic + Server DB Persistence)
  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );

      if (currentUser?.id) {
        try {
          await fetch(`/api/notifications/${id}/read`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser.id,
            },
            body: JSON.stringify({ userId: currentUser.id }),
          });
        } catch (err) {
          console.warn('Error marking notification as read on server:', err);
        }
      }
    },
    [currentUser?.id]
  );

  // 5. Mark All Notifications as Read (Optimistic + Server DB Persistence)
  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    if (currentUser?.id) {
      try {
        await fetch('/api/notifications/read-all', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch (err) {
        console.warn('Error marking all notifications as read on server:', err);
      }
    }
  }, [currentUser?.id]);

  const addNotification = useCallback((notif: Partial<NotificationItem>) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      type: notif.type || 'like',
      actor: notif.actor || {
        id: 'user-system',
        fullName: 'Nexus System',
        username: 'nexus_system',
        email: 'system@nexus.io',
        avatarUrl: '',
        coverUrl: '',
        bio: '',
        location: '',
        occupation: '',
        joinedDate: 'Joined Today',
        friendsCount: 0,
        followersCount: 0,
        followingCount: 0,
      },
      content: notif.content || '',
      targetId: notif.targetId,
      createdAt: 'Just now',
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

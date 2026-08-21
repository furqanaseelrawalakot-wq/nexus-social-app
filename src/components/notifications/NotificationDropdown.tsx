import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, UserPlus, Sparkles, CheckCheck, X, Repeat } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { UserAvatarLink } from '../common/UserLink';

export const NotificationDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  // Auto-mark all notifications as read upon opening the dropdown (matches Instagram / Facebook UX)
  useEffect(() => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  }, [unreadCount, markAllAsRead]);

  const handleNotificationClick = (notif: any) => {
    markAsRead(notif.id);
    onClose();

    if (notif.type === 'message' || notif.type === 'friend_accept') {
      navigate('/messages');
    } else if (notif.type === 'friend_request') {
      navigate('/friends');
    } else if (notif.type === 'like' || notif.type === 'comment' || notif.type === 'share') {
      if (notif.targetId) {
        navigate(`/post/${notif.targetId}`);
      } else if (notif.actor?.username || notif.actor?.id) {
        navigate(`/profile/${notif.actor.username || notif.actor.id}`);
      }
    } else if (notif.actor?.username || notif.actor?.id) {
      navigate(`/profile/${notif.actor.username || notif.actor.id}`);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
          <p className="text-[11px] text-slate-500">Activity from your network</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            title="Mark all as read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                !notif.isRead ? 'bg-indigo-50/50' : 'bg-white'
              }`}
            >
              {/* Actor Avatar with Type Badge */}
              <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                <UserAvatarLink
                  user={notif.actor}
                  size="md"
                  onClick={onClose}
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                  {notif.type === 'like' && <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />}
                  {notif.type === 'comment' && <MessageSquare className="w-3 h-3 text-indigo-500" />}
                  {notif.type === 'friend_request' && <UserPlus className="w-3 h-3 text-emerald-500" />}
                  {notif.type === 'friend_accept' && <UserPlus className="w-3 h-3 text-emerald-500" />}
                  {notif.type === 'message' && <MessageSquare className="w-3 h-3 text-indigo-500" />}
                  {notif.type === 'share' && <Repeat className="w-3 h-3 text-indigo-500" />}
                  {notif.type === 'story' && <Sparkles className="w-3 h-3 text-amber-500" />}
                </div>
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${!notif.isRead ? 'text-slate-900 font-semibold' : 'text-slate-700 font-normal'}`}>
                  <strong className="font-bold text-slate-900">{notif.actor?.fullName || 'Someone'}</strong>{' '}
                  {notif.content}
                </p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  {notif.createdAt}
                </span>
              </div>

              {!notif.isRead && (
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200 shrink-0 mt-1.5" />
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No notifications yet.
          </div>
        )}
      </div>
    </div>
  );
};

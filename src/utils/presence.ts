/**
 * Helper to format last seen timestamp respecting user privacy settings.
 */
export const formatLastSeen = (
  lastSeen?: string | null,
  isOnline?: boolean,
  showOnlineStatus: boolean = true
): string | null => {
  // If user disabled online status privacy, hide completely
  if (!showOnlineStatus) return null;

  // If user is currently online
  if (isOnline) return 'Active now';

  if (!lastSeen) return null;

  try {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);

    if (isNaN(diffInSeconds) || diffInSeconds < 0) return null;

    if (diffInSeconds < 60) {
      return 'Active just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `Active ${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `Active ${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
      return 'Active yesterday';
    }

    if (diffInDays < 7) {
      return `Active ${diffInDays}d ago`;
    }

    return `Active on ${lastSeenDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  } catch {
    return null;
  }
};

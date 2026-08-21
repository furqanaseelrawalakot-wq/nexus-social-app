import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface UserInfo {
  id?: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isOnline?: boolean;
}

interface UserAvatarLinkProps {
  user: UserInfo;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const UserAvatarLink: React.FC<UserAvatarLinkProps> = ({
  user,
  size = 'md',
  online,
  className = '',
  onClick,
}) => {
  const target = user.username ? `/profile/${user.username}` : user.id ? `/profile/${user.id}` : '/profile';

  return (
    <Link
      to={target}
      onClick={onClick}
      className={`inline-block shrink-0 transition-transform hover:scale-105 active:scale-95 focus:outline-none ${className}`}
      title={user.fullName || user.username || 'User Profile'}
    >
      <UserAvatar
        src={user.avatarUrl}
        name={user.fullName || user.username || 'User'}
        size={size}
        online={online !== undefined ? online : user.isOnline}
      />
    </Link>
  );
};

interface UserNameLinkProps {
  user: UserInfo;
  className?: string;
  showVerified?: boolean;
  subtitle?: string | React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export const UserNameLink: React.FC<UserNameLinkProps> = ({
  user,
  className = 'text-xs font-bold text-slate-900',
  showVerified = true,
  subtitle,
  onClick,
}) => {
  const target = user.username ? `/profile/${user.username}` : user.id ? `/profile/${user.id}` : '/profile';

  return (
    <div className="inline-flex flex-col min-w-0">
      <Link
        to={target}
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-indigo-600 hover:underline transition-colors truncate focus:outline-none ${className}`}
      >
        <span className="truncate">{user.fullName || user.username || 'User'}</span>
        {showVerified && user.isVerified && (
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 fill-indigo-100 shrink-0" />
        )}
      </Link>
      {subtitle && <span className="text-[11px] text-slate-400 truncate">{subtitle}</span>}
    </div>
  );
};

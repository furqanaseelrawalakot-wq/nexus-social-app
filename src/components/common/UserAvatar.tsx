import React from 'react';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  online?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'User',
  className = '',
  size = 'md',
  online,
}) => {
  const getInitials = (fullName: string) => {
    if (!fullName || !fullName.trim()) return 'U';
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getBackgroundColor = (fullName: string) => {
    const colors = [
      'bg-indigo-600 text-white',
      'bg-violet-600 text-white',
      'bg-slate-700 text-white',
      'bg-blue-600 text-white',
      'bg-teal-600 text-white',
      'bg-emerald-600 text-white',
      'bg-rose-600 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs font-bold',
    lg: 'w-12 h-12 text-sm font-bold',
    xl: 'w-16 h-16 text-base font-bold',
    '2xl': 'w-28 h-28 sm:w-36 sm:h-36 text-2xl sm:text-3xl font-extrabold',
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    '2xl': 'w-4 h-4 bottom-2 right-2',
  };

  const hasImage = Boolean(src && src.trim().length > 0);

  return (
    <div className="relative inline-block shrink-0 select-none">
      {hasImage ? (
        <img
          src={src!}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
          onError={(e) => {
            // If image fails to load, hide image and fallback to initials
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-display tracking-wider ${getBackgroundColor(
            name
          )} ${className}`}
        >
          {getInitials(name)}
        </div>
      )}

      {online && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full bg-emerald-500 ring-2 ring-white`}
        />
      )}
    </div>
  );
};

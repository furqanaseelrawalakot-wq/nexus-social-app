import React, { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useFeed } from '../../context/FeedContext';
import { useAuth } from '../../context/AuthContext';
import { StoryViewerModal } from './StoryViewerModal';
import { StoryCreateModal } from './StoryCreateModal';
import { UserAvatar } from '../common/UserAvatar';

export const StoriesBar: React.FC = () => {
  const { storyGroups, myStories } = useFeed();
  const { currentUser } = useAuth();

  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const hasMyStories = myStories.length > 0;
  const myLatestStory = hasMyStories ? myStories[myStories.length - 1] : null;

  const friendGroups = storyGroups.filter((g) => g.author.id !== currentUser.id);

  const handleOpenMyStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasMyStories) {
      // Find index of myGroup in storyGroups
      const myIdx = storyGroups.findIndex((g) => g.author.id === currentUser.id);
      setActiveGroupIndex(myIdx !== -1 ? myIdx : 0);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleOpenFriendGroup = (groupIndex: number) => {
    setActiveGroupIndex(groupIndex);
  };

  return (
    <>
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none select-none">
        {/* 1. CURRENT USER STORY CARD (+ ADD STORY) */}
        <div
          onClick={handleOpenMyStory}
          className="relative w-24 sm:w-28 h-36 sm:h-44 rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-card hover:shadow-card-hover transition-all cursor-pointer shrink-0 flex flex-col group"
        >
          {/* Thumbnail / Avatar */}
          <div className="h-3/4 overflow-hidden bg-slate-100 flex items-center justify-center relative">
            {myLatestStory?.mediaUrl ? (
              myLatestStory.type === 'video' ? (
                <video
                  src={myLatestStory.mediaUrl}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  muted
                />
              ) : (
                <img
                  src={myLatestStory.mediaUrl}
                  alt="My story"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              )
            ) : myLatestStory?.type === 'text' ? (
              <div
                className={`w-full h-full bg-gradient-to-tr ${
                  myLatestStory.backgroundStyle || 'from-indigo-600 to-purple-600'
                } flex items-center justify-center p-2 text-center`}
              >
                <span className="text-[10px] text-white font-bold line-clamp-3">
                  {myLatestStory.textContent}
                </span>
              </div>
            ) : currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <UserAvatar name={currentUser.fullName} size="lg" />
            )}

            {/* Glowing ring if user has active stories */}
            {hasMyStories && (
              <div className="absolute inset-0 ring-3 ring-indigo-500 rounded-t-3xl pointer-events-none" />
            )}
          </div>

          {/* Bottom Label & Plus Button */}
          <div className="h-1/4 bg-white relative flex flex-col items-center justify-end pb-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateModal(true);
              }}
              className="absolute -top-3.5 w-7 h-7 rounded-full bg-indigo-600 border-2 border-white text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform"
              title="Add Story"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-bold text-slate-800 truncate px-1">
              {hasMyStories ? 'Your Story' : 'Add Story'}
            </span>
          </div>
        </div>

        {/* 2. FRIENDS WITH ACTIVE STORIES */}
        {friendGroups.map((group) => {
          const groupIndexInAll = storyGroups.findIndex((g) => g.author.id === group.author.id);
          const latest = group.stories[group.stories.length - 1];

          return (
            <div
              key={group.author.id}
              onClick={() => handleOpenFriendGroup(groupIndexInAll !== -1 ? groupIndexInAll : 0)}
              className={`relative w-24 sm:w-28 h-36 sm:h-44 rounded-3xl overflow-hidden shadow-card hover:shadow-card-hover transition-all cursor-pointer shrink-0 group ${
                group.hasUnviewed
                  ? 'ring-3 ring-offset-2 ring-indigo-500'
                  : 'ring-1 ring-slate-300 opacity-90 hover:opacity-100'
              }`}
            >
              {/* Background Thumbnail */}
              {latest?.mediaUrl ? (
                latest.type === 'video' ? (
                  <video
                    src={latest.mediaUrl}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    muted
                  />
                ) : (
                  <img
                    src={latest.mediaUrl}
                    alt={group.author.fullName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                )
              ) : latest?.type === 'text' ? (
                <div
                  className={`w-full h-full bg-gradient-to-tr ${
                    latest.backgroundStyle || 'from-indigo-600 to-purple-600'
                  } flex items-center justify-center p-3 text-center`}
                >
                  <p className="text-white text-[10px] font-bold line-clamp-4 leading-tight">
                    {latest.textContent}
                  </p>
                </div>
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <UserAvatar src={group.author.avatarUrl} name={group.author.fullName} size="lg" />
                </div>
              )}

              {/* Gradient Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

              {/* Author Avatar with Glow Ring */}
              <div className="absolute top-2 left-2">
                <UserAvatar
                  src={group.author.avatarUrl}
                  name={group.author.fullName}
                  size="xs"
                  className={`ring-2 ${
                    group.hasUnviewed ? 'ring-indigo-400 ring-offset-1' : 'ring-white/80'
                  } shadow-md`}
                />
              </div>

              {/* Author First Name at Bottom */}
              <div className="absolute bottom-2 inset-x-2">
                <p className="text-[11px] font-bold text-white drop-shadow truncate">
                  {group.author.fullName.split(' ')[0]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Story Viewer Modal */}
      {activeGroupIndex !== null && (
        <StoryViewerModal
          storyGroups={storyGroups}
          initialGroupIndex={activeGroupIndex}
          onClose={() => setActiveGroupIndex(null)}
        />
      )}

      {/* Story Create Modal */}
      <StoryCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
};

import React from 'react';
import { Bookmark, Sparkles } from 'lucide-react';
import { useFeed } from '../context/FeedContext';
import { PostCard } from '../components/feed/PostCard';

export const SavedPostsPage: React.FC = () => {
  const { savedPosts } = useFeed();

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
          <Bookmark className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Saved Posts</h1>
          <p className="text-xs text-slate-500">Your bookmarked research papers, discussions, and updates</p>
        </div>
      </div>

      {savedPosts.length > 0 ? (
        <div className="space-y-5">
          {savedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center rounded-3xl bg-white border border-slate-200 shadow-card space-y-3">
          <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No saved posts yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click the bookmark icon on any post in your feed to save it for quick reading later.
          </p>
        </div>
      )}
    </div>
  );
};

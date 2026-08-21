import React from 'react';
import { StoriesBar } from '../components/feed/StoriesBar';
import { PostComposer } from '../components/feed/PostComposer';
import { PostCard } from '../components/feed/PostCard';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useFeed } from '../context/FeedContext';
import { Sparkles, TrendingUp } from 'lucide-react';

export const FeedPage: React.FC = () => {
  const { posts } = useFeed();

  return (
    <div className="space-y-6 max-w-2xl mx-auto w-full pb-16 select-none">
      {/* 24h Stories Bar */}
      <ErrorBoundary fallbackTitle="Stories Error" fallbackMessage="Could not load stories.">
        <StoriesBar />
      </ErrorBoundary>

      {/* Post Composer */}
      <ErrorBoundary fallbackTitle="Post Composer Error" fallbackMessage="Could not load post composer. Please reload.">
        <PostComposer />
      </ErrorBoundary>

      {/* Posts Stream */}
      <ErrorBoundary fallbackTitle="Feed Posts Error" fallbackMessage="Could not render posts stream. Please reload.">
        <div className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Latest Updates</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {posts.length} Posts
            </span>
          </div>

          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </ErrorBoundary>
    </div>
  );
};

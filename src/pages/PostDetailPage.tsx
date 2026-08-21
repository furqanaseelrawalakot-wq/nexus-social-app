import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useFeed } from '../context/FeedContext';
import { PostCard } from '../components/feed/PostCard';
import { Post } from '../types';

export const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { posts } = useFeed();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPost = async () => {
      setIsLoading(true);
      const local = posts.find((p) => p.id === id);
      if (local) {
        setPost(local);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/posts/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && isMounted) {
            setPost(data.post);
          }
        }
      } catch (err) {
        console.warn('Error fetching post:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPost();
    return () => {
      isMounted = false;
    };
  }, [id, posts]);

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4 pb-20 select-none">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Feed</span>
      </Link>

      {isLoading ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="space-y-1.5 flex-1">
              <div className="w-32 h-4 bg-slate-200 rounded" />
              <div className="w-20 h-3 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="w-full h-20 bg-slate-200 rounded-2xl" />
        </div>
      ) : post ? (
        <PostCard post={post} />
      ) : (
        <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center space-y-3">
          <FileText className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-800">Post Not Found</h3>
          <p className="text-xs text-slate-400">
            This post may have been deleted or the link is invalid.
          </p>
        </div>
      )}
    </div>
  );
};

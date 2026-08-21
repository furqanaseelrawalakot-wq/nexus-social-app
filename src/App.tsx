import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FeedProvider } from './context/FeedContext';
import { ChatProvider } from './context/ChatContext';
import { NotificationProvider } from './context/NotificationContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navbar } from './components/layout/Navbar';
import { SidebarLeft } from './components/layout/SidebarLeft';
import { SidebarRight } from './components/layout/SidebarRight';
import { FloatingChatWindow } from './components/chat/FloatingChatWindow';
import { LoginPage } from './pages/LoginPage';
import { FeedPage } from './pages/FeedPage';
import { ProfilePage } from './pages/ProfilePage';
import { FriendsPage } from './pages/FriendsPage';
import { MessagesPage } from './pages/MessagesPage';
import { SavedPostsPage } from './pages/SavedPostsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { PostComposer } from './components/feed/PostComposer';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isMessagesPage = location.pathname === '/messages';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Sticky Top Navbar */}
      <Navbar onOpenCreatePost={() => setShowCreateModal(true)} />

      {/* Main 3-Column Layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Left Sidebar (Profile & Navigation) */}
        {!isMessagesPage && <SidebarLeft />}

        {/* Center Main Stream View */}
        <main className="flex-1 min-w-0">
          <ErrorBoundary fallbackTitle="Feed & Page Error" fallbackMessage="Could not display this section. Click reload to refresh.">
            <Routes>
              <Route path="/" element={<FeedPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/post/:id" element={<PostDetailPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/saved" element={<SavedPostsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>

        {/* Right Sidebar (Friend Requests & Online Contacts) */}
        {!isMessagesPage && <SidebarRight />}
      </div>

      {/* Floating 1-on-1 Direct Chat Window */}
      <FloatingChatWindow />

      {/* Quick Create Post Modal */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl animate-in zoom-in-95"
          >
            <PostComposer />
          </div>
        </div>
      )}
    </div>
  );
};

const ProtectedRoot: React.FC = () => {
  const { isAuthenticated, isLoadingAuth, currentUser } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 select-none">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 animate-pulse">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-extrabold tracking-tight">Nexus Social</h2>
          <p className="text-xs text-slate-400">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser?.id) {
    return <LoginPage />;
  }

  return (
    <ErrorBoundary fallbackTitle="Application Error" fallbackMessage="An error occurred in the application shell. Please reload.">
      <AppLayout />
    </ErrorBoundary>
  );
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <FeedProvider>
          <ChatProvider>
            <NotificationProvider>
              <BrowserRouter>
                <ProtectedRoot />
              </BrowserRouter>
            </NotificationProvider>
          </ChatProvider>
        </FeedProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AudioProvider } from './context/AudioContext';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { PlayProvider } from './context/PlayContext';
import AudioLayout from './components/layout/AudioLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute, {
  AdminRoute,
  ModeratorRoute,
  CreatorRoute,
  SessionCreatorRoute,
  VerifiedRoute,
  GuestRoute,
} from './components/auth/ProtectedRoute';
import { WordCloudOverlayPage } from './components/features';

// Page Imports
import { 
  Home, 
  Login, 
  Signup, 
  Profile,
  Library, 
  Leaderboard,
  ForgotPassword,
  ResetPassword,
  VerifyEmail,
  Sessions,
  SessionDetail,
  NotFound,
  Unauthorized,
} from './pages';

import CreateSession from './pages/CreateSession';
import EditSession from './pages/EditSession';

// Admin imports
import { AdminLayout } from './components/admin';
import {
  AdminDashboard,
  UserManagement,
  ReportsPage,
  ContentModeration,
  SessionsAdmin,
  SettingsPage as AdminSettingsPage,
  AnnouncementsPage,
  ModActionsPage,
  UserDetailPage,
  SessionDetailAdmin,
  AnalyticsPage,
  SystemLogsPage,
} from './pages/admin';

// =============================================
// PLACEHOLDER COMPONENTS
// =============================================

const Settings = () => (
  <div className="max-w-4xl mx-auto px-4 py-6">
    <h1 className="text-3xl font-bold text-gray-900 mb-4">Settings</h1>
    <p className="text-gray-600">Application settings and preferences.</p>
  </div>
);

const Subscription = () => (
  <div className="max-w-4xl mx-auto px-4 py-6">
    <h1 className="text-3xl font-bold text-gray-900 mb-4">Subscription</h1>
    <p className="text-gray-600">Manage your subscription and billing.</p>
  </div>
);

const CreatorDashboard = () => (
  <div className="max-w-4xl mx-auto px-4 py-6">
    <h1 className="text-3xl font-bold text-gray-900 mb-4">Creator Dashboard</h1>
    <p className="text-gray-600">Manage your sessions and content.</p>
  </div>
);

const ModeratorDashboard = () => (
  <div className="max-w-4xl mx-auto px-4 py-6">
    <h1 className="text-3xl font-bold text-gray-900 mb-4">Moderator Dashboard</h1>
    <p className="text-gray-600">Moderation tools and reports.</p>
  </div>
);

const Notifications = () => (
  <div className="max-w-4xl mx-auto px-4 py-6">
    <h1 className="text-3xl font-bold text-gray-900 mb-4">Notifications</h1>
    <p className="text-gray-600">Your notifications and alerts.</p>
  </div>
);

// =============================================
// MAIN COMPONENTS
// =============================================

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Main app content
function AppContent() {
  return (
    <AudioLayout>
      <Routes>
        {/* Overlay Routes */}
        <Route path="overlay/wordcloud/:id" element={<WordCloudOverlayPage />} />
        
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="unauthorized" element={<Unauthorized />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<Profile />} />
          <Route path="library" element={<Library />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="sessions/:id" element={<SessionDetail />} />
          <Route path="sessions/create" element={<CreateSession />} />
          <Route path="sessions/edit/:id" element={<EditSession />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="subscription" element={<Subscription />} />
          
          <Route 
            path="join/:code" 
            element={
              <ProtectedRoute>
                <SessionDetail joinMode />
              </ProtectedRoute>
            } 
          />
          
          <Route element={<CreatorRoute />}>
            <Route path="creator/dashboard" element={<CreatorDashboard />} />
          </Route>
          
          <Route element={<ModeratorRoute />}>
            <Route path="moderator/dashboard" element={<ModeratorDashboard />} />
            <Route path="moderator/actions" element={<ModActionsPage />} />
          </Route>
          
          <Route element={<SessionCreatorRoute />}>
            <Route path="session-creator" element={<SessionCreatorRoute />} />
          </Route>
          
          <Route element={<VerifiedRoute />}>
            <Route path="premium" element={<div>Premium Content</div>} />
          </Route>
        </Route>
        
        {/* 404 - Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AudioLayout>
  );
}

// Admin routes component
function AdminRoutes() {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <AdminRoute redirectTo="/login" unauthorizedRedirect="/unauthorized">
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
        <Route path="sessions" element={<SessionsAdmin />} />
        <Route path="sessions/:sessionId" element={<SessionDetailAdmin />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="content" element={<ContentModeration />} />
        <Route path="mod-actions" element={<ModActionsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="logs" element={<SystemLogsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}

// Main App component with all providers
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <PlayProvider>
              <ThemeProvider>
                <AudioProvider>
                  <Routes>
                    <Route path="/admin/*" element={<AdminRoutes />} />
                    <Route path="/*" element={<AppContent />} />
                  </Routes>
                  <Toaster position="top-right" />
                  <ReactQueryDevtools initialIsOpen={false} />
                </AudioProvider>
              </ThemeProvider>
            </PlayProvider>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

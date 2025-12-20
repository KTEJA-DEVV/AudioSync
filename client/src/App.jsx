import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout';
import { ProtectedRoute, WordCloudOverlayPage } from './components/features';
import { 
  Home, 
  Login, 
  Signup, 
  Profile,
  Library, 
  Leaderboard,
  ForgotPassword,
  Sessions,
  SessionDetail,
  GenerationPage,
  GranularVotingPage,
  LiveSessionPage,
  LiveSessionsListPage,
  RewardsPage,
  LibraryPage,
  SongDetailPage,
  MySongsPage,
  NotFound 
} from './pages';
import CreateSession from './pages/CreateSession';
import { PersistentPlayer } from './components/features/library';
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
} from './pages/admin';

// Placeholder pages for routes still in development
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

function App() {
  return (
    <Routes>
      {/* Overlay routes (no layout) */}
      <Route path="overlay/wordcloud/:id" element={<WordCloudOverlayPage />} />
      
      {/* Public routes with MainLayout */}
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="library/:id" element={<SongDetailPage />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        
        {/* Session routes */}
        <Route path="sessions" element={<Sessions />} />
        <Route path="session/:id" element={<SessionDetail />} />
        <Route path="session/:id/generation" element={<GenerationPage />} />
        <Route path="session/:id/granular-voting" element={<GranularVotingPage />} />
        
        {/* Live session routes */}
        <Route path="live" element={<LiveSessionsListPage />} />
        <Route path="live/:id" element={<LiveSessionPage />} />
        
        {/* Song routes */}
        <Route path="songs/:id" element={<SongDetailPage />} />
        
        {/* Profile routes - public viewing */}
        <Route path="profile/:username" element={<Profile />} />
        
        {/* Protected routes */}
        <Route 
          path="profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="create-session" 
          element={
            <ProtectedRoute requiredRole="admin">
              <CreateSession />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="subscription" 
          element={
            <ProtectedRoute>
              <Subscription />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="rewards" 
          element={
            <ProtectedRoute>
              <RewardsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="my-songs" 
          element={
            <ProtectedRoute>
              <MySongsPage />
            </ProtectedRoute>
          } 
        />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin routes with AdminLayout */}
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="content" element={<ContentModeration />} />
        <Route path="sessions" element={<SessionsAdmin />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="mod-actions" element={<ModActionsPage />} />
      </Route>
    </Routes>
  );
}

export default App;

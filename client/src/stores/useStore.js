import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

// UI Store for app-wide UI state
export const useUIStore = create((set) => ({
  isSidebarOpen: false,
  isUserDropdownOpen: false,
  isMobileMenuOpen: false,
  notification: null,
  
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  toggleUserDropdown: () => set((state) => ({ isUserDropdownOpen: !state.isUserDropdownOpen })),
  setUserDropdownOpen: (isOpen) => set({ isUserDropdownOpen: isOpen }),
  
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
  
  showNotification: (notification) => set({ notification }),
  clearNotification: () => set({ notification: null }),
}));

// Session Store for managing live session state
export const useSessionStore = create((set, get) => ({
  currentSession: null,
  participants: [],
  isLoading: false,
  error: null,
  
  setCurrentSession: (session) => set({ currentSession: session, error: null }),
  
  fetchSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/sessions/${sessionId}`);
      set({ currentSession: response.data.data.session, isLoading: false });
      return response.data.data.session;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to fetch session';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },
  
  joinSession: async (sessionId) => {
    try {
      const response = await api.post(`/sessions/${sessionId}/join`);
      set({ currentSession: response.data.data.session });
      return response.data.data.session;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to join session';
      set({ error: message });
      throw new Error(message);
    }
  },
  
  leaveSession: () => set({ currentSession: null, participants: [] }),
  
  addParticipant: (participant) => set((state) => ({
    participants: [...state.participants, participant],
  })),
  
  removeParticipant: (userId) => set((state) => ({
    participants: state.participants.filter((p) => p.id !== userId),
  })),
  
  updateParticipants: (participants) => set({ participants }),
}));

// Leaderboard Store
export const useLeaderboardStore = create((set) => ({
  leaderboard: [],
  isLoading: false,
  error: null,
  filters: {
    sortBy: 'reputation',
    timeframe: 'all',
    limit: 50,
  },
  
  fetchLeaderboard: async (options = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/users/leaderboard', { params: options });
      set({
        leaderboard: response.data.data.leaderboard,
        isLoading: false,
      });
      return response.data.data.leaderboard;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to fetch leaderboard';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },
  
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),
}));

// User preferences store with persistence
export const usePreferencesStore = create(
  persist(
    (set) => ({
      theme: 'light',
      audioQuality: 'high',
      notifications: {
        email: true,
        push: true,
        inApp: true,
      },
      
      setTheme: (theme) => set({ theme }),
      setAudioQuality: (audioQuality) => set({ audioQuality }),
      setNotifications: (notifications) => set((state) => ({
        notifications: { ...state.notifications, ...notifications },
      })),
    }),
    {
      name: 'crowdbeat-preferences',
    }
  )
);

export default {
  useUIStore,
  useSessionStore,
  useLeaderboardStore,
  usePreferencesStore,
};

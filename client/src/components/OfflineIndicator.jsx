import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiIcon, SignalSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * Offline Indicator Component
 * Shows when the user loses internet connection
 */
const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnecting, setShowReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnecting(false);
      setReconnectAttempt(0);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnecting(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic connection check when offline
  useEffect(() => {
    if (!isOnline) {
      const checkConnection = setInterval(async () => {
        try {
          const response = await fetch('/api/health', { 
            method: 'HEAD',
            cache: 'no-cache',
          });
          if (response.ok) {
            setIsOnline(true);
            setShowReconnecting(false);
          }
        } catch {
          setReconnectAttempt(prev => prev + 1);
        }
      }, 5000);

      return () => clearInterval(checkConnection);
    }
  }, [isOnline]);

  // Show "back online" toast briefly
  const [showBackOnline, setShowBackOnline] = useState(false);
  useEffect(() => {
    if (isOnline && reconnectAttempt > 0) {
      setShowBackOnline(true);
      const timer = setTimeout(() => setShowBackOnline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, reconnectAttempt]);

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white px-4 py-3 shadow-lg"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SignalSlashIcon className="w-5 h-5" />
                <div>
                  <span className="font-medium">You're offline</span>
                  <span className="hidden sm:inline text-red-200 ml-2">
                    Some features may not be available
                  </span>
                </div>
              </div>
              
              {showReconnecting && (
                <div className="flex items-center gap-2 text-sm text-red-200">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Reconnecting...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Online Toast */}
      <AnimatePresence>
        {showBackOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[9999] bg-green-600 text-white px-4 py-3 shadow-lg"
          >
            <div className="max-w-7xl mx-auto flex items-center gap-3">
              <WifiIcon className="w-5 h-5" />
              <span className="font-medium">You're back online!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Hook to check online status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

export default OfflineIndicator;


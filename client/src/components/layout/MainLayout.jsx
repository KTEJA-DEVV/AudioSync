import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import { useMediaQuery } from '../../hooks';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

const MainLayout = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const location = useLocation();
  const { theme } = useTheme();

  // Apply theme class to the root element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeInOut' }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary transition-colors duration-200">
      <Header />

      <main className="flex-1 pb-20 lg:pb-0 relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />

      {/* Mobile Bottom Navigation */}
      {!isDesktop && <MobileNav />}

      {/* Toast Notifications */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: '!bg-elevated !text-text-primary !border !border-border',
          duration: 4000,
          success: {
            iconTheme: {
              primary: 'var(--color-primary)',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-error)',
              secondary: 'white',
            },
          },
        }}
      />

      {/* Audio Player - Will be conditionally rendered */}
      {/* <AudioPlayer /> */}
    </div>
  );
};

export default MainLayout;

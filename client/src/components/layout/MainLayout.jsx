import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';
import { useMediaQuery } from '../../hooks';

const MainLayout = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>

      <Footer />

      {/* Mobile Bottom Navigation */}
      {!isDesktop && <MobileNav />}
    </div>
  );
};

export default MainLayout;

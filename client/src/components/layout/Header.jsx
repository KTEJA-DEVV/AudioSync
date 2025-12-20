import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMediaQuery } from '../../hooks';
import { Button, LiveIndicator, UserDropdown } from '../ui';
import { 
  Menu, 
  X, 
  Bell, 
  Home,
  PlusCircle,
  Radio,
  Library,
  Trophy,
  Music,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';

const Header = ({ isLive = true }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Create', path: '/create-session', icon: PlusCircle, adminOnly: true },
    { name: 'Live', path: '/live-sessions', icon: Radio },
    { name: 'Library', path: '/library', icon: Library },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-gray-900 text-xl font-bold">
              <Music className="w-8 h-8 mr-2 text-indigo-600" />
              <span className="hidden sm:inline">CrowdBeat</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {isDesktop && (
            <nav className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => {
                // Hide admin-only links from non-admins
                if (link.adminOnly && !isAdmin) return null;
                if (link.protected && !isAuthenticated) return null;
                return (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'text-indigo-600 bg-indigo-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      )
                    }
                  >
                    <link.icon className="w-4 h-4 mr-1.5" />
                    {link.name}
                  </NavLink>
                );
              })}
            </nav>
          )}

          {/* Right Side */}
          <div className="flex items-center space-x-3">
            {/* Live Indicator */}
            {isLive && (
              <LiveIndicator isActive={true} className="hidden md:flex text-sm font-medium" />
            )}

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Dropdown */}
                <UserDropdown />
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link to="/signup" className="hidden sm:block">
                  <Button variant="primary" size="sm">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            {!isDesktop && (
              <button
                onClick={toggleMobileMenu}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {!isDesktop && isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              // Hide admin-only links from non-admins
              if (link.adminOnly && !isAdmin) return null;
              if (link.protected && !isAuthenticated) return null;
              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )
                  }
                >
                  <link.icon className="w-5 h-5 mr-3" />
                  {link.name}
                </NavLink>
              );
            })}
            
            {!isAuthenticated && (
              <div className="pt-3 border-t border-gray-200 mt-3">
                <Link 
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full"
                >
                  <Button variant="primary" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

Header.propTypes = {
  isLive: PropTypes.bool,
};

export default Header;

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  PlusCircle, 
  Radio, 
  Library, 
  User,
  Trophy,
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const MobileNav = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Live', path: '/live-sessions', icon: Radio },
    { name: 'Create', path: '/create-session', icon: PlusCircle, adminOnly: true, primary: true },
    { name: 'Library', path: '/library', icon: Library },
    { name: 'Profile', path: '/profile', icon: User, protected: true },
    { name: 'Leaders', path: '/leaderboard', icon: Trophy, protected: false },
  ];

  // Filter items based on authentication and role
  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.protected && !isAuthenticated) return false;
    return true;
  }).slice(0, 5); // Only show 5 items

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 lg:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        {filteredItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center w-full h-full transition-colors',
                item.primary && 'relative',
                isActive
                  ? 'text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                {item.primary ? (
                  <div className="absolute -top-4 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <item.icon className={cn('w-6 h-6', isActive && 'text-indigo-600')} />
                )}
                <span className={cn(
                  'text-xs mt-1',
                  item.primary && 'mt-6',
                  isActive ? 'font-medium' : ''
                )}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;

import { NavLink } from 'react-router-dom';
import { 
  Home, 
  PlusCircle, 
  Radio, 
  Library, 
  Trophy, 
  Settings,
  User,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/helpers';
import { LiveIndicator, Avatar } from '../ui';

const mainNavLinks = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Create Session', path: '/create', icon: PlusCircle },
  { name: 'Live Now', path: '/live', icon: Radio, hasLiveIndicator: true },
  { name: 'Library', path: '/library', icon: Library },
  { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
];

const secondaryNavLinks = [
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Help', path: '/help', icon: HelpCircle },
];

const Sidebar = () => {
  const { user, isAuthenticated } = useAuth();
  const hasLiveSessions = true; // Example

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 h-16 border-b border-gray-200">
        <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-5 h-5 text-white"
          >
            <rect x="3" y="10" width="2.5" height="4" rx="1" fill="currentColor" />
            <rect x="7" y="7" width="2.5" height="10" rx="1" fill="currentColor" />
            <rect x="11" y="8" width="2.5" height="8" rx="1" fill="currentColor" />
            <rect x="15" y="5" width="2.5" height="14" rx="1" fill="currentColor" />
            <rect x="19" y="9" width="2.5" height="6" rx="1" fill="currentColor" />
          </svg>
        </div>
        <span className="text-xl font-bold text-gray-900">CrowdBeat</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {mainNavLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:bg-gray-50'
              )
            }
          >
            <link.icon className="w-5 h-5" />
            <span className="flex-1">{link.name}</span>
            {link.hasLiveIndicator && hasLiveSessions && (
              <LiveIndicator size="sm" />
            )}
          </NavLink>
        ))}

        <div className="pt-4 mt-4 border-t border-gray-200">
          {secondaryNavLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:bg-gray-50'
                )
              }
            >
              <link.icon className="w-5 h-5" />
              {link.name}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User section */}
      {isAuthenticated && (
        <div className="p-4 border-t border-gray-200">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Avatar src={user?.avatar} name={user?.username} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </NavLink>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;


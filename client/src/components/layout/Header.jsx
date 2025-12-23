import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Custom hook to check if screen is desktop size
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
};
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, 
  X, 
  Music, 
  Radio, 
  Library as LibraryIcon, 
  Trophy, 
  Plus, 
  User, 
  Settings, 
  LogOut,
  Shield,
  Bell,
  Home as HomeIcon,
  PlusCircle
} from 'lucide-react';
import Button from '../ui/Button';

const Header = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  // Navigation items visible to all users
  const publicNavItems = [
    { name: 'Sessions', href: '/sessions', icon: Music },
    { name: 'Live', href: '/live', icon: Radio },
    { name: 'Library', href: '/library', icon: LibraryIcon },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  ];

  // Navigation items only for admin
  const adminNavItems = [
    { name: 'Create Session', href: '/create-session', icon: Plus },
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">CrowdBeat</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {publicNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
            
            {/* Admin-only navigation items */}
            {isAdmin && adminNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side - Auth */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <img
                      src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=6366f1&color=fff`}
                      alt={user?.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {user?.displayName || user?.username}
                    </span>
                    {isAdmin && (
                      <Shield className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      {/* User Info */}
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-medium text-gray-900">{user?.displayName || user?.username}</p>
                        <p className="text-sm text-gray-500">@{user?.username}</p>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          to={`/profile/${user?._id}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </Link>
                        <Link
                          to="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          <Music className="w-4 h-4" />
                          My Contributions
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                      </div>

                      {/* Admin Menu Items */}
                      {isAdmin && (
                        <div className="py-1 border-t border-gray-100">
                          <Link
                            to="/admin"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-indigo-600 hover:bg-indigo-50"
                          >
                            <Shield className="w-4 h-4" />
                            Admin Dashboard
                          </Link>
                          <Link
                            to="/create-session"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-indigo-600 hover:bg-indigo-50"
                          >
                            <Plus className="w-4 h-4" />
                            Create Session
                          </Link>
                        </div>
                      )}

                      {/* Logout */}
                      <div className="py-1 border-t border-gray-100">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
                {mobileMenuOpen ? (
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
      {!isDesktop && mobileMenuOpen && (
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

export default Header;

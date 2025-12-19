import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  User, 
  Settings, 
  LogOut, 
  CreditCard,
  Wallet,
  Crown,
  ChevronDown,
} from 'lucide-react';
import Avatar from './Avatar';
import ReputationBadge from './ReputationBadge';
import { cn } from '../../utils/helpers';

const UserDropdown = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (!user) return null;

  const { 
    username, 
    displayName, 
    avatar, 
    reputation, 
    subscription,
    wallet,
  } = user;

  const tierLabels = {
    free: 'Free',
    supporter: 'Supporter',
    creator: 'Creator',
    pro: 'Pro',
  };

  const tierColors = {
    free: 'text-gray-500',
    supporter: 'text-emerald-600',
    creator: 'text-purple-600',
    pro: 'text-indigo-600',
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <Avatar src={avatar} name={displayName || username} size="sm" />
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900 leading-tight">
            {displayName || username}
          </p>
          <p className="text-xs text-gray-500 leading-tight capitalize">
            {reputation?.level || 'bronze'}
          </p>
        </div>
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-400 transition-transform',
          isOpen && 'transform rotate-180'
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Avatar src={avatar} name={displayName || username} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {displayName || username}
                </p>
                <p className="text-sm text-gray-500 truncate">@{username}</p>
              </div>
            </div>
            
            {/* Reputation */}
            <div className="mt-3">
              <ReputationBadge 
                level={reputation?.level || 'bronze'}
                score={reputation?.score || 0}
                showScore
                showProgress
                size="sm"
              />
            </div>
          </div>

          {/* Subscription & Wallet */}
          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            {/* Subscription */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className={cn('w-4 h-4', tierColors[subscription?.tier || 'free'])} />
                <span className="text-sm text-gray-600">Plan</span>
              </div>
              <span className={cn('text-sm font-medium', tierColors[subscription?.tier || 'free'])}>
                {tierLabels[subscription?.tier || 'free']}
              </span>
            </div>
            
            {/* Wallet Balance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Earnings</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                ${(wallet?.balance || 0).toFixed(2)}
              </span>
            </div>
            
            {wallet?.pendingEarnings > 0 && (
              <p className="text-xs text-gray-500 text-right">
                +${wallet.pendingEarnings.toFixed(2)} pending
              </p>
            )}
          </div>

          {/* Navigation Links */}
          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Your Profile</span>
            </Link>
            
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
            
            <Link
              to="/subscription"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Subscription</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;


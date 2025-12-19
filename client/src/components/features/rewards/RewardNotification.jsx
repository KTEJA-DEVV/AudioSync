import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaMedal, FaCoins, FaDollarSign, FaGift, FaTimes } from 'react-icons/fa';

const RewardNotification = ({ reward, onClose, autoClose = true, autoCloseDelay = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for exit animation
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getRewardConfig = (type, currency) => {
    const typeConfigs = {
      'lyrics-winner': { icon: FaTrophy, label: 'Lyrics Winner!', color: 'text-yellow-500', bgGradient: 'from-yellow-400 to-amber-500' },
      'stem-accepted': { icon: FaMedal, label: 'Stem Accepted!', color: 'text-blue-500', bgGradient: 'from-blue-400 to-indigo-500' },
      'competition-winner': { icon: FaTrophy, label: 'Competition Winner!', color: 'text-purple-500', bgGradient: 'from-purple-400 to-pink-500' },
      'badge-earned': { icon: FaMedal, label: 'New Badge!', color: 'text-green-500', bgGradient: 'from-green-400 to-emerald-500' },
      'tip-received': { icon: FaGift, label: 'Tip Received!', color: 'text-pink-500', bgGradient: 'from-pink-400 to-rose-500' },
      'level-up': { icon: FaTrophy, label: 'Level Up!', color: 'text-indigo-500', bgGradient: 'from-indigo-400 to-purple-500' },
      'streak': { icon: FaCoins, label: 'Streak Bonus!', color: 'text-orange-500', bgGradient: 'from-orange-400 to-red-500' },
    };

    const currencyIcons = {
      reputation: '✨',
      tokens: '🪙',
      usd: '$',
    };

    return {
      ...(typeConfigs[type] || { icon: FaGift, label: 'Reward!', color: 'text-primary-500', bgGradient: 'from-primary-400 to-primary-600' }),
      currencyIcon: currencyIcons[currency] || '🎁',
    };
  };

  const config = getRewardConfig(reward.type, reward.currency);
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 right-4 z-50 max-w-sm w-full"
        >
          <div className={`relative bg-gradient-to-r ${config.bgGradient} rounded-xl shadow-2xl overflow-hidden`}>
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-white/30 rounded-full"
                  initial={{ 
                    x: Math.random() * 100 + '%', 
                    y: '100%', 
                    opacity: 0.5 
                  }}
                  animate={{ 
                    y: '-20%', 
                    opacity: 0,
                    transition: { 
                      duration: 2 + Math.random() * 2, 
                      repeat: Infinity, 
                      delay: Math.random() * 2 
                    }
                  }}
                />
              ))}
            </div>

            <div className="relative p-4">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4">
                {/* Icon with glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-md"></div>
                  <div className="relative bg-white/20 rounded-full p-3">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <motion.h3
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg font-bold text-white"
                  >
                    {config.label}
                  </motion.h3>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-2xl font-bold text-white">
                      {config.currencyIcon}
                      {reward.currency === 'usd' ? reward.amount.toFixed(2) : reward.amount.toLocaleString()}
                    </span>
                    <span className="text-white/80 text-sm">
                      {reward.currency.toUpperCase()}
                    </span>
                  </motion.div>
                  {reward.description && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/80 text-sm mt-1"
                    >
                      {reward.description}
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Progress bar for auto-close */}
              {autoClose && (
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: autoCloseDelay / 1000, ease: 'linear' }}
                  className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 origin-left"
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

RewardNotification.propTypes = {
  reward: PropTypes.shape({
    type: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
    currency: PropTypes.oneOf(['reputation', 'tokens', 'usd']).isRequired,
    description: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  autoClose: PropTypes.bool,
  autoCloseDelay: PropTypes.number,
};

export default RewardNotification;


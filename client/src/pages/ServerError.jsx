import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HomeIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const ServerError = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full text-center"
      >
        {/* 500 Visual */}
        <div className="relative mb-8">
          <div className="text-[150px] sm:text-[200px] font-bold text-gray-100 dark:text-gray-800 leading-none select-none">
            500
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <ExclamationCircleIcon className="w-12 h-12 text-white" />
            </div>
          </motion.div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Server Error
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Something went wrong on our end. Our team has been notified and we're working to fix it. 
          Please try again in a few moments.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Try Again
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            <HomeIcon className="w-5 h-5" />
            Go Home
          </Link>
        </div>

        {/* Status */}
        <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Status:</strong> We're experiencing temporary issues. 
            Please check back in a few minutes.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ServerError;


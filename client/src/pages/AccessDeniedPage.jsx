import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

const AccessDeniedPage = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <ShieldX className="w-24 h-24 text-red-500 mb-6" />
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        You don't have permission to access this page. This area is restricted to administrators only.
      </p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Go Home
        </Link>
        <Link
          to="/sessions"
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Browse Sessions
        </Link>
      </div>
    </div>
  );
};

export default AccessDeniedPage;

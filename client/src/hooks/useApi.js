import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const request = useCallback(async (method, url, data = null, options = {}) => {
    const { requiredPermission, onForbidden, showErrorToast = true } = options;
    
    // Check permission before making request (client-side pre-check)
    if (requiredPermission && !hasPermission(requiredPermission)) {
      const errorMsg = 'You do not have permission to perform this action';
      if (showErrorToast) {
        toast.error(errorMsg);
      }
      if (onForbidden) {
        onForbidden();
      } else {
        navigate('/access-denied');
      }
      return { success: false, error: errorMsg };
    }

    setLoading(true);
    setError(null);

    try {
      const config = { method, url };
      if (data) {
        if (method === 'get') {
          config.params = data;
        } else {
          config.data = data;
        }
      }

      const response = await api(config);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An error occurred';
      setError(errorMessage);
      
      // Handle 403 specifically
      if (err.response?.status === 403) {
        if (onForbidden) {
          onForbidden();
        }
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [hasPermission, navigate]);

  const get = useCallback((url, params, options) => 
    request('get', url, params, options), [request]);
    
  const post = useCallback((url, data, options) => 
    request('post', url, data, options), [request]);
    
  const put = useCallback((url, data, options) => 
    request('put', url, data, options), [request]);
    
  const del = useCallback((url, options) => 
    request('delete', url, null, options), [request]);

  return {
    loading,
    error,
    get,
    post,
    put,
    delete: del,
    request
  };
};

export default useApi;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, User, Mail, Shield, Edit, Save, X, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const UserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'user',
    isActive: true
  });

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await api.get(`/admin/users/${userId}`);
        // setUser(response.data);
        
        // Mock data
        setTimeout(() => {
          setUser({
            id: userId,
            username: 'johndoe',
            email: 'john@example.com',
            role: 'user',
            isActive: true,
            createdAt: '2023-01-15T10:30:00Z',
            lastLogin: new Date().toISOString(),
            stats: {
              sessions: 12,
              contributions: 45,
              reports: 2
            }
          });
          setFormData({
            username: 'johndoe',
            email: 'john@example.com',
            role: 'user',
            isActive: true
          });
          setLoading(false);
        }, 500);
      } catch (err) {
        setError('Failed to load user data');
        console.error('Error fetching user:', err);
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      // TODO: Replace with actual API call
      // await api.put(`/admin/users/${userId}`, formData);
      setUser(prev => ({
        ...prev,
        ...formData
      }));
      toast.success('User updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to update user');
      console.error('Error updating user:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        // TODO: Replace with actual API call
        // await api.delete(`/admin/users/${userId}`);
        toast.success('User deleted successfully');
        navigate('/admin/users');
      } catch (err) {
        toast.error('Failed to delete user');
        console.error('Error deleting user:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium text-foreground">User not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">The requested user could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="-ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
          <h1 className="mt-2 text-2xl font-bold">User Details</h1>
        </div>
        
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">{user.username}</h2>
              <div className="mt-1 flex items-center text-sm text-muted-foreground">
                <Mail className="mr-1.5 h-4 w-4" />
                {user.email}
              </div>
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Shield className="mr-1.5 h-3.5 w-3.5" />
                {user.role}
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-muted-foreground">Account Status</h3>
              <div className="mt-1 flex items-center">
                <div className={`h-2.5 w-2.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <span className="text-sm">{user.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              
              <h3 className="mt-4 text-sm font-medium text-muted-foreground">Member Since</h3>
              <p className="mt-1 text-sm">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
              
              <h3 className="mt-4 text-sm font-medium text-muted-foreground">Last Login</h3>
              <p className="mt-1 text-sm">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
              </p>
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">User Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Username
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-foreground">{user.username}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-foreground">{user.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Role
                </label>
                {isEditing ? (
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="user">User</option>
                    <option value="creator">Creator</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Administrator</option>
                  </select>
                ) : (
                  <p className="text-foreground capitalize">{user.role}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Status
                </label>
                {isEditing ? (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-foreground">
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className={`h-2.5 w-2.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                    <span className="text-foreground">{user.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">User Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Sessions</p>
                <p className="text-2xl font-semibold">{user.stats?.sessions || 0}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Contributions</p>
                <p className="text-2xl font-semibold">{user.stats?.contributions || 0}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Reports</p>
                <p className="text-2xl font-semibold">{user.stats?.reports || 0}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserDetailPage;

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Camera, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../ui';
import { cn } from '../../utils/helpers';

const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 
  'Classical', 'Country', 'Folk', 'Indie', 'Metal', 'Punk',
  'Soul', 'Funk', 'Reggae', 'Blues', 'Latin', 'World',
];

const EditProfileModal = ({ isOpen, onClose, profile, onUpdate }) => {
  const { updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    avatar: '',
    coverImage: '',
    userType: 'casual',
    socialLinks: {
      twitter: '',
      instagram: '',
      soundcloud: '',
      spotify: '',
    },
    favoriteGenres: [],
  });

  // Initialize form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
        coverImage: profile.coverImage || '',
        userType: profile.userType || 'casual',
        socialLinks: {
          twitter: profile.socialLinks?.twitter || '',
          instagram: profile.socialLinks?.instagram || '',
          soundcloud: profile.socialLinks?.soundcloud || '',
          spotify: profile.socialLinks?.spotify || '',
        },
        favoriteGenres: profile.preferences?.favoriteGenres || [],
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSocialLinkChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [name]: value,
      },
    }));
  };

  const toggleGenre = (genre) => {
    setFormData((prev) => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(genre)
        ? prev.favoriteGenres.filter((g) => g !== genre)
        : [...prev.favoriteGenres, genre].slice(0, 5), // Max 5 genres
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const updateData = {
        displayName: formData.displayName,
        bio: formData.bio,
        avatar: formData.avatar,
        coverImage: formData.coverImage,
        userType: formData.userType,
        socialLinks: formData.socialLinks,
      };

      const updatedUser = await updateProfile(updateData);
      onUpdate(updatedUser);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avatar URL
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <Input
                  name="avatar"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={formData.avatar}
                  onChange={handleChange}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Image URL
              </label>
              <div className="relative h-24 rounded-lg bg-gray-200 overflow-hidden mb-2">
                {formData.coverImage ? (
                  <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Upload className="w-8 h-8" />
                  </div>
                )}
              </div>
              <Input
                name="coverImage"
                type="url"
                placeholder="https://example.com/cover.jpg"
                value={formData.coverImage}
                onChange={handleChange}
              />
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Display Name
              </label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                placeholder="Your display name"
                value={formData.displayName}
                onChange={handleChange}
                maxLength={50}
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                placeholder="Tell others about yourself..."
                value={formData.bio}
                onChange={handleChange}
                maxLength={500}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
              />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {formData.bio.length}/500
              </p>
            </div>

            {/* User Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'casual', label: 'Casual' },
                  { value: 'technical', label: 'Technical' },
                  { value: 'creator', label: 'Creator' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, userType: option.value }))}
                    className={cn(
                      'py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
                      formData.userType === option.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Genres */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Favorite Genres (max 5)
              </label>
              <div className="flex flex-wrap gap-2">
                {GENRE_OPTIONS.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm transition-all',
                      formData.favoriteGenres.includes(genre)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Social Links
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Twitter Username</label>
                  <Input
                    name="twitter"
                    type="text"
                    placeholder="username"
                    value={formData.socialLinks.twitter}
                    onChange={handleSocialLinkChange}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Instagram Username</label>
                  <Input
                    name="instagram"
                    type="text"
                    placeholder="username"
                    value={formData.socialLinks.instagram}
                    onChange={handleSocialLinkChange}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">SoundCloud URL</label>
                  <Input
                    name="soundcloud"
                    type="url"
                    placeholder="https://soundcloud.com/username"
                    value={formData.socialLinks.soundcloud}
                    onChange={handleSocialLinkChange}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Spotify Artist URL</label>
                  <Input
                    name="spotify"
                    type="url"
                    placeholder="https://open.spotify.com/artist/..."
                    value={formData.socialLinks.spotify}
                    onChange={handleSocialLinkChange}
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

EditProfileModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  profile: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
};

export default EditProfileModal;


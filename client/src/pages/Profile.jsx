import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Avatar, ReputationBadge, Button, Badge } from '../components/ui';
import EditProfileModal from '../components/features/EditProfileModal';
import api from '../services/api';
import { 
  Edit, 
  Music, 
  ThumbsUp, 
  Users, 
  DollarSign,
  Calendar,
  ExternalLink,
  Twitter,
  Instagram,
} from 'lucide-react';
import { cn } from '../utils/helpers';

const StatCard = ({ icon: Icon, label, value, color = 'text-gray-600' }) => (
  <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
    <Icon className={cn('w-6 h-6 mx-auto mb-2', color)} />
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);

const BadgeDisplay = ({ badge }) => (
  <div 
    className="flex-shrink-0 flex flex-col items-center p-3 bg-white rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
    title={badge.description}
  >
    <span className="text-2xl mb-1">{badge.icon}</span>
    <span className="text-xs font-medium text-gray-700 text-center">{badge.name}</span>
    <span className={cn(
      'text-xs mt-1 capitalize',
      badge.rarity === 'common' && 'text-gray-500',
      badge.rarity === 'rare' && 'text-blue-500',
      badge.rarity === 'epic' && 'text-purple-500',
      badge.rarity === 'legendary' && 'text-amber-500'
    )}>
      {badge.rarity}
    </span>
  </div>
);

const Profile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);

  const isOwnProfile = !username || username === currentUser?.username;

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (isOwnProfile && currentUser) {
          setProfile(currentUser);
        } else if (username) {
          const response = await api.get(`/users/username/${username}`);
          setProfile(response.data.data.user);
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username, isOwnProfile, currentUser]);

  // Fetch recent activity
  useEffect(() => {
    const fetchActivity = async () => {
      if (!profile?.id) return;
      
      try {
        const response = await api.get(`/users/${profile.id}/contributions?limit=5`);
        setRecentActivity(response.data.data.contributions || []);
      } catch (err) {
        // Ignore errors for activity feed
      }
    };

    if (profile) {
      fetchActivity();
    }
  }, [profile?.id]);

  const handleProfileUpdate = (updatedUser) => {
    setProfile((prev) => ({ ...prev, ...updatedUser }));
    setIsEditModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link to="/">
          <Button variant="primary">Go Home</Button>
        </Link>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const {
    displayName,
    username: profileUsername,
    avatar,
    coverImage,
    bio,
    reputation,
    stats,
    socialLinks,
    createdAt,
  } = profile;

  const badges = reputation?.badges || [];
  const memberSince = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 lg:pb-6">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600">
        {coverImage && (
          <img 
            src={coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Profile Header */}
      <div className="relative px-4 md:px-6">
        {/* Avatar */}
        <div className="absolute -top-16">
          <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <Avatar name={displayName || profileUsername} size="lg" className="w-full h-full text-3xl" />
            )}
          </div>
        </div>

        {/* Edit Button */}
        {isOwnProfile && (
          <div className="absolute right-0 top-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        )}

        {/* Profile Info */}
        <div className="pt-20 pb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {displayName || profileUsername}
              </h1>
              <p className="text-gray-500">@{profileUsername}</p>
              
              {/* Reputation Badge */}
              <div className="mt-3">
                <ReputationBadge 
                  level={reputation?.level || 'bronze'}
                  score={reputation?.score || 0}
                  showScore
                  showProgress
                  size="md"
                />
              </div>
            </div>

            {/* Social Links */}
            {socialLinks && (
              <div className="flex items-center gap-3 mt-4 md:mt-0">
                {socialLinks.twitter && (
                  <a 
                    href={`https://twitter.com/${socialLinks.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a 
                    href={`https://instagram.com/${socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-pink-500 transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.soundcloud && (
                  <a 
                    href={socialLinks.soundcloud}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Bio */}
          {bio && (
            <p className="mt-4 text-gray-600 max-w-2xl">{bio}</p>
          )}

          {/* Member Since */}
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Member since {memberSince}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-0 mb-6">
        <StatCard 
          icon={Music} 
          label="Contributions" 
          value={stats?.songsContributed || 0}
          color="text-indigo-600"
        />
        <StatCard 
          icon={ThumbsUp} 
          label="Votes Cast" 
          value={stats?.votesCast || 0}
          color="text-emerald-600"
        />
        <StatCard 
          icon={Users} 
          label="Sessions" 
          value={stats?.sessionsAttended || 0}
          color="text-purple-600"
        />
        <StatCard 
          icon={DollarSign} 
          label="Earnings" 
          value={`$${(stats?.totalEarnings || 0).toFixed(0)}`}
          color="text-amber-600"
        />
      </div>

      {/* Badges Section */}
      {badges.length > 0 && (
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Badges</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6">
            {badges.map((badge, index) => (
              <BadgeDisplay key={badge.badgeId || index} badge={badge} />
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div 
                key={activity._id || index}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Music className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title || 'Contribution'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activity.session?.title || 'Session'} • {activity.type}
                  </p>
                </div>
                <Badge variant={activity.status === 'accepted' ? 'success' : 'default'}>
                  {activity.status || 'pending'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No activity yet. Start contributing to sessions!
          </p>
        )}
      </Card>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default Profile;


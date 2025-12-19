import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Hook for checking user permissions based on role, subscription, and reputation
 */
export const usePermissions = () => {
  const { user, isAuthenticated } = useAuth();

  const permissions = useMemo(() => {
    if (!isAuthenticated || !user) {
      return {
        // Voting
        canVote: false,
        voteWeight: 0,
        
        // Content creation
        canSubmit: false,
        canUploadAudio: false,
        canCreateSession: false,
        
        // Moderation
        canModerate: false,
        canBan: false,
        canDeleteContent: false,
        
        // Admin
        isAdmin: false,
        
        // Subscription features
        hasUnlimitedContributions: false,
        hasPriorityQueue: false,
        hasAnalytics: false,
        hasApiAccess: false,
        
        // User info
        role: null,
        tier: 'free',
        level: 'bronze',
      };
    }

    const { role, subscription, reputation, emailVerified } = user;
    const tier = subscription?.tier || 'free';
    const level = reputation?.level || 'bronze';
    const voteWeight = reputation?.voteWeight || 1;

    // Role checks
    const isAdmin = role === 'admin';
    const isModerator = role === 'moderator' || isAdmin;
    const isCreator = role === 'creator' || isModerator;

    // Subscription tier checks
    const isSupporter = ['supporter', 'creator', 'pro'].includes(tier);
    const isCreatorTier = ['creator', 'pro'].includes(tier);
    const isPro = tier === 'pro';

    return {
      // Voting - requires verified email
      canVote: emailVerified,
      voteWeight: emailVerified ? voteWeight : 0,
      
      // Content creation
      canSubmit: emailVerified,
      canUploadAudio: emailVerified && (isCreatorTier || isCreator),
      canCreateSession: emailVerified && (isCreatorTier || isCreator),
      
      // Moderation
      canModerate: isModerator,
      canBan: isAdmin,
      canDeleteContent: isModerator,
      
      // Admin
      isAdmin,
      isModerator,
      isCreator,
      
      // Subscription features
      hasUnlimitedContributions: isSupporter,
      hasPriorityQueue: isSupporter,
      hasAnalytics: isPro,
      hasApiAccess: isPro,
      
      // User info
      role,
      tier,
      level,
      emailVerified,
    };
  }, [user, isAuthenticated]);

  return permissions;
};

export default usePermissions;


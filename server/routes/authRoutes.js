const express = require('express');
const router = express.Router();

// =============================================
// CONTROLLER IMPORTS
// =============================================

const {
  // Public auth
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  
  // Private auth
  getMe,
  updateMe,
  updatePassword,
  resendVerification,
  refreshToken,
  
  // Permission checks
  checkAdmin,
  getPermissions,
  
  // Admin functions
  updateUserRole,
  getAllUsers,
  deactivateUser,
  reactivateUser,
  getAdminStats,
} = require('../controllers/authController');

// =============================================
// MIDDLEWARE IMPORTS
// =============================================

const {
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireModerator,
  authorize,
} = require('../middleware/auth');

const { applyRateLimiting } = require('../middleware/rateLimiter');

// =============================================
// RATE LIMITING CONFIGURATION
// =============================================

/**
 * Stricter rate limiting for sensitive auth endpoints
 * These have lower limits to prevent brute force attacks
 */
const strictRateLimiting = applyRateLimiting;

// =============================================
// PUBLIC ROUTES (No authentication required)
// =============================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { username, email, password, displayName?, userType?, role?, adminSecretKey? }
 */
router.post('/register', strictRateLimiting, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', strictRateLimiting, login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password', strictRateLimiting, forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @body    { token, password }
 */
router.post('/reset-password', strictRateLimiting, resetPassword);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 * @body    { token }
 */
router.post('/verify-email', verifyEmail);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email with token (GET version for email links)
 * @access  Public
 */
router.get('/verify-email/:token', async (req, res, next) => {
  // Convert GET request to work with existing controller
  req.body.token = req.params.token;
  return verifyEmail(req, res, next);
});

// =============================================
// AUTHENTICATED ROUTES (All logged-in users)
// =============================================

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate token
 * @access  Private
 */
router.post('/logout', requireAuth, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', requireAuth, getMe);

/**
 * @route   PUT /api/auth/me
 * @desc    Update current user's profile
 * @access  Private
 * @body    { displayName?, bio?, avatar?, coverImage?, userType?, socialLinks?, preferences? }
 */
router.put('/me', requireAuth, updateMe);

/**
 * @route   PUT /api/auth/update-password
 * @desc    Update current user's password
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.put('/update-password', requireAuth, strictRateLimiting, updatePassword);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification
 * @access  Private
 */
router.post('/resend-verification', requireAuth, strictRateLimiting, resendVerification);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh-token', requireAuth, refreshToken);

// =============================================
// PERMISSION CHECK ROUTES
// =============================================

/**
 * @route   GET /api/auth/check-admin
 * @desc    Check if current user is admin
 * @access  Private
 */
router.get('/check-admin', requireAuth, checkAdmin);

/**
 * @route   GET /api/auth/permissions
 * @desc    Get current user's permissions
 * @access  Private
 */
router.get('/permissions', requireAuth, getPermissions);

/**
 * @route   GET /api/auth/check-auth
 * @desc    Check if user is authenticated (lightweight endpoint)
 * @access  Private
 */
router.get('/check-auth', requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      authenticated: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        role: req.user.role,
      },
    },
  });
});

/**
 * @route   GET /api/auth/session
 * @desc    Get current session info (user + permissions)
 * @access  Private
 */
router.get('/session', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatarUrl,
          role: user.role,
          roleDisplayName: user.roleDisplayName,
          emailVerified: user.emailVerified,
          subscription: {
            tier: user.subscription?.tier || 'free',
            validUntil: user.subscription?.validUntil,
          },
        },
        permissions: {
          canCreateSession: user.canCreateSession,
          canManageSessions: user.canManageSessions,
          canModerate: user.canModerate,
          isAdmin: user.role === 'admin',
          isCreator: ['admin', 'moderator', 'creator'].includes(user.role),
          isModerator: ['admin', 'moderator'].includes(user.role),
        },
        currentSession: user.currentSession || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching session info',
    });
  }
});

// =============================================
// ADMIN ROUTES (Admin role only)
// =============================================

/**
 * @route   GET /api/auth/admin/stats
 * @desc    Get admin statistics
 * @access  Private (Admin only)
 */
router.get('/admin/stats', requireAuth, requireAdmin, getAdminStats);

/**
 * @route   GET /api/auth/users
 * @desc    Get all users with pagination and filters
 * @access  Private (Admin only)
 * @query   { page?, limit?, role?, search?, sortBy?, sortOrder?, isActive? }
 */
router.get('/users', requireAuth, requireAdmin, getAllUsers);

/**
 * @route   GET /api/auth/users/:userId
 * @desc    Get specific user by ID
 * @access  Private (Admin only)
 */
router.get('/users/:userId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.userId)
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/auth/users/:userId/role
 * @desc    Update user's role
 * @access  Private (Admin only)
 * @body    { role: 'user' | 'creator' | 'moderator' | 'admin' }
 */
router.put('/users/:userId/role', requireAuth, requireAdmin, updateUserRole);

/**
 * @route   PUT /api/auth/users/:userId/deactivate
 * @desc    Deactivate user account
 * @access  Private (Admin only)
 */
router.put('/users/:userId/deactivate', requireAuth, requireAdmin, deactivateUser);

/**
 * @route   PUT /api/auth/users/:userId/reactivate
 * @desc    Reactivate user account
 * @access  Private (Admin only)
 */
router.put('/users/:userId/reactivate', requireAuth, requireAdmin, reactivateUser);

/**
 * @route   PUT /api/auth/users/:userId
 * @desc    Update user details (admin)
 * @access  Private (Admin only)
 * @body    { displayName?, bio?, role?, userType?, isActive? }
 */
router.put('/users/:userId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { userId } = req.params;
    const { displayName, bio, role, userType, isActive, subscription } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Prevent self-demotion
    if (userId === req.user._id.toString() && role && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot demote yourself',
      });
    }
    
    // Update allowed fields
    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (role !== undefined) user.role = role;
    if (userType !== undefined) user.userType = userType;
    if (isActive !== undefined) user.isActive = isActive;
    if (subscription !== undefined) {
      user.subscription = { ...user.subscription, ...subscription };
    }
    
    await user.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          userType: user.userType,
          isActive: user.isActive,
          subscription: user.subscription,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/auth/users/:userId
 * @desc    Delete user account (hard delete)
 * @access  Private (Admin only)
 */
router.delete('/users/:userId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { userId } = req.params;
    
    // Prevent self-deletion
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Prevent deleting other admins unless you're a super admin
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete administrator accounts. Deactivate them instead.',
      });
    }
    
    await User.findByIdAndDelete(userId);
    
    // TODO: Clean up user's related data (sessions, submissions, votes, etc.)
    // This should be done carefully or via a background job
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/admin/creators
 * @desc    Get users who can create sessions (admin, moderator, creator)
 * @access  Private (Admin only)
 */
router.get('/admin/creators', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const creators = await User.find({
      role: { $in: ['admin', 'moderator', 'creator'] },
      isActive: true,
    })
      .select('username displayName email avatar role stats.sessionsCreated stats.sessionsHosted createdAt')
      .sort({ 'stats.sessionsCreated': -1 })
      .lean();
    
    res.status(200).json({
      success: true,
      data: {
        creators,
        count: creators.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/admin/create-user
 * @desc    Create a new user with specified role (admin only)
 * @access  Private (Admin only)
 * @body    { username, email, password, displayName?, role?, userType? }
 */
router.post('/admin/create-user', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const crypto = require('crypto');
    
    const { username, email, password, displayName, role, userType } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required',
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Username already taken',
      });
    }
    
    // Create user
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      displayName: displayName || username,
      role: role || 'user',
      userType: userType || 'casual',
      emailVerified: true, // Admin-created users are pre-verified
      isActive: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          userType: user.userType,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/admin/bulk-update-roles
 * @desc    Update roles for multiple users
 * @access  Private (Admin only)
 * @body    { userIds: string[], role: string }
 */
router.post('/admin/bulk-update-roles', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { userIds, role } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required',
      });
    }
    
    if (!role || !['user', 'creator', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role is required',
      });
    }
    
    // Prevent self-demotion
    if (userIds.includes(req.user._id.toString()) && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot demote yourself',
      });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { role } }
    );
    
    res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} users to ${role} role`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================
// MODERATOR ROUTES (Admin or Moderator role)
// =============================================

/**
 * @route   GET /api/auth/moderator/users
 * @desc    Get users list (limited info for moderators)
 * @access  Private (Admin or Moderator)
 */
router.get('/moderator/users', requireAuth, requireModerator, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { page = 1, limit = 20, search, role } = req.query;
    
    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('username displayName avatar role reputation.level reputation.score stats createdAt lastActiveAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================
// PUBLIC USER LOOKUP ROUTES
// =============================================

/**
 * @route   GET /api/auth/profile/:username
 * @desc    Get public profile by username
 * @access  Public
 */
router.get('/profile/:username', optionalAuth, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ 
      username: req.params.username.toLowerCase(),
      isActive: true,
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        profile: user.toPublicProfile(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/check-username/:username
 * @desc    Check if username is available
 * @access  Public
 */
router.get('/check-username/:username', async (req, res, next) => {
  try {
    const User = require('../models/User');
    const exists = await User.usernameExists(req.params.username);
    
    res.status(200).json({
      success: true,
      data: {
        available: !exists,
        username: req.params.username.toLowerCase(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/check-email/:email
 * @desc    Check if email is registered
 * @access  Public
 */
router.get('/check-email/:email', async (req, res, next) => {
  try {
    const User = require('../models/User');
    const exists = await User.emailExists(req.params.email);
    
    res.status(200).json({
      success: true,
      data: {
        registered: exists,
        email: req.params.email.toLowerCase(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================
// EXPORT ROUTER
// =============================================

module.exports = router;
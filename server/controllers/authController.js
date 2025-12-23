const crypto = require('crypto');
const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const { cache } = require('../config/redis');
const User = require('../models/User');
const config = require('../config');

// Token blacklist key prefix
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Generate user response object with permissions
 * @param {Object} user - User document
 * @param {boolean} includePrivate - Include private fields like email
 * @returns {Object} Formatted user object
 */
const formatUserResponse = (user, includePrivate = true) => {
  const baseResponse = {
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatarUrl,
    coverImage: user.coverImage,
    bio: user.bio,
    role: user.role,
    roleDisplayName: user.roleDisplayName,
    userType: user.userType,
    stats: user.stats,
    reputation: user.reputation,
    socialLinks: user.socialLinks,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
    // Permission flags for frontend role-based UI
    permissions: {
      canCreateSession: user.canCreateSession,
      canManageSessions: user.canManageSessions,
      canModerate: user.canModerate,
      isAdmin: user.role === 'admin',
      isCreator: ['admin', 'moderator', 'creator'].includes(user.role),
      isModerator: ['admin', 'moderator'].includes(user.role),
    },
  };

  if (includePrivate) {
    return {
      ...baseResponse,
      email: user.email,
      preferences: user.preferences,
      subscription: user.subscription,
      wallet: {
        balance: user.wallet?.balance || 0,
        pendingEarnings: user.wallet?.pendingEarnings || 0,
        tokenBalance: user.wallet?.tokenBalance || 0,
      },
    };
  }

  return baseResponse;
};

/**
 * Send token response with cookie
 * @param {Object} user - User document
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @param {string} message - Response message
 */
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.generateToken();

  // Cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + (config.jwtCookieExpire || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      data: {
        user: formatUserResponse(user),
        token,
      },
    });
};

// =============================================
// AUTHENTICATION CONTROLLERS
// =============================================

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res, next) => {
  const { username, email, password, displayName, userType, role } = req.body;

  // Validate required fields
  if (!username || !email || !password) {
    return next(new AppError('Please provide username, email, and password', 400, ErrorCodes.MISSING_FIELD));
  }

  // Validate password strength
  if (password.length < 8) {
    return next(new AppError('Password must be at least 8 characters', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Validate username format
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return next(new AppError('Username can only contain letters, numbers, and underscores', 400, ErrorCodes.VALIDATION_ERROR));
  }

  if (username.length < 3 || username.length > 20) {
    return next(new AppError('Username must be between 3 and 20 characters', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Validate email format
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return next(new AppError('Please provide a valid email address', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Check for existing user
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      return next(new AppError('Email already registered', 400, ErrorCodes.ALREADY_EXISTS));
    }
    return next(new AppError('Username already taken', 400, ErrorCodes.ALREADY_EXISTS));
  }

  // Determine user role
  // By default, users register as 'user' role
  // Admin/moderator/creator roles can be set during registration for development
  // In production, you might want to restrict this or use a separate admin creation flow
  let userRole = 'user';
  
  if (role && ['user', 'creator', 'moderator', 'admin'].includes(role)) {
    // In production, you might want to add additional verification for admin/moderator roles
    // For example, require an admin secret key or invitation code
    if (role === 'admin' || role === 'moderator') {
      // Check for admin secret key in production
      const adminSecretKey = req.body.adminSecretKey || req.headers['x-admin-secret'];
      
      if (config.nodeEnv === 'production' && config.adminSecretKey) {
        if (adminSecretKey !== config.adminSecretKey) {
          // In production, don't allow admin/moderator registration without secret key
          userRole = 'user';
        } else {
          userRole = role;
        }
      } else {
        // In development, allow role selection
        userRole = role;
      }
    } else {
      userRole = role;
    }
  }

  // Generate email verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create user
  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    displayName: displayName || username,
    userType: userType || 'casual',
    role: userRole,
    emailVerificationToken,
    emailVerificationExpires,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    isActive: true,
    lastLoginAt: new Date(),
  });

  // TODO: Send welcome email with verification link
  // await sendEmail({
  //   to: user.email,
  //   subject: 'Welcome to AudioSync! Verify your email',
  //   template: 'welcome',
  //   data: { 
  //     username: user.username, 
  //     verificationLink: `${config.clientUrl}/verify-email?token=${emailVerificationToken}` 
  //   }
  // });

  // Send response with token
  sendTokenResponse(user, 201, res, 'Registration successful! Please check your email to verify your account.');
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400, ErrorCodes.MISSING_FIELD));
  }

  // Find user and include password
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    return next(new AppError('Invalid email or password', 401, ErrorCodes.INVALID_CREDENTIALS));
  }

  // Check if user account is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 401, ErrorCodes.UNAUTHORIZED));
  }

  // Check password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return next(new AppError('Invalid email or password', 401, ErrorCodes.INVALID_CREDENTIALS));
  }

  // Update last active and online status
  user.lastActiveAt = new Date();
  user.lastLoginAt = new Date();
  user.isOnline = true;
  await user.save({ validateBeforeSave: false });

  // Send response with token
  sendTokenResponse(user, 200, res, 'Login successful');
});

// @desc    Logout user (invalidate token)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

  if (token) {
    // Add token to blacklist in Redis (expires when token would expire)
    try {
      const decoded = require('jsonwebtoken').decode(token);
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        
        if (ttl > 0) {
          await cache.set(`${TOKEN_BLACKLIST_PREFIX}${token}`, 'blacklisted', ttl);
        }
      }
    } catch (err) {
      // Ignore token decode errors during logout
      console.error('Error blacklisting token:', err.message);
    }
  }

  // Update user online status
  if (req.user) {
    await User.findByIdAndUpdate(req.userId, {
      isOnline: false,
      lastActiveAt: new Date(),
      currentSession: undefined, // Clear current session on logout
    });
  }

  // Clear cookie
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    data: {
      user: formatUserResponse(user),
    },
  });
});

// @desc    Update current user profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = asyncHandler(async (req, res, next) => {
  const allowedFields = [
    'displayName',
    'bio',
    'avatar',
    'coverImage',
    'userType',
    'socialLinks',
    'preferences',
  ];

  // Filter out non-allowed fields
  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Validate displayName if provided
  if (updates.displayName && updates.displayName.length > 50) {
    return next(new AppError('Display name cannot exceed 50 characters', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Validate bio if provided
  if (updates.bio && updates.bio.length > 500) {
    return next(new AppError('Bio cannot exceed 500 characters', 400, ErrorCodes.VALIDATION_ERROR));
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    updates,
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: formatUserResponse(user),
    },
  });
});

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
const updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current and new password', 400, ErrorCodes.MISSING_FIELD));
  }

  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Get user with password
  const user = await User.findById(req.userId).select('+password');

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect', 401, ErrorCodes.INVALID_CREDENTIALS));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Send new token
  sendTokenResponse(user, 200, res, 'Password updated successfully');
});

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide an email address', 400, ErrorCodes.MISSING_FIELD));
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Save to user
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save({ validateBeforeSave: false });

  // TODO: Send reset email
  // const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
  // await sendEmail({
  //   to: user.email,
  //   subject: 'AudioSync Password Reset',
  //   template: 'passwordReset',
  //   data: { resetUrl, username: user.username }
  // });

  res.status(200).json({
    success: true,
    message: 'If an account exists with this email, a password reset link has been sent.',
    // For development, include the token
    ...(config.nodeEnv === 'development' && { resetToken }),
  });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new AppError('Please provide token and new password', 400, ErrorCodes.MISSING_FIELD));
  }

  if (password.length < 8) {
    return next(new AppError('Password must be at least 8 characters', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Hash the token to match stored version
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return next(new AppError('Invalid or expired reset token', 400, ErrorCodes.INVALID_TOKEN));
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Send new token
  sendTokenResponse(user, 200, res, 'Password reset successful');
});

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('Verification token is required', 400, ErrorCodes.MISSING_FIELD));
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    return next(new AppError('Invalid or expired verification token', 400, ErrorCodes.INVALID_TOKEN));
  }

  // Verify email
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  
  // Award reputation for verifying email
  user.reputation.score += 10;
  
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully!',
    data: {
      user: formatUserResponse(user),
    },
  });
});

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (user.emailVerified) {
    return next(new AppError('Email is already verified', 400, ErrorCodes.CONFLICT));
  }

  // Generate new verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = emailVerificationToken;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  // TODO: Send verification email
  // const verifyUrl = `${config.clientUrl}/verify-email?token=${emailVerificationToken}`;
  // await sendEmail({ ... });

  res.status(200).json({
    success: true,
    message: 'Verification email sent',
    // For development
    ...(config.nodeEnv === 'development' && { emailVerificationToken }),
  });
});

// =============================================
// ADMIN CONTROLLERS
// =============================================

// @desc    Check if user is admin
// @route   GET /api/auth/check-admin
// @access  Private
const checkAdmin = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      isAdmin: req.user.role === 'admin',
      role: req.user.role,
      permissions: {
        canCreateSession: req.user.canCreateSession,
        canManageSessions: req.user.canManageSessions,
        canModerate: req.user.canModerate,
      },
    },
  });
});

// @desc    Get user permissions
// @route   GET /api/auth/permissions
// @access  Private
const getPermissions = asyncHandler(async (req, res) => {
  const user = req.user;

  // Get all permissions for the user
  const permissions = {
    // Session permissions
    canCreateSession: user.canCreateSession,
    canManageSessions: user.canManageSessions,
    canModerate: user.canModerate,
    
    // Role-based permissions
    isAdmin: user.role === 'admin',
    isCreator: ['admin', 'moderator', 'creator'].includes(user.role),
    isModerator: ['admin', 'moderator'].includes(user.role),
    
    // Specific action permissions
    actions: {
      createSession: user.hasPermission('create_session'),
      deleteSession: user.hasPermission('delete_session'),
      manageSession: user.hasPermission('manage_session'),
      startSession: user.hasPermission('start_session'),
      endSession: user.hasPermission('end_session'),
      addSongs: user.hasPermission('add_songs'),
      removeSongs: user.hasPermission('remove_songs'),
      kickParticipant: user.hasPermission('kick_participant'),
      viewAnalytics: user.hasPermission('view_analytics'),
      manageUsers: user.hasPermission('manage_users'),
      vote: user.hasPermission('vote'),
      joinSession: user.hasPermission('join_session'),
      submitFeedback: user.hasPermission('submit_feedback'),
      requestSongs: user.hasPermission('request_songs'),
    },
    
    // Subscription tier
    subscription: {
      tier: user.subscription?.tier || 'free',
      validUntil: user.subscription?.validUntil,
    },
  };

  res.status(200).json({
    success: true,
    data: {
      role: user.role,
      roleDisplayName: user.roleDisplayName,
      permissions,
    },
  });
});

// @desc    Admin: Update user role
// @route   PUT /api/auth/users/:userId/role
// @access  Private/Admin
const updateUserRole = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;

  // Validate role
  if (!role || !['user', 'creator', 'moderator', 'admin'].includes(role)) {
    return next(new AppError('Please provide a valid role (user, creator, moderator, admin)', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Find target user
  const targetUser = await User.findById(userId);

  if (!targetUser) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Prevent self-demotion for admins
  if (targetUser._id.toString() === req.userId && role !== 'admin') {
    return next(new AppError('You cannot demote yourself', 400, ErrorCodes.FORBIDDEN));
  }

  // Update role
  targetUser.role = role;
  await targetUser.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `User role updated to ${role}`,
    data: {
      user: {
        id: targetUser._id,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        roleDisplayName: targetUser.roleDisplayName,
      },
    },
  });
});

// @desc    Admin: Get all users
// @route   GET /api/auth/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    role,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isActive,
  } = req.query;

  // Build query
  const query = {};

  if (role) {
    query.role = role;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
    ];
  }

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [users, total] = await Promise.all([
    User.find(query)
      .select('username email displayName avatar role userType isActive emailVerified stats reputation createdAt lastActiveAt')
      .sort(sortOptions)
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
});

// @desc    Admin: Deactivate user
// @route   PUT /api/auth/users/:userId/deactivate
// @access  Private/Admin
const deactivateUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (userId === req.userId) {
    return next(new AppError('You cannot deactivate your own account', 400, ErrorCodes.FORBIDDEN));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  user.isActive = false;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully',
  });
});

// @desc    Admin: Reactivate user
// @route   PUT /api/auth/users/:userId/reactivate
// @access  Private/Admin
const reactivateUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  user.isActive = true;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'User reactivated successfully',
  });
});

// @desc    Admin: Get admin statistics
// @route   GET /api/auth/admin/stats
// @access  Private/Admin
const getAdminStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    adminCount,
    creatorCount,
    moderatorCount,
    verifiedUsers,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'creator' }),
    User.countDocuments({ role: 'moderator' }),
    User.countDocuments({ emailVerified: true }),
    User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  // Get users by role
  const usersByRole = {
    admin: adminCount,
    moderator: moderatorCount,
    creator: creatorCount,
    user: totalUsers - adminCount - moderatorCount - creatorCount,
  };

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      verifiedUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
      recentUsers,
      usersByRole,
      sessionCreators: adminCount + moderatorCount + creatorCount,
    },
  });
});

// =============================================
// TOKEN UTILITIES
// =============================================

// @desc    Check if token is blacklisted
const isTokenBlacklisted = async (token) => {
  try {
    const blacklisted = await cache.get(`${TOKEN_BLACKLIST_PREFIX}${token}`);
    return !!blacklisted;
  } catch (err) {
    // If Redis is not available, assume token is not blacklisted
    console.error('Error checking token blacklist:', err.message);
    return false;
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Private
const refreshToken = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!user.isActive) {
    return next(new AppError('Account is deactivated', 401, ErrorCodes.UNAUTHORIZED));
  }

  // Generate new token
  sendTokenResponse(user, 200, res, 'Token refreshed successfully');
});

// =============================================
// EXPORTS
// =============================================

module.exports = {
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
  
  // Utilities
  isTokenBlacklisted,
  formatUserResponse,
};
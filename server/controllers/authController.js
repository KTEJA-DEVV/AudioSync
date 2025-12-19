const crypto = require('crypto');
const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const { cache } = require('../config/redis');
const User = require('../models/User');
const config = require('../config');

// Token blacklist key prefix
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res, next) => {
  const { username, email, password, displayName, userType } = req.body;

  // Validate required fields
  if (!username || !email || !password) {
    return next(new AppError('Please provide username, email, and password', 400, ErrorCodes.MISSING_FIELD));
  }

  // Validate password strength
  if (password.length < 8) {
    return next(new AppError('Password must be at least 8 characters', 400, ErrorCodes.VALIDATION_ERROR));
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
    emailVerificationToken,
    emailVerificationExpires,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
  });

  // Generate JWT token
  const token = user.generateToken();

  // TODO: Send welcome email with verification link
  // await sendEmail({
  //   to: user.email,
  //   subject: 'Welcome to CrowdBeat! Verify your email',
  //   template: 'welcome',
  //   data: { username: user.username, verificationLink: `${config.clientUrl}/verify-email?token=${emailVerificationToken}` }
  // });

  // Return user data (without password)
  res.status(201).json({
    success: true,
    message: 'Registration successful! Please check your email to verify your account.',
    data: {
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatarUrl,
        role: user.role,
        userType: user.userType,
        reputation: user.reputation,
        emailVerified: user.emailVerified,
      },
      token,
    },
  });
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

  // Check password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return next(new AppError('Invalid email or password', 401, ErrorCodes.INVALID_CREDENTIALS));
  }

  // Update last active
  user.lastActiveAt = new Date();
  user.isOnline = true;
  await user.save({ validateBeforeSave: false });

  // Generate token
  const token = user.generateToken();

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatarUrl,
        coverImage: user.coverImage,
        bio: user.bio,
        role: user.role,
        userType: user.userType,
        stats: user.stats,
        reputation: user.reputation,
        preferences: user.preferences,
        subscription: user.subscription,
        wallet: {
          balance: user.wallet.balance,
          pendingEarnings: user.wallet.pendingEarnings,
        },
        socialLinks: user.socialLinks,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      token,
    },
  });
});

// @desc    Logout user (invalidate token)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    // Add token to blacklist in Redis (expires when token would expire)
    const decoded = require('jsonwebtoken').decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (ttl > 0) {
      await cache.set(`${TOKEN_BLACKLIST_PREFIX}${token}`, 'blacklisted', ttl);
    }
  }

  // Update user online status
  if (req.user) {
    await User.findByIdAndUpdate(req.userId, {
      isOnline: false,
      lastActiveAt: new Date(),
    });
  }

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
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatarUrl,
        coverImage: user.coverImage,
        bio: user.bio,
        role: user.role,
        userType: user.userType,
        stats: user.stats,
        reputation: user.reputation,
        preferences: user.preferences,
        subscription: user.subscription,
        wallet: {
          balance: user.wallet.balance,
          pendingEarnings: user.wallet.pendingEarnings,
          tokenBalance: user.wallet.tokenBalance,
        },
        socialLinks: user.socialLinks,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
      },
    },
  });
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
  //   subject: 'CrowdBeat Password Reset',
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

  // Generate new token
  const newToken = user.generateToken();

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    data: { token: newToken },
  });
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

// @desc    Check if token is blacklisted
const isTokenBlacklisted = async (token) => {
  const blacklisted = await cache.get(`${TOKEN_BLACKLIST_PREFIX}${token}`);
  return !!blacklisted;
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  isTokenBlacklisted,
};

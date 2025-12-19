/**
 * Reward Service for CrowdBeat
 * Manages rewards, earnings, and payouts
 */

const Reward = require('../models/Reward');
const User = require('../models/User');
const Tip = require('../models/Tip');
const { emitToRoom } = require('../config/socket');
const { addReputation, REPUTATION_VALUES } = require('./reputationService');

// Reward amounts for different types
const REWARD_AMOUNTS = {
  'lyrics-winner': { reputation: 50, tokens: 10 },
  'stem-accepted': { reputation: 10, tokens: 2 },
  'top-voter': { reputation: 25, tokens: 5 },
  'streak': { reputation: 10, tokens: 1 },
  'badge-earned': { reputation: 10, tokens: 0 },
  'competition-winner': { reputation: 100, tokens: 25 },
  'referral': { reputation: 25, tokens: 10 },
  'tip-received': { reputation: 5, tokens: 0 },
  'session-host': { reputation: 20, tokens: 5 },
  'daily-bonus': { reputation: 5, tokens: 1 },
};

// Minimum payout threshold
const MINIMUM_PAYOUT = {
  tokens: 50,
  usd: 10,
};

/**
 * Create a reward for user
 */
const createReward = async (userId, type, amount, currency = 'reputation', source = {}, description = null) => {
  const reward = await Reward.create({
    user: userId,
    type,
    amount,
    currency,
    source,
    description: description || getDefaultDescription(type, amount, currency),
    status: currency === 'reputation' ? 'credited' : 'pending',
    creditedAt: currency === 'reputation' ? new Date() : null,
  });

  // If reputation, apply immediately
  if (currency === 'reputation') {
    await addReputation(userId, amount, type, source, description);
  }

  // Emit reward earned event
  emitToRoom(userId.toString(), 'reward:earned', {
    type,
    amount,
    currency,
    description: reward.description,
  });

  return reward;
};

/**
 * Create standard reward based on type
 */
const createStandardReward = async (userId, type, source = {}, description = null) => {
  const amounts = REWARD_AMOUNTS[type];
  if (!amounts) {
    throw new Error(`Unknown reward type: ${type}`);
  }

  const rewards = [];

  // Create reputation reward
  if (amounts.reputation > 0) {
    const repReward = await createReward(
      userId,
      type,
      amounts.reputation,
      'reputation',
      source,
      description
    );
    rewards.push(repReward);
  }

  // Create token reward
  if (amounts.tokens > 0) {
    const tokenReward = await createReward(
      userId,
      type,
      amounts.tokens,
      'tokens',
      source,
      description
    );
    rewards.push(tokenReward);
  }

  return rewards;
};

/**
 * Get default description for reward type
 */
const getDefaultDescription = (type, amount, currency) => {
  const descriptions = {
    'lyrics-winner': 'Your lyrics won the session vote!',
    'stem-accepted': 'Your stem was accepted and used in the song',
    'top-voter': 'Reward for being an active voter',
    'streak': 'Activity streak bonus',
    'badge-earned': 'Bonus for earning a badge',
    'competition-winner': 'You won a competition!',
    'referral': 'Referral bonus',
    'tip-received': 'Received a tip from another user',
    'session-host': 'Thank you for hosting a session',
    'daily-bonus': 'Daily login bonus',
    'royalty': 'Royalty share from song revenue',
  };

  return descriptions[type] || `Earned ${amount} ${currency}`;
};

/**
 * Claim pending rewards
 */
const claimReward = async (rewardId, userId) => {
  const reward = await Reward.findOne({ _id: rewardId, user: userId });
  if (!reward) {
    throw new Error('Reward not found');
  }

  if (reward.status !== 'pending') {
    throw new Error('Reward already claimed or processed');
  }

  // Credit the reward
  await reward.credit();

  // Update user's balance
  const user = await User.findById(userId);
  if (reward.currency === 'tokens') {
    user.wallet.tokenBalance += reward.amount;
  } else if (reward.currency === 'usd') {
    user.wallet.balance += reward.amount;
  }
  await user.save();

  return reward;
};

/**
 * Process all pending rewards (batch job)
 */
const processRewards = async () => {
  const pendingRewards = await Reward.find({
    status: 'pending',
    createdAt: { $lt: new Date(Date.now() - 60000) }, // At least 1 minute old
  });

  const results = [];

  for (const reward of pendingRewards) {
    try {
      const user = await User.findById(reward.user);
      if (!user) continue;

      // Credit based on currency
      if (reward.currency === 'tokens') {
        user.wallet.tokenBalance += reward.amount;
      } else if (reward.currency === 'usd') {
        user.wallet.pendingEarnings += reward.amount;
      }
      
      await user.save();
      await reward.credit();
      
      results.push({ rewardId: reward._id, status: 'credited' });
    } catch (error) {
      results.push({ rewardId: reward._id, status: 'failed', error: error.message });
    }
  }

  return results;
};

/**
 * Get user's earnings summary
 */
const getEarningsSummary = async (userId) => {
  const user = await User.findById(userId).select('wallet stats');
  if (!user) throw new Error('User not found');

  const rewardSummary = await Reward.getEarningsSummary(userId);
  const tipTotals = await Tip.getTotals(userId);

  return {
    wallet: {
      balance: user.wallet.balance,
      tokenBalance: user.wallet.tokenBalance,
      pendingEarnings: user.wallet.pendingEarnings,
    },
    total: rewardSummary.total,
    pending: rewardSummary.pending,
    credited: rewardSummary.credited,
    byType: rewardSummary.byType,
    tips: tipTotals,
    canWithdraw: {
      tokens: user.wallet.tokenBalance >= MINIMUM_PAYOUT.tokens,
      usd: user.wallet.balance >= MINIMUM_PAYOUT.usd,
    },
    minimumPayout: MINIMUM_PAYOUT,
  };
};

/**
 * Calculate contributor share for a song
 */
const calculateContributorShare = async (songId, totalRevenue) => {
  // This would be more complex in production
  // For now, simple split based on contribution type
  const shares = {
    lyricsWriter: 0.30,  // 30% to lyrics
    stemContributors: 0.40, // 40% split among stem contributors
    host: 0.20, // 20% to host
    platform: 0.10, // 10% platform fee
  };

  // Get song and contributors
  const Song = require('../models/Song');
  const song = await Song.findById(songId)
    .populate('lyrics')
    .populate('contributors.user');

  if (!song) throw new Error('Song not found');

  const distribution = [];

  // Lyrics writer
  if (song.lyrics?.author) {
    distribution.push({
      userId: song.lyrics.author,
      share: shares.lyricsWriter,
      amount: totalRevenue * shares.lyricsWriter,
      type: 'royalty',
      description: 'Lyrics royalty',
    });
  }

  // Stem contributors
  const stemContributors = song.contributors.filter(c => 
    ['stems', 'producer', 'mixer'].includes(c.contributionType)
  );
  if (stemContributors.length > 0) {
    const perContributor = (totalRevenue * shares.stemContributors) / stemContributors.length;
    for (const contrib of stemContributors) {
      distribution.push({
        userId: contrib.user._id || contrib.user,
        share: shares.stemContributors / stemContributors.length,
        amount: perContributor,
        type: 'royalty',
        description: `${contrib.contributionType} royalty`,
      });
    }
  }

  return distribution;
};

/**
 * Distribute royalties for a song
 */
const distributeRoyalties = async (songId, totalRevenue) => {
  const distribution = await calculateContributorShare(songId, totalRevenue);
  const results = [];

  for (const dist of distribution) {
    const reward = await createReward(
      dist.userId,
      'royalty',
      dist.amount,
      'usd',
      { songId },
      dist.description
    );
    results.push(reward);
  }

  return results;
};

/**
 * Request payout
 */
const requestPayout = async (userId, currency, amount) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  let balance;
  if (currency === 'tokens') {
    balance = user.wallet.tokenBalance;
  } else if (currency === 'usd') {
    balance = user.wallet.balance;
  } else {
    throw new Error('Invalid currency');
  }

  if (balance < amount) {
    throw new Error('Insufficient balance');
  }

  if (amount < MINIMUM_PAYOUT[currency]) {
    throw new Error(`Minimum payout is ${MINIMUM_PAYOUT[currency]} ${currency.toUpperCase()}`);
  }

  // Deduct from balance
  if (currency === 'tokens') {
    user.wallet.tokenBalance -= amount;
  } else {
    user.wallet.balance -= amount;
  }
  await user.save();

  // Create payout record (would integrate with payment provider)
  const payout = await Reward.create({
    user: userId,
    type: 'royalty',
    amount: -amount, // Negative for payout
    currency,
    description: `Payout of ${amount} ${currency.toUpperCase()}`,
    status: 'pending', // Would be updated when payment clears
  });

  return {
    payout,
    newBalance: currency === 'tokens' ? user.wallet.tokenBalance : user.wallet.balance,
  };
};

module.exports = {
  createReward,
  createStandardReward,
  claimReward,
  processRewards,
  getEarningsSummary,
  calculateContributorShare,
  distributeRoyalties,
  requestPayout,
  REWARD_AMOUNTS,
  MINIMUM_PAYOUT,
};


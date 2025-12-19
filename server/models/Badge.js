const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema(
  {
    badgeId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 50,
    },
    description: {
      type: String,
      required: true,
      maxlength: 200,
    },
    icon: {
      type: String, // URL or emoji
      required: true,
    },
    category: {
      type: String,
      enum: ['participation', 'quality', 'streak', 'milestone', 'special', 'community'],
      default: 'participation',
    },
    criteria: {
      type: {
        type: String,
        enum: ['count', 'threshold', 'special', 'streak', 'unique'],
        required: true,
      },
      field: String, // e.g., 'stats.songsContributed', 'reputation.score'
      value: mongoose.Schema.Types.Mixed, // threshold value
      customCheck: String, // Name of custom check function
    },
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    earnedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
badgeSchema.index({ category: 1, sortOrder: 1 });
badgeSchema.index({ rarity: 1 });
badgeSchema.index({ isActive: 1 });

// Virtual for percentage of users who have it
badgeSchema.virtual('earnedPercentage').get(function() {
  // This would need total user count passed in
  return 0;
});

// Static to get all active badges
badgeSchema.statics.getActive = function() {
  return this.find({ isActive: true }).sort('sortOrder').lean();
};

// Static to get badges by category
badgeSchema.statics.getByCategory = function(category) {
  return this.find({ isActive: true, category }).sort('sortOrder').lean();
};

// Static to increment earned count
badgeSchema.statics.incrementEarnedCount = async function(badgeId) {
  return this.findOneAndUpdate(
    { badgeId },
    { $inc: { earnedCount: 1 } },
    { new: true }
  );
};

// Seed default badges
badgeSchema.statics.seedDefaultBadges = async function() {
  const defaultBadges = [
    // Participation badges
    { badgeId: 'first-session', name: 'First Steps', description: 'Attended your first session', icon: '🎵', category: 'participation', criteria: { type: 'count', field: 'stats.sessionsAttended', value: 1 }, rarity: 'common' },
    { badgeId: 'first-lyrics', name: 'Wordsmith', description: 'Submitted your first lyrics', icon: '✍️', category: 'participation', criteria: { type: 'count', field: 'stats.lyricsAccepted', value: 1 }, rarity: 'common' },
    { badgeId: 'first-stem', name: 'Producer', description: 'Contributed your first stem', icon: '🎹', category: 'participation', criteria: { type: 'count', field: 'stats.stemsAccepted', value: 1 }, rarity: 'common' },
    { badgeId: 'first-vote', name: 'Voice Heard', description: 'Cast your first vote', icon: '🗳️', category: 'participation', criteria: { type: 'count', field: 'stats.votesCast', value: 1 }, rarity: 'common' },
    
    // Milestone badges
    { badgeId: '10-songs', name: 'Contributor', description: 'Contributed to 10 songs', icon: '🎼', category: 'milestone', criteria: { type: 'threshold', field: 'stats.songsContributed', value: 10 }, rarity: 'uncommon' },
    { badgeId: '50-songs', name: 'Prolific', description: 'Contributed to 50 songs', icon: '🎸', category: 'milestone', criteria: { type: 'threshold', field: 'stats.songsContributed', value: 50 }, rarity: 'rare' },
    { badgeId: '100-songs', name: 'Maestro', description: 'Contributed to 100 songs', icon: '🎻', category: 'milestone', criteria: { type: 'threshold', field: 'stats.songsContributed', value: 100 }, rarity: 'epic' },
    { badgeId: '100-votes', name: 'Engaged', description: 'Cast 100 votes', icon: '📊', category: 'milestone', criteria: { type: 'threshold', field: 'stats.votesCast', value: 100 }, rarity: 'uncommon' },
    { badgeId: '1000-votes', name: 'Democracy Champion', description: 'Cast 1000 votes', icon: '🏛️', category: 'milestone', criteria: { type: 'threshold', field: 'stats.votesCast', value: 1000 }, rarity: 'rare' },
    
    // Quality badges
    { badgeId: 'lyrics-winner', name: 'Winning Words', description: 'Had your lyrics selected for a song', icon: '🏆', category: 'quality', criteria: { type: 'special', customCheck: 'hasWonLyrics' }, rarity: 'uncommon' },
    { badgeId: '5x-winner', name: 'Hit Maker', description: 'Won 5 lyrics competitions', icon: '⭐', category: 'quality', criteria: { type: 'threshold', field: 'stats.lyricsWon', value: 5 }, rarity: 'rare' },
    { badgeId: 'stem-master', name: 'Stem Master', description: 'Had 10 stems accepted', icon: '🎛️', category: 'quality', criteria: { type: 'threshold', field: 'stats.stemsAccepted', value: 10 }, rarity: 'rare' },
    
    // Streak badges
    { badgeId: '7-day-streak', name: 'Week Warrior', description: '7 day activity streak', icon: '🔥', category: 'streak', criteria: { type: 'streak', field: 'currentStreak', value: 7 }, rarity: 'uncommon' },
    { badgeId: '30-day-streak', name: 'Dedicated', description: '30 day activity streak', icon: '💪', category: 'streak', criteria: { type: 'streak', field: 'currentStreak', value: 30 }, rarity: 'rare' },
    { badgeId: '100-day-streak', name: 'Unstoppable', description: '100 day activity streak', icon: '⚡', category: 'streak', criteria: { type: 'streak', field: 'currentStreak', value: 100 }, rarity: 'epic' },
    
    // Reputation level badges
    { badgeId: 'level-bronze', name: 'Bronze', description: 'Reached Bronze reputation level', icon: '🥉', category: 'milestone', criteria: { type: 'threshold', field: 'reputation.score', value: 100 }, rarity: 'common' },
    { badgeId: 'level-silver', name: 'Silver', description: 'Reached Silver reputation level', icon: '🥈', category: 'milestone', criteria: { type: 'threshold', field: 'reputation.score', value: 500 }, rarity: 'uncommon' },
    { badgeId: 'level-gold', name: 'Gold', description: 'Reached Gold reputation level', icon: '🥇', category: 'milestone', criteria: { type: 'threshold', field: 'reputation.score', value: 2000 }, rarity: 'rare' },
    { badgeId: 'level-platinum', name: 'Platinum', description: 'Reached Platinum reputation level', icon: '💎', category: 'milestone', criteria: { type: 'threshold', field: 'reputation.score', value: 5000 }, rarity: 'epic' },
    { badgeId: 'level-diamond', name: 'Diamond', description: 'Reached Diamond reputation level', icon: '💠', category: 'milestone', criteria: { type: 'threshold', field: 'reputation.score', value: 10000 }, rarity: 'legendary' },
    
    // Community badges
    { badgeId: 'helpful', name: 'Helpful', description: 'Gave constructive feedback that was appreciated', icon: '🤝', category: 'community', criteria: { type: 'threshold', field: 'stats.helpfulFeedback', value: 10 }, rarity: 'uncommon' },
    { badgeId: 'generous', name: 'Generous', description: 'Tipped other users', icon: '💝', category: 'community', criteria: { type: 'count', field: 'stats.tipsSent', value: 1 }, rarity: 'uncommon' },
    { badgeId: 'patron', name: 'Patron', description: 'Sent 10+ tips', icon: '👑', category: 'community', criteria: { type: 'threshold', field: 'stats.tipsSent', value: 10 }, rarity: 'rare' },
    
    // Special badges
    { badgeId: 'early-adopter', name: 'Early Adopter', description: 'Joined during beta', icon: '🚀', category: 'special', criteria: { type: 'special', customCheck: 'isEarlyAdopter' }, rarity: 'legendary' },
    { badgeId: 'verified-artist', name: 'Verified Artist', description: 'Verified professional musician', icon: '✅', category: 'special', criteria: { type: 'special', customCheck: 'isVerifiedArtist' }, rarity: 'legendary' },
  ];
  
  for (const badge of defaultBadges) {
    await this.findOneAndUpdate(
      { badgeId: badge.badgeId },
      badge,
      { upsert: true, new: true }
    );
  }
  
  console.log(`Seeded ${defaultBadges.length} default badges`);
};

module.exports = mongoose.model('Badge', badgeSchema);


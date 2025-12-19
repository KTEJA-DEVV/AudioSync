const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    category: {
      type: String,
      enum: ['general', 'sessions', 'voting', 'rewards', 'moderation', 'features', 'limits'],
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    valueType: {
      type: String,
      enum: ['boolean', 'number', 'string', 'array', 'object'],
      required: true,
    },
    // For number types
    min: Number,
    max: Number,
    // For select types
    options: [String],
    // For validation
    required: { type: Boolean, default: false },
    // Visibility
    public: { type: Boolean, default: false }, // If true, exposed to all users
    // Audit
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index
systemSettingSchema.index({ category: 1, key: 1 });

// Static: Get all settings
systemSettingSchema.statics.getAllSettings = async function () {
  return this.find({})
    .populate('updatedBy', 'username displayName')
    .sort({ category: 1, key: 1 })
    .lean();
};

// Static: Get settings by category
systemSettingSchema.statics.getByCategory = async function (category) {
  return this.find({ category })
    .populate('updatedBy', 'username displayName')
    .sort({ key: 1 })
    .lean();
};

// Static: Get public settings (for frontend)
systemSettingSchema.statics.getPublicSettings = async function () {
  const settings = await this.find({ public: true }).lean();
  const result = {};
  settings.forEach(s => {
    result[s.key] = s.value;
  });
  return result;
};

// Static: Get setting value
systemSettingSchema.statics.getValue = async function (key, defaultValue = null) {
  const setting = await this.findOne({ key }).lean();
  return setting ? setting.value : defaultValue;
};

// Static: Set setting value
systemSettingSchema.statics.setValue = async function (key, value, userId) {
  return this.findOneAndUpdate(
    { key },
    { value, updatedBy: userId },
    { new: true }
  );
};

// Static: Initialize default settings
systemSettingSchema.statics.initializeDefaults = async function () {
  const defaults = [
    // General
    { key: 'platform_name', value: 'CrowdBeat', category: 'general', label: 'Platform Name', valueType: 'string', public: true },
    { key: 'maintenance_mode', value: false, category: 'general', label: 'Maintenance Mode', valueType: 'boolean', description: 'Enable to show maintenance page to users' },
    { key: 'new_registrations', value: true, category: 'general', label: 'Allow New Registrations', valueType: 'boolean' },
    
    // Sessions
    { key: 'max_participants_per_session', value: 100, category: 'sessions', label: 'Max Participants Per Session', valueType: 'number', min: 10, max: 1000 },
    { key: 'default_lyrics_deadline_hours', value: 24, category: 'sessions', label: 'Default Lyrics Deadline (hours)', valueType: 'number', min: 1, max: 168 },
    { key: 'default_voting_deadline_hours', value: 12, category: 'sessions', label: 'Default Voting Deadline (hours)', valueType: 'number', min: 1, max: 72 },
    
    // Voting
    { key: 'max_votes_per_user_per_round', value: 3, category: 'voting', label: 'Max Votes Per User Per Round', valueType: 'number', min: 1, max: 10 },
    { key: 'weighted_voting_enabled', value: true, category: 'voting', label: 'Enable Weighted Voting', valueType: 'boolean' },
    { key: 'max_vote_weight', value: 5, category: 'voting', label: 'Max Vote Weight', valueType: 'number', min: 1, max: 10 },
    
    // Rewards
    { key: 'lyrics_winner_reputation', value: 100, category: 'rewards', label: 'Lyrics Winner Reputation', valueType: 'number', min: 0 },
    { key: 'stem_accepted_reputation', value: 50, category: 'rewards', label: 'Stem Accepted Reputation', valueType: 'number', min: 0 },
    { key: 'vote_participation_reputation', value: 5, category: 'rewards', label: 'Vote Participation Reputation', valueType: 'number', min: 0 },
    { key: 'revenue_per_play_cents', value: 0.4, category: 'rewards', label: 'Revenue Per Play (cents)', valueType: 'number', min: 0 },
    { key: 'platform_fee_percentage', value: 10, category: 'rewards', label: 'Platform Fee (%)', valueType: 'number', min: 0, max: 50 },
    
    // Moderation
    { key: 'auto_flag_profanity', value: true, category: 'moderation', label: 'Auto-flag Profanity', valueType: 'boolean' },
    { key: 'auto_flag_spam_score', value: 0.8, category: 'moderation', label: 'Auto-flag Spam Score Threshold', valueType: 'number', min: 0, max: 1 },
    { key: 'default_mute_duration_hours', value: 24, category: 'moderation', label: 'Default Mute Duration (hours)', valueType: 'number', min: 1 },
    
    // Limits
    { key: 'max_submissions_per_user_per_session', value: 3, category: 'limits', label: 'Max Submissions Per User Per Session', valueType: 'number', min: 1, max: 10 },
    { key: 'max_daily_uploads_free', value: 5, category: 'limits', label: 'Max Daily Uploads (Free Tier)', valueType: 'number', min: 1 },
    { key: 'max_daily_uploads_pro', value: 50, category: 'limits', label: 'Max Daily Uploads (Pro Tier)', valueType: 'number', min: 1 },
    
    // Features
    { key: 'ai_generation_enabled', value: true, category: 'features', label: 'AI Generation Enabled', valueType: 'boolean' },
    { key: 'live_streaming_enabled', value: true, category: 'features', label: 'Live Streaming Enabled', valueType: 'boolean' },
    { key: 'ownership_transfer_enabled', value: false, category: 'features', label: 'Ownership Transfer Enabled', valueType: 'boolean' },
  ];

  for (const setting of defaults) {
    await this.findOneAndUpdate(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log('Default system settings initialized.');
};

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

module.exports = SystemSetting;

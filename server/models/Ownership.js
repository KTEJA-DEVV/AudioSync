const mongoose = require('mongoose');

const ownershipSchema = new mongoose.Schema(
  {
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      required: [true, 'Song reference is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    shares: {
      type: Number,
      required: [true, 'Shares amount is required'],
      min: [0, 'Shares cannot be negative'],
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    acquiredType: {
      type: String,
      enum: ['contribution', 'purchase', 'transfer', 'reward', 'platform'],
      required: true,
    },
    acquiredFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    price: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['usd', 'tokens'],
      default: 'usd',
    },
    transactionHash: {
      type: String, // For blockchain transactions
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index - one record per user per song
ownershipSchema.index({ song: 1, user: 1 }, { unique: true });
ownershipSchema.index({ user: 1, createdAt: -1 });
ownershipSchema.index({ song: 1, shares: -1 });

// Pre-save: Calculate percentage if song's totalShares is available
ownershipSchema.pre('save', async function (next) {
  if (this.isModified('shares')) {
    const Song = mongoose.model('Song');
    const song = await Song.findById(this.song).select('ownership.totalShares').lean();
    if (song?.ownership?.totalShares) {
      this.percentage = (this.shares / song.ownership.totalShares) * 100;
    }
  }
  next();
});

// Static: Get ownership distribution for a song
ownershipSchema.statics.getSongOwnership = async function (songId) {
  return this.find({ song: songId })
    .populate('user', 'username displayName avatar')
    .populate('acquiredFrom', 'username displayName')
    .sort({ shares: -1 })
    .lean();
};

// Static: Get all songs a user has ownership in
ownershipSchema.statics.getUserOwnership = async function (userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const [ownerships, total] = await Promise.all([
    this.find({ user: userId })
      .populate({
        path: 'song',
        select: 'title coverArt plays likes duration status revenue.totalRevenue',
        populate: {
          path: 'contributors.user',
          select: 'username displayName avatar',
        },
      })
      .sort({ shares: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({ user: userId }),
  ]);

  return {
    ownerships,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

// Static: Transfer shares between users
ownershipSchema.statics.transferShares = async function (songId, fromUserId, toUserId, shares, price = 0, currency = 'usd') {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get current ownership of sender
    const fromOwnership = await this.findOne({ song: songId, user: fromUserId }).session(session);
    if (!fromOwnership) {
      throw new Error('Sender does not have ownership in this song');
    }
    if (fromOwnership.shares < shares) {
      throw new Error('Insufficient shares to transfer');
    }

    // Reduce sender's shares
    fromOwnership.shares -= shares;
    if (fromOwnership.shares === 0) {
      await this.deleteOne({ _id: fromOwnership._id }).session(session);
    } else {
      await fromOwnership.save({ session });
    }

    // Add or update recipient's ownership
    let toOwnership = await this.findOne({ song: songId, user: toUserId }).session(session);
    if (toOwnership) {
      toOwnership.shares += shares;
      await toOwnership.save({ session });
    } else {
      toOwnership = await this.create([{
        song: songId,
        user: toUserId,
        shares,
        acquiredType: 'transfer',
        acquiredFrom: fromUserId,
        price,
        currency,
      }], { session });
    }

    await session.commitTransaction();
    return { fromOwnership, toOwnership };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Static: Create initial ownership from contributions
ownershipSchema.statics.createFromContributions = async function (songId, contributions) {
  const Song = mongoose.model('Song');
  const song = await Song.findById(songId);
  if (!song) throw new Error('Song not found');

  const totalShares = song.ownership?.totalShares || 10000;
  const ownerships = [];

  for (const contribution of contributions) {
    const shares = Math.round((contribution.percentage / 100) * totalShares);
    if (shares > 0) {
      const existing = await this.findOne({ song: songId, user: contribution.user });
      if (existing) {
        existing.shares += shares;
        await existing.save();
        ownerships.push(existing);
      } else {
        const ownership = await this.create({
          song: songId,
          user: contribution.user,
          shares,
          acquiredType: 'contribution',
          notes: contribution.contributionType,
        });
        ownerships.push(ownership);
      }
    }
  }

  // Update song's ownership distribution
  const allOwnerships = await this.find({ song: songId }).lean();
  song.ownership.distribution = allOwnerships.map(o => ({
    user: o.user,
    shares: o.shares,
    percentage: (o.shares / totalShares) * 100,
  }));
  await song.save();

  return ownerships;
};

const Ownership = mongoose.model('Ownership', ownershipSchema);

module.exports = Ownership;


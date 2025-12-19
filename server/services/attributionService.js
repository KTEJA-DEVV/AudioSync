const { Session, Song, LyricsSubmission, StemUpload, Vote, User, Ownership } = require('../models');

/**
 * Default contribution percentages
 * Adjustable by session settings
 */
const DEFAULT_PERCENTAGES = {
  lyrics: 30,        // Winning lyrics author
  stems: 30,         // Divided among used stems
  host: 20,          // Session host/producer
  voters: 10,        // Top voters who participated
  platform: 10,      // Platform fee
};

const attributionService = {
  /**
   * Calculate contribution percentages for all participants in a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<Array>} Array of contribution objects
   */
  calculateContributions: async (sessionId) => {
    const session = await Session.findById(sessionId)
      .populate('host', 'username displayName')
      .lean();
    
    if (!session) throw new Error('Session not found');

    // Get winning lyrics
    const winningLyrics = await LyricsSubmission.findOne({
      session: sessionId,
      status: 'accepted',
    }).populate('author', 'username displayName').lean();

    // Get used stems
    const usedStems = await StemUpload.find({
      session: sessionId,
      status: 'used',
    }).populate('contributor', 'username displayName').lean();

    // Get voters who participated in majority of rounds
    const votes = await Vote.find({ session: sessionId }).lean();
    const voterCounts = {};
    votes.forEach(vote => {
      const oderId = vote.user.toString();
      voterCounts[oderId] = (voterCounts[oderId] || 0) + 1;
    });

    // Get session percentages (or use defaults)
    const percentages = session.settings?.contributionPercentages || DEFAULT_PERCENTAGES;
    
    const contributions = [];

    // 1. Lyrics contributor
    if (winningLyrics?.author) {
      contributions.push({
        user: winningLyrics.author._id,
        contributionType: 'lyrics',
        percentage: percentages.lyrics,
        attribution: attributionService.generateAttributionString({
          user: winningLyrics.author,
          type: 'lyrics',
        }),
      });
    }

    // 2. Stem contributors (divide stems percentage equally among used stems)
    if (usedStems.length > 0) {
      const perStemPercentage = percentages.stems / usedStems.length;
      for (const stem of usedStems) {
        const existingIndex = contributions.findIndex(
          c => c.user.toString() === stem.contributor._id.toString()
        );
        
        if (existingIndex >= 0) {
          // Add to existing contribution
          contributions[existingIndex].percentage += perStemPercentage;
          contributions[existingIndex].contributionType = 'multiple';
        } else {
          contributions.push({
            user: stem.contributor._id,
            contributionType: `${stem.type}-stem`,
            percentage: perStemPercentage,
            attribution: attributionService.generateAttributionString({
              user: stem.contributor,
              type: `${stem.type} stem`,
            }),
          });
        }
      }
    }

    // 3. Host/Producer
    if (session.host) {
      const existingHostIndex = contributions.findIndex(
        c => c.user.toString() === session.host._id.toString()
      );
      
      if (existingHostIndex >= 0) {
        contributions[existingHostIndex].percentage += percentages.host;
      } else {
        contributions.push({
          user: session.host._id,
          contributionType: 'host',
          percentage: percentages.host,
          attribution: attributionService.generateAttributionString({
            user: session.host,
            type: 'producer',
          }),
        });
      }
    }

    // 4. Top voters (divide among voters who participated in >50% of voting rounds)
    const totalVotingRounds = session.stats?.totalVotingRounds || 1;
    const minParticipation = Math.ceil(totalVotingRounds * 0.5);
    
    const eligibleVoters = Object.entries(voterCounts)
      .filter(([_, count]) => count >= minParticipation)
      .map(([oderId]) => oderId);

    if (eligibleVoters.length > 0) {
      const perVoterPercentage = percentages.voters / eligibleVoters.length;
      
      for (const oderId of eligibleVoters) {
        // Skip if user is already a contributor with major role
        const existingIndex = contributions.findIndex(
          c => c.user.toString() === oderId && c.contributionType !== 'vote'
        );
        
        if (existingIndex >= 0) {
          contributions[existingIndex].percentage += perVoterPercentage;
        } else {
          const user = await User.findById(oderId).select('username displayName').lean();
          if (user) {
            contributions.push({
              user: oderId,
              contributionType: 'vote',
              percentage: perVoterPercentage,
              attribution: attributionService.generateAttributionString({
                user,
                type: 'voter',
              }),
            });
          }
        }
      }
    }

    // Normalize percentages to ensure they sum to 100% (minus platform fee)
    const totalContributorPercentage = 100 - percentages.platform;
    const currentTotal = contributions.reduce((sum, c) => sum + c.percentage, 0);
    
    if (currentTotal !== totalContributorPercentage && currentTotal > 0) {
      const scaleFactor = totalContributorPercentage / currentTotal;
      contributions.forEach(c => {
        c.percentage = Math.round(c.percentage * scaleFactor * 100) / 100;
      });
    }

    return contributions;
  },

  /**
   * Assign ownership to contributors based on their contribution percentages
   * @param {string} songId - The song ID
   * @param {Array} contributors - Array of contributor objects
   * @returns {Promise<Array>} Array of ownership records
   */
  assignOwnership: async (songId, contributors) => {
    const song = await Song.findById(songId);
    if (!song) throw new Error('Song not found');

    // Create ownership records
    const ownerships = await Ownership.createFromContributions(songId, contributors);

    // Update song's contributors array
    song.contributors = contributors.map(c => ({
      user: c.user,
      contributionType: c.contributionType,
      percentage: c.percentage,
      attribution: c.attribution,
      acceptedAt: new Date(),
    }));

    await song.save();

    return ownerships;
  },

  /**
   * Generate a display-friendly attribution string
   * @param {Object} contributor - Contributor info with user and type
   * @returns {string} Attribution string
   */
  generateAttributionString: ({ user, type }) => {
    const name = user.displayName || user.username;
    
    const typeLabels = {
      lyrics: 'Lyrics by',
      'drums-stem': 'Drums by',
      'bass-stem': 'Bass by',
      'melody-stem': 'Melody by',
      'vocals-stem': 'Vocals by',
      'synth-stem': 'Synth by',
      'guitar-stem': 'Guitar by',
      'piano-stem': 'Piano by',
      production: 'Produced by',
      producer: 'Produced by',
      host: 'Hosted by',
      vocal: 'Vocals by',
      concept: 'Concept by',
      vote: 'Contributed by',
      voter: 'Contributed by',
      mixing: 'Mixed by',
      mastering: 'Mastered by',
    };

    const label = typeLabels[type] || 'Contributed by';
    return `${label} @${user.username}`;
  },

  /**
   * Get formatted credits for display
   * @param {Array} contributors - Array of contributors with populated user
   * @returns {Object} Credits grouped by role
   */
  formatCredits: (contributors) => {
    const credits = {
      primary: [], // Main visible contributors
      lyrics: [],
      production: [],
      stems: [],
      voters: [],
    };

    contributors.forEach(c => {
      const entry = {
        user: c.user,
        attribution: c.attribution,
        percentage: c.percentage,
      };

      if (c.contributionType === 'lyrics') {
        credits.lyrics.push(entry);
        credits.primary.push(entry);
      } else if (['host', 'production', 'producer'].includes(c.contributionType)) {
        credits.production.push(entry);
        credits.primary.push(entry);
      } else if (c.contributionType.includes('stem')) {
        credits.stems.push(entry);
      } else if (c.contributionType === 'vote') {
        credits.voters.push(entry);
      } else {
        credits.primary.push(entry);
      }
    });

    // Sort each group by percentage
    Object.keys(credits).forEach(key => {
      credits[key].sort((a, b) => b.percentage - a.percentage);
    });

    return credits;
  },

  /**
   * Calculate and assign all contributions for a completed session
   * @param {string} sessionId - The session ID
   * @param {string} winningSongId - The winning song ID
   */
  finalizeSessionContributions: async (sessionId, winningSongId) => {
    // Calculate contributions
    const contributions = await attributionService.calculateContributions(sessionId);
    
    // Assign ownership to the winning song
    await attributionService.assignOwnership(winningSongId, contributions);

    // Update session status
    await Session.findByIdAndUpdate(sessionId, {
      status: 'completed',
      'results.winningSong': winningSongId,
      'results.contributionsSplit': contributions,
    });

    return contributions;
  },
};

module.exports = attributionService;


/**
 * Word Processing Service for CrowdBeat Feedback System
 * Handles text normalization, profanity detection, categorization, and sentiment analysis
 */

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'our', 'their', 'what', 'which', 'who', 'whom',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
  'if', 'because', 'until', 'while', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out',
  'off', 'over', 'under', 'again', 'further', 'am', 'being', 'having', 'doing',
]);

// Default blocked/profanity words (basic list - expand as needed)
const DEFAULT_BLOCKED_WORDS = new Set([
  // Add profanity words here - keeping minimal for example
  'spam', 'scam',
]);

// Positive words for sentiment and categorization
const POSITIVE_WORDS = new Set([
  'love', 'amazing', 'awesome', 'great', 'excellent', 'fantastic', 'wonderful',
  'beautiful', 'perfect', 'incredible', 'fire', 'lit', 'sick', 'dope', 'vibes',
  'good', 'nice', 'cool', 'best', 'brilliant', 'outstanding', 'superb', 'epic',
  'legendary', 'masterpiece', 'genius', 'talented', 'impressive', 'stunning',
  'catchy', 'groovy', 'smooth', 'crisp', 'clean', 'tight', 'fresh', 'slaps',
  'bangs', 'banger', 'heat', 'flames', 'goosebumps', 'chills', 'emotional',
]);

// Negative words for sentiment and categorization
const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'boring', 'weak', 'poor', 'disappointing',
  'slow', 'fast', 'loud', 'quiet', 'muddy', 'harsh', 'flat', 'dull', 'repetitive',
  'generic', 'basic', 'overused', 'cliche', 'skip', 'meh', 'nah', 'trash', 'mid',
  'offkey', 'pitchy', 'messy', 'cluttered', 'noisy', 'distorted', 'clipping',
]);

// Technical/music production words
const TECHNICAL_WORDS = new Set([
  'bass', 'treble', 'mid', 'mids', 'highs', 'lows', 'eq', 'compression', 'reverb',
  'delay', 'echo', 'chorus', 'flanger', 'phaser', 'distortion', 'saturation',
  'sidechain', 'kick', 'snare', 'hihat', 'hats', 'drums', 'percussion', 'synth',
  'pad', 'lead', 'arp', 'arpeggio', 'melody', 'harmony', 'chord', 'chords',
  'progression', 'drop', 'buildup', 'breakdown', 'bridge', 'verse', 'chorus',
  'hook', 'intro', 'outro', 'transition', 'mix', 'master', 'mastering', 'mixing',
  'panning', 'stereo', 'mono', 'dynamics', 'loudness', 'volume', 'gain', 'db',
  'frequency', 'filter', 'cutoff', 'resonance', 'envelope', 'adsr', 'lfo',
  'bpm', 'tempo', 'rhythm', 'groove', 'swing', 'quantize', 'velocity', 'pitch',
  'key', 'scale', 'octave', 'sample', 'loop', 'layer', 'stem', 'vocal', 'vocals',
  'autotune', 'vocoder', '808', 'sub', 'subbass', 'wobble', 'pluck', 'stab',
]);

// Mood/vibe words
const MOOD_WORDS = new Set([
  'happy', 'sad', 'chill', 'relaxed', 'energetic', 'hype', 'hyped', 'mellow',
  'dark', 'bright', 'uplifting', 'melancholic', 'nostalgic', 'dreamy', 'ethereal',
  'aggressive', 'intense', 'peaceful', 'calm', 'anxious', 'tense', 'euphoric',
  'romantic', 'sensual', 'playful', 'mysterious', 'haunting', 'powerful', 'soft',
  'warm', 'cold', 'atmospheric', 'ambient', 'moody', 'vibey', 'soulful', 'funky',
]);

// Genre words
const GENRE_WORDS = new Set([
  'pop', 'rock', 'hiphop', 'rap', 'rnb', 'soul', 'jazz', 'blues', 'country',
  'folk', 'electronic', 'edm', 'house', 'techno', 'trance', 'dubstep', 'dnb',
  'drum', 'bass', 'trap', 'lofi', 'indie', 'alternative', 'metal', 'punk',
  'reggae', 'dancehall', 'afrobeat', 'latin', 'classical', 'orchestral', 'cinematic',
  'ambient', 'experimental', 'phonk', 'drill', 'grime', 'uk', 'garage', 'disco',
  'funk', 'gospel', 'kpop', 'jpop', 'anime', 'retrowave', 'synthwave', 'vaporwave',
]);

/**
 * Process input text and extract valid words
 * @param {string} text - Raw input text
 * @param {Object} options - Processing options
 * @returns {string[]} Array of valid, normalized words
 */
const processInput = (text, options = {}) => {
  const {
    minLength = 2,
    maxLength = 30,
    removeStopWords = true,
    blockedWords = [],
  } = options;

  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize text: lowercase, remove special characters except hyphens
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into words
  const words = normalized.split(' ');

  // Filter and validate words
  const validWords = words.filter(word => {
    // Check length
    if (word.length < minLength || word.length > maxLength) {
      return false;
    }

    // Check if it's a number only
    if (/^\d+$/.test(word)) {
      return false;
    }

    // Remove stop words if enabled
    if (removeStopWords && STOP_WORDS.has(word)) {
      return false;
    }

    // Check against blocked words
    if (detectProfanity(word, blockedWords)) {
      return false;
    }

    return true;
  });

  // Remove duplicates while preserving order
  return [...new Set(validWords)];
};

/**
 * Detect if a word is profane or blocked
 * @param {string} word - Word to check
 * @param {string[]} additionalBlocked - Additional blocked words
 * @returns {boolean} True if word is blocked
 */
const detectProfanity = (word, additionalBlocked = []) => {
  const normalizedWord = word.toLowerCase().trim();
  
  // Check default blocked words
  if (DEFAULT_BLOCKED_WORDS.has(normalizedWord)) {
    return true;
  }
  
  // Check additional blocked words
  if (additionalBlocked.some(blocked => normalizedWord.includes(blocked.toLowerCase()))) {
    return true;
  }
  
  return false;
};

/**
 * Categorize a word based on its meaning
 * @param {string} word - Word to categorize
 * @returns {string} Category: general, positive, negative, technical, mood, genre, element
 */
const categorizeWord = (word) => {
  const normalizedWord = word.toLowerCase().trim();
  
  if (POSITIVE_WORDS.has(normalizedWord)) {
    return 'positive';
  }
  
  if (NEGATIVE_WORDS.has(normalizedWord)) {
    return 'negative';
  }
  
  if (TECHNICAL_WORDS.has(normalizedWord)) {
    return 'technical';
  }
  
  if (MOOD_WORDS.has(normalizedWord)) {
    return 'mood';
  }
  
  if (GENRE_WORDS.has(normalizedWord)) {
    return 'genre';
  }
  
  return 'general';
};

/**
 * Analyze sentiment of words
 * @param {string[]} words - Array of words
 * @returns {Object} Sentiment analysis result
 */
const analyzeSentiment = (words) => {
  if (!words || words.length === 0) {
    return { score: 0, label: 'neutral', positive: 0, negative: 0 };
  }
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    const normalized = word.toLowerCase().trim();
    if (POSITIVE_WORDS.has(normalized)) {
      positiveCount++;
    } else if (NEGATIVE_WORDS.has(normalized)) {
      negativeCount++;
    }
  });
  
  const total = positiveCount + negativeCount;
  
  if (total === 0) {
    return { score: 0, label: 'neutral', positive: 0, negative: 0 };
  }
  
  // Score from -1 (all negative) to 1 (all positive)
  const score = (positiveCount - negativeCount) / total;
  
  let label = 'neutral';
  if (score > 0.3) label = 'positive';
  else if (score < -0.3) label = 'negative';
  
  return {
    score: Math.round(score * 100) / 100,
    label,
    positive: positiveCount,
    negative: negativeCount,
  };
};

/**
 * Get sentiment score for a single word
 * @param {string} word - Word to analyze
 * @returns {number} Sentiment score from -1 to 1
 */
const getWordSentiment = (word) => {
  const normalized = word.toLowerCase().trim();
  
  if (POSITIVE_WORDS.has(normalized)) {
    return 0.5;
  }
  
  if (NEGATIVE_WORDS.has(normalized)) {
    return -0.5;
  }
  
  return 0;
};

/**
 * Simple word stemming (basic implementation)
 * Groups similar words together
 * @param {string} word - Word to stem
 * @returns {string} Stemmed word
 */
const stemWord = (word) => {
  const normalized = word.toLowerCase().trim();
  
  // Common suffix patterns
  const suffixes = [
    { suffix: 'ing', replacement: '' },
    { suffix: 'ed', replacement: '' },
    { suffix: 'ly', replacement: '' },
    { suffix: 'ness', replacement: '' },
    { suffix: 'ment', replacement: '' },
    { suffix: 'tion', replacement: '' },
    { suffix: 'sion', replacement: '' },
    { suffix: 'er', replacement: '' },
    { suffix: 'est', replacement: '' },
    { suffix: 's', replacement: '' },
  ];
  
  for (const { suffix, replacement } of suffixes) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length + 2) {
      return normalized.slice(0, -suffix.length) + replacement;
    }
  }
  
  return normalized;
};

/**
 * Get quick feedback suggestions based on context
 * @param {string} category - Category filter (optional)
 * @returns {string[]} Array of suggested feedback words
 */
const getQuickFeedbackSuggestions = (category = null) => {
  const suggestions = {
    positive: ['fire', 'love', 'amazing', 'vibes', 'banger', 'goosebumps'],
    negative: ['boring', 'slow', 'loud', 'quiet', 'muddy', 'skip'],
    technical: ['more bass', 'less treble', 'louder', 'softer', 'cleaner', 'punchier'],
    mood: ['chill', 'hype', 'emotional', 'dark', 'uplifting', 'dreamy'],
    general: ['fire', 'love it', 'more bass', 'too fast', 'chill vibes', 'needs work'],
  };
  
  return suggestions[category] || suggestions.general;
};

module.exports = {
  processInput,
  detectProfanity,
  categorizeWord,
  analyzeSentiment,
  getWordSentiment,
  stemWord,
  getQuickFeedbackSuggestions,
  STOP_WORDS,
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  TECHNICAL_WORDS,
  MOOD_WORDS,
  GENRE_WORDS,
};


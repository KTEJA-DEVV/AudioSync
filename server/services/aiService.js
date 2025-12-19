const OpenAI = require('openai');
const config = require('../config');
const { addAIJob } = require('../config/queue');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

/**
 * Generate music suggestions based on session context
 * @param {Object} context - Session context
 * @returns {Promise<Object>}
 */
const generateMusicSuggestions = async (context) => {
  const { genre, bpm, key, scale, theme, previousContributions } = context;

  const prompt = `You are a music production assistant. Based on the following context, suggest 3 musical ideas:
  
Genre: ${genre}
BPM: ${bpm}
Key: ${key} ${scale}
Theme: ${theme || 'Open'}
Previous contributions: ${previousContributions?.length || 0} tracks

Provide suggestions for:
1. A melodic idea
2. A rhythmic pattern
3. A harmonic progression

Format as JSON with fields: melody, rhythm, harmony, each with a description and optional note sequence.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful music production assistant. Respond only with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('AI suggestion error:', error);
    throw error;
  }
};

/**
 * Generate lyrics based on theme
 * @param {string} theme - Song theme
 * @param {string} style - Lyrical style
 * @returns {Promise<string>}
 */
const generateLyrics = async (theme, style = 'contemporary') => {
  const prompt = `Write a short verse (4-8 lines) about "${theme}" in a ${style} style. 
Make it suitable for a collaborative music project. Keep it universal and engaging.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a creative songwriter. Write concise, evocative lyrics.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 200,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Lyrics generation error:', error);
    throw error;
  }
};

/**
 * Analyze contribution for feedback
 * @param {Object} contribution - Contribution data
 * @returns {Promise<Object>}
 */
const analyzeContribution = async (contribution) => {
  // This would ideally analyze the actual audio
  // For now, we provide generic feedback structure
  return {
    quality: 'good',
    suggestions: [
      'Consider adding variation to keep interest',
      'The rhythm complements the existing track well',
    ],
    compatibility: 0.85,
  };
};

/**
 * Queue AI generation job
 * @param {string} sessionId
 * @param {string} prompt
 * @param {Object} options
 * @returns {Promise}
 */
const queueAIGeneration = async (sessionId, prompt, options = {}) => {
  return addAIJob({
    sessionId,
    prompt,
    options,
  });
};

module.exports = {
  generateMusicSuggestions,
  generateLyrics,
  analyzeContribution,
  queueAIGeneration,
};


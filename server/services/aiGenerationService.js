/**
 * AI Song Generation Service
 * 
 * This is a simulated service for demo purposes.
 * Structure allows easy integration with real AI APIs (Suno, Udio, etc.)
 */

const GenerationJob = require('../models/GenerationJob');
const Song = require('../models/Song');
const { emitToSession } = require('../config/socket');

// Simulated generation stages with timing
const GENERATION_STAGES = [
  { name: 'Analyzing lyrics', duration: 2000, progress: 15 },
  { name: 'Composing melody', duration: 3000, progress: 30 },
  { name: 'Generating arrangement', duration: 4000, progress: 50 },
  { name: 'Creating vocals', duration: 3500, progress: 70 },
  { name: 'Mixing', duration: 2500, progress: 85 },
  { name: 'Mastering', duration: 2000, progress: 100 },
];

// Mock audio URLs for demo
const MOCK_AUDIO_URLS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
];

// Genre-based cover art gradients
const GENRE_GRADIENTS = {
  'pop': 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
  'rock': 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
  'hip-hop': 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
  'r&b': 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
  'electronic': 'linear-gradient(135deg, #00d2d3 0%, #01a3a4 100%)',
  'jazz': 'linear-gradient(135deg, #f39c12 0%, #d68910 100%)',
  'folk': 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
  'indie': 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)',
  'default': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
};

// Generate mock waveform data
const generateWaveformData = (length = 100) => {
  const data = [];
  for (let i = 0; i < length; i++) {
    // Create realistic-looking waveform with peaks and valleys
    const base = 0.3 + Math.random() * 0.4;
    const noise = Math.sin(i * 0.2) * 0.2;
    data.push(Math.min(1, Math.max(0.1, base + noise)));
  }
  return data;
};

// Generate mock song sections
const generateSongSections = (duration) => {
  const sections = [];
  let currentTime = 0;
  
  // Intro
  sections.push({
    name: 'Intro',
    type: 'intro',
    startTime: currentTime,
    endTime: currentTime + 15,
  });
  currentTime += 15;
  
  // Verse 1
  sections.push({
    name: 'Verse 1',
    type: 'verse',
    startTime: currentTime,
    endTime: currentTime + 30,
  });
  currentTime += 30;
  
  // Chorus
  sections.push({
    name: 'Chorus',
    type: 'chorus',
    startTime: currentTime,
    endTime: currentTime + 25,
  });
  currentTime += 25;
  
  // Verse 2
  sections.push({
    name: 'Verse 2',
    type: 'verse',
    startTime: currentTime,
    endTime: currentTime + 30,
  });
  currentTime += 30;
  
  // Bridge
  if (duration > 150) {
    sections.push({
      name: 'Bridge',
      type: 'bridge',
      startTime: currentTime,
      endTime: currentTime + 20,
    });
    currentTime += 20;
  }
  
  // Final Chorus
  sections.push({
    name: 'Final Chorus',
    type: 'chorus',
    startTime: currentTime,
    endTime: currentTime + 30,
  });
  currentTime += 30;
  
  // Outro
  sections.push({
    name: 'Outro',
    type: 'outro',
    startTime: currentTime,
    endTime: Math.min(currentTime + 15, duration),
  });
  
  return sections;
};

// Build generation prompt
const buildGenerationPrompt = (params, lyricsText) => {
  const parts = [];
  
  parts.push(`Create a ${params.genre || 'pop'} song`);
  
  if (params.mood?.length > 0) {
    parts.push(`with a ${params.mood.join(', ')} mood`);
  }
  
  if (params.tempo) {
    parts.push(`at ${params.tempo} BPM`);
  }
  
  if (params.key) {
    parts.push(`in the key of ${params.key}`);
  }
  
  if (params.vocalStyle) {
    parts.push(`with ${params.vocalStyle} vocals`);
  }
  
  if (params.instruments?.length > 0) {
    parts.push(`featuring ${params.instruments.join(', ')}`);
  }
  
  if (params.style) {
    parts.push(`Style: ${params.style}`);
  }
  
  parts.push(`\n\nLyrics:\n${lyricsText}`);
  
  return parts.join(' ');
};

/**
 * Generate a song (simulated)
 */
const generateSong = async (jobId, sessionId, onProgress) => {
  const job = await GenerationJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  
  // Start the job
  await job.start();
  
  // Emit initial status
  emitToSession(sessionId.toString(), 'generation:progress', {
    jobId: job._id,
    status: 'processing',
    progress: 0,
    currentStage: GENERATION_STAGES[0].name,
  });
  
  // Simulate each stage
  for (let i = 0; i < GENERATION_STAGES.length; i++) {
    const stage = GENERATION_STAGES[i];
    
    // Update job progress
    await job.updateProgress(stage.progress, stage.name);
    
    // Emit progress update
    emitToSession(sessionId.toString(), 'generation:progress', {
      jobId: job._id,
      status: 'processing',
      progress: stage.progress,
      currentStage: stage.name,
      stageIndex: i,
    });
    
    if (onProgress) {
      onProgress(stage.progress, stage.name);
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, stage.duration));
  }
  
  // Generate mock result
  const audioUrl = MOCK_AUDIO_URLS[Math.floor(Math.random() * MOCK_AUDIO_URLS.length)];
  const duration = 180 + Math.floor(Math.random() * 60); // 3-4 minutes
  const waveformData = generateWaveformData(100);
  const sections = generateSongSections(duration);
  const coverArt = GENRE_GRADIENTS[job.params?.genre] || GENRE_GRADIENTS.default;
  
  // Complete the job
  await job.complete(audioUrl, {
    duration,
    waveformData,
    sections,
    coverArt,
  });
  
  // Update the song with results
  if (job.song) {
    await Song.findByIdAndUpdate(job.song, {
      audioUrl,
      waveformData,
      duration,
      coverArt,
      sections,
      status: 'ready',
      aiModel: 'crowdbeat-demo-v1',
      generationPrompt: job.prompt,
    });
  }
  
  // Emit completion
  emitToSession(sessionId.toString(), 'generation:complete', {
    jobId: job._id,
    songId: job.song,
    audioUrl,
    duration,
  });
  
  return {
    audioUrl,
    duration,
    waveformData,
    sections,
    coverArt,
  };
};

/**
 * Generate multiple song versions
 */
const generateMultipleVersions = async (sessionId, lyricsId, params, numVersions = 3) => {
  const versionLabels = ['A', 'B', 'C', 'D', 'E'];
  const jobs = [];
  const songs = [];
  
  // Get lyrics text
  const LyricsSubmission = require('../models/LyricsSubmission');
  const lyrics = await LyricsSubmission.findById(lyricsId);
  if (!lyrics) throw new Error('Lyrics not found');
  
  const lyricsText = lyrics.content.fullLyrics;
  const songTitle = lyrics.content.title || 'Untitled';
  
  // Build the generation prompt
  const prompt = buildGenerationPrompt(params, lyricsText);
  
  // Create songs and jobs for each version
  for (let i = 0; i < Math.min(numVersions, 5); i++) {
    const versionLabel = versionLabels[i];
    
    // Create song document
    const song = await Song.create({
      session: sessionId,
      lyrics: lyricsId,
      title: `${songTitle} (Version ${versionLabel})`,
      version: i + 1,
      versionLabel,
      generationParams: params,
      status: 'generating',
      contributors: [{
        user: lyrics.author,
        contributionType: 'lyrics',
        attribution: 'Lyrics',
      }],
    });
    
    songs.push(song);
    
    // Create generation job
    const job = await GenerationJob.create({
      session: sessionId,
      song: song._id,
      params: {
        ...params,
        lyricsText,
        version: i + 1,
        versionLabel,
      },
      prompt,
      aiModel: 'crowdbeat-demo-v1',
    });
    
    // Update song with job reference
    song.generationJobId = job._id;
    await song.save();
    
    jobs.push(job);
  }
  
  // Start generation for all jobs (in parallel for demo)
  const generatePromises = jobs.map((job, index) => 
    new Promise(async (resolve) => {
      // Stagger start times slightly
      await new Promise(r => setTimeout(r, index * 500));
      
      try {
        await generateSong(job._id, sessionId);
        resolve({ success: true, jobId: job._id, songId: songs[index]._id });
      } catch (error) {
        console.error(`Generation failed for job ${job._id}:`, error);
        await job.fail(error.message);
        resolve({ success: false, jobId: job._id, error: error.message });
      }
    })
  );
  
  // Don't wait for completion - let them run in background
  Promise.all(generatePromises).then((results) => {
    console.log('All generations completed:', results);
    
    // Emit all complete event
    emitToSession(sessionId.toString(), 'generation:allComplete', {
      results,
      totalCompleted: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
    });
  });
  
  return { jobs, songs };
};

/**
 * Generate a variation of an existing song
 */
const generateVariation = async (songId, adjustments) => {
  const song = await Song.findById(songId).populate('lyrics');
  if (!song) throw new Error('Song not found');
  
  const newParams = {
    ...song.generationParams,
    ...adjustments,
  };
  
  const newSong = await Song.create({
    session: song.session,
    lyrics: song.lyrics._id,
    title: `${song.title} (Variation)`,
    version: song.version + 10, // Variation versions
    generationParams: newParams,
    status: 'generating',
  });
  
  const job = await GenerationJob.create({
    session: song.session,
    song: newSong._id,
    params: newParams,
    aiModel: 'crowdbeat-demo-v1',
  });
  
  // Start generation
  generateSong(job._id, song.session);
  
  return { song: newSong, job };
};

/**
 * Analyze a stem (mock)
 */
const analyzeStem = async (audioUrl) => {
  // Simulate analysis delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return mock analysis
  return {
    bpm: 100 + Math.floor(Math.random() * 40), // 100-140 BPM
    key: ['C Major', 'A Minor', 'G Major', 'E Minor', 'D Major', 'B Minor'][
      Math.floor(Math.random() * 6)
    ],
    duration: 30 + Math.floor(Math.random() * 90),
    waveformData: generateWaveformData(50),
    peakAmplitude: 0.7 + Math.random() * 0.3,
  };
};

/**
 * Detect BPM and key from audio (mock)
 */
const detectBPMKey = async (audioUrl) => {
  // Simulate analysis delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    bpm: 100 + Math.floor(Math.random() * 40),
    key: ['C Major', 'A Minor', 'G Major', 'E Minor', 'D Major', 'B Minor'][
      Math.floor(Math.random() * 6)
    ],
    confidence: 0.7 + Math.random() * 0.3,
  };
};

/**
 * Cancel a generation job
 */
const cancelGeneration = async (jobId) => {
  const job = await GenerationJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  
  if (job.status === 'completed' || job.status === 'failed') {
    throw new Error('Cannot cancel completed or failed job');
  }
  
  await job.cancel();
  
  // Update song status
  if (job.song) {
    await Song.findByIdAndUpdate(job.song, { status: 'rejected' });
  }
  
  return job;
};

module.exports = {
  generateSong,
  generateMultipleVersions,
  generateVariation,
  analyzeStem,
  detectBPMKey,
  cancelGeneration,
  buildGenerationPrompt,
};


// Navigation links
export const NAV_LINKS = [
  { name: 'Record', path: '/' },
  { name: 'Library', path: '/library' },
];

// Status colors
export const STATUS = {
  RECORDING: 'recording',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  PROCESSING: 'processing',
  READY: 'ready',
};

// Audio settings
export const AUDIO_CONFIG = {
  sampleRate: 44100,
  channels: 1,
  bitDepth: 16,
};

// AI insight types
export const INSIGHT_TYPES = {
  SUMMARY: 'summary',
  ACTION_ITEMS: 'action_items',
  KEY_POINTS: 'key_points',
  QUESTIONS: 'questions',
};

// File upload limits
export const UPLOAD_LIMITS = {
  maxSize: 100 * 1024 * 1024, // 100MB
  acceptedFormats: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/m4a',
  ],
  acceptedExtensions: ['.mp3', '.wav', '.ogg', '.webm', '.m4a'],
};

// Keyboard shortcuts
export const SHORTCUTS = {
  RECORD: 'r',
  PAUSE: 'space',
  STOP: 's',
  NEW: 'n',
};

const mongoose = require('mongoose');

const generationJobSchema = new mongoose.Schema(
  {
    // References
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session is required'],
    },
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
    },
    
    // Status
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'queued',
    },
    
    // Progress
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    currentStage: {
      type: String,
      default: 'Queued',
    },
    
    // Generation stages for UI
    stages: [{
      name: { type: String },
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] },
      startedAt: { type: Date },
      completedAt: { type: Date },
    }],
    
    // Parameters (copy for history)
    params: {
      genre: { type: String },
      mood: [{ type: String }],
      tempo: { type: Number },
      key: { type: String },
      vocalStyle: { type: String },
      instruments: [{ type: String }],
      style: { type: String },
      referenceTrack: { type: String },
      lyricsText: { type: String },
      version: { type: Number },
      versionLabel: { type: String },
    },
    
    // Human inputs to incorporate
    humanInputs: {
      stemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StemUpload' }],
      projectFileUrl: { type: String },
      additionalAudioUrls: [{ type: String }],
      instructions: { type: String },
    },
    
    // AI/Model info
    aiModel: { type: String },
    prompt: { type: String },
    
    // Retry handling
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    
    // Error handling
    error: { type: String },
    errorDetails: { type: mongoose.Schema.Types.Mixed },
    
    // Timing
    startedAt: { type: Date },
    completedAt: { type: Date },
    estimatedDuration: { type: Number }, // seconds
    
    // Result
    resultUrl: { type: String },
    resultMetadata: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
generationJobSchema.index({ session: 1, status: 1 });
generationJobSchema.index({ song: 1 });
generationJobSchema.index({ status: 1, createdAt: 1 });

// Virtual for elapsed time
generationJobSchema.virtual('elapsedTime').get(function () {
  if (!this.startedAt) return 0;
  const end = this.completedAt || new Date();
  return Math.floor((end - this.startedAt) / 1000);
});

// Default stages
const DEFAULT_STAGES = [
  'Analyzing lyrics',
  'Composing melody',
  'Generating arrangement',
  'Creating vocals',
  'Mixing',
  'Mastering',
];

// Pre-save to initialize stages
generationJobSchema.pre('save', function (next) {
  if (this.isNew && (!this.stages || this.stages.length === 0)) {
    this.stages = DEFAULT_STAGES.map(name => ({
      name,
      status: 'pending',
    }));
  }
  next();
});

// Method: Start job
generationJobSchema.methods.start = async function () {
  this.status = 'processing';
  this.startedAt = new Date();
  this.attempts += 1;
  this.currentStage = this.stages[0]?.name || 'Starting';
  
  // Mark first stage as processing
  if (this.stages.length > 0) {
    this.stages[0].status = 'processing';
    this.stages[0].startedAt = new Date();
  }
  
  await this.save();
  return this;
};

// Method: Update progress
generationJobSchema.methods.updateProgress = async function (progress, stageName) {
  this.progress = Math.min(100, Math.max(0, progress));
  
  if (stageName) {
    this.currentStage = stageName;
    
    // Update stage statuses
    let foundCurrent = false;
    for (const stage of this.stages) {
      if (stage.name === stageName) {
        if (stage.status !== 'processing') {
          stage.status = 'processing';
          stage.startedAt = new Date();
        }
        foundCurrent = true;
      } else if (!foundCurrent && stage.status !== 'completed') {
        stage.status = 'completed';
        stage.completedAt = new Date();
      }
    }
  }
  
  await this.save();
  return this;
};

// Method: Complete job
generationJobSchema.methods.complete = async function (resultUrl, metadata = {}) {
  this.status = 'completed';
  this.progress = 100;
  this.completedAt = new Date();
  this.currentStage = 'Complete';
  this.resultUrl = resultUrl;
  this.resultMetadata = metadata;
  
  // Mark all stages as completed
  for (const stage of this.stages) {
    if (stage.status !== 'completed') {
      stage.status = 'completed';
      stage.completedAt = new Date();
    }
  }
  
  await this.save();
  return this;
};

// Method: Fail job
generationJobSchema.methods.fail = async function (error, details = null) {
  this.error = error;
  this.errorDetails = details;
  
  // Mark current stage as failed
  const currentStageIndex = this.stages.findIndex(s => s.status === 'processing');
  if (currentStageIndex >= 0) {
    this.stages[currentStageIndex].status = 'failed';
  }
  
  // Check if we should retry
  if (this.attempts < this.maxAttempts) {
    this.status = 'queued';
    this.progress = 0;
    this.currentStage = 'Queued (retry)';
  } else {
    this.status = 'failed';
    this.completedAt = new Date();
  }
  
  await this.save();
  return this;
};

// Method: Cancel job
generationJobSchema.methods.cancel = async function () {
  this.status = 'cancelled';
  this.completedAt = new Date();
  await this.save();
  return this;
};

// Method: Get public data
generationJobSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    session: this.session,
    song: this.song,
    status: this.status,
    progress: this.progress,
    currentStage: this.currentStage,
    stages: this.stages,
    params: {
      genre: this.params?.genre,
      mood: this.params?.mood,
      tempo: this.params?.tempo,
      vocalStyle: this.params?.vocalStyle,
      versionLabel: this.params?.versionLabel,
    },
    attempts: this.attempts,
    error: this.status === 'failed' ? this.error : undefined,
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    elapsedTime: this.elapsedTime,
    createdAt: this.createdAt,
  };
};

// Static: Get jobs for session
generationJobSchema.statics.getSessionJobs = async function (sessionId) {
  return this.find({ session: sessionId })
    .populate('song', 'title version versionLabel status audioUrl')
    .sort({ createdAt: 1 })
    .lean();
};

const GenerationJob = mongoose.model('GenerationJob', generationJobSchema);

module.exports = GenerationJob;


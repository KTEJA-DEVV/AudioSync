const authController = require('./authController');
const userController = require('./userController');
const sessionController = require('./sessionController');
const lyricsController = require('./lyricsController');
const voteController = require('./voteController');
const healthController = require('./healthController');
const songController = require('./songController');
const stemController = require('./stemController');
const elementController = require('./elementController');
const feedbackController = require('./feedbackController');
const liveSessionController = require('./liveSessionController');
const rewardsController = require('./rewardsController');
const adminController = require('./adminController');

module.exports = {
  ...authController,
  ...userController,
  ...sessionController,
  ...lyricsController,
  ...voteController,
  ...healthController,
  ...songController,
  ...stemController,
  ...elementController,
  ...feedbackController,
  ...liveSessionController,
  ...rewardsController,
  ...adminController,
};

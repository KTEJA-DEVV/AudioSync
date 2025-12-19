const { ModAction } = require('../models');

/**
 * Middleware to automatically log admin/mod actions
 * Use after the action is performed successfully
 * 
 * @param {string} actionType - Type of action being logged
 * @param {Function} getTargetInfo - Function to extract target info from req
 */
const auditLog = (actionType, getTargetInfo) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to log after successful response
    res.json = async function (body) {
      // Only log on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const targetInfo = typeof getTargetInfo === 'function' 
            ? await getTargetInfo(req, body) 
            : getTargetInfo || {};

          await ModAction.create({
            moderator: req.user._id,
            actionType,
            targetType: targetInfo.targetType || 'unknown',
            targetId: targetInfo.targetId || req.params.id,
            targetUser: targetInfo.targetUser,
            reason: req.body.reason || targetInfo.reason,
            details: targetInfo.details || req.body,
            relatedReport: targetInfo.relatedReport,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          });
        } catch (err) {
          console.error('Audit log error:', err.message);
          // Don't fail the request if logging fails
        }
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Helper to create simple audit log entries
 */
const logModAction = async (data) => {
  try {
    await ModAction.create(data);
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = {
  auditLog,
  logModAction,
};


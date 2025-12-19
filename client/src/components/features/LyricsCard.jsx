import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Avatar, Badge, ReputationBadge } from '../ui';
import VotingInterface from './VotingInterface';
import { 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Star,
  Award,
  Trophy,
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const sectionLabels = {
  'intro': 'Intro',
  'verse': 'Verse',
  'pre-chorus': 'Pre-Chorus',
  'chorus': 'Chorus',
  'bridge': 'Bridge',
  'hook': 'Hook',
  'outro': 'Outro',
};

const LyricsCard = ({
  submission,
  showVotes = false,
  votingSystem = 'simple',
  hasVoted = false,
  onVote,
  onRemoveVote,
  onFeedback,
  isVotingOpen = false,
  compact = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  const {
    id,
    content,
    author,
    isAnonymous,
    status,
    ranking,
    votes,
    weightedVoteScore,
    averageRating,
    feedbackCount,
    wordCount,
    lineCount,
  } = submission;

  const displayVotes = showVotes ? (votingSystem === 'weighted' ? weightedVoteScore : votes) : null;

  const getRankingIcon = () => {
    if (!ranking) return null;
    if (ranking === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (ranking === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (ranking === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const handleFeedbackSubmit = () => {
    if (feedbackRating > 0 && onFeedback) {
      onFeedback(id, feedbackRating, feedbackComment);
      setShowFeedbackForm(false);
      setFeedbackRating(0);
      setFeedbackComment('');
    }
  };

  // Format lyrics for display
  const formatLyrics = (text) => {
    if (!text) return null;
    
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line || <br />}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const maxPreviewLines = 6;
  const lyricsLines = content?.fullLyrics?.split('\n') || [];
  const needsExpansion = compact && lyricsLines.length > maxPreviewLines;
  const displayedLyrics = needsExpansion && !isExpanded
    ? lyricsLines.slice(0, maxPreviewLines).join('\n') + '...'
    : content?.fullLyrics;

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-100 overflow-hidden transition-all',
      status === 'winner' && 'ring-2 ring-yellow-400',
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title & Ranking */}
            <div className="flex items-center gap-2 mb-2">
              {getRankingIcon()}
              <h3 className="font-semibold text-gray-900 truncate">
                {content?.title || 'Untitled'}
              </h3>
              {status === 'winner' && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Winner
                </Badge>
              )}
              {status === 'runnerUp' && (
                <Badge variant="default">Runner-up</Badge>
              )}
            </div>

            {/* Author */}
            <div className="flex items-center gap-2">
              {isAnonymous ? (
                <span className="text-sm text-gray-500 italic">Anonymous</span>
              ) : author ? (
                <>
                  <Avatar src={author.avatar} name={author.displayName || author.username} size="sm" />
                  <span className="text-sm text-gray-600">
                    {author.displayName || author.username}
                  </span>
                  {author.reputation?.level && (
                    <ReputationBadge level={author.reputation.level} size="sm" />
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Vote Display */}
          {showVotes && displayVotes !== null && (
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{displayVotes}</p>
              <p className="text-xs text-gray-500">
                {votingSystem === 'weighted' ? 'points' : 'votes'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lyrics Content */}
      <div className="p-4">
        {/* Sections View */}
        {content?.sections && content.sections.length > 0 ? (
          <div className="space-y-4">
            {content.sections.map((section, index) => (
              <div key={index}>
                <Badge variant="default" className="mb-2 text-xs">
                  {sectionLabels[section.type] || section.type}
                </Badge>
                <p className="text-gray-800 whitespace-pre-line font-serif leading-relaxed">
                  {formatLyrics(section.content)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* Full Lyrics View */
          <p className="text-gray-800 whitespace-pre-line font-serif text-lg leading-relaxed">
            {formatLyrics(displayedLyrics)}
          </p>
        )}

        {/* Expand/Collapse Button */}
        {needsExpansion && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 mt-3 text-sm text-indigo-600 hover:text-indigo-700"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" /> Show more ({lyricsLines.length - maxPreviewLines} more lines)
              </>
            )}
          </button>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
          <span>{wordCount || 0} words</span>
          <span>{lineCount || 0} lines</span>
          {averageRating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              {averageRating.toFixed(1)} ({feedbackCount})
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between gap-3">
          {/* Voting */}
          {isVotingOpen && (
            <VotingInterface
              hasVoted={hasVoted}
              votes={displayVotes}
              votingSystem={votingSystem}
              onVote={(value) => onVote?.(id, value)}
              onRemoveVote={() => onRemoveVote?.(id)}
              showCount={showVotes}
            />
          )}

          {/* Feedback Button */}
          <button
            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              showFeedbackForm
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Feedback
          </button>
        </div>

        {/* Feedback Form */}
        {showFeedbackForm && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600">Rating:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFeedbackRating(star)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      'w-5 h-5 transition-colors',
                      star <= feedbackRating
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Share your thoughts (optional)..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={2}
              maxLength={500}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowFeedbackForm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                disabled={feedbackRating === 0}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

LyricsCard.propTypes = {
  submission: PropTypes.shape({
    id: PropTypes.string,
    content: PropTypes.object,
    author: PropTypes.object,
    isAnonymous: PropTypes.bool,
    status: PropTypes.string,
    ranking: PropTypes.number,
    votes: PropTypes.number,
    weightedVoteScore: PropTypes.number,
    hasVoted: PropTypes.bool,
    averageRating: PropTypes.number,
    feedbackCount: PropTypes.number,
    wordCount: PropTypes.number,
    lineCount: PropTypes.number,
  }).isRequired,
  showVotes: PropTypes.bool,
  votingSystem: PropTypes.string,
  hasVoted: PropTypes.bool,
  onVote: PropTypes.func,
  onRemoveVote: PropTypes.func,
  onFeedback: PropTypes.func,
  isVotingOpen: PropTypes.bool,
  compact: PropTypes.bool,
  className: PropTypes.string,
};

export default LyricsCard;


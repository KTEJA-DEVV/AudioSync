import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../utils/helpers';

const LyricsDisplay = ({
  lyrics,
  sections = [],
  showSectionLabels = true,
  showAttribution = true,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = lyrics?.fullLyrics || 
      lyrics?.sections?.map(s => `[${s.label}]\n${s.text}`).join('\n\n') ||
      '';
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format section type to display label
  const getSectionLabel = (type) => {
    const labels = {
      intro: 'Intro',
      verse: 'Verse',
      'pre-chorus': 'Pre-Chorus',
      chorus: 'Chorus',
      bridge: 'Bridge',
      hook: 'Hook',
      outro: 'Outro',
      instrumental: 'Instrumental',
    };
    return labels[type] || type;
  };

  // Render lyrics with sections
  const renderLyrics = () => {
    // If we have structured sections
    if (lyrics?.sections && lyrics.sections.length > 0) {
      return lyrics.sections.map((section, index) => (
        <div key={index} className="mb-6 last:mb-0">
          {showSectionLabels && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                [{section.label || getSectionLabel(section.type)}]
              </span>
              {showAttribution && section.contributor && (
                <span className="text-xs text-gray-400">
                  — {section.contributor.displayName || section.contributor.username}
                </span>
              )}
            </div>
          )}
          <p className="text-gray-800 whitespace-pre-line leading-relaxed">
            {section.text}
          </p>
        </div>
      ));
    }

    // If we have song structure sections
    if (sections && sections.length > 0) {
      return sections.map((section, index) => (
        <div key={index} className="mb-6 last:mb-0">
          {showSectionLabels && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                [{getSectionLabel(section.type) || section.name}]
              </span>
              {showAttribution && section.contributor && (
                <span className="text-xs text-gray-400">
                  — {section.contributor.displayName || section.contributor.username}
                </span>
              )}
            </div>
          )}
          {section.lyricsText && (
            <p className="text-gray-800 whitespace-pre-line leading-relaxed">
              {section.lyricsText}
            </p>
          )}
        </div>
      ));
    }

    // Plain text lyrics
    if (lyrics?.fullLyrics) {
      return (
        <p className="text-gray-800 whitespace-pre-line leading-relaxed">
          {lyrics.fullLyrics}
        </p>
      );
    }

    return (
      <p className="text-gray-500 italic">No lyrics available</p>
    );
  };

  return (
    <div className={cn('bg-white rounded-xl', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Lyrics</h3>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
            copied 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Lyrics Content */}
      <div className="max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300">
        {renderLyrics()}
      </div>

      {/* Attribution Footer */}
      {showAttribution && lyrics?.author && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Written by{' '}
            <span className="font-medium text-gray-700">
              @{lyrics.author.username || lyrics.author}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

LyricsDisplay.propTypes = {
  lyrics: PropTypes.shape({
    fullLyrics: PropTypes.string,
    sections: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      type: PropTypes.string,
      text: PropTypes.string,
      contributor: PropTypes.shape({
        username: PropTypes.string,
        displayName: PropTypes.string,
      }),
    })),
    title: PropTypes.string,
    author: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        username: PropTypes.string,
      }),
    ]),
  }),
  sections: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    type: PropTypes.string,
    lyricsText: PropTypes.string,
    contributor: PropTypes.shape({
      username: PropTypes.string,
      displayName: PropTypes.string,
    }),
  })),
  showSectionLabels: PropTypes.bool,
  showAttribution: PropTypes.bool,
  className: PropTypes.string,
};

export default LyricsDisplay;


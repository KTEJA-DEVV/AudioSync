import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';

// Section colors
const SECTION_COLORS = {
  intro: 'bg-gray-400',
  verse: 'bg-blue-500',
  'pre-chorus': 'bg-cyan-500',
  chorus: 'bg-purple-500',
  bridge: 'bg-green-500',
  hook: 'bg-pink-500',
  outro: 'bg-gray-500',
  instrumental: 'bg-amber-500',
};

const SECTION_LABELS = {
  intro: 'Intro',
  verse: 'Verse',
  'pre-chorus': 'Pre-Chorus',
  chorus: 'Chorus',
  bridge: 'Bridge',
  hook: 'Hook',
  outro: 'Outro',
  instrumental: 'Instrumental',
};

const SongStructureTimeline = ({
  sections = [],
  duration = 0,
  currentTime = 0,
  selectedSection = null,
  onSectionClick,
  onSectionDrag,
  isTechnicalUser = false,
  className = '',
}) => {
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragSection, setDragSection] = useState(null);
  const [hoveredSection, setHoveredSection] = useState(null);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate section width percentage
  const getSectionWidth = (section) => {
    if (duration === 0) return 0;
    const sectionDuration = section.endTime - section.startTime;
    return (sectionDuration / duration) * 100;
  };

  // Get playhead position
  const getPlayheadPosition = () => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  };

  // Handle section click
  const handleSectionClick = (section, index) => {
    if (onSectionClick) {
      onSectionClick(section, index);
    }
  };

  // Handle drag start (technical users only)
  const handleDragStart = (e, section, edge) => {
    if (!isTechnicalUser || !onSectionDrag) return;
    e.preventDefault();
    setIsDragging(true);
    setDragSection({ section, edge });
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging || !dragSection) return;

    const handleMouseMove = (e) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = (x / rect.width) * duration;

      if (onSectionDrag) {
        onSectionDrag(dragSection.section, dragSection.edge, Math.max(0, Math.min(duration, newTime)));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragSection(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragSection, duration, onSectionDrag]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Time markers */}
      <div className="flex justify-between text-xs text-gray-500 px-1">
        <span>0:00</span>
        <span>{formatTime(duration / 4)}</span>
        <span>{formatTime(duration / 2)}</span>
        <span>{formatTime((duration * 3) / 4)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="relative h-12 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex"
      >
        {/* Sections */}
        {sections.map((section, index) => {
          const width = getSectionWidth(section);
          const isSelected = selectedSection?.name === section.name;
          const isHovered = hoveredSection === index;
          const colorClass = SECTION_COLORS[section.type] || 'bg-gray-400';

          return (
            <div
              key={`${section.name}-${index}`}
              className={cn(
                'relative h-full cursor-pointer transition-opacity group',
                colorClass,
                isSelected && 'ring-2 ring-white ring-inset',
                isHovered && 'opacity-90'
              )}
              style={{ width: `${width}%` }}
              onClick={() => handleSectionClick(section, index)}
              onMouseEnter={() => setHoveredSection(index)}
              onMouseLeave={() => setHoveredSection(null)}
            >
              {/* Section label */}
              {width > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium truncate px-1">
                  {SECTION_LABELS[section.type] || section.name}
                </span>
              )}

              {/* Drag handles (technical users only) */}
              {isTechnicalUser && (
                <>
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => handleDragStart(e, section, 'start')}
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => handleDragStart(e, section, 'end')}
                  />
                </>
              )}

              {/* Hover tooltip */}
              {isHovered && (
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {SECTION_LABELS[section.type] || section.name}: {formatTime(section.startTime)} - {formatTime(section.endTime)}
                </div>
              )}
            </div>
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
          style={{ left: `${getPlayheadPosition()}%` }}
        >
          <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-white rounded-full shadow" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {Object.entries(SECTION_COLORS).map(([type, colorClass]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={cn('w-3 h-3 rounded', colorClass)} />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {SECTION_LABELS[type]}
            </span>
          </div>
        ))}
      </div>

      {/* Selected section details */}
      {selectedSection && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-sm mb-2">
            Selected: {SECTION_LABELS[selectedSection.type] || selectedSection.name}
          </h4>
          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Start: {formatTime(selectedSection.startTime)}</span>
            <span>End: {formatTime(selectedSection.endTime)}</span>
            <span>Duration: {formatTime(selectedSection.endTime - selectedSection.startTime)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

SongStructureTimeline.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      startTime: PropTypes.number.isRequired,
      endTime: PropTypes.number.isRequired,
    })
  ),
  duration: PropTypes.number,
  currentTime: PropTypes.number,
  selectedSection: PropTypes.object,
  onSectionClick: PropTypes.func,
  onSectionDrag: PropTypes.func,
  isTechnicalUser: PropTypes.bool,
  className: PropTypes.string,
};

export default SongStructureTimeline;


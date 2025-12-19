import React from 'react';

/**
 * Skip to Main Content Link
 * Accessibility feature for keyboard navigation
 */
const SkipLink = ({ targetId = 'main-content' }) => {
  const handleClick = (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[99999]
        px-4 py-2 
        bg-primary-600 text-white font-medium
        rounded-lg shadow-lg
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        transition-all
      "
    >
      Skip to main content
    </a>
  );
};

export default SkipLink;


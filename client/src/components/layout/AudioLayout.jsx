import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Player } from '../player/Player';
import { useAudio } from '../../hooks/useAudio';
import { X, Maximize2, Minimize2, ChevronUp } from 'lucide-react';

const AudioLayout = () => {
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { currentTrack, isPlaying, togglePlay } = useAudio();
  const location = useLocation();

  // Close drawer when navigating to a new route
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-text-primary">
      {/* Header */}
      <Header onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)} />

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ease-out ${isPlayerExpanded ? 'pb-0' : 'pb-24'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Audio Player */}
      <div className={`fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 transition-all duration-300 ease-out ${
        isPlayerExpanded ? 'h-screen' : 'h-24'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-surface rounded-md overflow-hidden">
                {currentTrack?.cover && (
                  <img 
                    src={currentTrack.cover} 
                    alt={currentTrack.title} 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium">{currentTrack?.title || 'No track selected'}</h4>
                <p className="text-xs text-text-secondary">{currentTrack?.artist || 'Select a track to begin'}</p>
              </div>
            </div>
            <button
              onClick={() => setIsPlayerExpanded(!isPlayerExpanded)}
              className="p-2 text-text-secondary hover:text-text-primary transition-colors"
              aria-label={isPlayerExpanded ? 'Minimize player' : 'Expand player'}
            >
              {isPlayerExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isPlayerExpanded && (
              <div className="py-6">
                <div className="waveform-container my-6">
                  <div className="waveform" style={{ transform: 'scaleX(0.7)' }} />
                </div>
                
                <div className="flex items-center justify-center space-x-6 my-6">
                  <button className="p-3 text-text-secondary hover:text-text-primary transition-colors">
                    <ChevronUp size={20} />
                  </button>
                  <button 
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-hover transition-colors"
                  >
                    {isPlaying ? (
                      <div className="flex space-x-1 w-5 h-5">
                        <span className="block w-1.5 h-full bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                        <span className="block w-1.5 h-full bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="block w-1.5 h-full bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    )}
                  </button>
                  <button className="p-3 text-text-secondary hover:text-text-primary transition-colors">
                    <ChevronUp size={20} className="rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-surface border-l border-border z-50 transform transition-transform duration-300 ease-out ${
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-medium">AI Insights</h3>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close drawer"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              <div className="bg-surface-elevated p-4 rounded-lg">
                <h4 className="text-sm font-medium text-text-secondary mb-2">Key Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {['Product Design', 'User Research', 'Prototyping', 'UI/UX', 'Figma'].map((topic) => (
                    <span key={topic} className="px-3 py-1 bg-surface text-sm rounded-full border border-border">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-surface-elevated p-4 rounded-lg">
                <h4 className="text-sm font-medium text-text-secondary mb-2">Action Items</h4>
                <ul className="space-y-2">
                  {[
                    'Update the login page with new design system',
                    'Review pull request #1234',
                    'Schedule user testing session'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-2" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-surface-elevated p-4 rounded-lg">
                <h4 className="text-sm font-medium text-text-secondary mb-2">Sentiment Analysis</h4>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary" 
                    style={{ width: '75%' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>Negative</span>
                  <span>Positive</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when drawer is open */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
    </div>
  );
};

export default AudioLayout;

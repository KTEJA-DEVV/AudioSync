import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Plus, Trash2, Eye, EyeOff, Type, AlignLeft } from 'lucide-react';
import { Button, Badge } from '../ui';
import { cn } from '../../utils/helpers';

const sectionTypes = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Verse' },
  { value: 'pre-chorus', label: 'Pre-Chorus' },
  { value: 'chorus', label: 'Chorus' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'hook', label: 'Hook' },
  { value: 'outro', label: 'Outro' },
];

const moodOptions = [
  'happy', 'sad', 'energetic', 'chill', 'angry', 
  'romantic', 'inspirational', 'dark', 'uplifting', 'melancholic'
];

const LyricsSubmissionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  sessionInfo = {},
  isLoading = false,
}) => {
  const [mode, setMode] = useState('freeform'); // 'freeform' or 'sections'
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    fullLyrics: '',
    sections: [],
    theme: '',
    inspiration: '',
    targetMood: '',
    isAnonymous: false,
  });

  const maxChars = 5000;
  const charCount = mode === 'freeform' 
    ? formData.fullLyrics.length 
    : formData.sections.reduce((sum, s) => sum + s.content.length, 0);

  const handleAddSection = () => {
    setFormData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        { type: 'verse', content: '' }
      ],
    }));
  };

  const handleRemoveSection = (index) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const handleSectionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) => 
        i === index ? { ...section, [field]: value } : section
      ),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Combine sections into fullLyrics if using section mode
    let finalLyrics = formData.fullLyrics;
    if (mode === 'sections' && formData.sections.length > 0) {
      finalLyrics = formData.sections.map(s => s.content).join('\n\n');
    }

    if (!finalLyrics.trim()) {
      alert('Please enter your lyrics');
      return;
    }

    onSubmit({
      title: formData.title || undefined,
      fullLyrics: finalLyrics,
      sections: mode === 'sections' ? formData.sections : undefined,
      theme: formData.theme || undefined,
      inspiration: formData.inspiration || undefined,
      targetMood: formData.targetMood || undefined,
      isAnonymous: formData.isAnonymous,
    });
  };

  const renderPreview = () => {
    const lyrics = mode === 'freeform' 
      ? formData.fullLyrics 
      : formData.sections.map(s => s.content).join('\n\n');

    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        {formData.title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{formData.title}</h3>
        )}
        
        {mode === 'sections' ? (
          <div className="space-y-4">
            {formData.sections.map((section, index) => (
              <div key={index}>
                <Badge variant="default" className="mb-2 text-xs capitalize">
                  {section.type}
                </Badge>
                <p className="text-gray-800 whitespace-pre-line font-serif leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-800 whitespace-pre-line font-serif leading-relaxed">
            {formData.fullLyrics}
          </p>
        )}

        {(formData.theme || formData.targetMood) && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
            {formData.theme && <p>Theme: {formData.theme}</p>}
            {formData.targetMood && <p>Mood: {formData.targetMood}</p>}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Submit Your Lyrics</h2>
              {sessionInfo.theme && (
                <p className="text-sm text-gray-500">Theme: {sessionInfo.theme}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Mode Toggle */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMode('freeform')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                    mode === 'freeform'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <AlignLeft className="w-4 h-4" />
                  Free Form
                </button>
                <button
                  type="button"
                  onClick={() => setMode('sections')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                    mode === 'sections'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Type className="w-4 h-4" />
                  With Sections
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Give your lyrics a title"
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Lyrics Content */}
              {mode === 'freeform' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your Lyrics
                  </label>
                  <textarea
                    value={formData.fullLyrics}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullLyrics: e.target.value }))}
                    placeholder="Write your lyrics here..."
                    rows={12}
                    maxLength={maxChars}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Lyrics Sections
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddSection}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Section
                    </Button>
                  </div>

                  {formData.sections.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <p className="text-gray-500 mb-2">No sections yet</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddSection}
                      >
                        Add your first section
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.sections.map((section, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <select
                              value={section.type}
                              onChange={(e) => handleSectionChange(index, 'type', e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-200 rounded-md"
                            >
                              {sectionTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(index)}
                              className="ml-auto p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <textarea
                            value={section.content}
                            onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                            placeholder={`Write your ${section.type} here...`}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Character Count */}
              <div className="flex justify-between text-sm">
                <span className={cn(
                  charCount > maxChars * 0.9 ? 'text-red-500' : 'text-gray-500'
                )}>
                  {charCount} / {maxChars} characters
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>

              {/* Preview */}
              {showPreview && renderPreview()}

              {/* Optional Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Theme (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.theme}
                    onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value }))}
                    placeholder="e.g., Love, Freedom"
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Target Mood (optional)
                  </label>
                  <select
                    value={formData.targetMood}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetMood: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select mood</option>
                    {moodOptions.map((mood) => (
                      <option key={mood} value={mood} className="capitalize">
                        {mood.charAt(0).toUpperCase() + mood.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inspiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Inspiration (optional)
                </label>
                <input
                  type="text"
                  value={formData.inspiration}
                  onChange={(e) => setFormData(prev => ({ ...prev, inspiration: e.target.value }))}
                  placeholder="What inspired these lyrics?"
                  maxLength={300}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Anonymous Option */}
              {sessionInfo.allowAnonymous && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isAnonymous}
                    onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">Submit anonymously</span>
                </label>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              disabled={isLoading || charCount === 0}
            >
              {isLoading ? 'Submitting...' : 'Submit Lyrics'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

LyricsSubmissionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  sessionInfo: PropTypes.object,
  isLoading: PropTypes.bool,
};

export default LyricsSubmissionModal;


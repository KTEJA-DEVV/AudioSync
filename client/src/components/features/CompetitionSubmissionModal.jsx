import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';
import { Button, AudioPlayer } from '../ui';
import {
  XMarkIcon,
  CloudArrowUpIcon,
  TrophyIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const CompetitionSubmissionModal = ({
  isOpen,
  onClose,
  onSubmit,
  competition,
}) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [description, setDescription] = useState('');
  const [bpm, setBpm] = useState(competition?.requirements?.bpm || '');
  const [musicalKey, setMusicalKey] = useState(competition?.requirements?.key || '');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/x-m4a'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please select a valid audio file (MP3, WAV, M4A)');
      return;
    }

    // Validate file size
    const maxSize = competition?.requirements?.maxFileSize || 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError('');
  }, [competition]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect({ target: { files: [droppedFile] } });
    }
  }, [handleFileSelect]);

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the terms and conditions');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setError('');

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // In real app, upload file and get URL
      await new Promise(resolve => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Mock audio URL
      const mockAudioUrl = previewUrl;

      await onSubmit?.({
        audioUrl: mockAudioUrl,
        description,
        metadata: {
          bpm: bpm ? parseInt(bpm) : null,
          key: musicalKey || null,
          filename: file.name,
        },
      });

      // Close modal
      handleClose();
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setDescription('');
    setBpm('');
    setMusicalKey('');
    setTermsAccepted(false);
    setUploadProgress(0);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Enter Competition
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Competition info */}
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <h3 className="font-medium text-indigo-900 dark:text-indigo-100 mb-1">
              {competition?.title}
            </h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Element: {competition?.elementType}
            </p>
          </div>

          {/* Guidelines */}
          {competition?.guidelines && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">
                Guidelines
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {competition.guidelines}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* File upload */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Drop your audio file here
              </p>
              <p className="text-sm text-gray-500">or click to browse</p>
              {competition?.requirements && (
                <div className="mt-3 text-xs text-gray-400 space-y-1">
                  {competition.requirements.bpm && (
                    <p>Required BPM: {competition.requirements.bpm}</p>
                  )}
                  {competition.requirements.key && (
                    <p>Required Key: {competition.requirements.key}</p>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(previewUrl);
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>

              {/* Preview player */}
              {previewUrl && (
                <AudioPlayer src={previewUrl} compact className="bg-gray-900" />
              )}
            </div>
          )}

          {/* Metadata inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                BPM {competition?.requirements?.bpm && `(Required: ${competition.requirements.bpm})`}
              </label>
              <input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                placeholder="120"
                min="40"
                max="220"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Key {competition?.requirements?.key && `(Required: ${competition.requirements.key})`}
              </label>
              <select
                value={musicalKey}
                onChange={(e) => setMusicalKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">Select key...</option>
                <option value="C Major">C Major</option>
                <option value="C Minor">C Minor</option>
                <option value="D Major">D Major</option>
                <option value="D Minor">D Minor</option>
                <option value="E Major">E Major</option>
                <option value="E Minor">E Minor</option>
                <option value="F Major">F Major</option>
                <option value="F Minor">F Minor</option>
                <option value="G Major">G Major</option>
                <option value="G Minor">G Minor</option>
                <option value="A Major">A Major</option>
                <option value="A Minor">A Minor</option>
                <option value="B Major">B Major</option>
                <option value="B Minor">B Minor</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your submission..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 resize-none"
            />
            <p className="text-xs text-gray-500 text-right mt-1">
              {description.length}/500
            </p>
          </div>

          {/* Terms acceptance */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-4 h-4 mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              I confirm this is my original work and I grant CrowdBeat the right to use it 
              in the session's final song if selected.
            </span>
          </label>

          {/* Upload progress */}
          {isSubmitting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || !termsAccepted || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Entry'}
          </Button>
        </div>
      </div>
    </div>
  );
};

CompetitionSubmissionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  competition: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    elementType: PropTypes.string,
    guidelines: PropTypes.string,
    requirements: PropTypes.shape({
      bpm: PropTypes.number,
      key: PropTypes.string,
      maxFileSize: PropTypes.number,
    }),
  }),
};

export default CompetitionSubmissionModal;


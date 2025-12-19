import React, { useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';
import { Button, AudioPlayer } from '../ui';
import {
  XMarkIcon,
  CloudArrowUpIcon,
  MusicalNoteIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const STEM_TYPES = [
  { value: 'drums', label: 'Drums', icon: '🥁' },
  { value: 'bass', label: 'Bass', icon: '🎸' },
  { value: 'melody', label: 'Melody', icon: '🎹' },
  { value: 'vocals', label: 'Vocals', icon: '🎤' },
  { value: 'synth', label: 'Synth', icon: '🎛️' },
  { value: 'guitar', label: 'Guitar', icon: '🎸' },
  { value: 'piano', label: 'Piano', icon: '🎹' },
  { value: 'other', label: 'Other', icon: '🎵' },
];

const StemUploadModal = ({
  isOpen,
  onClose,
  onUpload,
  sessionId,
}) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [type, setType] = useState('melody');
  const [bpm, setBpm] = useState('');
  const [musicalKey, setMusicalKey] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/x-m4a', 'audio/mp4'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please select a valid audio file (MP3, WAV, M4A)');
      return;
    }

    // Validate file size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError('');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // Create a synthetic event to reuse handleFileSelect
      handleFileSelect({ target: { files: [droppedFile] } });
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDetectBPMKey = async () => {
    if (!file) return;
    
    setIsDetecting(true);
    try {
      // Simulated detection (in real app, this would call the API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      setBpm(String(100 + Math.floor(Math.random() * 40)));
      setMusicalKey(['C Major', 'A Minor', 'G Major', 'E Minor', 'D Major'][Math.floor(Math.random() * 5)]);
    } catch (err) {
      setError('Failed to detect BPM/Key');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // In real app, upload file to S3/storage and get URL
      // For demo, we'll simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Mock audio URL (in real app, this comes from upload response)
      const mockAudioUrl = previewUrl;

      await onUpload?.({
        type,
        audioUrl: mockAudioUrl,
        filename: file.name,
        description,
        bpm: bpm ? parseInt(bpm) : null,
        key: musicalKey || null,
        duration: 30, // Would be detected from audio
      });

      // Reset form and close
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setType('melody');
    setBpm('');
    setMusicalKey('');
    setDescription('');
    setUploadProgress(0);
    setError('');
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MusicalNoteIcon className="w-5 h-5 text-indigo-600" />
            Upload Stem
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Drag-drop zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Drag and drop your audio file here
              </p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">MP3, WAV, M4A (max 50MB)</p>
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
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                    <MusicalNoteIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-5 h-5 text-red-500" />
                </button>
              </div>

              {/* Preview player */}
              {previewUrl && (
                <AudioPlayer src={previewUrl} compact className="bg-gray-900" />
              )}
            </div>
          )}

          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stem Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {STEM_TYPES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={cn(
                    'p-3 rounded-lg border-2 text-center transition-all',
                    type === value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500'
                      : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300'
                  )}
                >
                  <span className="text-xl mb-1 block">{icon}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BPM and Key inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                BPM
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  placeholder="120"
                  min="40"
                  max="220"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Key
              </label>
              <select
                value={musicalKey}
                onChange={(e) => setMusicalKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

          {/* Detect button */}
          {file && (
            <button
              onClick={handleDetectBPMKey}
              disabled={isDetecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={cn('w-4 h-4', isDetecting && 'animate-spin')} />
              {isDetecting ? 'Detecting...' : 'Auto-Detect BPM & Key'}
            </button>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your stem (e.g., 'Funky bass line with slap technique')"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 text-right mt-1">
              {description.length}/500
            </p>
          </div>

          {/* Upload progress */}
          {isUploading && (
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
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="min-w-[120px]"
          >
            {isUploading ? 'Uploading...' : 'Upload Stem'}
          </Button>
        </div>
      </div>
    </div>
  );
};

StemUploadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpload: PropTypes.func,
  sessionId: PropTypes.string,
};

export default StemUploadModal;


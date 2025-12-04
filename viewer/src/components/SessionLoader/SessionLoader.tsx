/**
 * Session Loader Component
 * Handles importing sessions from zip files or directories
 */

import { useRef, useState } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { importSessionFromZip } from '@/utils/zipHandler';
import { loadSessionFromFiles } from '@/utils/sessionLoader';
import './SessionLoader.css';

export const SessionLoader = () => {
  const loadSession = useSessionStore((state) => state.loadSession);
  const setLoading = useSessionStore((state) => state.setLoading);
  const setError = useSessionStore((state) => state.setError);
  const sessionData = useSessionStore((state) => state.sessionData);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleZipImport = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const loadedData = await importSessionFromZip(file);
      loadSession(loadedData);

      console.log('Session loaded successfully:', loadedData.sessionData.sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load session';
      setError(message);
      console.error('Session load error:', error);
    }
  };

  const handleFilesImport = async (files: FileList) => {
    try {
      setLoading(true);
      setError(null);

      const loadedData = await loadSessionFromFiles(files);
      loadSession(loadedData);

      console.log('Session loaded successfully:', loadedData.sessionData.sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load session';
      setError(message);
      console.error('Session load error:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if it's a single zip file
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
      await handleZipImport(files[0]);
    } else {
      // Multiple files from directory
      await handleFilesImport(files);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Check if it's a single zip file
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
      await handleZipImport(files[0]);
    } else {
      await handleFilesImport(files);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  if (sessionData) {
    return null; // Hide loader when session is loaded
  }

  return (
    <div className="session-loader">
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.json"
        multiple
        onChange={handleFileSelect}
        className="session-loader-input"
      />

      <div
        className={`session-loader-dropzone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="session-loader-content">
          <svg className="session-loader-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>

          <h2>Import Session Recording</h2>
          <p className="session-loader-description">
            Drag and drop a session zip file here, or click to browse
          </p>

          <button type="button" className="session-loader-button" onClick={handleButtonClick}>
            Choose File
          </button>

          <p className="session-loader-hint">
            Supports: .zip archives or multiple session files
          </p>
        </div>
      </div>
    </div>
  );
};

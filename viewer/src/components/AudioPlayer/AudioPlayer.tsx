/**
 * AudioPlayer Component
 * Dual-stream audio player for voice (microphone) and system (display) audio
 * Supports toggling between sources, volume controls, and synchronized seeking
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import './AudioPlayer.css';

export type AudioSource = 'both' | 'voice' | 'system';

interface AudioPlayerProps {
  /** Initial audio source mode */
  initialSource?: AudioSource;
  /** Called when current playback time changes */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when playback state changes */
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export const AudioPlayer = ({
  initialSource = 'both',
  onTimeUpdate,
  onPlayStateChange,
}: AudioPlayerProps) => {
  const audioBlob = useSessionStore((state) => state.audioBlob);
  const systemAudioBlob = useSessionStore((state) => state.systemAudioBlob);
  const sessionData = useSessionStore((state) => state.sessionData);

  // Audio element refs
  const voiceAudioRef = useRef<HTMLAudioElement>(null);
  const systemAudioRef = useRef<HTMLAudioElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Source selection
  const [activeSource, setActiveSource] = useState<AudioSource>(initialSource);

  // Volume controls (0-1)
  const [voiceVolume, setVoiceVolume] = useState(1);
  const [systemVolume, setSystemVolume] = useState(1);
  const [masterVolume, setMasterVolume] = useState(1);

  // Playback rate
  const [playbackRate, setPlaybackRate] = useState(1);

  // Create object URLs for audio blobs
  const voiceUrl = useMemo(() => {
    return audioBlob ? URL.createObjectURL(audioBlob) : null;
  }, [audioBlob]);

  const systemUrl = useMemo(() => {
    return systemAudioBlob ? URL.createObjectURL(systemAudioBlob) : null;
  }, [systemAudioBlob]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (voiceUrl) URL.revokeObjectURL(voiceUrl);
      if (systemUrl) URL.revokeObjectURL(systemUrl);
    };
  }, [voiceUrl, systemUrl]);

  // Check what audio sources are available
  const hasVoice = !!audioBlob;
  const hasSystem = !!systemAudioBlob;
  const hasBoth = hasVoice && hasSystem;
  const hasAny = hasVoice || hasSystem;

  // Determine effective source based on availability
  const effectiveSource = useMemo(() => {
    if (activeSource === 'both') {
      if (hasBoth) return 'both';
      if (hasVoice) return 'voice';
      if (hasSystem) return 'system';
    }
    if (activeSource === 'voice' && hasVoice) return 'voice';
    if (activeSource === 'system' && hasSystem) return 'system';
    // Fallback
    if (hasVoice) return 'voice';
    if (hasSystem) return 'system';
    return 'both';
  }, [activeSource, hasVoice, hasSystem, hasBoth]);

  // Setup audio event handlers
  useEffect(() => {
    const voiceAudio = voiceAudioRef.current;
    const systemAudio = systemAudioRef.current;

    const handleTimeUpdate = () => {
      // Use the primary audio element for time tracking
      const primaryAudio = effectiveSource === 'system' ? systemAudio : voiceAudio;
      if (primaryAudio) {
        setCurrentTime(primaryAudio.currentTime);
        onTimeUpdate?.(primaryAudio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      // Get duration from the longest audio
      const voiceDuration = voiceAudio?.duration || 0;
      const systemDuration = systemAudio?.duration || 0;
      setDuration(Math.max(voiceDuration, systemDuration));
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    // Add event listeners
    if (voiceAudio) {
      voiceAudio.addEventListener('timeupdate', handleTimeUpdate);
      voiceAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
      voiceAudio.addEventListener('play', handlePlay);
      voiceAudio.addEventListener('pause', handlePause);
      voiceAudio.addEventListener('ended', handleEnded);
    }

    if (systemAudio) {
      systemAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
      // Only add ended listener to system audio if it's the primary source
      if (effectiveSource === 'system') {
        systemAudio.addEventListener('timeupdate', handleTimeUpdate);
        systemAudio.addEventListener('play', handlePlay);
        systemAudio.addEventListener('pause', handlePause);
        systemAudio.addEventListener('ended', handleEnded);
      }
    }

    return () => {
      if (voiceAudio) {
        voiceAudio.removeEventListener('timeupdate', handleTimeUpdate);
        voiceAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        voiceAudio.removeEventListener('play', handlePlay);
        voiceAudio.removeEventListener('pause', handlePause);
        voiceAudio.removeEventListener('ended', handleEnded);
      }
      if (systemAudio) {
        systemAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        systemAudio.removeEventListener('timeupdate', handleTimeUpdate);
        systemAudio.removeEventListener('play', handlePlay);
        systemAudio.removeEventListener('pause', handlePause);
        systemAudio.removeEventListener('ended', handleEnded);
      }
    };
  }, [effectiveSource, onTimeUpdate, onPlayStateChange]);

  // Update volumes when they change
  useEffect(() => {
    if (voiceAudioRef.current) {
      const shouldMute = effectiveSource === 'system';
      voiceAudioRef.current.volume = shouldMute ? 0 : voiceVolume * masterVolume;
    }
    if (systemAudioRef.current) {
      const shouldMute = effectiveSource === 'voice';
      systemAudioRef.current.volume = shouldMute ? 0 : systemVolume * masterVolume;
    }
  }, [voiceVolume, systemVolume, masterVolume, effectiveSource]);

  // Update playback rate when it changes
  useEffect(() => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.playbackRate = playbackRate;
    }
    if (systemAudioRef.current) {
      systemAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Play/pause controls
  const handlePlayPause = async () => {
    const voiceAudio = voiceAudioRef.current;
    const systemAudio = systemAudioRef.current;

    if (isPlaying) {
      voiceAudio?.pause();
      systemAudio?.pause();
    } else {
      // Play both in sync
      const playPromises: Promise<void>[] = [];

      if (voiceAudio && effectiveSource !== 'system') {
        playPromises.push(voiceAudio.play());
      }
      if (systemAudio && effectiveSource !== 'voice') {
        playPromises.push(systemAudio.play());
      }

      try {
        await Promise.all(playPromises);
      } catch (error) {
        console.warn('Audio playback error:', error);
      }
    }
  };

  // Stop controls
  const handleStop = () => {
    const voiceAudio = voiceAudioRef.current;
    const systemAudio = systemAudioRef.current;

    if (voiceAudio) {
      voiceAudio.pause();
      voiceAudio.currentTime = 0;
    }
    if (systemAudio) {
      systemAudio.pause();
      systemAudio.currentTime = 0;
    }
    setCurrentTime(0);
  };

  // Seek to specific time
  const handleSeek = (newTime: number) => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.currentTime = newTime;
    }
    if (systemAudioRef.current) {
      systemAudioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    handleSeek(newTime);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Source change handler
  const handleSourceChange = async (source: AudioSource) => {
    const wasPlaying = isPlaying;

    // Pause both
    voiceAudioRef.current?.pause();
    systemAudioRef.current?.pause();

    setActiveSource(source);

    // Resume if was playing
    if (wasPlaying) {
      // Small delay to let state update
      setTimeout(async () => {
        if (source === 'both' || source === 'voice') {
          voiceAudioRef.current?.play();
        }
        if (source === 'both' || source === 'system') {
          systemAudioRef.current?.play();
        }
      }, 50);
    }
  };

  if (!hasAny) {
    return (
      <div className="audio-player audio-player-empty">
        <p>No audio recordings available</p>
      </div>
    );
  }

  return (
    <div className="audio-player">
      {/* Hidden audio elements */}
      {voiceUrl && (
        <audio ref={voiceAudioRef} src={voiceUrl} preload="metadata" />
      )}
      {systemUrl && (
        <audio ref={systemAudioRef} src={systemUrl} preload="metadata" />
      )}

      {/* Audio source info */}
      <div className="audio-player-header">
        <div className="audio-sources-info">
          {hasVoice && (
            <span className="source-indicator voice-indicator">
              🎤 Voice {sessionData?.voiceRecording?.duration
                ? `(${(sessionData.voiceRecording.duration / 1000).toFixed(1)}s)`
                : ''}
            </span>
          )}
          {hasSystem && (
            <span className="source-indicator system-indicator">
              🔊 System {sessionData?.systemAudioRecording?.duration
                ? `(${(sessionData.systemAudioRecording.duration / 1000).toFixed(1)}s)`
                : ''}
            </span>
          )}
        </div>
      </div>

      {/* Source selection buttons */}
      {hasBoth && (
        <div className="audio-source-selector">
          <button
            type="button"
            className={`source-btn ${activeSource === 'both' ? 'active' : ''}`}
            onClick={() => handleSourceChange('both')}
            title="Play both voice and system audio"
          >
            Both
          </button>
          <button
            type="button"
            className={`source-btn ${activeSource === 'voice' ? 'active' : ''}`}
            onClick={() => handleSourceChange('voice')}
            title="Play voice (microphone) only"
          >
            🎤 Voice Only
          </button>
          <button
            type="button"
            className={`source-btn ${activeSource === 'system' ? 'active' : ''}`}
            onClick={() => handleSourceChange('system')}
            title="Play system (display) audio only"
          >
            🔊 System Only
          </button>
        </div>
      )}

      {/* Main controls */}
      <div className="audio-controls">
        <button
          type="button"
          className="control-btn play-pause-btn"
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        <button
          type="button"
          className="control-btn stop-btn"
          onClick={handleStop}
          title="Stop"
        >
          ⏹️
        </button>

        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span className="time-separator">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="playback-rate-control">
          <label htmlFor="audio-playback-rate">Speed:</label>
          <select
            id="audio-playback-rate"
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="audio-progress-container"
        onClick={handleProgressClick}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
      >
        <div
          className="audio-progress-bar"
          style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
        />
      </div>

      {/* Volume controls */}
      <div className="audio-volume-controls">
        <div className="volume-control master-volume">
          <span className="volume-label">🔊 Master</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="volume-slider"
          />
          <span className="volume-value">{Math.round(masterVolume * 100)}%</span>
        </div>

        {hasBoth && effectiveSource === 'both' && (
          <>
            <div className="volume-control voice-volume">
              <span className="volume-label">🎤 Voice</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceVolume}
                onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                className="volume-slider"
              />
              <span className="volume-value">{Math.round(voiceVolume * 100)}%</span>
            </div>

            <div className="volume-control system-volume">
              <span className="volume-label">🔊 System</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={systemVolume}
                onChange={(e) => setSystemVolume(parseFloat(e.target.value))}
                className="volume-slider"
              />
              <span className="volume-value">{Math.round(systemVolume * 100)}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Voice Transcript Viewer Component
 * Displays voice transcript with word-level highlighting and audio playback
 */

import { useRef, useState, useEffect } from 'react';
import type { VoiceTranscriptAction } from '@/types/session';
import './VoiceTranscriptViewer.css';

interface Props {
  voiceAction: VoiceTranscriptAction;
  audioUrl: string | null;
}

export const VoiceTranscriptViewer = ({ voiceAction, audioUrl }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Highlight current word based on audio playback position
      if (voiceAction.transcript.words && voiceAction.transcript.words.length > 0) {
        const segmentStart = new Date(voiceAction.transcript.startTime).getTime();
        const currentAbsTime = segmentStart + audio.currentTime * 1000;

        const idx = voiceAction.transcript.words.findIndex(w => {
          const wordStart = new Date(w.startTime).getTime();
          const wordEnd = new Date(w.endTime).getTime();
          return currentAbsTime >= wordStart && currentAbsTime <= wordEnd;
        });

        setCurrentWordIndex(idx >= 0 ? idx : null);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentWordIndex(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [voiceAction]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleWordClick = (wordIndex: number) => {
    const audio = audioRef.current;
    if (!audio || !voiceAction.transcript.words) return;

    const word = voiceAction.transcript.words[wordIndex];
    const segmentStart = new Date(voiceAction.transcript.startTime).getTime();
    const wordStart = new Date(word.startTime).getTime();
    const relativeTime = (wordStart - segmentStart) / 1000;

    audio.currentTime = relativeTime;
    audio.play();
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentWordIndex(null);
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(voiceAction.transcript.text);
  };

  const getTranscriptDuration = () => {
    const start = new Date(voiceAction.transcript.startTime).getTime();
    const end = new Date(voiceAction.transcript.endTime).getTime();
    return ((end - start) / 1000).toFixed(1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-transcript-viewer">
      <div className="voice-header">
        <div className="voice-meta">
          <span className="voice-meta-item">
            <strong>Duration:</strong> {getTranscriptDuration()}s
          </span>
          <span className="voice-meta-item">
            <strong>Confidence:</strong> {(voiceAction.transcript.confidence * 100).toFixed(0)}%
          </span>
          {voiceAction.transcript.words && (
            <span className="voice-meta-item">
              <strong>Words:</strong> {voiceAction.transcript.words.length}
            </span>
          )}
        </div>
        <button type="button" className="copy-btn" onClick={copyTranscript} title="Copy transcript">
          📋 Copy
        </button>
      </div>

      <div className="transcript-text">
        {voiceAction.transcript.words && voiceAction.transcript.words.length > 0 ? (
          voiceAction.transcript.words.map((word, idx) => (
            <span
              key={idx}
              className={`word ${idx === currentWordIndex ? 'active' : ''}`}
              onClick={() => handleWordClick(idx)}
              title={`${(word.probability * 100).toFixed(0)}% confidence`}
            >
              {word.word}{' '}
            </span>
          ))
        ) : (
          <p className="transcript-fallback">{voiceAction.transcript.text}</p>
        )}
      </div>

      {audioUrl && (
        <div className="audio-player">
          <audio ref={audioRef} src={audioUrl} preload="metadata">
            Your browser does not support the audio element.
          </audio>

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
              <span>{getTranscriptDuration()}s</span>
            </div>

            <div className="playback-rate">
              <label htmlFor="playback-rate">Speed:</label>
              <select
                id="playback-rate"
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

          <div className="audio-progress">
            <div
              className="audio-progress-bar"
              style={{
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
              }}
            />
          </div>
        </div>
      )}

      {!audioUrl && (
        <div className="no-audio-message">
          <p>⚠️ Audio file not available</p>
        </div>
      )}
    </div>
  );
};

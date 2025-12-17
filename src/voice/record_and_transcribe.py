#!/usr/bin/env python3
"""
Audio recording and transcription script for SessionRecorder
Handles both recording audio from microphone AND transcription using Whisper

TR-1: Supports MP3 output with configurable bitrate and sample rate
"""

import sys
import json
import argparse
import signal
import subprocess
import shutil
from pathlib import Path
from datetime import datetime, timezone
import time

# Only import recording dependencies at startup (fast imports)
try:
    import sounddevice as sd
    import soundfile as sf
    import numpy as np
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Recording packages not installed. Run: pip install sounddevice soundfile numpy\nMissing: {str(e)}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), flush=True)
    sys.exit(1)

# Whisper and torch are imported lazily when transcription starts
# This allows recording to start immediately without waiting for torch to load


def convert_wav_to_mp3(wav_path: str, mp3_path: str, bitrate: str = "64k",
                       sample_rate: int = 22050) -> dict:
    """
    Convert WAV to MP3 using ffmpeg (TR-1 compression)

    Args:
        wav_path: Path to input WAV file
        mp3_path: Path to output MP3 file
        bitrate: MP3 bitrate (e.g., "64k", "128k")
        sample_rate: Output sample rate (default: 22050 Hz)

    Returns:
        dict with success status and file info
    """
    # Check if ffmpeg is available
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        return {
            "success": False,
            "error": "ffmpeg not found. Install ffmpeg to enable MP3 conversion.",
            "fallback": wav_path
        }

    try:
        print(json.dumps({
            "type": "status",
            "message": f"Converting to MP3 ({bitrate}, {sample_rate}Hz)...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        # ffmpeg command: convert to mono MP3 with specified bitrate and sample rate
        cmd = [
            ffmpeg_path,
            "-i", wav_path,
            "-ac", "1",  # Mono
            "-ar", str(sample_rate),  # Sample rate
            "-b:a", bitrate,  # Audio bitrate
            "-y",  # Overwrite output
            mp3_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"ffmpeg conversion failed: {result.stderr}",
                "fallback": wav_path
            }

        # Get file sizes for comparison
        wav_size = Path(wav_path).stat().st_size
        mp3_size = Path(mp3_path).stat().st_size
        compression_ratio = wav_size / mp3_size if mp3_size > 0 else 0

        print(json.dumps({
            "type": "status",
            "message": f"MP3 conversion complete. Compression ratio: {compression_ratio:.1f}x",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        return {
            "success": True,
            "mp3_path": mp3_path,
            "wav_size": wav_size,
            "mp3_size": mp3_size,
            "compression_ratio": compression_ratio
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "ffmpeg conversion timed out",
            "fallback": wav_path
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"MP3 conversion error: {str(e)}",
            "fallback": wav_path
        }


class AudioRecorder:
    """Handles audio recording from microphone"""

    def __init__(self, sample_rate=16000, channels=1):
        self.sample_rate = sample_rate
        self.channels = channels
        self.recording = False
        self.frames = []

    def audio_callback(self, indata, frames, time_info, status):
        """Callback for audio stream"""
        if status:
            print(json.dumps({
                "type": "warning",
                "message": f"Audio status: {status}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), file=sys.stderr, flush=True)

        if self.recording:
            self.frames.append(indata.copy())

    def start_recording(self):
        """Start recording audio"""
        self.recording = True
        self.frames = []

        # Create audio stream
        self.stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            callback=self.audio_callback,
            dtype=np.int16
        )

        self.stream.start()

        # Capture the exact moment recording starts (for timestamp alignment)
        recording_start = datetime.now(timezone.utc)
        self.recording_start_time = recording_start

        print(json.dumps({
            "type": "status",
            "message": "Recording started",
            "timestamp": recording_start.isoformat(),
            "recording_start_time": int(recording_start.timestamp() * 1000)  # Epoch ms for Node.js
        }), flush=True)

    def stop_recording(self, output_path):
        """Stop recording and save to file"""
        self.recording = False

        if hasattr(self, 'stream'):
            self.stream.stop()
            self.stream.close()

        # Concatenate all frames
        if not self.frames:
            return {
                "success": False,
                "error": "No audio data recorded",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        audio_data = np.concatenate(self.frames, axis=0)

        # Save to WAV file
        try:
            sf.write(output_path, audio_data, self.sample_rate)

            print(json.dumps({
                "type": "status",
                "message": f"Recording saved to {output_path}",
                "duration": len(audio_data) / self.sample_rate,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), flush=True)

            return {
                "success": True,
                "audio_path": str(output_path),
                "duration": len(audio_data) / self.sample_rate,
                "sample_rate": self.sample_rate,
                "channels": self.channels
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to save audio: {str(e)}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }


def detect_device(torch_module):
    """Detect available compute device (CUDA/MPS/CPU)"""
    if torch_module.cuda.is_available():
        return "cuda"
    elif hasattr(torch_module.backends, "mps") and \
            torch_module.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"


def transcribe_audio(audio_path: str, model_size: str = "base",
                     device: str = None) -> dict:
    """
    Transcribe audio file using Whisper

    Args:
        audio_path: Path to audio file
        model_size: Whisper model size (tiny, base, small, medium, large)
        device: Device to use (cuda, mps, cpu) - auto-detects if None

    Returns:
        dict with success, segments, words, metadata
    """
    try:
        # Import whisper and torch lazily (these are slow to import)
        print(json.dumps({
            "type": "status",
            "message": "Loading transcription libraries...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        import torch
        import whisper

        # Auto-detect device if not specified
        if device is None:
            device = detect_device(torch)

        print(json.dumps({
            "type": "status",
            "message": f"Loading Whisper model '{model_size}' on {device}...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        # Load model
        model = whisper.load_model(model_size, device=device)

        print(json.dumps({
            "type": "status",
            "message": "Transcribing audio...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        # Transcribe with word-level timestamps
        result = model.transcribe(
            audio_path,
            word_timestamps=True,
            verbose=False
        )

        # Extract segments with word-level data
        segments = []
        all_words = []

        for segment in result.get("segments", []):
            segment_data = {
                "id": segment.get("id"),
                "start": segment.get("start"),
                "end": segment.get("end"),
                "text": segment.get("text", "").strip(),
                "confidence": segment.get("avg_logprob", 0.0)
            }

            # Extract word-level timestamps
            words = []
            if "words" in segment:
                for word_data in segment.get("words", []):
                    word = {
                        "word": word_data.get("word", "").strip(),
                        "start": word_data.get("start"),
                        "end": word_data.get("end"),
                        "probability": word_data.get("probability", 1.0)
                    }
                    words.append(word)
                    all_words.append(word)

            segment_data["words"] = words
            segments.append(segment_data)

        return {
            "success": True,
            "text": result.get("text", "").strip(),
            "language": result.get("language", "unknown"),
            "duration": result.get("duration", 0.0),
            "segments": segments,
            "words": all_words,
            "device": device,
            "model": model_size,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Transcription failed: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


def main():
    parser = argparse.ArgumentParser(description="Record audio and transcribe using Whisper")
    parser.add_argument("output_path", help="Path to save audio recording (WAV or MP3), or existing audio file with --transcribe-only")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium", "large"],
                        help="Whisper model size (default: base)")
    parser.add_argument("--device", choices=["cuda", "mps", "cpu"],
                        help="Device to use for transcription (auto-detects if not specified)")
    parser.add_argument("--sample-rate", type=int, default=16000,
                        help="Sample rate for recording (default: 16000)")
    parser.add_argument("--channels", type=int, default=1,
                        help="Number of audio channels (default: 1)")
    # TR-1: MP3 conversion options
    parser.add_argument("--output-format", default="wav", choices=["wav", "mp3"],
                        help="Output audio format (default: wav, use mp3 for smaller files)")
    parser.add_argument("--mp3-bitrate", default="64k",
                        help="MP3 bitrate (default: 64k, TR-1 target)")
    parser.add_argument("--mp3-sample-rate", type=int, default=22050,
                        help="MP3 sample rate (default: 22050 Hz, TR-1 target)")
    # FEAT-04: Transcribe-only mode for existing audio files
    parser.add_argument("--transcribe-only", action="store_true",
                        help="Skip recording, just transcribe existing audio file")
    parser.add_argument("--transcript-output", type=str, default=None,
                        help="Path to save transcript JSON (default: {audio_path}-transcript.json)")

    args = parser.parse_args()

    # Handle transcribe-only mode (FEAT-04)
    if args.transcribe_only:
        audio_path = Path(args.output_path)

        if not audio_path.exists():
            print(json.dumps({
                "success": False,
                "error": f"Audio file not found: {audio_path}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), flush=True)
            sys.exit(1)

        print(json.dumps({
            "type": "status",
            "message": f"Transcribe-only mode: {audio_path}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        # Transcribe the audio file
        transcription_result = transcribe_audio(
            str(audio_path),
            model_size=args.model,
            device=args.device
        )

        # Add audio path to result
        transcription_result["audio_path"] = str(audio_path)

        # Output result
        print(json.dumps(transcription_result), flush=True)

        # Optionally save to file
        if args.transcript_output:
            transcript_path = Path(args.transcript_output)
            transcript_path.parent.mkdir(parents=True, exist_ok=True)
            transcript_path.write_text(json.dumps(transcription_result, indent=2))
            print(json.dumps({
                "type": "status",
                "message": f"Transcript saved to {transcript_path}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), flush=True)

        sys.exit(0 if transcription_result["success"] else 1)

    # Create output directory if needed
    output_path = Path(args.output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Create recorder
    recorder = AudioRecorder(sample_rate=args.sample_rate, channels=args.channels)

    # Start recording
    recorder.start_recording()

    # Keep running until signal received or stdin closes (for Windows)
    print(json.dumps({
        "type": "ready",
        "message": "Recording... Send SIGINT/SIGTERM to stop",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), flush=True)

    # Flag to track if we're stopping
    stopping = False

    def handle_stop():
        """Handle stop - called from signal handler or stdin monitor"""
        nonlocal stopping
        if stopping:
            return
        stopping = True

        print(json.dumps({
            "type": "status",
            "message": "Stopping recording...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        # Stop recording
        record_result = recorder.stop_recording(output_path)

        if not record_result["success"]:
            print(json.dumps(record_result), flush=True)
            sys.exit(1)

        # Transcribe the recorded audio (always use WAV for transcription)
        transcription_result = transcribe_audio(
            str(output_path),
            model_size=args.model,
            device=args.device
        )

        # TR-1: Convert to MP3 if requested
        final_audio_path = str(output_path)
        mp3_conversion = None

        if args.output_format == "mp3":
            mp3_path = str(output_path).replace(".wav", ".mp3")
            if mp3_path == str(output_path):
                mp3_path = str(output_path) + ".mp3"

            mp3_result = convert_wav_to_mp3(
                str(output_path),
                mp3_path,
                bitrate=args.mp3_bitrate,
                sample_rate=args.mp3_sample_rate
            )

            if mp3_result["success"]:
                final_audio_path = mp3_result["mp3_path"]
                mp3_conversion = {
                    "converted": True,
                    "format": "mp3",
                    "bitrate": args.mp3_bitrate,
                    "sample_rate": args.mp3_sample_rate,
                    "compression_ratio": mp3_result.get("compression_ratio", 0),
                    "original_size": mp3_result.get("wav_size", 0),
                    "compressed_size": mp3_result.get("mp3_size", 0)
                }

                Path(output_path).unlink()
            else:
                # Conversion failed, keep WAV
                mp3_conversion = {
                    "converted": False,
                    "error": mp3_result.get("error", "Unknown error")
                }
                print(json.dumps({
                    "type": "warning",
                    "message": f"MP3 conversion failed, keeping WAV: {mp3_result.get('error')}",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }), flush=True)

        # Combine results
        final_result = {
            **transcription_result,
            "audio_path": final_audio_path,
            "recording": {
                "duration": record_result.get("duration", 0),
                "sample_rate": record_result.get(
                    "sample_rate", args.sample_rate),
                "channels": record_result.get("channels", args.channels),
                "format": args.output_format
            }
        }

        # Add MP3 conversion info if applicable
        if mp3_conversion:
            final_result["mp3_conversion"] = mp3_conversion

        # Output final result as single-line JSON for easy parsing
        print(json.dumps(final_result), flush=True)

        sys.exit(0 if transcription_result["success"] else 1)

    # Update signal handler to use handle_stop
    def signal_handler(sig, frame):
        handle_stop()

    # Register signal handler
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        # Monitor stdin for STOP command (cross-platform)
        import threading
        stop_event = threading.Event()

        def stdin_monitor():
            """Monitor stdin for STOP command or closure"""
            print(json.dumps({
                "type": "status",
                "message": "Stdin monitor started",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), file=sys.stderr, flush=True)

            try:
                while not stop_event.is_set():
                    try:
                        line = sys.stdin.readline()
                        print(json.dumps({
                            "type": "status",
                            "message": f"Stdin received: {repr(line)}",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }), file=sys.stderr, flush=True)

                        if not line:  # EOF - stdin closed
                            print(json.dumps({
                                "type": "status",
                                "message": "Stdin EOF",
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            }), file=sys.stderr, flush=True)
                            stop_event.set()
                            break
                        elif line.strip().upper() == 'STOP':
                            print(json.dumps({
                                "type": "status",
                                "message": "STOP command received",
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            }), file=sys.stderr, flush=True)
                            stop_event.set()
                            break
                    except Exception as e:
                        print(json.dumps({
                            "type": "status",
                            "message": f"Stdin read error: {e}",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }), file=sys.stderr, flush=True)
                        stop_event.set()
                        break
            except Exception as e:
                print(json.dumps({
                    "type": "status",
                    "message": f"Stdin monitor error: {e}",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }), file=sys.stderr, flush=True)
                stop_event.set()

        # Start stdin monitor thread
        monitor_thread = threading.Thread(target=stdin_monitor, daemon=True)
        monitor_thread.start()

        # Main loop - check for stop event
        while not stop_event.is_set():
            time.sleep(0.1)

        # Stop triggered - call handler to process recording
        print(json.dumps({
            "type": "status",
            "message": "Stop event detected, processing...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)
        handle_stop()

    except (KeyboardInterrupt, EOFError):
        handle_stop()


if __name__ == "__main__":
    main()

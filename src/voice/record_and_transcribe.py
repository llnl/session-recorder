#!/usr/bin/env python3
"""
Audio recording and transcription script for SessionRecorder
Handles both recording audio from microphone AND transcription using Whisper
"""

import sys
import json
import argparse
import signal
from pathlib import Path
from datetime import datetime
import time

try:
    import sounddevice as sd
    import soundfile as sf
    import numpy as np
    import whisper
    import torch
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Required packages not installed. Run: pip install sounddevice soundfile openai-whisper torch numpy\nMissing: {str(e)}",
        "timestamp": datetime.utcnow().isoformat()
    }), flush=True)
    sys.exit(1)


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
                "timestamp": datetime.utcnow().isoformat()
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

        print(json.dumps({
            "type": "status",
            "message": "Recording started",
            "timestamp": datetime.utcnow().isoformat()
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
                "timestamp": datetime.utcnow().isoformat()
            }

        audio_data = np.concatenate(self.frames, axis=0)

        # Save to WAV file
        try:
            sf.write(output_path, audio_data, self.sample_rate)

            print(json.dumps({
                "type": "status",
                "message": f"Recording saved to {output_path}",
                "duration": len(audio_data) / self.sample_rate,
                "timestamp": datetime.utcnow().isoformat()
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
                "timestamp": datetime.utcnow().isoformat()
            }


def detect_device():
    """Detect available compute device (CUDA/MPS/CPU)"""
    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"


def transcribe_audio(audio_path: str, model_size: str = "base", device: str = None) -> dict:
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
        # Auto-detect device if not specified
        if device is None:
            device = detect_device()

        print(json.dumps({
            "type": "status",
            "message": f"Loading Whisper model '{model_size}' on {device}...",
            "timestamp": datetime.utcnow().isoformat()
        }), flush=True)

        # Load model
        model = whisper.load_model(model_size, device=device)

        print(json.dumps({
            "type": "status",
            "message": "Transcribing audio...",
            "timestamp": datetime.utcnow().isoformat()
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
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Transcription failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }


def main():
    parser = argparse.ArgumentParser(description="Record audio and transcribe using Whisper")
    parser.add_argument("output_path", help="Path to save audio recording (WAV)")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium", "large"],
                        help="Whisper model size (default: base)")
    parser.add_argument("--device", choices=["cuda", "mps", "cpu"],
                        help="Device to use for transcription (auto-detects if not specified)")
    parser.add_argument("--sample-rate", type=int, default=16000,
                        help="Sample rate for recording (default: 16000)")
    parser.add_argument("--channels", type=int, default=1,
                        help="Number of audio channels (default: 1)")

    args = parser.parse_args()

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
        "timestamp": datetime.utcnow().isoformat()
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
            "timestamp": datetime.utcnow().isoformat()
        }), flush=True)

        # Stop recording
        record_result = recorder.stop_recording(output_path)

        if not record_result["success"]:
            print(json.dumps(record_result), flush=True)
            sys.exit(1)

        # Transcribe the recorded audio
        transcription_result = transcribe_audio(
            str(output_path),
            model_size=args.model,
            device=args.device
        )

        # Combine results
        final_result = {
            **transcription_result,
            "audio_path": str(output_path),
            "recording": {
                "duration": record_result.get("duration", 0),
                "sample_rate": record_result.get(
                    "sample_rate", args.sample_rate),
                "channels": record_result.get("channels", args.channels)
            }
        }

        # Output final result as JSON
        print(json.dumps(final_result, indent=2), flush=True)

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
                "timestamp": datetime.utcnow().isoformat()
            }), file=sys.stderr, flush=True)

            try:
                while not stop_event.is_set():
                    try:
                        line = sys.stdin.readline()
                        print(json.dumps({
                            "type": "status",
                            "message": f"Stdin received: {repr(line)}",
                            "timestamp": datetime.utcnow().isoformat()
                        }), file=sys.stderr, flush=True)

                        if not line:  # EOF - stdin closed
                            print(json.dumps({
                                "type": "status",
                                "message": "Stdin EOF",
                                "timestamp": datetime.utcnow().isoformat()
                            }), file=sys.stderr, flush=True)
                            stop_event.set()
                            break
                        elif line.strip().upper() == 'STOP':
                            print(json.dumps({
                                "type": "status",
                                "message": "STOP command received",
                                "timestamp": datetime.utcnow().isoformat()
                            }), file=sys.stderr, flush=True)
                            stop_event.set()
                            break
                    except Exception as e:
                        print(json.dumps({
                            "type": "status",
                            "message": f"Stdin read error: {e}",
                            "timestamp": datetime.utcnow().isoformat()
                        }), file=sys.stderr, flush=True)
                        stop_event.set()
                        break
            except Exception as e:
                print(json.dumps({
                    "type": "status",
                    "message": f"Stdin monitor error: {e}",
                    "timestamp": datetime.utcnow().isoformat()
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
            "timestamp": datetime.utcnow().isoformat()
        }), flush=True)
        handle_stop()

    except (KeyboardInterrupt, EOFError):
        handle_stop()


if __name__ == "__main__":
    main()

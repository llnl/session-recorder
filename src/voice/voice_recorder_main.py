#!/usr/bin/env python3
"""
Voice Recorder - Standalone entry point for PyInstaller bundling

This is the main entry point for the bundled voice-recorder executable.
Supports:
- Audio recording from microphone with device selection
- Transcription using OpenAI Whisper
- Transcription-only mode for existing audio files
- Cross-platform (Windows, macOS, Linux)

Usage:
    voice-recorder record --output ./audio/recording.wav
    voice-recorder record --output ./audio/recording.mp3 --format mp3 --device 1
    voice-recorder transcribe --input ./audio/recording.wav --model base
    voice-recorder list-devices
    voice-recorder --version
"""

import sys
import os
import json
import argparse
import signal
import subprocess
import shutil
import threading
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

__version__ = "1.0.0"

# ============================================================================
# Audio Device Management
# ============================================================================

def get_audio_devices() -> List[Dict[str, Any]]:
    """Get list of available audio input devices"""
    try:
        import sounddevice as sd
        devices = sd.query_devices()
        input_devices = []

        for i, device in enumerate(devices):
            # Only include input devices (devices with input channels)
            if device.get('max_input_channels', 0) > 0:
                input_devices.append({
                    "index": i,
                    "name": device.get('name', f'Device {i}'),
                    "channels": device.get('max_input_channels', 0),
                    "sample_rate": device.get('default_samplerate', 44100),
                    "is_default": i == sd.default.device[0]  # default input device
                })

        return input_devices
    except ImportError:
        return []
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Failed to query audio devices: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)
        return []


def list_devices_command() -> int:
    """List available audio input devices"""
    devices = get_audio_devices()

    if not devices:
        print(json.dumps({
            "success": False,
            "error": "No audio input devices found or sounddevice not installed",
            "devices": [],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)
        return 1

    print(json.dumps({
        "success": True,
        "devices": devices,
        "count": len(devices),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), flush=True)
    return 0


# ============================================================================
# Audio Recording
# ============================================================================

class AudioRecorder:
    """Handles audio recording from microphone"""

    def __init__(self, sample_rate: int = 16000, channels: int = 1,
                 device: Optional[int] = None):
        self.sample_rate = sample_rate
        self.channels = channels
        self.device = device
        self.recording = False
        self.frames = []
        self.stream = None
        self.recording_start_time = None

        # Import here to allow lazy loading
        import sounddevice as sd
        import numpy as np
        self.sd = sd
        self.np = np

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

    def start_recording(self) -> Dict[str, Any]:
        """Start recording audio"""
        try:
            self.recording = True
            self.frames = []

            # Create audio stream
            self.stream = self.sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                callback=self.audio_callback,
                dtype=self.np.int16,
                device=self.device
            )

            self.stream.start()

            # Capture the exact moment recording starts
            recording_start = datetime.now(timezone.utc)
            self.recording_start_time = recording_start

            return {
                "success": True,
                "message": "Recording started",
                "timestamp": recording_start.isoformat(),
                "recording_start_time": int(recording_start.timestamp() * 1000),
                "device": self.device,
                "sample_rate": self.sample_rate,
                "channels": self.channels
            }
        except Exception as e:
            self.recording = False
            return {
                "success": False,
                "error": f"Failed to start recording: {str(e)}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    def stop_recording(self, output_path: str) -> Dict[str, Any]:
        """Stop recording and save to file"""
        import soundfile as sf

        self.recording = False

        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None

        # Concatenate all frames
        if not self.frames:
            return {
                "success": False,
                "error": "No audio data recorded",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        audio_data = self.np.concatenate(self.frames, axis=0)

        # Save to WAV file
        try:
            sf.write(output_path, audio_data, self.sample_rate)
            duration = len(audio_data) / self.sample_rate

            return {
                "success": True,
                "audio_path": str(output_path),
                "duration": duration,
                "sample_rate": self.sample_rate,
                "channels": self.channels,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to save audio: {str(e)}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }


# ============================================================================
# Audio Conversion
# ============================================================================

def convert_wav_to_mp3(wav_path: str, mp3_path: str, bitrate: str = "64k",
                       sample_rate: int = 22050) -> Dict[str, Any]:
    """Convert WAV to MP3 using ffmpeg"""
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

        cmd = [
            ffmpeg_path,
            "-i", wav_path,
            "-ac", "1",  # Mono
            "-ar", str(sample_rate),
            "-b:a", bitrate,
            "-y",  # Overwrite
            mp3_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"ffmpeg conversion failed: {result.stderr}",
                "fallback": wav_path
            }

        wav_size = Path(wav_path).stat().st_size
        mp3_size = Path(mp3_path).stat().st_size
        compression_ratio = wav_size / mp3_size if mp3_size > 0 else 0

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


# ============================================================================
# Transcription
# ============================================================================

def detect_device() -> str:
    """Detect available compute device (CUDA/MPS/CPU)"""
    import torch

    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"


def transcribe_audio(audio_path: str, model_size: str = "base",
                     device: Optional[str] = None, language: Optional[str] = None) -> Dict[str, Any]:
    """Transcribe audio file using Whisper"""
    try:
        print(json.dumps({
            "type": "status",
            "message": "Loading transcription libraries...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        import torch
        import whisper

        # Auto-detect device if not specified
        if device is None:
            device = detect_device()

        print(json.dumps({
            "type": "status",
            "message": f"Loading Whisper model '{model_size}' on {device}...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        model = whisper.load_model(model_size, device=device)

        print(json.dumps({
            "type": "status",
            "message": "Transcribing audio...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        # Build transcribe options
        transcribe_opts = {
            "word_timestamps": True,
            "verbose": False
        }
        if language:
            transcribe_opts["language"] = language

        result = model.transcribe(audio_path, **transcribe_opts)

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


# ============================================================================
# Commands
# ============================================================================

def record_command(args) -> int:
    """Record audio from microphone and optionally transcribe"""
    # Validate dependencies
    try:
        import sounddevice as sd
        import soundfile as sf
        import numpy as np
    except ImportError as e:
        print(json.dumps({
            "success": False,
            "error": f"Recording packages not installed: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)
        return 1

    # Resolve device
    device_index = None
    if args.device is not None:
        if args.device.isdigit():
            device_index = int(args.device)
        else:
            # Search by name
            devices = get_audio_devices()
            for d in devices:
                if args.device.lower() in d["name"].lower():
                    device_index = d["index"]
                    break
            if device_index is None:
                print(json.dumps({
                    "success": False,
                    "error": f"Device not found: {args.device}",
                    "available_devices": [d["name"] for d in devices],
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }), flush=True)
                return 1

    # Create output directory
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Ensure WAV extension for initial recording
    wav_path = output_path
    if args.format == "mp3":
        wav_path = output_path.with_suffix(".wav")

    # Create recorder
    recorder = AudioRecorder(
        sample_rate=args.sample_rate,
        channels=args.channels,
        device=device_index
    )

    # Start recording
    start_result = recorder.start_recording()
    if not start_result["success"]:
        print(json.dumps(start_result), flush=True)
        return 1

    print(json.dumps(start_result), flush=True)

    # Set up stop handling
    stop_event = threading.Event()
    stopping = False

    def handle_stop():
        nonlocal stopping
        if stopping:
            return
        stopping = True
        stop_event.set()

        print(json.dumps({
            "type": "status",
            "message": "Stopping recording...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)

        # Stop recording
        record_result = recorder.stop_recording(str(wav_path))

        if not record_result["success"]:
            print(json.dumps(record_result), flush=True)
            sys.exit(1)

        # Transcribe if requested
        transcription_result = None
        if not args.no_transcribe:
            transcription_result = transcribe_audio(
                str(wav_path),
                model_size=args.model,
                device=args.transcribe_device,
                language=args.language
            )

        # Convert to MP3 if requested
        final_audio_path = str(wav_path)
        mp3_conversion = None

        if args.format == "mp3":
            mp3_path = str(output_path)
            if not mp3_path.endswith(".mp3"):
                mp3_path = mp3_path.rsplit(".", 1)[0] + ".mp3"

            mp3_result = convert_wav_to_mp3(
                str(wav_path),
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
                    "compression_ratio": mp3_result.get("compression_ratio", 0)
                }
                # Remove WAV file
                Path(wav_path).unlink(missing_ok=True)
            else:
                mp3_conversion = {
                    "converted": False,
                    "error": mp3_result.get("error", "Unknown error")
                }

        # Build final result
        final_result = {
            "success": True,
            "audio_path": final_audio_path,
            "recording": {
                "duration": record_result.get("duration", 0),
                "sample_rate": record_result.get("sample_rate", args.sample_rate),
                "channels": record_result.get("channels", args.channels),
                "format": args.format
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        if transcription_result:
            final_result["transcription"] = transcription_result

        if mp3_conversion:
            final_result["mp3_conversion"] = mp3_conversion

        # Save transcript to file if specified
        if hasattr(args, 'transcript_output') and args.transcript_output and transcription_result:
            transcript_path = Path(args.transcript_output)
            transcript_path.parent.mkdir(parents=True, exist_ok=True)
            with open(transcript_path, 'w', encoding='utf-8') as f:
                json.dump(transcription_result, f, indent=2, ensure_ascii=False)
            final_result["transcript_path"] = str(transcript_path)

        print(json.dumps(final_result), flush=True)
        sys.exit(0 if final_result["success"] else 1)

    # Signal handlers
    def signal_handler(sig, frame):
        handle_stop()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Stdin monitor for STOP command
    def stdin_monitor():
        try:
            while not stop_event.is_set():
                try:
                    line = sys.stdin.readline()
                    if not line:  # EOF
                        stop_event.set()
                        break
                    elif line.strip().upper() == "STOP":
                        stop_event.set()
                        break
                except Exception:
                    stop_event.set()
                    break
        except Exception:
            stop_event.set()

    monitor_thread = threading.Thread(target=stdin_monitor, daemon=True)
    monitor_thread.start()

    # Wait for stop
    print(json.dumps({
        "type": "ready",
        "message": "Recording... Send 'STOP' to stdin or SIGINT/SIGTERM to stop",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), flush=True)

    try:
        while not stop_event.is_set():
            time.sleep(0.1)
        handle_stop()
    except (KeyboardInterrupt, EOFError):
        handle_stop()

    return 0


def transcribe_command(args) -> int:
    """Transcribe an existing audio file"""
    input_path = Path(args.input)

    if not input_path.exists():
        print(json.dumps({
            "success": False,
            "error": f"Input file not found: {args.input}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), flush=True)
        return 1

    result = transcribe_audio(
        str(input_path),
        model_size=args.model,
        device=args.device,
        language=args.language
    )

    # Save transcript to file if requested
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        result["transcript_path"] = str(output_path)

    print(json.dumps(result), flush=True)
    return 0 if result["success"] else 1


def version_command() -> int:
    """Print version information"""
    info = {
        "name": "voice-recorder",
        "version": __version__,
        "python_version": sys.version,
        "platform": sys.platform,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    # Check for optional dependencies
    try:
        import torch
        info["torch_version"] = torch.__version__
        info["cuda_available"] = torch.cuda.is_available()
        if hasattr(torch.backends, "mps"):
            info["mps_available"] = torch.backends.mps.is_available()
    except Exception as e:
        info["torch_version"] = "not installed"
        info["torch_error"] = f"{type(e).__name__}: {str(e)}"

    try:
        import whisper
        info["whisper_version"] = getattr(whisper, "__version__", "unknown")
    except Exception as e:
        info["whisper_version"] = "not installed"
        info["whisper_error"] = f"{type(e).__name__}: {str(e)}"

    try:
        import sounddevice
        info["sounddevice_version"] = sounddevice.__version__
    except ImportError:
        info["sounddevice_version"] = "not installed"

    # Check ffmpeg
    ffmpeg_path = shutil.which("ffmpeg")
    info["ffmpeg_available"] = ffmpeg_path is not None

    print(json.dumps(info, indent=2), flush=True)
    return 0


# ============================================================================
# Main Entry Point
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        prog="voice-recorder",
        description="Voice Recorder - Record and transcribe audio using Whisper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  voice-recorder record --output ./recording.wav
  voice-recorder record --output ./recording.mp3 --format mp3 --device 1
  voice-recorder transcribe --input ./recording.wav --model base
  voice-recorder list-devices
  voice-recorder --version
        """
    )

    parser.add_argument("--version", "-v", action="store_true",
                        help="Show version information")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Record command
    record_parser = subparsers.add_parser("record", help="Record audio from microphone")
    record_parser.add_argument("--output", "-o", required=True,
                               help="Output file path")
    record_parser.add_argument("--format", "-f", default="wav", choices=["wav", "mp3"],
                               help="Output format (default: wav)")
    record_parser.add_argument("--device", "-d",
                               help="Audio device index or name (use list-devices to see available)")
    record_parser.add_argument("--sample-rate", type=int, default=16000,
                               help="Recording sample rate (default: 16000)")
    record_parser.add_argument("--channels", type=int, default=1,
                               help="Number of channels (default: 1)")
    record_parser.add_argument("--no-transcribe", action="store_true",
                               help="Skip transcription after recording")
    record_parser.add_argument("--model", default="base",
                               choices=["tiny", "base", "small", "medium", "large"],
                               help="Whisper model for transcription (default: base)")
    record_parser.add_argument("--transcribe-device", choices=["cuda", "mps", "cpu"],
                               help="Device for transcription (auto-detect if not specified)")
    record_parser.add_argument("--language",
                               help="Language code for transcription (auto-detect if not specified)")
    record_parser.add_argument("--mp3-bitrate", default="64k",
                               help="MP3 bitrate (default: 64k)")
    record_parser.add_argument("--mp3-sample-rate", type=int, default=22050,
                               help="MP3 sample rate (default: 22050)")
    record_parser.add_argument("--transcript-output", "-t",
                               help="Output JSON file for transcript (default: stdout only)")

    # Transcribe command
    transcribe_parser = subparsers.add_parser("transcribe",
                                               help="Transcribe existing audio file")
    transcribe_parser.add_argument("--input", "-i", required=True,
                                    help="Input audio file (wav, mp3, etc.)")
    transcribe_parser.add_argument("--output", "-o",
                                    help="Output JSON file for transcript")
    transcribe_parser.add_argument("--model", default="base",
                                    choices=["tiny", "base", "small", "medium", "large"],
                                    help="Whisper model (default: base)")
    transcribe_parser.add_argument("--device", choices=["cuda", "mps", "cpu"],
                                    help="Device for transcription (auto-detect if not specified)")
    transcribe_parser.add_argument("--language",
                                    help="Language code (auto-detect if not specified)")

    # List devices command
    subparsers.add_parser("list-devices", help="List available audio input devices")

    args = parser.parse_args()

    # Handle version flag
    if args.version:
        return version_command()

    # Handle commands
    if args.command == "record":
        return record_command(args)
    elif args.command == "transcribe":
        return transcribe_command(args)
    elif args.command == "list-devices":
        return list_devices_command()
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main())

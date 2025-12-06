#!/usr/bin/env python3
"""
Whisper transcription script for SessionRecorder voice integration
Uses OpenAI's official Whisper model for maximum accuracy with word-level timestamps
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

try:
    import whisper
    import torch
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "Required packages not installed. Run: pip install openai-whisper torch",
        "timestamp": datetime.utcnow().isoformat()
    }))
    sys.exit(1)


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
        audio_path: Path to audio file (WebM, MP3, WAV, etc.)
        model_size: Whisper model size (tiny, base, small, medium, large)
        device: Device to use (cuda, mps, cpu) - auto-detects if None

    Returns:
        dict with success, segments, words, metadata
    """
    try:
        # Auto-detect device if not specified
        if device is None:
            device = detect_device()

        # Load model
        model = whisper.load_model(model_size, device=device)

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
                "confidence": segment.get("avg_logprob", 0.0)  # Approximate confidence
            }

            # Extract word-level timestamps
            words = []
            if "words" in segment:
                for word_data in segment["words"]:
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

        # Return result
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
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


def main():
    parser = argparse.ArgumentParser(description="Transcribe audio using Whisper")
    parser.add_argument("audio_file", help="Path to audio file")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium", "large"],
                        help="Whisper model size (default: base)")
    parser.add_argument("--device", choices=["cuda", "mps", "cpu"],
                        help="Device to use (auto-detects if not specified)")
    parser.add_argument("--output", help="Output JSON file path (optional)")

    args = parser.parse_args()

    # Verify audio file exists
    if not Path(args.audio_file).exists():
        result = {
            "success": False,
            "error": f"Audio file not found: {args.audio_file}",
            "timestamp": datetime.utcnow().isoformat()
        }
        print(json.dumps(result, indent=2))
        sys.exit(1)

    # Transcribe
    result = transcribe_audio(args.audio_file, args.model, args.device)

    # Output result
    output_json = json.dumps(result, indent=2)

    if args.output:
        Path(args.output).write_text(output_json, encoding="utf-8")

    print(output_json)

    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()

# Session Recorder Desktop App

Desktop application for recording browser sessions with voice narration.

## Features

- **Multi-browser support**: Chromium, Firefox, WebKit (Safari)
- **Voice recording**: Optional microphone recording with Whisper transcription
- **System tray**: Runs in system tray with easy access menu
- **Cross-platform**: Windows, macOS, Linux

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the app
npm start

# Or in one command
npm run dev
```

### Building Distributable

```bash
# Build for current platform
npm run electron:build

# Build for specific platforms
npm run electron:build:win    # Windows (NSIS installer + portable)
npm run electron:build:mac    # macOS (DMG)
npm run electron:build:linux  # Linux (AppImage + DEB)

# Build for all platforms (requires each platform for signing)
npm run electron:build:all
```

## Prerequisites

### Voice Recording (Optional)

For voice recording to work, you need the voice-recorder bundle:

```bash
# From the parent session-recorder directory
cd ..
npm run voice:build
```

This creates the bundled voice-recorder executable in `desktop-app/resources/[platform]/voice-recorder/`.

### Development Mode

In development mode, the app can fall back to using Python directly if the bundled executable is not available:

1. Set up Python virtual environment:

```bash
cd ../src/voice
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

2. The app will automatically detect and use the Python script.

## Architecture

```
desktop-app/
├── src/
│   └── main/
│       ├── index.ts      # Main process entry point
│       ├── config.ts     # Configuration management
│       ├── tray.ts       # System tray management
│       ├── recorder.ts   # Recording orchestration
│       └── voice.ts      # Voice recorder subprocess
├── resources/
│   ├── windows/          # Windows-specific resources
│   ├── macos/            # macOS-specific resources
│   └── linux/            # Linux-specific resources
├── package.json
├── tsconfig.json
└── entitlements.mac.plist  # macOS entitlements for microphone
```

## Usage

1. **Start the app** - The app starts minimized to system tray
2. **Right-click tray icon** - Opens context menu
3. **Start Recording** - Choose browser type (Chromium/Firefox/WebKit)
4. **Browser opens** - Perform your actions
5. **Stop Recording** - Click "Stop Recording" in tray menu
6. **View output** - File explorer opens showing the session zip

## Configuration

Configuration is stored in:
- Windows: `%APPDATA%/session-recorder-desktop/config.json`
- macOS: `~/Library/Application Support/session-recorder-desktop/config.json`
- Linux: `~/.config/session-recorder-desktop/config.json`

### Options

| Option | Default | Description |
|--------|---------|-------------|
| voiceEnabled | true | Enable voice recording |
| browserType | chromium | Default browser |
| whisperModel | base | Whisper model size |
| outputDir | Documents/SessionRecordings | Output directory |
| compressSnapshots | true | Gzip compress snapshots |
| screenshotFormat | jpeg | Screenshot format |
| screenshotQuality | 75 | JPEG quality (1-100) |
| audioFormat | mp3 | Audio format |
| audioBitrate | 64k | MP3 bitrate |

## Output

Sessions are saved to `Documents/SessionRecordings/` (configurable):

```
session-XXXXX.zip
├── session.json          # Session metadata
├── snapshots/            # HTML snapshots
├── screenshots/          # Screenshots
└── audio/                # Voice recording + transcript
    ├── recording.mp3
    └── transcript.json
```

## Testing the Voice Recorder Bundle

After building the voice recorder (`npm run voice:build` from parent directory), test it:

### 1. Version Info

```bash
cd resources/windows/voice-recorder
./voice-recorder.exe --version
```

Expected output:

```json
{
  "torch_version": "2.9.1+cpu",
  "whisper_version": "20250625",
  "sounddevice_version": "0.5.3",
  "ffmpeg_available": true
}
```

### 2. List Audio Devices

```bash
./voice-recorder.exe list-devices
```

### 3. Test Recording

```bash
./voice-recorder.exe record --output test-recording.wav
```

Speak into your microphone, then press **Ctrl+C** to stop. Verify `test-recording.wav` was created.

### 4. Test Transcription

```bash
./voice-recorder.exe transcribe --input test-recording.wav --model tiny
```

Should output JSON with transcript of your speech.

### 5. Test Record with Auto-Transcribe

```bash
./voice-recorder.exe record --output test2.wav --model tiny
```

Records until **Ctrl+C**, then automatically transcribes with the specified model.

### 6. Test Full Desktop App

```bash
cd ..  # back to desktop-app root
npm run dev
```

Right-click the tray icon → Start Recording → select browser.

### Clean VM Testing Checklist

- [ ] Windows 10 without Python installed
- [ ] Windows 11 without Python installed
- [ ] Verify no missing DLL errors on startup
- [ ] Verify microphone access works
- [ ] Verify Whisper transcription produces valid output

---

## Troubleshooting

### Voice recording not working

1. Check microphone permissions in system settings
2. Verify voice-recorder bundle is built: `npm run voice:build` in parent directory
3. Check console output for errors

### Browser not launching

1. Ensure Playwright browsers are installed: `npx playwright install`
2. Check that the selected browser is available on your system

### App not showing in tray

1. On Windows, check hidden icons in system tray
2. On macOS, app runs without dock icon (tray only)
3. On Linux, ensure system tray support is available

## License

MIT

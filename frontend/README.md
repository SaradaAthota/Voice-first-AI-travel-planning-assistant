# Voice Travel Assistant - Frontend

React + Vite frontend for the voice-first AI travel planning assistant.

## Setup

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## Features

- **Voice Recording**: MediaRecorder API for audio capture
- **Live Transcript**: Server-Sent Events (SSE) for real-time transcript updates
- **Mic Button**: Visual recording controls with pause/resume
- **Transcript Display**: Live transcript with connection status

## Components

### MicButton
Microphone button component with recording states:
- Idle (blue)
- Recording (red, pulsing)
- Paused (yellow)

### TranscriptDisplay
Displays live transcript from SSE:
- Connection status indicator
- Real-time transcript updates
- Error display

## Hooks

### useVoiceRecorder
Manages audio recording:
- MediaRecorder integration
- Chunk upload every 1-2 seconds
- Pause/resume support

### useSSETranscript
Manages SSE connection for live transcript:
- Automatic connection management
- Real-time updates
- Connection status tracking

## API Integration

The frontend communicates with the backend via:
- `POST /api/voice/upload` - Upload audio chunks
- `GET /api/voice/transcript/:sessionId` - SSE stream
- `POST /api/voice/complete` - Complete session
- `GET /api/voice/session/new` - Create session

## Environment

The frontend uses Vite's proxy configuration to forward `/api` requests to the backend (default: `http://localhost:3000`).


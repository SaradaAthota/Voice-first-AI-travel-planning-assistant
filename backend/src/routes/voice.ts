/**
 * Voice Routes
 * 
 * Handles voice input and live transcript streaming.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { transcribeAudio } from '../voice/stt-service';
import { appendTranscript, getSessionTranscript } from '../voice/transcript-manager';
import {
  setupSSEConnection,
  broadcastTranscriptUpdate,
  sendCompletionMessage,
  sendErrorMessage,
} from '../voice/sse-manager';
import { TranscriptUpdate } from '../voice/types';

const router = Router();

// Configure multer for audio upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

/**
 * POST /api/voice/upload
 * Upload audio chunk for transcription
 */
router.post('/upload', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const { sessionId, tripId, chunkIndex, isFinal } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const chunkIdx = parseInt(chunkIndex || '0', 10);
    const final = isFinal === 'true' || isFinal === true;

    // Transcribe audio
    const sttResult = await transcribeAudio(req.file.buffer, req.file.mimetype);

    // Create transcript update
    const update: TranscriptUpdate = {
      sessionId,
      tripId: tripId || undefined,
      text: sttResult.text,
      isFinal: final,
      timestamp: new Date().toISOString(),
      chunkIndex: chunkIdx,
    };

    // Append to transcript
    await appendTranscript(update);

    // Broadcast to SSE clients
    broadcastTranscriptUpdate(update);

    // Return success
    res.json({
      success: true,
      text: sttResult.text,
      chunkIndex: chunkIdx,
      isFinal: final,
    });
  } catch (error) {
    console.error('Voice upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Send error to SSE clients if sessionId exists
    if (req.body.sessionId) {
      sendErrorMessage(req.body.sessionId, errorMessage);
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/voice/transcript/:sessionId
 * SSE endpoint for live transcript streaming
 */
router.get('/transcript/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  // Setup SSE connection
  setupSSEConnection(res, sessionId);

  // Send current transcript if available
  const currentTranscript = getSessionTranscript(sessionId);
  if (currentTranscript) {
    broadcastTranscriptUpdate({
      sessionId,
      text: currentTranscript,
      isFinal: true,
      timestamp: new Date().toISOString(),
      chunkIndex: 0,
    });
  }
});

/**
 * POST /api/voice/complete
 * Mark session as complete
 */
router.post('/complete', (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  // Send completion message to SSE clients
  sendCompletionMessage(sessionId);

  res.json({ success: true });
});

/**
 * GET /api/voice/session/new
 * Create new session
 */
router.get('/session/new', (req: Request, res: Response) => {
  const sessionId = uuidv4();
  res.json({ sessionId });
});

export default router;


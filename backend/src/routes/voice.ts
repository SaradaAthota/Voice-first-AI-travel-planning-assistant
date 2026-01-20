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
  fileFilter: (_req, file, cb) => {
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
  console.log('=== UPLOAD ENDPOINT CALLED ===');
  console.log('Request body:', { 
    sessionId: req.body.sessionId, 
    tripId: req.body.tripId,
    chunkIndex: req.body.chunkIndex,
    isFinal: req.body.isFinal 
  });
  console.log('File received:', req.file ? {
    size: req.file.size,
    mimetype: req.file.mimetype,
    originalname: req.file.originalname,
  } : 'NO FILE');
  
  try {
    const { sessionId, tripId, chunkIndex, isFinal } = req.body;

    if (!sessionId) {
      console.error('Missing sessionId');
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const chunkIdx = parseInt(chunkIndex || '0', 10);
    const final = isFinal === 'true' || isFinal === true;

    // Get MIME type, defaulting to webm if not provided
    const mimeType = req.file.mimetype || 'audio/webm';
    
    // Log for debugging (STEP 6)
    console.log('Audio upload received:', {
      mimetype: mimeType,
      size: req.file.size,
      name: req.file.originalname,
    });

    // OpenAI Whisper supports WebM directly - no conversion needed!
    // Just ensure the file has the correct extension
    // Skip FFmpeg conversion and send WebM directly
    console.log('Starting transcription...');
    let sttResult;
    try {
      sttResult = await transcribeAudio(req.file.buffer, mimeType);
      console.log('Transcription result:', { 
        text: sttResult.text, 
        length: sttResult.text.length,
        hasText: !!sttResult.text 
      });
    } catch (transcriptionError) {
      console.error('Voice upload error:', transcriptionError);
      // Broadcast error to SSE clients
      sendErrorMessage(sessionId, transcriptionError instanceof Error ? transcriptionError.message : 'Transcription failed');
      
      return res.status(500).json({
        success: false,
        error: transcriptionError instanceof Error ? transcriptionError.message : 'Transcription failed',
        text: '',
        chunkIndex: chunkIdx,
        isFinal: final,
      });
    }

    // Create transcript update
    const update: TranscriptUpdate = {
      sessionId,
      tripId: tripId || undefined,
      text: sttResult.text,
      isFinal: final,
      timestamp: new Date().toISOString(),
      chunkIndex: chunkIdx,
    };

    console.log('Broadcasting transcript update:', {
      sessionId,
      textLength: update.text.length,
      textPreview: update.text.substring(0, 50),
      isFinal: update.isFinal,
    });

    // Append to transcript
    await appendTranscript(update);

    // Broadcast to SSE clients IMMEDIATELY - do this BEFORE returning response
    console.log('About to broadcast transcript update. SessionId:', sessionId);
    broadcastTranscriptUpdate(update);
    console.log('Transcript update broadcasted to SSE clients');

    // Return success
    res.json({
      success: true,
      text: sttResult.text,
      chunkIndex: chunkIdx,
      isFinal: final,
    });
    return;
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
    return;
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
  // SSE connection stays open - connection will be maintained by setupSSEConnection
  // This is a streaming endpoint, so we don't return - the connection remains open
  // TypeScript requires a return, but this endpoint intentionally doesn't return
  return;
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
  return;
});

/**
 * GET /api/voice/session/new
 * Create new session
 */
router.get('/session/new', (_req: Request, res: Response) => {
  const sessionId = uuidv4();
  res.json({ sessionId });
  return;
});

export default router;


import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { closeConnections } from './db/supabase';
import voiceRoutes from './routes/voice';
import chatRoutes from './routes/chat';
import explanationRoutes from './routes/explanations';
import evaluationRoutes from './routes/evaluations';
import tripRoutes from './routes/trips';
import itineraryRoutes from './routes/itinerary';
import pdfRoutes from './routes/pdf';

const app: Express = express();

// Middleware
// CORS configuration - restrict to allowed origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL]
    : config.env === 'production' 
      ? [] // No default in production - must be explicitly set
      : ['http://localhost:5173']; // Default for development

console.log('CORS configuration:', {
  allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : 'none (allowing server-to-server)',
  hasFrontendUrl: !!process.env.FRONTEND_URL,
  hasAllowedOrigins: !!process.env.ALLOWED_ORIGINS,
});

app.use(cors({
  origin: (origin, callback) => {
    // ✅ CRITICAL: Allow server-to-server calls (n8n, cron, backend-to-backend) - no origin header
    // This is essential for n8n Cloud webhooks and other server-to-server communication
    // Server-to-server requests (like n8n webhooks) do NOT send Origin header
    if (!origin) {
      console.log('CORS: Allowing request without origin (server-to-server)');
      return callback(null, true);
    }
    
    // ✅ Allow known frontends
    if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
      console.log('CORS: Allowing request from allowed origin:', origin);
      return callback(null, true);
    }
    
    // If no allowed origins configured but we have a frontend URL, allow it
    if (allowedOrigins.length === 0 && process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      console.log('CORS: Allowing request from FRONTEND_URL:', origin);
      return callback(null, true);
    }
    
    // Block unknown origins
    console.warn(`CORS: Blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'backend',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Voice-first AI Travel Planning Assistant API',
    version: '1.0.0',
  });
});

// Voice routes
app.use('/api/voice', voiceRoutes);

// Chat routes (message processing)
app.use('/api/chat', chatRoutes);

// Explanation routes
app.use('/api/explanations', explanationRoutes);

// Evaluation routes
app.use('/api/evaluations', evaluationRoutes);

// Trip routes
app.use('/api/trips', tripRoutes);

// Itinerary routes
app.use('/api/itinerary', itineraryRoutes);

// PDF routes
app.use('/api/pdf', pdfRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.env === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: _req.path,
  });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.env}`);
  // Use BASE_URL if available, otherwise show localhost (dev only)
  const healthUrl = process.env.BASE_URL 
    ? `${process.env.BASE_URL}/health` 
    : `http://localhost:${config.port}/health`;
  console.log(`Health check: ${healthUrl}`);
  if (config.env === 'production') {
    console.log(`Allowed CORS origins: ${allowedOrigins.join(', ') || 'NONE - REQUIRED'}`);
    if (allowedOrigins.length === 0) {
      console.error('⚠️  WARNING: No CORS origins configured! Frontend requests will be blocked.');
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await closeConnections();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await closeConnections();
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;


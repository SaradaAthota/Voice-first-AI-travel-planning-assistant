import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { closeConnections } from './db/supabase';
import voiceRoutes from './routes/voice';
import explanationRoutes from './routes/explanations';
import evaluationRoutes from './routes/evaluations';
import tripRoutes from './routes/trips';
import itineraryRoutes from './routes/itinerary';
import pdfRoutes from './routes/pdf';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// API routes
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Voice-first AI Travel Planning Assistant API',
    version: '1.0.0',
  });
});

// Voice routes
app.use('/api/voice', voiceRoutes);

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
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.env === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.env}`);
  console.log(`Health check: http://localhost:${config.port}/health`);
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


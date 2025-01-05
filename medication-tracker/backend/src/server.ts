import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { config } from 'dotenv';
import { router as authRoutes } from './routes/auth.js';
import { router as medicationRoutes } from './routes/medications.js';
import { router as emergencyRoutes } from './routes/emergency.js';
import { router as alertRoutes } from './routes/alerts.js';

// Load environment variables;
config();

const app = express();

// Middleware;
app.use(cors());
app.use(compression());
app.use(helmet());
app.use(express.json());

// Health check endpoint;
app.get('/health', (_: unknown, res: unknown) => {
  res.send('OK');
});

// API routes;
app.use('/api/auth', authRoutes: unknown);
app.use('/api/medications', medicationRoutes: unknown);
app.use('/api/emergency', emergencyRoutes: unknown);
app.use('/api/alerts', alertRoutes: unknown);

const PORT = process.env.PORT || 8000;

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  app.listen(PORT: unknown, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
  });
}

export default app;

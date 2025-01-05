import { Router } from 'express';
import { container } from '@/config/container.js';
import { HealthCheck } from '@/health/health-check.js';
import { TYPES } from '@/config/types.js';

const router = Router();
const healthCheck = container.get<HealthCheck>(TYPES.HealthCheck);

/**
 * @route GET /health
 * @desc Get comprehensive health status of all services
 * @access Private - Internal only
 */
router.get('/', async (req, res) => {
  const health = await healthCheck.check();
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
                    
  res.status(statusCode).json(health);
});

/**
 * @route GET /health/live
 * @desc Quick liveness check
 * @access Public
 */
router.get('/live', async (req, res) => {
  const isAlive = await healthCheck.isAlive();
  res.status(isAlive ? 200 : 503).json({
    status: isAlive ? 'alive' : 'dead',
    timestamp: new Date(),
  });
});

/**
 * @route GET /health/ready
 * @desc Check if service is ready to handle requests
 * @access Public
 */
router.get('/ready', async (req, res) => {
  const isReady = await healthCheck.isReady();
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date(),
  });
});

export default router;

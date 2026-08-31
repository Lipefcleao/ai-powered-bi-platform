import { Router } from 'express';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * GET /healthz
 * Probe de liveness: confirma que o processo HTTP Node está respondendo.
 */
router.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /readyz
 * Probe de readiness: confirma conectividade ativa com o banco MySQL (réplica).
 */
router.get('/readyz', async (req, res, next) => {
  if (env.demoMode) {
    return res.status(200).json({
      status: 'ready',
      database: 'connected_demo',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();

    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unready',
      database: 'disconnected',
      error: 'Database connection check failed'
    });
  }
});

export default router;

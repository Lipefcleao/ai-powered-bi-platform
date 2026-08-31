import app from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

const server = app.listen(env.port, () => {
  console.log(`[SERVER] BI Assistant API running in ${env.nodeEnv} mode on port ${env.port}`);
});

/**
 * Encerramento gracioso do servidor (Graceful Shutdown)
 * Escuta sinais do sistema (SIGTERM/SIGINT) enviados pelo Cloud Run / Docker
 */
async function gracefulShutdown(signal) {
  console.log(`[SERVER] ${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('[SERVER] HTTP server closed.');
    try {
      await pool.end();
      console.log('[SERVER] MySQL connection pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('[SERVER] Error closing MySQL pool:', err);
      process.exit(1);
    }
  });

  // Força o encerramento após 10 segundos se houver conexões pendentes presas
  setTimeout(() => {
    console.error('[SERVER] Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

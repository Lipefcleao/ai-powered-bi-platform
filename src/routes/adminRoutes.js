import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { requireAuthenticatedUser, requireRole } from '../middleware/auth.js';

const router = Router();

// Aplica autenticação e papel 'admin' obrigatoriamente a todas as rotas administrativas
router.use(requireAuthenticatedUser);
router.use(requireRole('admin'));

const metricsPath = path.resolve(process.cwd(), 'metrics.json');

// Inicializa o arquivo de métricas se ele não existir
async function initMetricsFile() {
  try {
    await fs.access(metricsPath);
  } catch {
    const initialMetrics = {
      summary: {
        totalRequests: 0,
        totalPromptTokens: 0,
        totalCachedTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        totalCostWithoutCache: 0,
        totalSavings: 0
      },
      history: []
    };
    await fs.writeFile(metricsPath, JSON.stringify(initialMetrics, null, 2), 'utf8');
    console.log('[Admin Routes] Arquivo metrics.json inicializado.');
  }
}
await initMetricsFile();

/**
 * GET /api/admin/metrics
 * Retorna métricas do sistema e uso de tokens de IA apenas para administradores.
 */
router.get('/metrics', async (req, res, next) => {
  try {
    const fileContent = await fs.readFile(metricsPath, 'utf8');
    const data = JSON.parse(fileContent);
    res.json({
      ...data,
      status: 'ok',
      systemMetrics: {
        serverUptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/metrics/reset
 * Reseta o arquivo de métricas de tokens de IA.
 */
router.post('/metrics/reset', async (req, res, next) => {
  try {
    const initialMetrics = {
      summary: {
        totalRequests: 0,
        totalPromptTokens: 0,
        totalCachedTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        totalCostWithoutCache: 0,
        totalSavings: 0
      },
      history: []
    };
    await fs.writeFile(metricsPath, JSON.stringify(initialMetrics, null, 2), 'utf8');
    res.json({ message: 'Métricas resetadas com sucesso.' });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from 'express';
import { requireAuthenticatedUser, requireRole } from '../middleware/auth.js';
import { SemanticQueryService } from '../services/semanticQueryService.js';

const router = Router();

router.use(requireAuthenticatedUser);
router.use(requireRole('analyst', 'admin'));

/**
 * POST /api/v2/chat/query
 * Executa consulta do Chat de IA validada via QueryPolicyService.
 */
router.post('/query', async (req, res, next) => {
  try {
    const { sql } = req.body;
    const result = await SemanticQueryService.executeAiQuery({
      sqlQuery: sql,
      requestContext: req.requestContext
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

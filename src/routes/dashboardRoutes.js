import { Router } from 'express';
import { requireAuthenticatedUser, requireRole } from '../middleware/auth.js';
import { handleDashboardQuery } from '../controllers/dashboardController.js';

const router = Router();

router.use(requireAuthenticatedUser);

/**
 * POST /api/v2/dashboards/:dashboardId/query
 * Executa consulta de dashboard com filtros, agregação e paginação no servidor.
 * Aplica restrição de papel (RBAC) dependendo da confidencialidade do dashboard solicitado.
 */
router.post('/:dashboardId/query', (req, res, next) => {
  const { dashboardId } = req.params;
  const isPersonal = ['faq4', 'Pessoal', 'Gasto com pessoal', 'Gasto%20com%20pessoal'].includes(dashboardId);
  
  if (isPersonal) {
    // FAQ 4 (Gasto com pessoal) contém dados confidenciais de folha de pagamento e exige 'analyst' ou 'admin'
    return requireRole('analyst', 'admin')(req, res, next);
  }
  
  // Outros dashboards admitem acesso do papel básico 'viewer'
  return requireRole('viewer', 'analyst', 'admin')(req, res, next);
}, handleDashboardQuery);

export default router;

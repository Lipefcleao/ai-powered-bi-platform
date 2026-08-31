import { DashboardService } from '../services/dashboardService.js';

export async function handleDashboardQuery(req, res, next) {
  try {
    const { dashboardId } = req.params;
    const result = await DashboardService.queryDashboard({
      dashboardId,
      payload: req.body,
      requestContext: req.requestContext
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

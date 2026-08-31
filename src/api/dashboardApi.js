import { httpClient } from './httpClient.js';

export const dashboardApi = {
  /**
   * Executa a consulta de um dashboard v2 com filtros e paginação no backend.
   */
  async queryDashboard({ dashboardId, filters = {}, pagination = {}, view = 'compensated', signal }) {
    const response = await httpClient(`/api/v2/dashboards/${dashboardId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        view,
        filters,
        pagination
      }),
      signal
    });
    return response.data;
  }
};

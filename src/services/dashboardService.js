import { validateDashboardQueryPayload } from '../schemas/dashboardSchemas.js';
import { DashboardRepository } from '../repositories/dashboardRepository.js';
import { CacheService } from './cacheService.js';

export class DashboardService {
  /**
   * Executa a consulta do dashboard aplicando validação, filtro e cache em memória.
   */
  static async queryDashboard({ dashboardId, payload, requestContext }) {
    const validatedParams = validateDashboardQueryPayload(payload);
    const tenantId = requestContext.user?.tenantId || 'default_tenant';

    const cacheKey = CacheService.generateKey(
      tenantId,
      dashboardId,
      validatedParams.view,
      validatedParams.filters,
      validatedParams.pagination
    );

    const { data, cacheHit } = await CacheService.getOrSet(
      cacheKey,
      async () => {
        if (dashboardId === 'faq9' || dashboardId === 'Resultado Financeiro') {
          return await DashboardRepository.getFinancialResult({
            view: validatedParams.view,
            filters: validatedParams.filters,
            pagination: validatedParams.pagination,
            requestId: requestContext.requestId
          });
        }

        if (dashboardId === 'faq10' || dashboardId === 'Utilização de Horas' || dashboardId === 'Utilização de Horas – Mensal') {
          return await DashboardRepository.getHoursUtilization({
            filters: validatedParams.filters,
            pagination: validatedParams.pagination,
            requestId: requestContext.requestId
          });
        }

        if (dashboardId === 'faq7' || dashboardId === 'Projetos') {
          return await DashboardRepository.getProjectsDashboard({
            view: validatedParams.view,
            filters: validatedParams.filters,
            pagination: validatedParams.pagination,
            requestId: requestContext.requestId
          });
        }

        if (dashboardId === 'faq8' || dashboardId === 'Rateio') {
          return await DashboardRepository.getApportionmentDashboard({
            filters: validatedParams.filters,
            pagination: validatedParams.pagination,
            requestId: requestContext.requestId
          });
        }

        if (dashboardId === 'faq5' || dashboardId === 'Lucratividade') {
          return await DashboardRepository.getProfitabilityDashboard({
            view: validatedParams.view,
            filters: validatedParams.filters,
            pagination: validatedParams.pagination,
            requestId: requestContext.requestId
          });
        }

        if (dashboardId === 'faq2' || dashboardId === 'Comercial') {
          return await DashboardRepository.getCommercialDashboard({
            filters: validatedParams.filters,
            pagination: validatedParams.pagination,
            requestId: requestContext.requestId
          });
        }

        if (dashboardId === 'faq3' || dashboardId === 'Despesas' || dashboardId === 'Despesas x Fornecedores') {
          return await DashboardRepository.getExpensesDashboard({
            filters: validatedParams.filters,
            pagination: validatedParams.pagination,
            requestId: requestContext.requestId
          });
        }

        if (dashboardId === 'faq4' || dashboardId === 'Pessoal' || dashboardId === 'Gasto com pessoal') {
          return await DashboardRepository.getPersonalExpensesDashboard({
            filters: validatedParams.filters,
            pagination: validatedParams.pagination,
            requestId: requestContext.requestId
          });
        }

        const err = new Error(`Dashboard '${dashboardId}' not supported in API v2 yet.`);
        err.status = 404;
        err.code = 'DASHBOARD_NOT_FOUND';
        throw err;
      },
      300 // TTL de 5 minutos (300 segundos)
    );

    return {
      dashboardId,
      ...data,
      meta: {
        requestId: requestContext.requestId,
        generatedAt: new Date().toISOString(),
        cacheHit,
        user: requestContext.user?.id
      }
    };
  }
}

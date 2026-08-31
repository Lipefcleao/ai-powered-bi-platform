import { repositoryFactory } from './index.js';

/**
 * Proxy/Facade para o Repositório de Dashboards.
 * Mantém retrocompatibilidade com endpoints e serviços legados que fazem uso de chamadas estáticas,
 * redirecionando as execuções para a implementação resolvida dinamicamente pela Factory (Sql ou Demo).
 */
export class DashboardRepository {
  static async getFinancialResult(args) {
    return await repositoryFactory.getDashboardRepository().getFinancialResult(args);
  }

  static async getCompetenceResult(args) {
    return await repositoryFactory.getDashboardRepository().getCompetenceResult(args);
  }

  static async getCashResult(args) {
    return await repositoryFactory.getDashboardRepository().getCashResult(args);
  }

  static async getHoursUtilization(args) {
    return await repositoryFactory.getDashboardRepository().getHoursUtilization(args);
  }

  static async getProjectsDashboard(args) {
    return await repositoryFactory.getDashboardRepository().getProjectsDashboard(args);
  }

  static async getApportionmentDashboard(args) {
    return await repositoryFactory.getDashboardRepository().getApportionmentDashboard(args);
  }

  static async getProfitabilityDashboard(args) {
    return await repositoryFactory.getDashboardRepository().getProfitabilityDashboard(args);
  }

  static async getCommercialDashboard(args) {
    return await repositoryFactory.getDashboardRepository().getCommercialDashboard(args);
  }

  static async getExpensesDashboard(args) {
    return await repositoryFactory.getDashboardRepository().getExpensesDashboard(args);
  }

  static async getPersonalExpensesDashboard(args) {
    return await repositoryFactory.getDashboardRepository().getPersonalExpensesDashboard(args);
  }
}

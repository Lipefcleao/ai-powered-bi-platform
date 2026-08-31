/**
 * Classe Base Abstrata para os Repositórios de Dashboard de BI.
 * Define o contrato comum que deve ser implementado pelo repositório SQL (produção) e Demo (sintético).
 */
export class BaseRepository {
  async getFinancialResult({ view, filters, pagination, requestId }) {
    throw new Error('Method getFinancialResult must be implemented');
  }

  async getCompetenceResult({ filters, pagination, requestId }) {
    throw new Error('Method getCompetenceResult must be implemented');
  }

  async getCashResult({ view, filters, pagination, requestId }) {
    throw new Error('Method getCashResult must be implemented');
  }

  async getHoursUtilization({ filters, pagination, requestId }) {
    throw new Error('Method getHoursUtilization must be implemented');
  }

  async getProjectsDashboard({ view, filters, pagination, requestId }) {
    throw new Error('Method getProjectsDashboard must be implemented');
  }

  async getApportionmentDashboard({ filters, pagination, requestId }) {
    throw new Error('Method getApportionmentDashboard must be implemented');
  }

  async getProfitabilityDashboard({ view, filters, pagination, requestId }) {
    throw new Error('Method getProfitabilityDashboard must be implemented');
  }

  async getCommercialDashboard({ filters, requestId }) {
    throw new Error('Method getCommercialDashboard must be implemented');
  }

  async getExpensesDashboard({ filters, pagination, requestId }) {
    throw new Error('Method getExpensesDashboard must be implemented');
  }

  async getPersonalExpensesDashboard({ filters, pagination, requestId }) {
    throw new Error('Method getPersonalExpensesDashboard must be implemented');
  }
}

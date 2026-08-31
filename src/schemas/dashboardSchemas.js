/**
 * Schema e sanitizador para payloads da API de Dashboards v2.
 */
export function validateDashboardQueryPayload(body) {
  const errors = [];
  const { view = 'compensated', filters = {}, pagination = {}, sort = {} } = body || {};

  // Validação de intervalo de datas
  const startDate = filters.startDate ? new Date(filters.startDate) : null;
  const endDate = filters.endDate ? new Date(filters.endDate) : null;

  if (filters.startDate && isNaN(startDate.getTime())) {
    errors.push("Invalid 'startDate' format. Use YYYY-MM-DD.");
  }
  if (filters.endDate && isNaN(endDate.getTime())) {
    errors.push("Invalid 'endDate' format. Use YYYY-MM-DD.");
  }
  if (startDate && endDate && startDate > endDate) {
    errors.push("'startDate' must be less than or equal to 'endDate'.");
  }

  // Validação de paginação
  const page = Math.max(1, parseInt(pagination.page || 1, 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(pagination.pageSize || 50, 10)));

  // Validação de arrays de IDs (garante que são inteiros)
  const projectIds = Array.isArray(filters.projectIds) 
    ? filters.projectIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0)
    : [];
  const clientIds = Array.isArray(filters.clientIds)
    ? filters.clientIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0)
    : [];

  // Validação de filtros adicionais da Utilização de Horas e Projetos
  const year = filters.year ? parseInt(filters.year, 10) : null;
  const month = (filters.month !== undefined && filters.month !== null) ? parseInt(filters.month, 10) : null;
  const collaborator = filters.collaborator || null;
  
  const clientName = filters.clientName || null;
  const projectName = filters.projectName || null;
  const projectStatus = filters.projectStatus || null;
  const responsibleName = filters.responsibleName || null;

  // Filtros específicos do Rateio (FAQ 8)
  const ratedProjectName = filters.ratedProjectName || null;
  const recipientProjectName = filters.recipientProjectName || null;
  const rateioMethod = filters.rateioMethod || null;

  // Filtros específicos do Despesas x Fornecedores (FAQ 3)
  const supplierName = filters.supplierName || null;
  const bankAccountName = filters.bankAccountName || null;
  const status = filters.status || null;

  // Filtros específicos do Gasto com Pessoal (FAQ 4)
  const etapaName = filters.etapaName || null;
  const tarefaName = filters.tarefaName || null;

  if (year && (isNaN(year) || year < 2000 || year > 2100)) {
    errors.push("Invalid 'year' filter. Must be between 2000 and 2100.");
  }
  if (month !== null && (isNaN(month) || month < 0 || month > 11)) {
    errors.push("Invalid 'month' filter. Must be 0-indexed (0 to 11).");
  }

  if (errors.length > 0) {
    const err = new Error(errors.join(' '));
    err.status = 400;
    err.code = 'INVALID_PAYLOAD';
    throw err;
  }

  const validViews = [
    'compensated', 'uncompensated', 'competence', 'utilization',
    'status', 'tempo_projeto', 'tempo_etapa', 'tempo_tarefa', 'apportionment',
    'profitability', 'overdue', 'commercial', 'financial_flow', 'expenses', 'personal_expenses'
  ];

  return {
    view: validViews.includes(view) ? view : 'compensated',
    filters: {
      startDate: filters.startDate || null,
      endDate: filters.endDate || null,
      projectIds,
      clientIds,
      year,
      month,
      collaborator,
      clientName,
      projectName,
      projectStatus,
      responsibleName,
      ratedProjectName,
      recipientProjectName,
      rateioMethod,
      supplierName,
      bankAccountName,
      status,
      etapaName,
      tarefaName
    },
    pagination: {
      page,
      pageSize,
      offset: (page - 1) * pageSize
    },
    sort: {
      field: sort.field || 'CompetenceDate',
      direction: (sort.direction || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    }
  };
}

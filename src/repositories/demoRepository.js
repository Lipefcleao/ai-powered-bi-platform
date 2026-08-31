import fs from 'fs';
import path from 'path';
import { BaseRepository } from './baseRepository.js';

// Carrega os dados sintéticos em memória no bootstrap para latência mínima
const financePath = path.resolve(process.cwd(), 'src', 'demo', 'staticData', 'syntheticFinance.json');
const projectsPath = path.resolve(process.cwd(), 'src', 'demo', 'staticData', 'syntheticProjects.json');

let syntheticFinance = [];
let syntheticProjects = { projects: [], collaborators: [], boards: [], tasks: [], timeReports: [] };

try {
  syntheticFinance = JSON.parse(fs.readFileSync(financePath, 'utf8'));
  syntheticProjects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
} catch (err) {
  console.error('[DemoRepository Warning] Falha ao carregar dados sintéticos:', err.message);
}

export class DemoRepository extends BaseRepository {
  /**
   * FAQ 9 - Resultado Financeiro
   */
  async getFinancialResult({ view, filters, pagination, requestId }) {
    if (view === 'competence') {
      return await this.getCompetenceResult({ filters, pagination, requestId });
    } else {
      return await this.getCashResult({ view, filters, pagination, requestId });
    }
  }

  async getCompetenceResult({ filters, pagination, requestId }) {
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;

    // Filtra lançamentos pela data de competência
    const filtered = syntheticFinance.filter(item => {
      if (!item.competenceDate) return false;
      const refDate = new Date(item.competenceDate);
      if (start && refDate < start) return false;
      if (end && refDate > end) return false;
      if (filters.projectIds && filters.projectIds.length > 0) {
        // Simula filtro por ID mapeando pelo nome do projeto
        const matchedProj = syntheticProjects.projects.find(p => p.id === Number(filters.projectIds[0]));
        if (matchedProj && item.projectName !== matchedProj.name) return false;
      }
      return true;
    });

    // Calcula KPIs do sumário
    let totalRevenue = 0;
    let totalExpenses = 0;
    filtered.forEach(item => {
      if (item.value > 0) totalRevenue += item.value;
      else totalExpenses += Math.abs(item.value);
    });
    const netMargin = totalRevenue - totalExpenses;

    // Agrupa dados temporais por período mensal YYYY-MM
    const seriesMap = {};
    filtered.forEach(item => {
      const period = item.competenceDate.substring(0, 7);
      if (!seriesMap[period]) seriesMap[period] = { period, revenue: 0, expense: 0 };
      if (item.value > 0) seriesMap[period].revenue += item.value;
      else seriesMap[period].expense += Math.abs(item.value);
    });
    const series = Object.values(seriesMap).sort((a, b) => a.period.localeCompare(b.period));

    // Mapeia e formata linhas detalhadas
    const rows = filtered.map((item, idx) => ({
      id: `demo-competence-${item.id}-${idx}`,
      competenceDate: item.competenceDate,
      description: `Competência: ${item.categoryName} (${item.executed ? 'Compensada' : 'Não compensada'})`,
      type: item.value >= 0 ? 'Income' : 'Expense',
      amount: Math.abs(item.value),
      projectId: item.projectName || 'Sem projeto',
      clientName: item.clientName || '-',
      accountName: item.accountName || '-',
      categoryName: item.categoryName
    }));

    // Paginação
    const paginatedRows = rows.slice(pagination.offset, pagination.offset + pagination.pageSize);

    return {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netMargin: Math.round(netMargin * 100) / 100
      },
      series,
      rows: paginatedRows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize
      }
    };
  }

  async getCashResult({ view, filters, pagination, requestId }) {
    const isCompensated = view !== 'uncompensated';
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;

    // Filtra lançamentos por data de pagamento (caixa) e status
    const filtered = syntheticFinance.filter(item => {
      const refDate = new Date(item.date);
      if (start && refDate < start) return false;
      if (end && refDate > end) return false;
      if (item.executed !== (isCompensated ? 1 : 0)) return false;
      if (filters.projectIds && filters.projectIds.length > 0) {
        const matchedProj = syntheticProjects.projects.find(p => p.id === Number(filters.projectIds[0]));
        if (matchedProj && item.projectName !== matchedProj.name) return false;
      }
      return true;
    });

    let totalRevenue = 0;
    let totalExpenses = 0;
    filtered.forEach(item => {
      if (item.value > 0) totalRevenue += item.value;
      else totalExpenses += Math.abs(item.value);
    });
    const netMargin = totalRevenue - totalExpenses;

    const seriesMap = {};
    filtered.forEach(item => {
      const period = item.date.substring(0, 7);
      if (!seriesMap[period]) seriesMap[period] = { period, revenue: 0, expense: 0 };
      if (item.value > 0) seriesMap[period].revenue += item.value;
      else seriesMap[period].expense += Math.abs(item.value);
    });
    const series = Object.values(seriesMap).sort((a, b) => a.period.localeCompare(b.period));

    const rows = filtered.map((item, idx) => ({
      id: `demo-cash-${item.id}-${idx}`,
      competenceDate: item.date,
      description: item.categoryName,
      type: item.value >= 0 ? 'Income' : 'Expense',
      amount: Math.abs(item.value),
      projectId: item.projectName || 'Sem projeto',
      clientName: item.clientName || 'Sem cliente definido',
      accountName: item.accountName || 'Sem conta definida',
      categoryName: item.categoryName
    }));

    const paginatedRows = rows.slice(pagination.offset, pagination.offset + pagination.pageSize);

    return {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netMargin: Math.round(netMargin * 100) / 100
      },
      series,
      rows: paginatedRows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize
      }
    };
  }

  /**
   * FAQ 10 - Utilização de Horas
   */
  async getHoursUtilization({ filters, pagination, requestId }) {
    const activeYear = filters.year || 2026;
    const activeMonth = (filters.month !== null && filters.month !== undefined) ? filters.month : 7; // Agosto padrão

    // Filtra apontamentos de esforço
    const reports = syntheticProjects.timeReports.filter(r => {
      const rDate = new Date(r.dia);
      const matchPeriod = rDate.getFullYear() === activeYear && rDate.getMonth() === activeMonth;
      const matchCollab = (!filters.collaborator || filters.collaborator === 'Todos' || r.membroNome === filters.collaborator);
      return matchPeriod && matchCollab;
    });

    // Calcula horas trabalhadas por colaborador no período
    const collabHours = {};
    reports.forEach(r => {
      collabHours[r.membroNome] = (collabHours[r.membroNome] || 0) + r.horasTrabalhadas;
    });

    // Lista de colaboradores e suas taxas de utilização
    const rows = Object.entries(collabHours).map(([name, worked]) => {
      const useful = 160; // 160h úteis padrão de simulação
      const balance = worked - useful;
      const rate = useful > 0 ? (worked / useful) * 100 : 0;
      return {
        id: `demo-utilization-${name}`,
        collaboratorName: name,
        period: `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-01`,
        usefulHours: useful,
        workedHours: worked,
        balanceHours: Math.round(balance * 100) / 100,
        utilizationRate: Math.round(rate * 100) / 100
      };
    });

    // Gráfico de distribuição por projetos
    const projectHoursMap = {};
    reports.forEach(r => {
      projectHoursMap[r.projetoName] = (projectHoursMap[r.projetoName] || 0) + r.horasTrabalhadas;
    });
    const projectHours = Object.entries(projectHoursMap).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100
    }));

    // Tendência mensal de utilização (simulada estável de 6 meses)
    const monthlyTrend = [
      { mesLabel: 'Março 2026', horasUteis: 160, horasTrabalhadas: 164, saldo: 4, taxa: 102.5 },
      { mesLabel: 'Abril 2026', horasUteis: 160, horasTrabalhadas: 152, saldo: -8, taxa: 95.0 },
      { mesLabel: 'Maio 2026', horasUteis: 160, horasTrabalhadas: 160, saldo: 0, taxa: 100.0 },
      { mesLabel: 'Junho 2026', horasUteis: 160, horasTrabalhadas: 172, saldo: 12, taxa: 107.5 },
      { mesLabel: 'Julho 2026', horasUteis: 160, horasTrabalhadas: 158, saldo: -2, taxa: 98.75 },
      { mesLabel: 'Agosto 2026', horasUteis: 160, horasTrabalhadas: 165, saldo: 5, taxa: 103.12 }
    ];

    // Totais Consolidados Gerais
    let totalWorked = 0;
    rows.forEach(r => totalWorked += r.workedHours);
    const totalUseful = rows.length * 160 || 160;
    const totalBalance = totalWorked - totalUseful;
    const averageRate = totalUseful > 0 ? (totalWorked / totalUseful) * 100 : 0;

    const activeCollaborators = syntheticProjects.collaborators.map(c => c.name);

    return {
      summary: {
        totalUsefulHours: totalUseful,
        totalWorkedHours: totalWorked,
        totalBalanceHours: Math.round(totalBalance * 100) / 100,
        averageUtilizationRate: Math.round(averageRate * 100) / 100
      },
      projectHours,
      monthlyTrend,
      collaborators: rows.slice(pagination.offset, pagination.offset + pagination.pageSize),
      activeCollaborators,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows: rows.length,
        totalPages: Math.ceil(rows.length / pagination.pageSize)
      }
    };
  }

  /**
   * FAQ 7 - Projetos
   */
  async getProjectsDashboard({ view, filters, pagination, requestId }) {
    const clients = [...new Set(syntheticProjects.projects.map(p => p.clientName))];
    const projects = syntheticProjects.projects.map(p => p.name);
    const statuses = ['A começar', 'Em andamento', 'Finalizado'];
    const responsibles = syntheticProjects.collaborators.map(c => c.name);

    const filterOptions = { clients, projects, statuses, responsibles };

    let rows = [];
    if (view === 'status') {
      rows = syntheticProjects.projects.map(p => ({
        NomeProjeto: p.name,
        Data: '2026-08-01',
        Cliente: p.clientName,
        StatusProjeto: p.id % 2 === 0 ? 'Finalizado' : 'Em andamento',
        StatusAtivo: p.active,
        Responsavel: responsibles[p.id % responsibles.length]
      }));
    } else if (view === 'tempo_projeto') {
      rows = syntheticProjects.projects.map(p => ({
        Cliente: p.clientName,
        Projeto: p.name,
        ResponsavelProjeto: responsibles[p.id % responsibles.length],
        ProjetoInicio: '2026-01-01',
        ProjetoPrazo: '2026-12-31',
        ProjetoFim: p.id % 2 === 0 ? '2026-06-30' : null,
        StatusProjeto: p.id % 2 === 0 ? 'Concluído no prazo' : 'No prazo',
        TempoProjetoMeses: p.id % 2 === 0 ? 6 : null,
        isFirstOfClient: true,
        clientRowSpan: 1,
        ClienteExibicao: p.clientName
      }));
    } else if (view === 'tempo_etapa') {
      rows = syntheticProjects.boards.map(b => {
        const proj = syntheticProjects.projects.find(p => p.id === b.projectId) || { name: 'Sem projeto', clientName: '-' };
        return {
          Projeto: proj.name,
          Etapa: b.name,
          EtapaInicio: '2026-08-01',
          EtapaPrazo: '2026-08-31',
          EtapaFim: b.id % 2 === 0 ? '2026-08-20' : null,
          Cliente: proj.clientName,
          StatusEtapa: b.id % 2 === 0 ? 'Concluído no prazo' : 'No prazo',
          TempoEtapaDias: b.id % 2 === 0 ? 20 : null
        };
      });
    } else if (view === 'tempo_tarefa') {
      rows = syntheticProjects.tasks.map(t => {
        const board = syntheticProjects.boards.find(b => b.id === t.boardId) || { name: 'Sem etapa', projectId: 5 };
        const proj = syntheticProjects.projects.find(p => p.id === board.projectId) || { name: 'Sem projeto', clientName: '-' };
        const assignee = syntheticProjects.collaborators.find(c => c.id === t.userId) || { name: 'Sem responsável' };
        return {
          Cliente: proj.clientName,
          Projeto: proj.name,
          ResponsavelProjeto: responsibles[0],
          Etapa: board.name,
          TituloTarefa: t.title,
          ResponsavelTarefa: assignee.name,
          Tag: t.id % 2 === 0 ? 'Bug' : 'Funcionalidade',
          TarefaCriacao: '2026-08-01',
          TarefaInicio: '2026-08-02',
          TarefaPrazo: '2026-08-15',
          TarefaFim: t.status === 'Done' ? '2026-08-10' : null,
          StatusTarefa: t.status === 'Done' ? 'Concluído no prazo' : 'No prazo',
          TempoTarefaDias: t.status === 'Done' ? 9 : null
        };
      });
    }

    // Filtros dinâmicos quali
    const filteredRows = rows.filter(row => {
      if (filters.clientName && filters.clientName !== 'Todos' && row.Cliente !== filters.clientName) return false;
      if (filters.projectName && filters.projectName !== 'Todos') {
        const projField = row.Projeto || row.NomeProjeto;
        if (projField !== filters.projectName) return false;
      }
      if (filters.projectStatus && filters.projectStatus !== 'Todos') {
        const statField = row.StatusProjeto || row.StatusEtapa || row.StatusTarefa;
        if (statField !== filters.projectStatus) return false;
      }
      if (filters.responsibleName && filters.responsibleName !== 'Todos') {
        const respField = row.Responsavel || row.ResponsavelProjeto || row.ResponsavelTarefa;
        if (respField !== filters.responsibleName) return false;
      }
      return true;
    });

    const paginatedRows = filteredRows.slice(pagination.offset, pagination.offset + pagination.pageSize);

    let summary = {};
    let chartData = [];

    if (view === 'status') {
      summary = { totalActiveProjects: filteredRows.length };
      chartData = [
        { Status: 'Em andamento', "Quantidade de Projetos": filteredRows.filter(r => r.StatusProjeto === 'Em andamento').length },
        { Status: 'Finalizado', "Quantidade de Projetos": filteredRows.filter(r => r.StatusProjeto === 'Finalizado').length }
      ];
    } else if (view === 'tempo_projeto') {
      summary = { totalProjects: filteredRows.length };
    } else if (view === 'tempo_etapa') {
      summary = { totalStages: filteredRows.length };
    } else if (view === 'tempo_tarefa') {
      summary = { totalTasks: filteredRows.length };
    }

    return {
      summary,
      chartData: view === 'status' ? chartData : undefined,
      rows: paginatedRows,
      filterOptions,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows: filteredRows.length,
        totalPages: Math.ceil(filteredRows.length / pagination.pageSize)
      }
    };
  }

  /**
   * FAQ 8 - Rateio
   */
  async getApportionmentDashboard({ filters, pagination, requestId }) {
    // Retorna dados de rateio simulando o fechamento do projeto
    const list = [
      {
        "Mês/Ano": "agosto/2026",
        "Ano": 2026,
        "Mês": 8,
        "Projeto rateado (origem)": "Geral Operacional",
        "Método de rateio": "Pessoas",
        "Projeto (padrão)": "Dashboard Analytics",
        "Total (horas/receitas/pessoas)": 5,
        "Fator multiplicador": 0.40,
        "Valor do rateio": 3400.00,
        "Percentual": 40.0
      },
      {
        "Mês/Ano": "agosto/2026",
        "Ano": 2026,
        "Mês": 8,
        "Projeto rateado (origem)": "Geral Operacional",
        "Método de rateio": "Pessoas",
        "Projeto (padrão)": "Migração Cloud",
        "Total (horas/receitas/pessoas)": 5,
        "Fator multiplicador": 0.30,
        "Valor do rateio": 2550.00,
        "Percentual": 30.0
      },
      {
        "Mês/Ano": "agosto/2026",
        "Ano": 2026,
        "Mês": 8,
        "Projeto rateado (origem)": "Geral Operacional",
        "Método de rateio": "Pessoas",
        "Projeto (padrão)": "Portal de Vendas",
        "Total (horas/receitas/pessoas)": 5,
        "Fator multiplicador": 0.20,
        "Valor do rateio": 1700.00,
        "Percentual": 20.0
      },
      {
        "Mês/Ano": "agosto/2026",
        "Ano": 2026,
        "Mês": 8,
        "Projeto rateado (origem)": "Geral Operacional",
        "Método de rateio": "Pessoas",
        "Projeto (padrão)": "Segurança da Informação",
        "Total (horas/receitas/pessoas)": 5,
        "Fator multiplicador": 0.10,
        "Valor do rateio": 850.00,
        "Percentual": 10.0
      }
    ];

    const filtered = list.filter(row => {
      if (filters.ratedProjectName && filters.ratedProjectName !== 'Todos' && row["Projeto rateado (origem)"] !== filters.ratedProjectName) return false;
      if (filters.recipientProjectName && filters.recipientProjectName !== 'Todos' && row["Projeto (padrão)"] !== filters.recipientProjectName) return false;
      if (filters.rateioMethod && filters.rateioMethod !== 'Todos' && row["Método de rateio"] !== filters.rateioMethod) return false;
      return true;
    });

    const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.pageSize);

    // Gráfico de barras de rateio por projeto de destino
    const chartData = filtered.map(item => ({
      projetoDestino: item["Projeto (padrão)"],
      valor: item["Valor do rateio"]
    }));

    const distinctOrigem = ['Geral Operacional'];
    const distinctDestino = ['Dashboard Analytics', 'Migração Cloud', 'Portal de Vendas', 'Segurança da Informação'];
    const distinctMetodos = ['Pessoas', 'Horas', 'Receitas'];

    return {
      rows: paginated,
      chartData,
      filterOptions: {
        ratedProjects: distinctOrigem,
        recipientProjects: distinctDestino,
        methods: distinctMetodos
      },
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows: filtered.length,
        totalPages: Math.ceil(filtered.length / pagination.pageSize)
      }
    };
  }

  /**
   * FAQ 5 - Lucratividade e Contas em Atraso
   */
  async getProfitabilityDashboard({ view, filters, pagination, requestId }) {
    if (view === 'overdue') {
      const overdueList = [
        { id: 901, date: '2026-08-01', clientName: 'Globex', projectName: 'Migração Cloud', amount: 35000.00, delayDays: 24, type: 'Receber' },
        { id: 902, date: '2026-08-10', clientName: 'Initech', projectName: 'Segurança da Informação', amount: 12000.00, delayDays: 15, type: 'Receber' },
        { id: 903, date: '2026-08-05', clientName: 'Uso Interno', projectName: 'Geral Operacional', amount: 5000.00, delayDays: 20, type: 'Pagar' }
      ];
      
      const filtered = overdueList.filter(row => {
        if (filters.clientName && filters.clientName !== 'Todos' && row.clientName !== filters.clientName) return false;
        if (filters.projectName && filters.projectName !== 'Todos' && row.projectName !== filters.projectName) return false;
        return true;
      });

      const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.pageSize);
      
      let totOverdue = 0;
      filtered.forEach(r => totOverdue += r.amount);

      return {
        summary: {
          totalOverdueAmount: totOverdue
        },
        rows: paginated,
        filterOptions: {
          clients: ['Globex', 'Initech', 'Uso Interno'],
          projects: ['Migração Cloud', 'Segurança da Informação', 'Geral Operacional']
        },
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalRows: filtered.length,
          totalPages: Math.ceil(filtered.length / pagination.pageSize)
        }
      };
    }

    // View: 'profitability' (Resultado do projeto)
    const profitability = [
      { id: 801, clientName: 'Acme Corp', projectName: 'Dashboard Analytics', revenue: 78000.00, expenses: 13500.00, margin: 64500.00, rate: 82.69 },
      { id: 802, clientName: 'Globex', projectName: 'Migração Cloud', revenue: 70000.00, expenses: 22000.00, margin: 48000.00, rate: 68.57 },
      { id: 803, clientName: 'Stark Industries', projectName: 'Portal de Vendas', revenue: 88000.00, expenses: 19500.00, margin: 68500.00, rate: 77.84 },
      { id: 804, clientName: 'Initech', projectName: 'Segurança da Informação', revenue: 30000.00, expenses: 8000.00, margin: 22000.00, rate: 73.33 }
    ];

    const filtered = profitability.filter(row => {
      if (filters.clientName && filters.clientName !== 'Todos' && row.clientName !== filters.clientName) return false;
      if (filters.projectName && filters.projectName !== 'Todos' && row.projectName !== filters.projectName) return false;
      return true;
    });

    const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.pageSize);

    let totalRevenue = 0, totalExpenses = 0;
    filtered.forEach(r => {
      totalRevenue += r.revenue;
      totalExpenses += r.expenses;
    });
    const totalMargin = totalRevenue - totalExpenses;
    const averageRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netMargin: Math.round(totalMargin * 100) / 100,
        averageProfitabilityRate: Math.round(averageRate * 100) / 100
      },
      rows: paginated,
      filterOptions: {
        clients: ['Acme Corp', 'Globex', 'Stark Industries', 'Initech'],
        projects: ['Dashboard Analytics', 'Migração Cloud', 'Portal de Vendas', 'Segurança da Informação']
      },
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows: filtered.length,
        totalPages: Math.ceil(filtered.length / pagination.pageSize)
      }
    };
  }

  /**
   * FAQ 2 - Comercial
   */
  async getCommercialDashboard({ filters, requestId }) {
    const activeYear = filters.year || 2026;

    // Métricas comerciais simuladas anuais
    const summary = {
      totalValueSales: 166000.00,
      totalCountSales: 4,
      totalCompensatedSales: 125000.00,
      compensatedPercent: 75.30
    };

    // Gráfico de Funil (Vendas e Orçamentos)
    const salesFunnel = [
      { name: '1. Orçamentos Enviados', value: 12 },
      { name: '2. Propostas em Negociação', value: 8 },
      { name: '3. Contratos Fechados', value: 4 }
    ];

    // Série de Vendas Anual Mensal
    const annualSales = [
      { period: '2026-01', sales: 25000 },
      { period: '2026-02', sales: 0 },
      { period: '2026-03', sales: 0 },
      { period: '2026-04', sales: 30000 },
      { period: '2026-05', sales: 25000 },
      { period: '2026-06', sales: 40000 },
      { period: '2026-07', sales: 35000 },
      { period: '2026-08', sales: 48000 }
    ];

    return {
      summary,
      salesFunnel,
      annualSales,
      series: annualSales
    };
  }

  /**
   * FAQ 3 - Despesas x Fornecedores
   */
  async getExpensesDashboard({ filters, pagination, requestId }) {
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;

    // Filtra lançamentos negativos (despesas)
    const expenses = syntheticFinance.filter(item => {
      if (item.value >= 0) return false;
      const refDate = new Date(item.date);
      if (start && refDate < start) return false;
      if (end && refDate > end) return false;
      return true;
    });

    let totalExpenses = 0;
    expenses.forEach(e => totalExpenses += Math.abs(e.value));

    // Ranking de Fornecedores (Gráfico de barras)
    const supplierRanking = {};
    expenses.forEach(e => {
      const supplier = e.categoryName; // Simula fornecedor pela categoria
      supplierRanking[supplier] = (supplierRanking[supplier] || 0) + Math.abs(e.value);
    });

    const barChartTotalFornecedorData = Object.entries(supplierRanking).map(([name, value]) => ({
      fornecedor: name,
      valor: Math.round(value * 100) / 100
    })).sort((a, b) => b.valor - a.valor);

    // Evolução mensal por fornecedor (Barras empilhadas)
    const monthlyMap = {};
    expenses.forEach(e => {
      const period = e.date.substring(0, 7);
      const supplier = e.categoryName;
      if (!monthlyMap[period]) monthlyMap[period] = { period };
      monthlyMap[period][supplier] = (monthlyMap[period][supplier] || 0) + Math.abs(e.value);
    });
    const barChartFornecedorData = Object.values(monthlyMap).sort((a, b) => a.period.localeCompare(b.period));

    const uniqueFornecedores = Object.keys(supplierRanking);

    const rows = expenses.map((item, idx) => ({
      id: `demo-expense-${item.id}-${idx}`,
      competenceDate: item.date,
      description: item.categoryName,
      type: 'Expense',
      amount: Math.abs(item.value),
      projectId: item.projectName || 'Sem projeto',
      clientName: item.clientName || 'Sem cliente definido',
      accountName: item.accountName || 'Sem conta definida',
      categoryName: item.categoryName
    }));

    const paginatedRows = rows.slice(pagination.offset, pagination.offset + pagination.pageSize);

    return {
      summary: {
        totalExpenses: Math.round(totalExpenses * 100) / 100
      },
      series: {
        barChartFornecedorData,
        barChartTotalFornecedorData,
        uniqueFornecedores
      },
      rows: paginatedRows,
      filterOptions: {
        suppliers: uniqueFornecedores,
        bankAccounts: ['Itaú Demo', 'Bradesco Demo']
      },
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows: rows.length,
        totalPages: Math.ceil(rows.length / pagination.pageSize)
      }
    };
  }

  /**
   * FAQ 4 - Gasto com Pessoal
   */
  async getPersonalExpensesDashboard({ filters, pagination, requestId }) {
    const rows = [
      { id: 'demo-personal-1', collaboratorName: 'Alice Silva', role: 'Software Engineer', usefulHours: 160, workedHours: 165, hourCost: 85.00, salaryBase: 10000.00, totalTaxes: 3400.00, costTotal: 13400.00, period: '2026-08' },
      { id: 'demo-personal-2', collaboratorName: 'Bob Santos', role: 'UI/UX Designer', usefulHours: 160, workedHours: 155, hourCost: 65.00, salaryBase: 7000.00, totalTaxes: 2380.00, costTotal: 9380.00, period: '2026-08' },
      { id: 'demo-personal-3', collaboratorName: 'Carlos Oliveira', role: 'Cloud Architect', usefulHours: 160, workedHours: 160, hourCost: 95.00, salaryBase: 12000.00, totalTaxes: 4080.00, costTotal: 16080.00, period: '2026-08' }
    ];

    const filtered = rows.filter(row => {
      if (filters.collaborator && filters.collaborator !== 'Todos' && row.collaboratorName !== filters.collaborator) return false;
      return true;
    });

    const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.pageSize);

    let totalCost = 0;
    filtered.forEach(r => totalCost += r.costTotal);

    return {
      summary: {
        totalPersonalExpenses: totalCost
      },
      rows: paginated,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows: filtered.length,
        totalPages: Math.ceil(filtered.length / pagination.pageSize)
      }
    };
  }
}

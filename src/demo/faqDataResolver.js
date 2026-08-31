import fs from 'fs';
import path from 'path';

/**
 * Resolvedor de dados sintéticos pré-formatados para as 10 FAQs legadas.
 * Cada FAQ retorna dados no EXATO formato que o frontend espera,
 * simulando o resultado que viria das queries SQL de produção.
 */

const financePath = path.resolve(process.cwd(), 'src', 'demo', 'staticData', 'syntheticFinance.json');
const projectsPath = path.resolve(process.cwd(), 'src', 'demo', 'staticData', 'syntheticProjects.json');

let finance = [];
let projects = { projects: [], collaborators: [], boards: [], tasks: [], timeReports: [] };

try {
  finance = JSON.parse(fs.readFileSync(financePath, 'utf8'));
  projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
} catch (e) {
  console.warn('[FaqDataResolver] Erro ao carregar dados sintéticos:', e.message);
}

// ═══════════════════════════════════════════════════════════════
// FAQ 1 — Alocação de Horas – Estimado x Reportado
// ═══════════════════════════════════════════════════════════════
function getFaq1() {
  return projects.tasks.map(t => {
    const board = projects.boards.find(b => b.id === t.boardId) || { name: 'Sem etapa', projectId: 0 };
    const proj = projects.projects.find(p => p.id === board.projectId) || { name: 'Sem projeto' };
    const member = projects.collaborators.find(c => c.id === t.userId) || { name: 'Sem responsável' };
    const reported = projects.timeReports
      .filter(r => r.taskId === t.id)
      .reduce((sum, r) => sum + r.horasTrabalhadas, 0);
    return {
      Projeto: proj.name,
      EstimativaProjeto: 160,
      ReportagemProjeto: 140,
      Etapa: board.name,
      EstimativaEtapa: t.estimatedEffort * 2,
      ReportagemEtapa: reported * 2,
      Tarefa: t.title,
      EstimativaTarefa: t.estimatedEffort,
      ReportagemTarefa: reported,
      ResponsavelTarefa: member.name,
      EstimativaResponsavel: t.estimatedEffort,
      ReportagemResponsavel: reported
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// FAQ 2 — Comercial (Vendas + Compensações) — isMultiple
// ═══════════════════════════════════════════════════════════════
function getFaq2() {
  const vendas = [
    { Date: '2024-01-15', Receitas: 42000.00, Tipo: 'Venda' },
    { Date: '2024-02-20', Receitas: 18500.00, Tipo: 'Orçamento' },
    { Date: '2024-03-10', Receitas: 55000.00, Tipo: 'Venda' },
    { Date: '2024-04-05', Receitas: 22000.00, Tipo: 'Orçamento' },
    { Date: '2024-05-12', Receitas: 67000.00, Tipo: 'Venda' },
    { Date: '2024-06-18', Receitas: 31000.00, Tipo: 'Venda' },
    { Date: '2024-07-22', Receitas: 48000.00, Tipo: 'Venda' },
    { Date: '2024-08-14', Receitas: 25000.00, Tipo: 'Orçamento' },
    { Date: '2024-09-08', Receitas: 72000.00, Tipo: 'Venda' },
    { Date: '2024-10-03', Receitas: 38000.00, Tipo: 'Venda' },
    { Date: '2024-11-19', Receitas: 19500.00, Tipo: 'Orçamento' },
    { Date: '2024-12-01', Receitas: 85000.00, Tipo: 'Venda' }
  ];

  const compensacoes = [
    { Date: '2024-01-20', ValorCompensado: 42000.00, Cliente: 'Acme Corp', Projeto: 'Dashboard Analytics' },
    { Date: '2024-03-15', ValorCompensado: 55000.00, Cliente: 'Globex', Projeto: 'Migração Cloud' },
    { Date: '2024-05-18', ValorCompensado: 67000.00, Cliente: 'Stark Industries', Projeto: 'Portal de Vendas' },
    { Date: '2024-06-22', ValorCompensado: 31000.00, Cliente: 'Acme Corp', Projeto: 'Dashboard Analytics' },
    { Date: '2024-07-28', ValorCompensado: 48000.00, Cliente: 'Initech', Projeto: 'Segurança da Informação' },
    { Date: '2024-09-12', ValorCompensado: 72000.00, Cliente: 'Globex', Projeto: 'Migração Cloud' },
    { Date: '2024-10-08', ValorCompensado: 38000.00, Cliente: 'Stark Industries', Projeto: 'Portal de Vendas' },
    { Date: '2024-12-05', ValorCompensado: 85000.00, Cliente: 'Acme Corp', Projeto: 'Dashboard Analytics' }
  ];

  return [vendas, compensacoes];
}

// ═══════════════════════════════════════════════════════════════
// FAQ 3 — Despesas x Fornecedores
// ═══════════════════════════════════════════════════════════════
function getFaq3() {
  return [
    { Date: '2024-01-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-01-20', Projeto: 'Dashboard Analytics', Categoria: 'Cloud Azure', Fornecedor: 'Microsoft', Total: -3200.00 },
    { Date: '2024-02-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-02-22', Projeto: 'Migração Cloud', Categoria: 'Cloud AWS', Fornecedor: 'Amazon Web Services', Total: -4800.00 },
    { Date: '2024-03-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-03-18', Projeto: 'Dashboard Analytics', Categoria: 'Licenças Software', Fornecedor: 'JetBrains', Total: -1200.00 },
    { Date: '2024-04-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-04-20', Projeto: 'Portal de Vendas', Categoria: 'Marketing Digital', Fornecedor: 'Google Ads', Total: -5600.00 },
    { Date: '2024-05-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-06-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-06-25', Projeto: 'Segurança da Informação', Categoria: 'Consultoria', Fornecedor: 'CyberSec Ltda', Total: -12000.00 },
    { Date: '2024-07-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-08-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-08-20', Projeto: 'Migração Cloud', Categoria: 'Cloud AWS', Fornecedor: 'Amazon Web Services', Total: -5200.00 },
    { Date: '2024-09-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-10-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-11-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 },
    { Date: '2024-12-15', Projeto: 'Geral Operacional', Categoria: 'Aluguel', Fornecedor: 'Imobiliária Demo', Total: -8500.00 }
  ];
}

// ═══════════════════════════════════════════════════════════════
// FAQ 4 — Gasto com Pessoal
// ═══════════════════════════════════════════════════════════════
function getFaq4() {
  return projects.collaborators.map(c => {
    const horasReportadas = projects.timeReports
      .filter(r => r.membroId === c.id)
      .reduce((sum, r) => sum + r.horasTrabalhadas, 0);
    const custoHora = c.role.includes('Architect') ? 95 : c.role.includes('Engineer') ? 85 : c.role.includes('Designer') ? 65 : c.role.includes('Security') ? 90 : 70;
    return {
      Membro: c.name,
      Cargo: c.role,
      HorasReportadas: horasReportadas,
      CustoHora: custoHora,
      SalarioBase: custoHora * 160,
      Encargos: Math.round(custoHora * 160 * 0.34),
      CustoTotal: Math.round(custoHora * 160 * 1.34),
      Periodo: '2024-01 a 2024-12'
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// FAQ 5 — Lucratividade (ResultadoProjeto + ContasAtraso) — isMultiple
// ═══════════════════════════════════════════════════════════════
function getFaq5() {
  const resultadoProjeto = [
    { Projeto: 'Dashboard Analytics', Cliente: 'Acme Corp', Receita: 158000.00, Despesa: 42500.00, Resultado: 115500.00, Margem: 73.10 },
    { Projeto: 'Migração Cloud', Cliente: 'Globex', Receita: 127000.00, Despesa: 38200.00, Resultado: 88800.00, Margem: 69.92 },
    { Projeto: 'Portal de Vendas', Cliente: 'Stark Industries', Receita: 105000.00, Despesa: 31000.00, Resultado: 74000.00, Margem: 70.48 },
    { Projeto: 'Segurança da Informação', Cliente: 'Initech', Receita: 48000.00, Despesa: 20000.00, Resultado: 28000.00, Margem: 58.33 }
  ];

  const contasAtraso = [
    { Vencimento: '2024-10-15', Cliente: 'Globex', Projeto: 'Migração Cloud', Valor: 35000.00, DiasAtraso: 45, Tipo: 'Receber' },
    { Vencimento: '2024-11-01', Cliente: 'Initech', Projeto: 'Segurança da Informação', Valor: 12000.00, DiasAtraso: 28, Tipo: 'Receber' },
    { Vencimento: '2024-11-10', Cliente: 'Interno', Projeto: 'Geral Operacional', Valor: 5000.00, DiasAtraso: 19, Tipo: 'Pagar' }
  ];

  return [resultadoProjeto, contasAtraso];
}

// ═══════════════════════════════════════════════════════════════
// FAQ 6 — Produtividade por tarefa
// ═══════════════════════════════════════════════════════════════
function getFaq6() {
  return projects.tasks.map(t => {
    const board = projects.boards.find(b => b.id === t.boardId) || { name: 'Sem etapa', projectId: 0 };
    const proj = projects.projects.find(p => p.id === board.projectId) || { name: 'Sem projeto' };
    const assignee = projects.collaborators.find(c => c.id === t.userId) || { name: 'Sem responsável' };
    const horasReais = projects.timeReports
      .filter(r => r.taskId === t.id)
      .reduce((sum, r) => sum + r.horasTrabalhadas, 0);
    return {
      Projeto: proj.name,
      Etapa: board.name,
      Tarefa: t.title,
      Responsavel: assignee.name,
      Status: t.status,
      Estimativa: t.estimatedEffort,
      HorasReais: horasReais,
      Desvio: horasReais - t.estimatedEffort,
      Eficiencia: t.estimatedEffort > 0 ? Math.round((t.estimatedEffort / Math.max(horasReais, 1)) * 100) : 0,
      TarefasEntregues: t.status === 'Done' ? 1 : 0
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// FAQ 7 — Projetos (4 queries: tarefas, etapas, projetos, status) — isMultiple
// ═══════════════════════════════════════════════════════════════
function getFaq7() {
  const tarefas = projects.tasks.map(t => {
    const board = projects.boards.find(b => b.id === t.boardId) || { name: '-', projectId: 0 };
    const proj = projects.projects.find(p => p.id === board.projectId) || { name: '-', clientName: '-' };
    const assignee = projects.collaborators.find(c => c.id === t.userId) || { name: 'Sem responsável' };
    return {
      Cliente: proj.clientName, Projeto: proj.name, Etapa: board.name,
      TituloTarefa: t.title, ResponsavelTarefa: assignee.name,
      TarefaCriacao: '2024-01-10', TarefaInicio: '2024-01-15', TarefaPrazo: '2024-03-15',
      TarefaFim: t.status === 'Done' ? '2024-02-28' : null,
      StatusTarefa: t.status === 'Done' ? 'Concluído no prazo' : 'No prazo',
      TempoTarefaDias: t.status === 'Done' ? 44 : null
    };
  });

  const etapas = projects.boards.map(b => {
    const proj = projects.projects.find(p => p.id === b.projectId) || { name: '-', clientName: '-' };
    return {
      Cliente: proj.clientName, Projeto: proj.name, Etapa: b.name,
      EtapaInicio: '2024-01-01', EtapaPrazo: '2024-06-30',
      EtapaFim: b.id % 2 === 0 ? '2024-05-15' : null,
      StatusEtapa: b.id % 2 === 0 ? 'Concluído no prazo' : 'Em andamento',
      TempoEtapaDias: b.id % 2 === 0 ? 135 : null
    };
  });

  const projetosTempo = projects.projects.map(p => ({
    Cliente: p.clientName, Projeto: p.name,
    ResponsavelProjeto: projects.collaborators[p.id % projects.collaborators.length]?.name || 'N/A',
    ProjetoInicio: '2024-01-01', ProjetoPrazo: '2024-12-31',
    ProjetoFim: p.id % 2 === 0 ? '2024-10-15' : null,
    StatusProjeto: p.id % 2 === 0 ? 'Concluído no prazo' : 'Em andamento',
    TempoProjetoMeses: p.id % 2 === 0 ? 10 : null
  }));

  const statusCounts = [
    { Status: 'Em andamento', Quantidade: 3 },
    { Status: 'Concluído no prazo', Quantidade: 2 }
  ];

  return [tarefas, etapas, projetosTempo, statusCounts];
}

// ═══════════════════════════════════════════════════════════════
// FAQ 8 — Rateio
// ═══════════════════════════════════════════════════════════════
function getFaq8() {
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const rows = [];
  for (let m = 0; m < 12; m++) {
    const destinos = [
      { nome: 'Dashboard Analytics', fator: 0.40 },
      { nome: 'Migração Cloud', fator: 0.30 },
      { nome: 'Portal de Vendas', fator: 0.20 },
      { nome: 'Segurança da Informação', fator: 0.10 }
    ];
    const totalRateado = 8500; // custo operacional mensal a ratear
    destinos.forEach(d => {
      rows.push({
        'Mês/Ano': `${months[m]}/2024`,
        'Ano': 2024, 'Mês': m + 1,
        'Projeto rateado (ID)': 5,
        'Projeto rateado (origem)': 'Geral Operacional',
        'Método de rateio': 'Horas',
        'Projeto (padrão) - ID': projects.projects.find(p => p.name === d.nome)?.id || 0,
        'Projeto (padrão)': d.nome,
        'Total (horas/receitas/pessoas)': 160,
        'Fator multiplicador': d.fator,
        'Valor do rateio': Math.round(totalRateado * d.fator * 100) / 100,
        'Percentual': d.fator * 100
      });
    });
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════
// FAQ 9 — Resultado Financeiro (Compensado + NãoCompensado + Competência) — isMultiple
// ═══════════════════════════════════════════════════════════════
function getFaq9() {
  const buildRows = (filterExecuted) => {
    return finance
      .filter(f => filterExecuted === null || f.executed === filterExecuted)
      .map(f => ({
        Date: filterExecuted !== null ? f.date : f.competenceDate,
        Projeto: f.projectName || 'Sem projeto definido',
        Cliente: f.clientName || 'Sem cliente definido',
        Conta: f.accountName || 'Sem conta definida',
        Categoria: f.categoryName || 'Sem categoria definida',
        TotalReceitas: f.value > 0 ? f.value : 0,
        TotalDespesas: f.value < 0 ? Math.abs(f.value) : 0,
        Resultado: f.value
      }));
  };

  const compensado = buildRows(1);
  const naoCompensado = buildRows(0);
  const competencia = buildRows(null);

  return [compensado, naoCompensado, competencia];
}

// ═══════════════════════════════════════════════════════════════
// FAQ 10 — Utilização de Horas (UtilizacaoHoras + HorasPorProjeto) — isMultiple
// ═══════════════════════════════════════════════════════════════
function getFaq10() {
  const utilizacao = projects.collaborators.map(c => {
    const horas = projects.timeReports
      .filter(r => r.membroId === c.id)
      .reduce((sum, r) => sum + r.horasTrabalhadas, 0);
    return {
      Membro: c.name,
      Cargo: c.role,
      HorasUteis: 160,
      HorasTrabalhadas: horas,
      Saldo: Math.round((horas - 160) * 100) / 100,
      Taxa: Math.round((horas / 160) * 10000) / 100
    };
  });

  const horasPorProjeto = {};
  projects.timeReports.forEach(r => {
    const projName = r.projetoNome || 'Sem projeto';
    horasPorProjeto[projName] = (horasPorProjeto[projName] || 0) + r.horasTrabalhadas;
  });
  const porProjeto = Object.entries(horasPorProjeto).map(([nome, horas]) => ({
    Projeto: nome,
    TotalHoras: Math.round(horas * 100) / 100
  }));

  return [utilizacao, porProjeto];
}

// ═══════════════════════════════════════════════════════════════
// Resolvedor Principal
// ═══════════════════════════════════════════════════════════════
const resolvers = {
  '1': getFaq1,
  '2': getFaq2,
  '3': getFaq3,
  '4': getFaq4,
  '5': getFaq5,
  '6': getFaq6,
  '7': getFaq7,
  '8': getFaq8,
  '9': getFaq9,
  '10': getFaq10
};

const faqSqlMap = {
  '1': ['Alocação de Horas – Estimado x Reportado.sql'],
  '2': ['comercial/Vendas.sql', 'comercial/Compensacoes.sql'],
  '3': ['Despesas x Fornecedores.sql'],
  '4': ['Gasto com pessoal.sql'],
  '5': ['lucratividade/ResultadoProjeto.sql', 'lucratividade/ContasAtraso.sql'],
  '6': ['Produtividade por tarefa.sql'],
  '7': ['projetos/TempoConclusaoTarefa.sql', 'projetos/TempoConclusaoEtapa.sql', 'projetos/TempoConclusaoProjeto.sql', 'projetos/QuantidadeStatus.sql'],
  '8': ['Rateio.sql'],
  '9': ['resultado_financeiro/ResultadoCompensado.sql', 'resultado_financeiro/ResultadoNaoCompensado.sql', 'resultado_financeiro/ResultadoCompetencia.sql'],
  '10': ['utilizacao_horas/UtilizacaoHoras.sql', 'utilizacao_horas/HorasPorProjeto.sql']
};

/**
 * Resolve dados sintéticos para uma FAQ específica.
 * Retorna o objeto no formato { data, sql, fileNames, isMultiple, activeClients }
 */
export function resolveFaqDemo(faqId) {
  const resolver = resolvers[faqId];
  if (!resolver) return null;

  const result = resolver();
  const fileNames = faqSqlMap[faqId] || [];
  const isMultiple = fileNames.length > 1;
  const activeClients = [...new Set(projects.projects.map(p => p.clientName))];

  return {
    data: isMultiple ? result : (Array.isArray(result) ? result : [result]),
    sql: '-- [DEMO MODE] Dados sintéticos pré-calculados',
    fileNames,
    isMultiple,
    activeClients
  };
}

import { pool } from './pool.js';
import { env } from '../config/env.js';
import fs from 'fs';
import path from 'path';

// Carrega os dados sintéticos uma vez no bootstrap do executor para modo Demo
const financePath = path.resolve(process.cwd(), 'src', 'demo', 'staticData', 'syntheticFinance.json');
const projectsPath = path.resolve(process.cwd(), 'src', 'demo', 'staticData', 'syntheticProjects.json');

let financeData = [];
let projectsData = { projects: [], collaborators: [], boards: [], tasks: [], timeReports: [] };

try {
  if (fs.existsSync(financePath)) financeData = JSON.parse(fs.readFileSync(financePath, 'utf8'));
  if (fs.existsSync(projectsPath)) projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
} catch (e) {
  // Ignora erros na carga inicial do mock
}

/**
 * Executor seguro de consultas MySQL.
 * Recebe SQL e parâmetros isoladamente, aplica timeout e limite de linhas retornadas.
 */
export async function executeQuery({
  sql,
  params = [],
  queryName = 'unnamed_query',
  maxRows = 10000,
  timeoutMs = 15000
}) {
  const startTime = Date.now();

  // Interceptador unificado para o modo de demonstração (Demo Mode)
  if (env.demoMode) {
    const durationMs = Date.now() - startTime;
    let rows = [];
    const upperSql = sql.toUpperCase();

    if (upperSql.includes('FROM MEMBRO') || upperSql.includes('FROM `MEMBRO`')) {
      rows = projectsData.collaborators.map(c => ({ Id: c.id, Nome: c.name, Perfil: c.role, Ativo: c.active, DataDesativacao: null }));
    } else if ((upperSql.includes('FROM PROJETO') || upperSql.includes('FROM `PROJETO`')) && !upperSql.includes('PROJETO_ID')) {
      rows = projectsData.projects.map(p => ({ Id: p.id, Nome: p.name, Ativo: p.active, ClientName: p.clientName, CustoPlanejado: 50000, DataInicial: '2024-01-01', DataFinal: '2024-12-31' }));
    } else if (upperSql.includes('FROM CASHFLOWITEMS') || upperSql.includes('FROM `CASHFLOWITEMS`') || upperSql.includes('CASHFLOWITEMS CF')) {
      rows = financeData.map(f => ({
        Id: f.id,
        Date: f.date,
        DueDate: f.dueDate,
        CompetenceDate: f.competenceDate,
        Value: f.value,
        Executed: f.executed,
        Transfer_Id: null,
        Parent_Id: null,
        Projeto: f.projectName,
        Cliente: f.clientName,
        Conta: f.accountName,
        Categoria: f.categoryName,
        CostCenter_Id: projectsData.projects.findIndex(p => p.name === f.projectName) + 1,
        Client_Id: 1,
        BankAccount_Id: f.accountName === 'Itaú Demo' ? 1 : 2,
        Category_Id: 1
      }));
    } else if (upperSql.includes('FROM REPORTAGEM') || upperSql.includes('FROM `REPORTAGEM`')) {
      rows = projectsData.timeReports.map(r => ({
        Id: r.id,
        Dia: r.dia,
        Membro_Id: r.membroId,
        MembroNome: r.membroNome,
        Projeto_Id: r.projetoId,
        ProjetoNome: r.projetoNome,
        HorasTrabalhadas: r.horasTrabalhadas,
        Task_Id: r.taskId,
        BoardName: r.boardName
      }));
    } else if (upperSql.includes('FROM TASKS') || upperSql.includes('FROM `TASKS`')) {
      rows = projectsData.tasks.map(t => ({
        Id: t.id,
        BoardId: t.boardId,
        Title: t.title,
        EstimatedEffort: t.estimatedEffort,
        UserId: t.userId,
        Active: 1,
        Status: t.status,
        CreationDate: '2024-01-05',
        StartDate: '2024-01-10',
        EndDate: '2024-06-30'
      }));
    } else if (upperSql.includes('FROM BOARDS') || upperSql.includes('FROM `BOARDS`')) {
      rows = projectsData.boards.map(b => ({
        Id: b.id,
        ProjectId: b.projectId,
        CostCenterId: b.projectId,
        Name: b.name,
        Active: 1,
        StartDate: '2024-01-01',
        EndDate: '2024-12-31'
      }));
    } else if (upperSql.includes('FROM CLIENTS') || upperSql.includes('FROM `CLIENTS`')) {
      rows = [...new Set(projectsData.projects.map(p => p.clientName))].map((name, idx) => ({
        Id: idx + 1,
        Name: name,
        active: 1
      }));
    } else if (upperSql.includes('FROM COSTCENTERS') || upperSql.includes('FROM `COSTCENTERS`')) {
      rows = projectsData.projects.map(p => ({
        Id: p.id,
        Name: p.name,
        Client_Id: projectsData.projects.indexOf(p) + 1
      }));
    } else if (upperSql.includes('FROM SERVICESALES') || upperSql.includes('FROM `SERVICESALES`')) {
      rows = [
        { Id: 1, Date: '2024-01-15', Total: 42000, IsActual: 1, ParentVersion_Id: null },
        { Id: 2, Date: '2024-02-20', Total: 18500, IsActual: 0, ParentVersion_Id: null },
        { Id: 3, Date: '2024-03-10', Total: 55000, IsActual: 1, ParentVersion_Id: null },
        { Id: 4, Date: '2024-04-05', Total: 22000, IsActual: 0, ParentVersion_Id: null },
        { Id: 5, Date: '2024-05-12', Total: 67000, IsActual: 1, ParentVersion_Id: null },
        { Id: 6, Date: '2024-06-18', Total: 31000, IsActual: 1, ParentVersion_Id: null },
        { Id: 7, Date: '2024-07-22', Total: 48000, IsActual: 1, ParentVersion_Id: null },
        { Id: 8, Date: '2024-08-14', Total: 25000, IsActual: 0, ParentVersion_Id: null },
        { Id: 9, Date: '2024-09-08', Total: 72000, IsActual: 1, ParentVersion_Id: null },
        { Id: 10, Date: '2024-10-03', Total: 38000, IsActual: 1, ParentVersion_Id: null },
        { Id: 11, Date: '2024-11-19', Total: 19500, IsActual: 0, ParentVersion_Id: null },
        { Id: 12, Date: '2024-12-01', Total: 85000, IsActual: 1, ParentVersion_Id: null }
      ];
    } else if (upperSql.includes('FROM CACHE_FINANCEIRO') || upperSql.includes('FROM `CACHE_FINANCEIRO`')) {
      // Dados de rateio mensal simulados
      const months = [];
      for (let m = 1; m <= 12; m++) {
        projectsData.projects.filter(p => p.name !== 'Geral Operacional').forEach(p => {
          months.push({ Ano: 2024, Mes: m, Projeto_Id: p.id, Nome: p.name, Despesas: 12000, Receitas: 45000, Colaboradores: 2, Horas: 160, Rateio: 0 });
        });
        months.push({ Ano: 2024, Mes: m, Projeto_Id: 5, Nome: 'Geral Operacional', Despesas: 8500, Receitas: 0, Colaboradores: 0, Horas: 0, Rateio: 1 });
      }
      rows = months;
    } else if (upperSql.includes('FROM CASHFLOWCATEGORIES') || upperSql.includes('FROM `CASHFLOWCATEGORIES`')) {
      rows = [
        { Id: 1, Name: 'Consultoria TI' }, { Id: 2, Name: 'Aluguel' }, { Id: 3, Name: 'Cloud Azure' },
        { Id: 4, Name: 'Cloud AWS' }, { Id: 5, Name: 'Marketing Digital' }, { Id: 6, Name: 'Licenças Software' },
        { Id: 7, Name: 'Consultoria Terceirizada' }, { Id: 8, Name: 'Desenvolvimento Web' }, { Id: 9, Name: 'Consultoria Segurança' }
      ];
    } else if (upperSql.includes('FROM BANKACCOUNTS') || upperSql.includes('FROM `BANKACCOUNTS`')) {
      rows = [{ Id: 1, Name: 'Itaú Demo' }, { Id: 2, Name: 'Bradesco Demo' }];
    } else if (upperSql.includes('SET NAMES')) {
      rows = [];
    } else {
      // Fallback: retorna dados genéricos
      console.log(`[DEMO QueryExecutor] Query não mapeada: ${sql.substring(0, 100)}...`);
      rows = [{ info: 'Dados de demonstração', count: 1 }];
    }

    return {
      rows: rows.slice(0, maxRows),
      rowCount: rows.length,
      truncated: rows.length > maxRows,
      durationMs
    };
  }

  let connection;

  try {
    connection = await pool.getConnection();

    // Prometifica a execução com timeout para evitar queries presas no servidor
    const queryPromise = connection.query({
      sql,
      values: params,
      timeout: timeoutMs
    });

    const [rows] = await queryPromise;
    const durationMs = Date.now() - startTime;

    // Garante que o retorno não ultrapasse o limite de segurança de memória
    if (Array.isArray(rows) && rows.length > maxRows) {
      console.warn(`[QUERY_EXECUTOR] Query '${queryName}' exceeded maxRows limit (${rows.length} > ${maxRows}). Truncating.`);
      return {
        rows: rows.slice(0, maxRows),
        rowCount: rows.length,
        truncated: true,
        durationMs
      };
    }

    return {
      rows: Array.isArray(rows) ? rows : [],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      truncated: false,
      durationMs
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[QUERY_EXECUTOR_ERROR] Failed executing query '${queryName}' after ${durationMs}ms:`, {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });

    // Encaminha erro sanitizado para a camada superior sem expor credenciais
    const err = new Error(`Query execution failed for '${queryName}'`);
    err.code = error.code || 'DB_QUERY_ERROR';
    err.status = 500;
    throw err;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

import { executeQuery } from '../db/queryExecutor.js';

/**
 * Repositório de consultas SQL parametrizadas para Dashboards v2.
 * Piloto: FAQ 9 - Resultado Financeiro (Compensado, Não Compensado e Competência).
 */
import { BaseRepository } from './baseRepository.js';

export class SqlRepository extends BaseRepository {
  /**
   * Executa a consulta agregada do FAQ 9 (Resultado Financeiro).
   */
  async getFinancialResult({ view, filters, pagination, requestId }) {
    if (view === 'competence') {
      return await this.getCompetenceResult({ filters, pagination, requestId });
    } else {
      return await this.getCashResult({ view, filters, pagination, requestId });
    }
  }

  /**
   * Executa a consulta para a visão de Competência.
   */
  async getCompetenceResult({ filters, pagination, requestId }) {
    const params = [];
    const competenceWhere = [
      "cf.Transfer_Id IS NULL",
      "cf.CompetenceDate IS NOT NULL",
      "cf.Id NOT IN (SELECT DISTINCT Parent_Id FROM cashflowitems WHERE Parent_Id IS NOT NULL AND (Type <> 1 OR Type IS NULL))"
    ];

    if (filters.startDate) {
      competenceWhere.push("cf.CompetenceDate >= ?");
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      competenceWhere.push("cf.CompetenceDate <= ?");
      params.push(filters.endDate);
    }
    if (filters.projectIds && filters.projectIds.length > 0) {
      const placeholders = filters.projectIds.map(() => '?').join(',');
      competenceWhere.push(`cf.CostCenter_Id IN (${placeholders})`);
      params.push(...filters.projectIds);
    }

    const competenceCtePrefix = `
      WITH base AS (
          SELECT 
              c.Name AS Projeto,
              COALESCE(cl.Name, 'Sem cliente') AS Cliente,
              COALESCE(ba.Name, 'Sem conta') AS Conta,
              COALESCE(cat.Name, 'Sem categoria') AS Categoria,
              cf.CompetenceDate AS DateReferencia,
              cf.Value,
              cf.Executed,
              CASE 
                  WHEN cf.Executed = 1 THEN 'Compensada'
                  ELSE 'Não compensada'
              END AS StatusCompensacao
          FROM cashflowitems cf
          LEFT JOIN costcenters c ON cf.CostCenter_Id = c.Id
          LEFT JOIN clients cl ON cf.Client_Id = cl.Id
          LEFT JOIN bankaccounts ba ON cf.BankAccount_Id = ba.Id
          LEFT JOIN cashflowcategories cat ON cf.Category_Id = cat.Id
          WHERE ${competenceWhere.join(' AND ')}
      )
    `;

    const summarySql = `
      ${competenceCtePrefix}
      SELECT 
          ROUND(SUM(CASE WHEN Value > 0 THEN Value ELSE 0 END), 2) AS totalRevenue,
          ROUND(SUM(CASE WHEN Value < 0 THEN Value * -1 ELSE 0 END), 2) AS totalExpenses,
          ROUND(SUM(Value), 2) AS netMargin
      FROM base;
    `;

    const seriesSql = `
      ${competenceCtePrefix}
      SELECT 
          DATE_FORMAT(DateReferencia, '%Y-%m') AS period,
          ROUND(SUM(CASE WHEN Value > 0 THEN Value ELSE 0 END), 2) AS revenue,
          ROUND(SUM(CASE WHEN Value < 0 THEN Value * -1 ELSE 0 END), 2) AS expense
      FROM base
      GROUP BY period
      ORDER BY period ASC;
    `;

    const rowsSql = `
      ${competenceCtePrefix}
      SELECT 
          DateReferencia AS competenceDate,
          Projeto AS projectId,
          Cliente AS clientName,
          Conta AS accountName,
          Categoria AS categoryName,
          StatusCompensacao AS status,
          ROUND(SUM(CASE WHEN Value > 0 THEN Value ELSE 0 END), 2) AS totalReceitas,
          ROUND(SUM(CASE WHEN Value < 0 THEN Value * -1 ELSE 0 END), 2) AS totalDespesas,
          ROUND(SUM(Value), 2) AS Resultado
      FROM base
      GROUP BY DateReferencia, Projeto, Cliente, Conta, Categoria, StatusCompensacao
      ORDER BY DateReferencia DESC, Projeto ASC
      LIMIT ? OFFSET ?;
    `;

    const summaryResult = await executeQuery({ sql: summarySql, params, queryName: 'faq9_competence_summary' });
    const seriesResult = await executeQuery({ sql: seriesSql, params, queryName: 'faq9_competence_series' });
    const rowsResult = await executeQuery({ 
      sql: rowsSql, 
      params: [...params, pagination.pageSize, pagination.offset], 
      queryName: 'faq9_competence_rows' 
    });

    // Formata o retorno das linhas para compatibilidade
    const formattedRows = rowsResult.rows.map(row => ({
      id: `${row.competenceDate}-${row.projectId}-${row.categoryName}`,
      competenceDate: row.competenceDate ? new Date(row.competenceDate).toISOString().split('T')[0] : '-',
      description: `Competência: ${row.categoryName} (${row.status})`,
      type: row.Resultado >= 0 ? 'Income' : 'Expense',
      amount: Math.abs(row.Resultado),
      projectId: row.projectId,
      clientName: row.clientName,
      accountName: row.accountName,
      categoryName: row.categoryName
    }));

    return {
      summary: summaryResult.rows[0] || { totalRevenue: 0, totalExpenses: 0, netMargin: 0 },
      series: seriesResult.rows,
      rows: formattedRows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize
      }
    };
  }

  /**
   * Executa a consulta para as visões Compensado (compensated) e Não Compensado (uncompensated).
   */
  async getCashResult({ view, filters, pagination, requestId }) {
    const statusValue = view === 'uncompensated' ? 'Não Executado' : 'Executado';

    const revenueParams = [];
    const expenseParams = [];

    const revenueWhere = [
      "CF.Transfer_Id IS NULL",
      "CF.Id NOT IN (SELECT DISTINCT Parent_Id FROM cashflowitems CFI WHERE CFI.Parent_Id IS NOT NULL AND (Type <> 1 OR Type IS NULL))"
    ];
    const expenseWhere = [
      "CF.Transfer_Id IS NULL",
      "CF.Id NOT IN (SELECT DISTINCT Parent_Id FROM cashflowitems CFI WHERE CFI.Parent_Id IS NOT NULL AND (Type <> 1 OR Type IS NULL))"
    ];

    if (filters.startDate) {
      revenueWhere.push("COALESCE(CF.Date, CF.DueDate) >= ?");
      revenueParams.push(filters.startDate);

      expenseWhere.push("COALESCE(CF.Date, CF.DueDate) >= ?");
      expenseParams.push(filters.startDate);
    }
    if (filters.endDate) {
      revenueWhere.push("COALESCE(CF.Date, CF.DueDate) <= ?");
      revenueParams.push(filters.endDate);

      expenseWhere.push("COALESCE(CF.Date, CF.DueDate) <= ?");
      expenseParams.push(filters.endDate);
    }
    if (filters.projectIds && filters.projectIds.length > 0) {
      const placeholders = filters.projectIds.map(() => '?').join(',');
      revenueWhere.push(`CF.CostCenter_Id IN (${placeholders})`);
      revenueParams.push(...filters.projectIds);

      expenseWhere.push(`CF.CostCenter_Id IN (${placeholders})`);
      expenseParams.push(...filters.projectIds);
    }

    const cteParams = [...revenueParams, ...expenseParams];

    const ctePrefix = `
      WITH Revenues AS (
          SELECT 
              CF.Id,
              COALESCE(CF.Date, CF.DueDate) AS RevenueDate,
              CASE WHEN CF.Value > 0 THEN CF.Value ELSE NULL END AS Receitas,
              CC.Name AS Projeto,
              C.Name AS Cliente,
              BA.Name AS Conta,
              CAT.Name AS Categoria,
              CASE WHEN CF.Executed = 1 THEN 'Executado' ELSE 'Não Executado' END AS Status
          FROM cashflowitems CF 
          LEFT JOIN costcenters CC ON CF.CostCenter_Id = CC.Id
          LEFT JOIN clients C ON CF.Client_Id = C.Id
          LEFT JOIN bankaccounts BA ON CF.BankAccount_Id = BA.Id
          LEFT JOIN cashflowcategories CAT ON CF.Category_Id = CAT.Id
          WHERE ${revenueWhere.join(' AND ')}
      ),
      
      ServiceSalesFromCF_Revenue AS (
          SELECT DISTINCT
              SP.Sale_Id AS Id,
              CC.Name AS Projeto
          FROM Revenues R
          INNER JOIN servicesalepayments SP ON R.Id = SP.CashFlowItem_Id
          LEFT JOIN cashflowitems CF ON CF.Id = SP.CashFlowItem_Id
          LEFT JOIN costcenters CC ON CF.CostCenter_Id = CC.Id
      ),
      
      ServiceSalesPayments_Revenue AS (
          SELECT
              SP.Sale_Id,
              SP.EffectiveDate,
              SC.Projeto,
              (COALESCE(SP.Value, SP.EffectiveValue) / SubQuery.TotalSum) * SS.Total AS GrossValue
          FROM ServiceSalesFromCF_Revenue SC
          INNER JOIN servicesalepayments SP ON SC.Id = SP.Sale_Id
          INNER JOIN servicesales SS ON SS.Id = SP.Sale_Id
          CROSS JOIN LATERAL (
              SELECT SUM(Value) AS TotalSum 
              FROM servicesalepayments S 
              WHERE S.Sale_Id = SP.Sale_Id
          ) AS SubQuery
      ),
      
      ServiceSalesTaxes_Revenue AS (
          SELECT 
              S.Id,
              S.Projeto,
              (ST.Value / C1.TotalGrossValue) AS TaxValue
          FROM ServiceSalesFromCF_Revenue S
          INNER JOIN servicesaletaxes ST ON S.Id = ST.Sale_Id
          CROSS JOIN LATERAL (
              SELECT SUM(GrossValue) AS TotalGrossValue
              FROM ServiceSalesPayments_Revenue SP 
              WHERE SP.Sale_Id = S.Id
          ) AS C1
      ),
      
      TaxesPerRevenue AS (
          SELECT 
              SUB.EffectiveDate,
              SUB.Projeto,
              ROUND(SUM(SUB.TotalGrossValue * ST.TaxValue), 2) AS Total
          FROM ServiceSalesTaxes_Revenue ST
          CROSS JOIN LATERAL (
              SELECT 
                  SP.EffectiveDate,
                  SP.Projeto,
                  SUM(GrossValue) AS TotalGrossValue
              FROM ServiceSalesPayments_Revenue SP
              WHERE SP.Sale_Id = ST.Id
              GROUP BY SP.EffectiveDate, SP.Projeto
          ) AS SUB
          GROUP BY SUB.EffectiveDate, SUB.Projeto
          HAVING Total IS NOT NULL
      ),
      
      RevenuesWithTaxes AS (
          SELECT 
              RevenueDate AS Date,
              Projeto,
              Cliente,
              Conta,
              Categoria,
              SUM(Receitas) AS Total
          FROM Revenues
          WHERE Status = '${statusValue}'
          GROUP BY RevenueDate, Projeto, Cliente, Conta, Categoria
          HAVING Total IS NOT NULL
      
          UNION ALL
      
          SELECT
              TPT.EffectiveDate AS Date,
              TPT.Projeto,
              NULL AS Cliente,
              NULL AS Conta,
              NULL AS Categoria,
              SUM(Total) AS Total
          FROM TaxesPerRevenue TPT
          GROUP BY TPT.EffectiveDate, TPT.Projeto
          HAVING TPT.EffectiveDate IS NOT NULL
      ),
      
      Expenses AS (
          SELECT 
              CF.Id,
              COALESCE(CF.Date, CF.DueDate) AS ExpenseDate,
              CASE WHEN CF.Value < 0 THEN CF.Value ELSE NULL END AS Despesas,
              CC.Name AS Projeto,
              NULL AS Cliente,
              NULL AS Conta,
              CAT.Name AS Categoria,
              CASE WHEN CF.Executed = 1 THEN 'Executado' ELSE 'Não Executado' END AS Status
          FROM cashflowitems CF 
          LEFT JOIN costcenters CC ON CF.CostCenter_Id = CC.Id
          LEFT JOIN cashflowcategories CAT ON CF.Category_Id = CAT.Id
          WHERE ${expenseWhere.join(' AND ')}
      ),
      
      ServiceSalesFromCF_Expense AS (
          SELECT DISTINCT
              SP.Sale_Id AS Id,
              CC.Name AS Projeto
          FROM Expenses E
          INNER JOIN servicesalepayments SP ON E.Id = SP.CashFlowItem_Id
          LEFT JOIN cashflowitems CF ON CF.Id = SP.CashFlowItem_Id
          LEFT JOIN costcenters CC ON CF.CostCenter_Id = CC.Id
      ),
      
      ServiceSalesPayments_Expense AS (
          SELECT
              SP.Sale_Id,
              SP.EffectiveDate,
              SC.Projeto,
              (COALESCE(SP.Value, SP.EffectiveValue) / SubQuery.TotalSum) * SS.Total AS GrossValue
          FROM ServiceSalesFromCF_Expense SC
          INNER JOIN servicesalepayments SP ON SC.Id = SP.Sale_Id
          INNER JOIN servicesales SS ON SS.Id = SP.Sale_Id
          CROSS JOIN LATERAL (
              SELECT SUM(Value) AS TotalSum 
              FROM servicesalepayments S 
              WHERE S.Sale_Id = SP.Sale_Id
          ) AS SubQuery
      ),
      
      ServiceSalesTaxes_Expense AS (
          SELECT 
              S.Id,
              S.Projeto,
              (ST.Value / C1.TotalGrossValue) AS TaxValue
          FROM ServiceSalesFromCF_Expense S
          INNER JOIN servicesaletaxes ST ON S.Id = ST.Sale_Id
          CROSS JOIN LATERAL (
              SELECT SUM(GrossValue) AS TotalGrossValue
              FROM ServiceSalesPayments_Expense SP 
              WHERE SP.Sale_Id = S.Id
          ) AS C1
      ),
      
      TaxesPerExpense AS (
          SELECT 
              SUB.EffectiveDate,
              SUB.Projeto,
              ROUND(SUM(SUB.TotalGrossValue * ST.TaxValue), 2) * -1 AS Total
          FROM ServiceSalesTaxes_Expense ST
          CROSS JOIN LATERAL (
              SELECT 
                  SP.EffectiveDate,
                  SP.Projeto,
                  SUM(GrossValue) AS TotalGrossValue
              FROM ServiceSalesPayments_Expense SP
              WHERE SP.Sale_Id = ST.Id
              GROUP BY SP.EffectiveDate, SP.Projeto
          ) AS SUB
          GROUP BY SUB.EffectiveDate, SUB.Projeto
          HAVING Total IS NOT NULL
      ),
      
      ExpensesWithTaxes AS (
          SELECT 
              ExpenseDate AS Date,
              Projeto,
              Cliente,
              Conta,
              Categoria,
              SUM(Despesas) AS Total
          FROM Expenses
          WHERE Status = '${statusValue}'
          GROUP BY ExpenseDate, Projeto, Cliente, Conta, Categoria
          HAVING Total IS NOT NULL
      
          UNION ALL
      
          SELECT
              TPT.EffectiveDate AS Date,
              TPT.Projeto,
              NULL AS Cliente,
              NULL AS Conta,
              NULL AS Categoria,
              SUM(Total) AS Total
          FROM TaxesPerExpense TPT
          GROUP BY TPT.EffectiveDate, TPT.Projeto
          HAVING TPT.EffectiveDate IS NOT NULL
      )
    `;

    const summarySql = `
      ${ctePrefix}
      SELECT 
          ROUND(SUM(CASE WHEN Tipo = 'Receita' THEN Total ELSE 0 END), 2) AS totalRevenue,
          ROUND(SUM(CASE WHEN Tipo = 'Despesa' THEN Total * -1 ELSE 0 END), 2) AS totalExpenses,
          ROUND(SUM(Total), 2) AS netMargin
      FROM (
          SELECT 'Receita' AS Tipo, Total FROM RevenuesWithTaxes
          UNION ALL
          SELECT 'Despesa' AS Tipo, Total FROM ExpensesWithTaxes
      ) AS Combined;
    `;

    const seriesSql = `
      ${ctePrefix}
      SELECT 
          DATE_FORMAT(Date, '%Y-%m') AS period,
          ROUND(SUM(CASE WHEN Tipo = 'Receita' THEN Total ELSE 0 END), 2) AS revenue,
          ROUND(SUM(CASE WHEN Tipo = 'Despesa' THEN Total * -1 ELSE 0 END), 2) AS expense
      FROM (
          SELECT 'Receita' AS Tipo, Date, Total FROM RevenuesWithTaxes
          UNION ALL
          SELECT 'Despesa' AS Tipo, Date, Total FROM ExpensesWithTaxes
      ) AS Combined
      GROUP BY period
      ORDER BY period ASC;
    `;

    const rowsSql = `
      ${ctePrefix}
      SELECT 
          Date AS competenceDate,
          COALESCE(Projeto, 'Sem projeto definido') AS projectId,
          COALESCE(Cliente, 'Sem cliente definido') AS clientName,
          COALESCE(Conta, 'Sem conta definida') AS accountName,
          COALESCE(Categoria,'Sem categoria definida') AS categoryName,
          SUM(CASE WHEN Tipo = 'Receita' THEN Total ELSE 0 END) AS totalReceitas,
          SUM(CASE WHEN Tipo = 'Despesa' THEN Total * -1 ELSE 0 END) AS totalDespesas,
          SUM(Total) AS Resultado
      FROM (
          SELECT 'Receita' AS Tipo, Date, Projeto, Cliente, Conta, Categoria, Total FROM RevenuesWithTaxes
          UNION ALL
          SELECT 'Despesa' AS Tipo, Date, Projeto, Cliente, Conta, Categoria, Total FROM ExpensesWithTaxes
      ) AS Combined
      GROUP BY Date, Projeto, Cliente, Conta, Categoria
      ORDER BY Date DESC, Projeto ASC
      LIMIT ? OFFSET ?;
    `;

    const summaryResult = await executeQuery({ sql: summarySql, params: cteParams, queryName: `faq9_${view}_summary` });
    const seriesResult = await executeQuery({ sql: seriesSql, params: cteParams, queryName: `faq9_${view}_series` });
    const rowsResult = await executeQuery({ 
      sql: rowsSql, 
      params: [...cteParams, pagination.pageSize, pagination.offset], 
      queryName: `faq9_${view}_rows` 
    });

    const formattedRows = rowsResult.rows.map((row, idx) => ({
      id: `${row.competenceDate}-${row.projectId}-${idx}`,
      competenceDate: row.competenceDate ? new Date(row.competenceDate).toISOString().split('T')[0] : '-',
      description: row.categoryName,
      type: row.Resultado >= 0 ? 'Income' : 'Expense',
      amount: Math.abs(row.Resultado),
      projectId: row.projectId,
      clientName: row.clientName,
      accountName: row.accountName,
      categoryName: row.categoryName
    }));

    return {
      summary: summaryResult.rows[0] || { totalRevenue: 0, totalExpenses: 0, netMargin: 0 },
      series: seriesResult.rows,
      rows: formattedRows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize
      }
    };
  }

  /**
   * Executa a consulta de Utilização de Horas (FAQ 10).
   * Consolida horas úteis, trabalhadas, saldo, taxa por colaborador, distribuição por projetos e tendência mensal.
   */
  async getHoursUtilization({ filters, pagination, requestId }) {
    let start = filters.startDate;
    let end = filters.endDate;
    const activeYear = filters.year || new Date().getFullYear();
    const activeMonth = (filters.month !== null && filters.month !== undefined) ? filters.month : new Date().getMonth();

    if (!start || !end) {
      // Por padrão, trazemos o ano completo do filtro ativo
      start = `${activeYear}-01-01`;
      end = `${activeYear}-12-31`;
    }

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const diffTime = Math.abs(endDateObj - startDateObj);
    const limitDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Query de Utilização de Horas (Completa do Período)
    const utilizationSql = `
      WITH RECURSIVE
        Calendario AS (
          SELECT
            DATE_ADD(?, INTERVAL num DAY) AS Dia
          FROM
            (
              SELECT
                ROW_NUMBER() OVER () - 1 AS num
              FROM
                (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) a
                CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) b
                CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) c
                CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) d
              LIMIT ?
            ) seq
        ),
        VigenciaPromocao AS (
          SELECT
            Membro_Id,
            Cargo_Id,
            DesdeDia AS Inicio,
            (
              SELECT
                DATE_ADD(DesdeDia, INTERVAL -1 DAY)
              FROM
                promocao NP
              WHERE
                NP.Membro_Id = CP.Membro_Id
                AND NP.DesdeDia > CP.DesdeDia
              ORDER BY
                NP.DesdeDia ASC
              LIMIT
                1
            ) AS Fim
          FROM
            promocao CP
        ),
        DiasUteisPorCargo AS (
          SELECT
            C.Dia,
            VP.Membro_Id,
            VP.Cargo_Id,
            IF(
              F.Id IS NULL
              AND VC.Id IS NULL,
              CH.Carga,
              0
            ) AS CargaDiaria
          FROM
            Calendario C
            LEFT JOIN feriado F ON C.Dia = F.Dia
            LEFT JOIN VigenciaPromocao VP ON C.Dia BETWEEN VP.Inicio AND IFNULL(VP.Fim, C.Dia)
            LEFT JOIN carga_horaria CH ON CH.Cargo_Id = VP.Cargo_Id
            AND MOD(WEEKDAY(C.Dia) + 1, 7) = CH.DiaSemana
            LEFT JOIN vacation VC ON C.Dia BETWEEN VC.InitialDate AND VC.FinalDate
            AND VP.Membro_Id = VC.User_Id
        ),
        HorasTrabalhadas AS (
          SELECT
            VP.Membro_Id,
            M.Nome AS Responsavel,
            DATE_FORMAT(C.Dia, '%Y-%m') AS Mes_Ano,
            SUM(IFNULL(R.HorasTrabalhadas, 0)) AS Total_Horas_Trabalhadas,
            VP.Cargo_Id
          FROM
            Calendario C
            LEFT JOIN reportagem R ON R.Dia = C.Dia
            INNER JOIN membro M ON R.Membro_Id = M.Id AND M.DataDesativacao IS NULL
            INNER JOIN VigenciaPromocao VP ON VP.Membro_Id = M.Id
            AND C.Dia >= VP.Inicio
            AND (
              C.Dia <= VP.Fim
              OR VP.Fim IS NULL
            )
          GROUP BY
            VP.Membro_Id,
            M.Nome,
            Mes_Ano,
            VP.Cargo_Id
        ),
        HorasUteisPorMes AS (
          SELECT
            Membro_Id,
            DATE_FORMAT(Dia, '%Y-%m') AS Mes_Ano,
            SUM(CargaDiaria) AS TotalHorasUteis
          FROM
            DiasUteisPorCargo
          GROUP BY
            Membro_Id,
            Mes_Ano
        ),
        ResultadoFinal AS (
          SELECT
            HT.Responsavel,
            STR_TO_DATE(CONCAT(HT.Mes_Ano, '-01'), '%Y-%m-%d') AS Mes_Ano,
            HT.Total_Horas_Trabalhadas,
            ROUND(
              CASE
                WHEN HT.Cargo_Id = 10009 THEN HT.Total_Horas_Trabalhadas
                ELSE HUPM.TotalHorasUteis
              END,
              2
            ) AS Horas_Uteis
          FROM
            HorasTrabalhadas HT
            LEFT JOIN HorasUteisPorMes HUPM ON HT.Membro_Id = HUPM.Membro_Id
            AND HT.Mes_Ano = HUPM.Mes_Ano
        )
      SELECT
        Responsavel AS Responsável,
        Mes_Ano AS Mês,
        Horas_Uteis AS \`Horas Úteis no Mês\`,
        Total_Horas_Trabalhadas AS \`Horas Trabalhadas\`,
        ROUND(Total_Horas_Trabalhadas - Horas_Uteis, 2) AS \`Saldo de Horas no Mês\`,
        ROUND(IF(Horas_Uteis > 0, (Total_Horas_Trabalhadas / Horas_Uteis) * 100, 0), 2) AS \`Taxa do Mês (%)\`
      FROM
        ResultadoFinal
      ORDER BY
        Mês ASC,
        Responsável ASC;
    `;

    // Query de Horas por Projeto
    const projectSql = `
      SELECT 
          M.Nome AS Responsavel,
          DATE(DATE_FORMAT(R.Dia, '%Y-%m-01')) AS Mes,
          COALESCE(P.Nome, 'Sem Projeto') AS Projeto,
          SUM(R.HorasTrabalhadas) AS Horas_Trabalhadas
      FROM reportagem R
      INNER JOIN membro M 
          ON R.Membro_Id = M.Id AND M.DataDesativacao IS NULL
      LEFT JOIN projeto P 
          ON R.Projeto_Id = P.Id
      WHERE R.HorasTrabalhadas IS NOT NULL
        AND R.Dia >= ? AND R.Dia <= ?
      GROUP BY 
          M.Nome,
          Mes,
          Projeto
      ORDER BY 
          Mes ASC,
          Responsavel ASC,
          Horas_Trabalhadas DESC;
    `;

    // Consulta de colaboradores ativos
    const collaboratorSql = `
      SELECT Nome FROM membro WHERE DataDesativacao IS NULL ORDER BY Nome ASC;
    `;

    const utilizationResult = await executeQuery({ 
      sql: utilizationSql, 
      params: [start, limitDays], 
      queryName: 'faq10_utilization' 
    });

    const projectResult = await executeQuery({ 
      sql: projectSql, 
      params: [start, end], 
      queryName: 'faq10_projects' 
    });

    const collaboratorResult = await executeQuery({ 
      sql: collaboratorSql, 
      params: [], 
      queryName: 'faq10_collaborators' 
    });

    // --- PROCESSAMENTO E FILTRAGEM ---
    const allUtilization = utilizationResult.rows;
    const allProjects = projectResult.rows;
    const activeCollaborators = collaboratorResult.rows.map(c => c.Nome);

    // 1. Filtragem da Listagem por Mês/Ano e Colaborador Ativos
    const filteredUtilization = allUtilization.filter(d => {
      if (!d.Mês) return false;
      const rowDate = new Date(d.Mês);
      const matchPeriod = rowDate.getFullYear() === activeYear && rowDate.getMonth() === activeMonth;
      const matchResp = (!filters.collaborator || filters.collaborator === 'Todos' || d['Responsável'] === filters.collaborator);
      return matchPeriod && matchResp;
    });

    // 2. Horas por Projeto para o Mês e Colaborador ativos (Gráfico de Pizza)
    const projectHoursMap = {};
    let totalProjectHours = 0;

    allProjects.forEach(d => {
      if (!d.Mes) return;
      const rowDate = new Date(d.Mes);
      const matchPeriod = rowDate.getFullYear() === activeYear && rowDate.getMonth() === activeMonth;
      const matchResp = (!filters.collaborator || filters.collaborator === 'Todos' || d.Responsavel === filters.collaborator);

      if (matchPeriod && matchResp) {
        const proj = d.Projeto;
        const worked = Number(d.Horas_Trabalhadas) || 0;
        projectHoursMap[proj] = (projectHoursMap[proj] || 0) + worked;
        totalProjectHours += worked;
      }
    });

    const projectHoursData = Object.entries(projectHoursMap)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);

    // 3. Tabela Por Mês de Evolução (Tabela 2)
    const monthlySummaryMap = {};
    allUtilization.forEach(d => {
      if (!d.Mês) return;
      const rowDate = new Date(d.Mês);
      const mesLabel = rowDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' ');

      // Filtro de Colaborador opcional na evolução
      const matchResp = (!filters.collaborator || filters.collaborator === 'Todos' || d['Responsável'] === filters.collaborator);
      if (matchResp) {
        if (!monthlySummaryMap[mesLabel]) {
          monthlySummaryMap[mesLabel] = {
            mesLabel,
            horasUteis: 0,
            horasTrabalhadas: 0,
            saldo: 0,
            taxaSoma: 0
          };
        }
        monthlySummaryMap[mesLabel].horasUteis += Number(d['Horas Úteis no Mês']) || 0;
        monthlySummaryMap[mesLabel].horasTrabalhadas += Number(d['Horas Trabalhadas']) || 0;
        monthlySummaryMap[mesLabel].saldo += Number(d['Saldo de Horas no Mês']) || 0;
        monthlySummaryMap[mesLabel].taxaSoma += Number(d['Taxa do Mês (%)']) || 0;
      }
    });

    const tablePorMesData = Object.values(monthlySummaryMap).map(m => ({
      mesLabel: m.mesLabel,
      horasUteis: Math.round(m.horasUteis * 100) / 100,
      horasTrabalhadas: Math.round(m.horasTrabalhadas * 100) / 100,
      saldo: Math.round(m.saldo * 100) / 100,
      taxa: m.horasUteis > 0 ? Math.round((m.horasTrabalhadas / m.horasUteis) * 100 * 100) / 100 : 0
    }));

    // 4. Totais Gerais Consolidados (Tabela 3)
    let totHorasUteis = 0;
    let totHorasTrabalhadas = 0;
    let totSaldo = 0;

    allUtilization.forEach(d => {
      // Filtro de Colaborador opcional no total geral
      const matchResp = (!filters.collaborator || filters.collaborator === 'Todos' || d['Responsável'] === filters.collaborator);
      if (matchResp) {
        totHorasUteis += Number(d['Horas Úteis no Mês']) || 0;
        totHorasTrabalhadas += Number(d['Horas Trabalhadas']) || 0;
        totSaldo += Number(d['Saldo de Horas no Mês']) || 0;
      }
    });

    const tableTotalGeralData = {
      horasUteis: Math.round(totHorasUteis * 100) / 100,
      horasTrabalhadas: Math.round(totHorasTrabalhadas * 100) / 100,
      saldo: Math.round(totSaldo * 100) / 100,
      taxa: totHorasUteis > 0 ? Math.round((totHorasTrabalhadas / totHorasUteis) * 100 * 100) / 100 : 0
    };

    // Paginação
    const totalRows = filteredUtilization.length;
    const totalPages = Math.ceil(totalRows / pagination.pageSize);
    const paginatedUtilization = filteredUtilization.slice(pagination.offset, pagination.offset + pagination.pageSize);

    // Formata o retorno das linhas para compatibilidade
    const formattedRows = paginatedUtilization.map((row, idx) => ({
      id: `${row['Responsável']}-${row['Mês']}-${idx}`,
      collaboratorName: row['Responsável'],
      period: row['Mês'] ? new Date(row['Mês']).toISOString().split('T')[0] : '-',
      usefulHours: row['Horas Úteis no Mês'],
      workedHours: row['Horas Trabalhadas'],
      balanceHours: row['Saldo de Horas no Mês'],
      utilizationRate: row['Taxa do Mês (%)']
    }));

    return {
      summary: {
        totalUsefulHours: tableTotalGeralData.horasUteis,
        totalWorkedHours: tableTotalGeralData.horasTrabalhadas,
        totalBalanceHours: tableTotalGeralData.saldo,
        averageUtilizationRate: tableTotalGeralData.taxa
      },
      projectHours: projectHoursData,
      monthlyTrend: tablePorMesData,
      collaborators: formattedRows,
      activeCollaborators,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows,
        totalPages
      }
    };
  }

  /**
   * Executa a consulta de Projetos (FAQ 7).
   * Suporta sub-views: status, tempo_projeto, tempo_etapa, tempo_tarefa.
   * Aplica filtros sargables de data e paginação real no banco de dados.
   */
  async getProjectsDashboard({ view, filters, pagination, requestId }) {
    let start = filters.startDate;
    let end = filters.endDate;
    const activeYear = filters.year || new Date().getFullYear();

    if (!start || !end) {
      start = `${activeYear}-01-01`;
      end = `${activeYear}-12-31`;
    }

    const diffTime = Math.abs(new Date(end) - new Date(start));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const includeNulls = diffDays > 300;

    // Queries Auxiliares para alimentar os Dropdowns de Filtro da UI
    const filterOptionsSql = `
      SELECT DISTINCT c.Name AS Cliente FROM clients c WHERE c.active = 1 ORDER BY c.Name ASC;
    `;
    const filterProjectsSql = `
      SELECT DISTINCT p.Nome AS Projeto FROM projeto p WHERE p.Ativo = 1 ORDER BY p.Nome ASC;
    `;
    const filterStatusSql = `
      SELECT DISTINCT Name AS Status FROM statustemplates ORDER BY Name ASC;
    `;
    const filterResponsiblesSql = `
      SELECT DISTINCT Nome AS Responsavel FROM membro WHERE DataDesativacao IS NULL ORDER BY Nome ASC;
    `;

    const [clientsList, projectsList, statusList, responsiblesList] = await Promise.all([
      executeQuery({ sql: filterOptionsSql, params: [], queryName: 'faq7_list_clients' }),
      executeQuery({ sql: filterProjectsSql, params: [], queryName: 'faq7_list_projects' }),
      executeQuery({ sql: filterStatusSql, params: [], queryName: 'faq7_list_status' }),
      executeQuery({ sql: filterResponsiblesSql, params: [], queryName: 'faq7_list_responsibles' })
    ]);

    const filterOptions = {
      clients: clientsList.rows.map(r => r.Cliente),
      projects: projectsList.rows.map(r => r.Projeto),
      statuses: statusList.rows.map(r => r.Status),
      responsibles: responsiblesList.rows.map(r => r.Responsavel)
    };

    let sql = '';
    let params = [];

    // Condicional de Query por View
    if (view === 'status') {
      sql = `
        SELECT
          p.Nome AS NomeProjeto,
          COALESCE(p.DataInicial, p.DataFinal) AS Data,
          c.Name AS Cliente,
          st.Name AS StatusProjeto,
          CAST(p.Ativo AS UNSIGNED) AS StatusAtivo,
          m.Nome AS Responsavel
        FROM
          projeto p
          LEFT JOIN costcenters cc ON cc.Id = p.Id
          LEFT JOIN clients c ON cc.Client_Id = c.Id
          LEFT JOIN statustemplates st ON p.StatusTemplateId = st.Id
          LEFT JOIN projectowners po ON po.ProjectId = p.Id
          LEFT JOIN membro m ON m.Id = po.UserId AND m.DataDesativacao IS NULL
        WHERE p.Ativo = 1
      `;
    } else if (view === 'tempo_projeto') {
      sql = `
        WITH TargetProjects AS (
          SELECT
              p.Nome AS Projeto,
              p.DataInicial AS ProjetoInicio,
              p.DataFinal AS ProjetoPrazo,
              p.RealEndDate AS ProjetoFim,
              p.Id AS ProjetoId,
              c.Name AS Cliente
          FROM projeto p
          JOIN costcenters cc ON p.Id = cc.Id
          LEFT JOIN clients c ON cc.Client_Id = c.Id
          WHERE p.Ativo = 1
        ),
        ProjetoComResponsavel AS (
          SELECT
              pc.Cliente,
              pc.Projeto,
              COALESCE(m.Nome, 'Sem responsável') AS ResponsavelProjeto,
              pc.ProjetoInicio,
              pc.ProjetoPrazo,
              pc.ProjetoFim,
              CASE 
                  WHEN pc.ProjetoPrazo IS NULL THEN 'Sem prazo'
                  WHEN pc.ProjetoFim IS NOT NULL THEN
                      IF(pc.ProjetoFim > pc.ProjetoPrazo, 'Concluído com atraso', 'Concluído no prazo')
                  WHEN pc.ProjetoPrazo < CURDATE() THEN 'Atrasado'
                  WHEN DATEDIFF(pc.ProjetoPrazo, CURDATE()) <= 15 THEN 'Prazo próximo'
                  ELSE 'No prazo'
              END AS StatusProjeto,
              IF(pc.ProjetoFim IS NULL, NULL, TIMESTAMPDIFF(MONTH, pc.ProjetoInicio, pc.ProjetoFim)) AS TempoProjetoMeses
          FROM TargetProjects pc
          LEFT JOIN projectowners po ON po.ProjectId = pc.ProjetoId
          LEFT JOIN membro m ON m.Id = po.UserId AND m.DataDesativacao IS NULL
        )
        SELECT * FROM ProjetoComResponsavel
        WHERE 1=1
      `;
    } else if (view === 'tempo_etapa') {
      sql = `
        WITH EtapaClassificada AS (
            SELECT
                cc.Name AS Projeto,
                b.Name AS Etapa,
                b.StartDate AS EtapaInicio,
                b.EndDate AS EtapaPrazo,
                b.RealEndDate AS EtapaFim,
                c.Name AS Cliente,
                CASE 
                    WHEN b.EndDate IS NULL THEN 'Sem prazo'
                    WHEN b.RealEndDate IS NOT NULL THEN
                        IF(b.RealEndDate > b.EndDate, 'Concluído com atraso', 'Concluído no prazo')
                    WHEN b.EndDate < CURDATE() THEN 'Atrasado'
                    WHEN DATEDIFF(b.EndDate, CURDATE()) <= 7 THEN 'Prazo próximo'
                    ELSE 'No prazo'
                END AS StatusEtapa,
                IF(b.RealEndDate IS NULL, NULL, DATEDIFF(b.RealEndDate, b.StartDate) + 1) AS TempoEtapaDias
            FROM boards b
            JOIN costcenters cc ON b.CostCenterId = cc.Id
            JOIN projeto p ON cc.Id = p.Id AND p.Ativo = 1
            LEFT JOIN clients c ON cc.Client_Id = c.Id
            WHERE b.Active = 1
        )
        SELECT * FROM EtapaClassificada
        WHERE 1=1
      `;
    } else if (view === 'tempo_tarefa') {
      sql = `
        WITH TaskCompletion AS (
            SELECT 
                th.TaskId,
                MAX(th.Timestamp) AS Fim
            FROM taskhistories th
            JOIN status os ON th.OldValue = os.Id
            JOIN status ns ON th.NewValue = ns.Id
            JOIN statustemplates ost ON os.TemplateId = ost.Id
            JOIN statustemplates nst ON ns.TemplateId = nst.Id
            WHERE 
                th.PropertyName LIKE '%StatusId%' 
                AND ost.IsFinal = 0
                AND nst.IsFinal = 1
                AND th.OldValue IS NOT NULL
            GROUP BY th.TaskId
        ),
        TarefaClassificada AS (
            SELECT 
                c.Name AS Cliente,
                cc.Name AS Projeto,
                b.Name AS Etapa,
                t.Title AS TituloTarefa,
                COALESCE(m.Nome, 'Sem responsável') AS ResponsavelProjeto,
                COALESCE(mt.Nome, 'Sem responsável') AS ResponsavelTarefa,
                GROUP_CONCAT(DISTINCT tg.Name ORDER BY tg.Name SEPARATOR ', ') AS Tag,
                p.DataInicial AS ProjetoInicio,
                p.DataFinal AS ProjetoPrazo,
                p.RealEndDate AS ProjetoFim,
                b.StartDate AS EtapaInicio,
                b.EndDate AS EtapaPrazo,
                b.RealEndDate AS EtapaFim,
                t.CreationDate AS TarefaCriacao,
                t.StartDate AS TarefaInicio,
                t.EndDate AS TarefaPrazo,
                tc.Fim AS TarefaFim
            FROM tasks t
            LEFT JOIN membro mt ON t.UserId = mt.Id AND mt.DataDesativacao IS NULL
            JOIN boards b ON t.BoardId = b.Id
            JOIN costcenters cc ON b.CostCenterId = cc.Id
            JOIN projeto p ON cc.Id = p.Id AND p.Ativo = 1
            LEFT JOIN projectowners po ON po.ProjectId = p.Id
            LEFT JOIN membro m ON m.Id = po.UserId AND m.DataDesativacao IS NULL
            LEFT JOIN clients c ON cc.Client_Id = c.Id
            LEFT JOIN tagtasks tt ON t.Id = tt.Task_Id
            LEFT JOIN tags tg ON tt.Tag_Id = tg.Id
            LEFT JOIN TaskCompletion tc ON t.Id = tc.TaskId
            WHERE t.Active = 1
            GROUP BY 
                t.Id, c.Name, cc.Name, b.Name, t.Title, m.Nome, mt.Nome,
                p.DataInicial, p.DataFinal, p.RealEndDate, b.StartDate, b.EndDate, b.RealEndDate,
                t.CreationDate, t.StartDate, t.EndDate, tc.Fim
        ),
        TarefaFinal AS (
            SELECT 
                Cliente,
                Projeto,
                ResponsavelProjeto,
                Etapa,
                TituloTarefa,
                ResponsavelTarefa,
                Tag,
                TarefaCriacao,
                TarefaInicio,
                TarefaPrazo,
                TarefaFim,
                CASE 
                    WHEN TarefaPrazo IS NULL THEN 'Sem prazo'
                    WHEN TarefaFim IS NOT NULL THEN
                        IF(TarefaFim > TarefaPrazo, 'Concluído com atraso', 'Concluído no prazo')
                    WHEN TarefaPrazo < CURDATE() THEN 'Atrasado'
                    WHEN DATEDIFF(TarefaPrazo, CURDATE()) <= 3 THEN 'Prazo próximo'
                    ELSE 'No prazo'
                END AS StatusTarefa,
                IF(TarefaInicio IS NULL OR TarefaFim IS NULL, NULL, DATEDIFF(TarefaFim, TarefaInicio) + 1) AS TempoTarefaDias
            FROM TarefaClassificada
        )
        SELECT * FROM TarefaFinal
        WHERE 1=1
      `;
    }

    // --- APLICAÇÃO DE FILTROS ---
    let whereClause = '';

    // Filtros de Data com sargabilidade
    if (view === 'status') {
      if (includeNulls) {
        whereClause += ` AND (COALESCE(p.DataInicial, p.DataFinal) >= ? AND COALESCE(p.DataInicial, p.DataFinal) <= ? OR COALESCE(p.DataInicial, p.DataFinal) IS NULL) `;
      } else {
        whereClause += ` AND COALESCE(p.DataInicial, p.DataFinal) >= ? AND COALESCE(p.DataInicial, p.DataFinal) <= ? `;
      }
      params.push(start, end);
    } else if (view === 'tempo_projeto') {
      if (includeNulls) {
        whereClause += ` AND (ProjetoInicio >= ? AND ProjetoInicio <= ? OR ProjetoInicio IS NULL) `;
      } else {
        whereClause += ` AND ProjetoInicio >= ? AND ProjetoInicio <= ? `;
      }
      params.push(start, end);
    } else if (view === 'tempo_etapa') {
      if (includeNulls) {
        whereClause += ` AND (EtapaInicio >= ? AND EtapaInicio <= ? OR EtapaInicio IS NULL) `;
      } else {
        whereClause += ` AND EtapaInicio >= ? AND EtapaInicio <= ? `;
      }
      params.push(start, end);
    } else if (view === 'tempo_tarefa') {
      if (includeNulls) {
        whereClause += ` AND ((TarefaInicio >= ? AND TarefaInicio <= ?) OR (TarefaCriacao >= ? AND TarefaCriacao <= ?) OR (TarefaInicio IS NULL AND TarefaCriacao IS NULL)) `;
      } else {
        whereClause += ` AND ((TarefaInicio >= ? AND TarefaInicio <= ?) OR (TarefaCriacao >= ? AND TarefaCriacao <= ?)) `;
      }
      params.push(start, end, start, end);
    }

    // Filtros qualitativos
    if (filters.clientName && filters.clientName !== 'Todos') {
      whereClause += ` AND Cliente = ? `;
      params.push(filters.clientName);
    }
    if (filters.projectName && filters.projectName !== 'Todos') {
      if (view === 'status') {
        whereClause += ` AND NomeProjeto = ? `;
      } else {
        whereClause += ` AND Projeto = ? `;
      }
      params.push(filters.projectName);
    }
    if (filters.projectStatus && filters.projectStatus !== 'Todos') {
      if (view === 'status') {
        whereClause += ` AND StatusProjeto = ? `;
      } else if (view === 'tempo_projeto') {
        whereClause += ` AND StatusProjeto = ? `;
      } else if (view === 'tempo_etapa') {
        whereClause += ` AND StatusEtapa = ? `;
      } else if (view === 'tempo_tarefa') {
        whereClause += ` AND StatusTarefa = ? `;
      }
      params.push(filters.projectStatus);
    }
    if (filters.responsibleName && filters.responsibleName !== 'Todos') {
      if (view === 'status') {
        whereClause += ` AND Responsavel = ? `;
      } else if (view === 'tempo_projeto') {
        whereClause += ` AND ResponsavelProjeto = ? `;
      } else if (view === 'tempo_tarefa') {
        whereClause += ` AND ResponsavelTarefa = ? `;
      }
      params.push(filters.responsibleName);
    }

    const finalSql = sql + whereClause;

    // Executa a query
    const result = await executeQuery({ sql: finalSql, params, queryName: `faq7_${view}_data` });
    const allRows = result.rows;

    let responseData = {};

    if (view === 'status') {
      // Agrupamento por status
      const statusCounts = {};
      allRows.forEach(row => {
        const status = row.StatusProjeto || '(vazio)';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const order = ['(vazio)', 'A começar', 'Aguardando aprovação do Cliente', 'Em análise', 'Em andamento', 'Finalizado'];
      const chartData = Object.keys(statusCounts).map(status => ({
        Status: status,
        "Quantidade de Projetos": statusCounts[status]
      })).sort((a, b) => {
        const indexA = order.indexOf(a.Status);
        const indexB = order.indexOf(b.Status);
        if (indexA === -1 && indexB === -1) return a.Status.localeCompare(b.Status);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      responseData = {
        summary: {
          totalActiveProjects: allRows.length
        },
        chartData,
        rows: allRows.slice(pagination.offset, pagination.offset + pagination.pageSize),
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalRows: allRows.length,
          totalPages: Math.ceil(allRows.length / pagination.pageSize)
        }
      };
    } else if (view === 'tempo_projeto') {
      // Ordenação por cliente
      const sortedRows = [...allRows].sort((a, b) => {
        const cliA = a.Cliente || 'Sem cliente';
        const cliB = b.Cliente || 'Sem cliente';
        if (cliA === cliB) {
          return (a.Projeto || '').localeCompare(b.Projeto || '');
        }
        if (cliA === 'Sem cliente') return 1;
        if (cliB === 'Sem cliente') return -1;
        return cliA.localeCompare(cliB);
      });

      const clientGroups = {};
      sortedRows.forEach(row => {
        const cli = row.Cliente || 'Sem cliente';
        if (!clientGroups[cli]) clientGroups[cli] = [];
        clientGroups[cli].push(row);
      });

      const pivotData = [];
      Object.keys(clientGroups).sort((a, b) => {
        if (a === 'Sem cliente') return 1;
        if (b === 'Sem cliente') return -1;
        return a.localeCompare(b);
      }).forEach(cli => {
        const rowsGroup = clientGroups[cli];
        rowsGroup.forEach((row, rowIndex) => {
          pivotData.push({
            ...row,
            isFirstOfClient: rowIndex === 0,
            clientRowSpan: rowsGroup.length,
            ClienteExibicao: cli
          });
        });
      });

      const totalRows = pivotData.length;
      const paginatedRows = pivotData.slice(pagination.offset, pagination.offset + pagination.pageSize);

      responseData = {
        summary: {
          totalProjects: totalRows
        },
        rows: paginatedRows,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalRows,
          totalPages: Math.ceil(totalRows / pagination.pageSize)
        }
      };
    } else if (view === 'tempo_etapa') {
      const sortedRows = [...allRows].sort((a, b) => {
        const cliA = a.Cliente || '';
        const cliB = b.Cliente || '';
        return cliA.localeCompare(cliB) || a.Projeto.localeCompare(b.Projeto);
      });

      const totalRows = sortedRows.length;
      const paginatedRows = sortedRows.slice(pagination.offset, pagination.offset + pagination.pageSize);

      responseData = {
        summary: {
          totalStages: totalRows
        },
        rows: paginatedRows,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalRows,
          totalPages: Math.ceil(totalRows / pagination.pageSize)
        }
      };
    } else if (view === 'tempo_tarefa') {
      const sortedRows = [...allRows].sort((a, b) => {
        return a.Projeto.localeCompare(b.Projeto) || a.Etapa.localeCompare(b.Etapa);
      });

      const totalRows = sortedRows.length;
      const paginatedRows = sortedRows.slice(pagination.offset, pagination.offset + pagination.pageSize);

      responseData = {
        summary: {
          totalTasks: totalRows
        },
        rows: paginatedRows,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalRows,
          totalPages: Math.ceil(totalRows / pagination.pageSize)
        }
      };
    }

    return {
      ...responseData,
      filterOptions
    };
  }

  /**
   * Executa e calcula o Dashboard de Rateio (FAQ 8).
   */
  async getApportionmentDashboard({ filters, pagination, requestId }) {
    let startYear = 2019, startMonth = 1;
    if (filters.startDate) {
      const parts = filters.startDate.split('-');
      startYear = parseInt(parts[0], 10);
      startMonth = parseInt(parts[1], 10);
    }
    let endYear = 2030, endMonth = 12;
    if (filters.endDate) {
      const parts = filters.endDate.split('-');
      endYear = parseInt(parts[0], 10);
      endMonth = parseInt(parts[1], 10);
    }

    const params = [
      startYear, startYear, startMonth,
      endYear, endYear, endMonth
    ];

    const sql = `
      WITH
        Base AS (
          SELECT
            cf.Ano,
            cf.Mes,
            STR_TO_DATE(CONCAT(cf.Ano, '-', LPAD(cf.Mes, 2, '0'), '-01'), '%Y-%m-%d') AS DataMes,
            cf.Projeto_Id,
            cf.Despesas,
            cf.Receitas,
            cf.Colaboradores,
            cf.Horas,
            p.Nome,
            p.Rateio
          FROM
            cache_financeiro cf
            JOIN projeto p ON p.Id = cf.Projeto_Id
          WHERE
            (cf.Ano > ? OR (cf.Ano = ? AND cf.Mes >= ?))
            AND (cf.Ano < ? OR (cf.Ano = ? AND cf.Mes <= ?))
        ),
        Rated AS (
          SELECT
            b.*,
            CASE
              WHEN b.Rateio = 4 OR b.Rateio = 1 OR b.Rateio = 2 THEN GREATEST(b.Despesas - COALESCE(b.Receitas, 0), 0)
            END AS TotalToAllocate
          FROM
            Base b
          WHERE
            b.Rateio IN (1, 2, 4)
        ),
        Recipients AS (
          SELECT
            b.Ano,
            b.Mes,
            b.DataMes,
            b.Projeto_Id,
            b.Nome,
            b.Horas,
            b.Colaboradores,
            b.Receitas
          FROM
            Base b
          WHERE
            b.Rateio = 0
        ),
        RecipientSums AS (
          SELECT
            r.Ano,
            r.Mes,
            r.DataMes,
            SUM(r.Horas) AS SumHoursRecipients,
            SUM(r.Colaboradores) AS SumPeopleRecipients,
            SUM(r.Receitas) AS SumRevenueRecipients
          FROM
            Recipients r
          GROUP BY
            r.Ano,
            r.Mes,
            r.DataMes
        ),
        Allocation AS (
          SELECT
            rd.Ano,
            rd.Mes,
            rd.DataMes,
            rd.Projeto_Id AS RatedProject_Id,
            rd.Nome AS RatedProject_Name,
            rd.Rateio AS RatedMethod,
            rc.Projeto_Id AS Recipient_Id,
            rc.Nome AS Recipient_Name,
            CASE
              WHEN rd.Rateio = 1 THEN NULLIF(rc.Horas, 0)
              WHEN rd.Rateio = 2 THEN NULLIF(rc.Colaboradores, 0)
              WHEN rd.Rateio = 4 THEN NULLIF(rc.Receitas, 0)
              ELSE NULL
            END AS Recipient_Base,
            CASE
              WHEN rd.Rateio = 1 AND rs.SumHoursRecipients > 0 THEN rc.Horas / rs.SumHoursRecipients
              WHEN rd.Rateio = 2 AND rs.SumPeopleRecipients > 0 THEN rc.Colaboradores / rs.SumPeopleRecipients
              WHEN rd.Rateio = 4 AND rs.SumRevenueRecipients > 0 THEN rc.Receitas / rs.SumRevenueRecipients
              ELSE 0
            END AS Factor,
            CASE
              WHEN rd.Rateio = 1 AND rs.SumHoursRecipients > 0 THEN rd.TotalToAllocate * (rc.Horas / rs.SumHoursRecipients)
              WHEN rd.Rateio = 2 AND rs.SumPeopleRecipients > 0 THEN rd.TotalToAllocate * (rc.Colaboradores / rs.SumPeopleRecipients)
              WHEN rd.Rateio = 4 AND rs.SumRevenueRecipients > 0 THEN rd.TotalToAllocate * (rc.Receitas / rs.SumRevenueRecipients)
              ELSE 0
            END AS AllocationValue
          FROM
            Rated rd
            JOIN RecipientSums rs ON rs.DataMes = rd.DataMes
            JOIN Recipients rc ON rc.DataMes = rd.DataMes
        )
      SELECT
        a.DataMes,
        CONCAT(
          ELT(
            a.Mes,
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
          ),
          '/',
          a.Ano
        ) AS "Mês/Ano",
        a.Ano AS "Ano",
        a.Mes AS "Mês",
        a.RatedProject_Id AS "Projeto rateado (ID)",
        a.RatedProject_Name AS "Projeto rateado (origem)",
        CASE a.RatedMethod
          WHEN 1 THEN 'Horas'
          WHEN 2 THEN 'Pessoas'
          WHEN 4 THEN 'Receitas'
        END AS "Método de rateio",
        a.Recipient_Id AS "Projeto (padrão) - ID",
        a.Recipient_Name AS "Projeto (padrão)",
        a.Recipient_Base AS "Total (horas/receitas/pessoas)",
        a.Factor AS "Fator multiplicador",
        a.AllocationValue AS "Valor do rateio",
        (a.Factor * 100.0) AS "Percentual"
      FROM
        Allocation a
      WHERE
        a.Recipient_Base IS NOT NULL
        AND a.AllocationValue > 0
      ORDER BY
        a.DataMes,
        a.RatedProject_Name,
        a.Factor DESC,
        a.Recipient_Name;
    `;

    const result = await executeQuery({
      sql,
      params,
      queryName: 'faq8_apportionment_raw',
      requestId
    });

    const allRows = result.rows;

    // Filtros qualitativos aplicados na memória para preservar a integridade matemática das CTEs de rateio
    const filteredRows = allRows.filter(row => {
      if (filters.ratedProjectName && filters.ratedProjectName !== 'Todos' && row['Projeto rateado (origem)'] !== filters.ratedProjectName) {
        return false;
      }
      if (filters.recipientProjectName && filters.recipientProjectName !== 'Todos' && row['Projeto (padrão)'] !== filters.recipientProjectName) {
        return false;
      }
      if (filters.rateioMethod && filters.rateioMethod !== 'Todos' && row['Método de rateio'] !== filters.rateioMethod) {
        return false;
      }
      return true;
    });

    // 1. Calcular KPIs
    const calcBaseSum = (method) => {
      let rows = filteredRows.filter(d => d['Método de rateio'] === method);
      
      if (method === 'Receitas' && (!filters.ratedProjectName || filters.ratedProjectName === 'Todos')) {
        rows = rows.filter(r => r['Projeto rateado (origem)'] && !r['Projeto rateado (origem)'].includes('Engine'));
      }

      const uniqueMap = new Map();
      rows.forEach(r => {
        const key = r['Projeto (padrão) - ID'] + '_' + r['DataMes'];
        uniqueMap.set(key, Number(r['Total (horas/receitas/pessoas)']) || 0);
      });
      return Array.from(uniqueMap.values()).reduce((sum, val) => sum + val, 0);
    };

    const sumHours = calcBaseSum('Horas');
    const sumPeople = calcBaseSum('Pessoas');
    const sumRevenue = calcBaseSum('Receitas');

    // 2. Gráfico: Agrupamento mensal para o Gráfico de Barras
    const mapMonthToAbbr = (mesAnoStr) => {
      if (!mesAnoStr) return '';
      const parts = mesAnoStr.split('/');
      if (parts.length !== 2) return mesAnoStr;
      const mes = parts[0].toLowerCase().trim();
      const ano = parts[1].trim();
      const map = {
        'janeiro': 'jan', 'fevereiro': 'fev', 'março': 'mar', 'abril': 'abr',
        'maio': 'mai', 'junho': 'jun', 'julho': 'jul', 'agosto': 'ago',
        'setembro': 'set', 'outubro': 'out', 'novembro': 'nov', 'dezembro': 'dez'
      };
      return (map[mes] || mes.slice(0, 3)) + ' ' + ano;
    };

    const dateTextOrder = Array.from(new Set(filteredRows.map(r => r['Mês/Ano'])));
    const uniqueOrigProjects = Array.from(new Set(allRows.map(r => r['Projeto rateado (origem)']))).filter(Boolean).sort();

    const chartMap = {};
    dateTextOrder.forEach(m => {
      chartMap[m] = { name: mapMonthToAbbr(m) };
      uniqueOrigProjects.forEach(p => {
        chartMap[m][p] = 0;
      });
    });

    filteredRows.forEach(row => {
      const m = row['Mês/Ano'];
      const p = row['Projeto rateado (origem)'];
      const val = Number(row['Valor do rateio']) || 0;
      if (chartMap[m] && p) {
        chartMap[m][p] += val;
      }
    });

    const seriesData = dateTextOrder.map(m => chartMap[m]);

    // 3. Tabela: Agrupamento em árvore para rowspans e subtotais
    const tree = {};
    filteredRows.forEach(row => {
      const dateText = row['Mês/Ano'] || 'Sem data';
      const method = row['Método de rateio'] || 'Sem método';
      const ratedProj = row['Projeto rateado (origem)'] || 'Sem projeto origem';

      if (!tree[dateText]) tree[dateText] = {};
      if (!tree[dateText][method]) tree[dateText][method] = {};
      if (!tree[dateText][method][ratedProj]) tree[dateText][method][ratedProj] = [];

      tree[dateText][method][ratedProj].push(row);
    });

    const pivotData = [];
    dateTextOrder.forEach(dateText => {
      const methods = Object.keys(tree[dateText] || {}).sort((a, b) => a.localeCompare(b));
      
      let dateRowSpan = 0;
      methods.forEach(method => {
        const ratedProjs = Object.keys(tree[dateText][method] || {}).sort((a, b) => a.localeCompare(b));
        ratedProjs.forEach(ratedProj => {
          dateRowSpan += tree[dateText][method][ratedProj].length + 1;
        });
      });
      
      let isFirstOfDate = true;
      
      methods.forEach(method => {
        const ratedProjs = Object.keys(tree[dateText][method] || {}).sort((a, b) => a.localeCompare(b));
        
        let methodRowSpan = 0;
        ratedProjs.forEach(ratedProj => {
          methodRowSpan += tree[dateText][method][ratedProj].length + 1;
        });
        
        let isFirstOfMethod = true;
        
        ratedProjs.forEach(ratedProj => {
          const recipients = tree[dateText][method][ratedProj];
          const ratedProjRowSpan = recipients.length;
          
          const subtotalTotal = recipients.reduce((acc, r) => acc + (Number(r['Total (horas/receitas/pessoas)']) || 0), 0);
          const subtotalRateio = recipients.reduce((acc, r) => acc + (Number(r['Valor do rateio']) || 0), 0);
          const subtotalPercent = recipients.reduce((acc, r) => acc + (Number(r['Percentual']) || 0), 0);

          let isFirstOfRatedProj = true;
          
          recipients.forEach((recRow) => {
            pivotData.push({
              isFirstOfDate,
              dateRowSpan,
              isFirstOfMethod,
              methodRowSpan,
              isFirstOfRatedProj,
              ratedProjRowSpan,
              
              isSubtotal: false,
              displayDate: dateText,
              displayMethod: method,
              displayRatedProj: ratedProj,
              displayRecipient: recRow['Projeto (padrão)'],
              displayTotal: recRow['Total (horas/receitas/pessoas)'],
              displayPercent: recRow['Percentual'],
              displayRateio: recRow['Valor do rateio']
            });
            
            isFirstOfDate = false;
            isFirstOfMethod = false;
            isFirstOfRatedProj = false;
          });
          
          pivotData.push({
            isFirstOfDate,
            dateRowSpan,
            isFirstOfMethod,
            methodRowSpan,
            isFirstOfRatedProj: false,
            ratedProjRowSpan: 0,
            
            isSubtotal: true,
            displayDate: dateText,
            displayMethod: method,
            displayRatedProj: ratedProj,
            displayRecipient: '',
            displayTotal: subtotalTotal,
            displayPercent: 100,
            displayRateio: subtotalRateio
          });
          
          isFirstOfDate = false;
          isFirstOfMethod = false;
        });
      });
    });

    const totalRows = pivotData.length;
    const paginatedRows = pivotData.slice(pagination.offset, pagination.offset + pagination.pageSize);

    return {
      summary: {
        totalHoursBase: sumHours,
        totalPeopleBase: sumPeople,
        totalRevenueBase: sumRevenue
      },
      series: seriesData,
      rows: paginatedRows,
      filterOptions: {
        ratedProjects: uniqueOrigProjects,
        recipientProjects: Array.from(new Set(allRows.map(r => r['Projeto (padrão)']))).filter(Boolean).sort(),
        methods: ['Horas', 'Pessoas', 'Receitas']
      },
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows,
        totalPages: Math.ceil(totalRows / pagination.pageSize)
      }
    };
  }

  async getProfitabilityDashboard({ view, filters, pagination, requestId }) {
    const startDate = filters.startDate || '2024-01-01';
    const endDate = filters.endDate || '2024-12-31';
    const projectName = filters.projectName || 'Todos';
    const clientName = filters.clientName || 'Todos';

    // Queries Auxiliares para dropdowns de filtros dinâmicos
    const sqlProjects = `SELECT DISTINCT cc.Name AS Projeto FROM costcenters cc WHERE cc.active = 1 ORDER BY cc.Name ASC;`;
    const sqlClients = `SELECT DISTINCT c.Name AS Cliente FROM clients c WHERE c.active = 1 ORDER BY c.Name ASC;`;

    const [projectsRes, clientsRes] = await Promise.all([
      executeQuery({ sql: sqlProjects, params: [], queryName: 'faq5_list_projects', requestId }),
      executeQuery({ sql: sqlClients, params: [], queryName: 'faq5_list_clients', requestId })
    ]);

    const filterOptions = {
      projects: projectsRes.rows.map(r => r.Projeto).filter(Boolean),
      clients: clientsRes.rows.map(r => r.Cliente).filter(Boolean)
    };

    if (view === 'overdue' || view === 'atraso') {
      // View 2: Contas a receber em atraso por cliente
      const sqlOverdue = `
        SELECT * FROM (
          SELECT 
              clients.Name AS Client,
              ABS(cfi.Value) AS Value,
              cfi.DueDate AS DueDate,
              costcenters.Name AS Project,
              cfi.Description
          FROM cashflowitems cfi
          LEFT JOIN costcenters ON cfi.CostCenter_Id = costcenters.Id
          LEFT JOIN clients ON cfi.Client_Id = clients.Id
          WHERE 
              cfi.Value > 0
              AND cfi.Date IS NULL                     
              AND cfi.DueDate < CURRENT_DATE()        
              AND cfi.Transfer_Id IS NULL
              AND cfi.Id NOT IN (
                  SELECT DISTINCT Parent_Id 
                  FROM cashflowitems cf 
                  WHERE cf.Parent_Id IS NOT NULL AND (cf.Type <> 1 OR cf.Type IS NULL)
              )
        ) t
        WHERE (? = 'Todos' OR t.Project = ?)
          AND (? = 'Todos' OR t.Client = ?)
        ORDER BY t.DueDate ASC;
      `;

      const paramsOverdue = [projectName, projectName, clientName, clientName];
      const dbResult = await executeQuery({
        sql: sqlOverdue,
        params: paramsOverdue,
        queryName: 'faq5_overdue_raw',
        requestId
      });

      const allRows = dbResult.rows || [];
      const totalRows = allRows.length;
      const paginatedRows = allRows.slice(pagination.offset, pagination.offset + pagination.pageSize);

      return {
        summary: {
          totalOverdueCount: totalRows,
          totalOverdueValue: allRows.reduce((sum, r) => sum + (Number(r.Value) || 0), 0)
        },
        rows: paginatedRows,
        filterOptions,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalRows,
          totalPages: Math.ceil(totalRows / pagination.pageSize)
        }
      };
    }

    // View 1: Resultado do projeto (Default)
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    const startYear = startD.getFullYear();
    const startMonth = startD.getMonth() + 1;
    const endYear = endD.getFullYear();
    const endMonth = endD.getMonth() + 1;

    const sqlProfitability = `
      WITH ReceitaProjeto AS (
          SELECT 
              cfi.CostCenter_Id AS ProjetoId,
              cfi.Client_Id,
              YEAR(cfi.CompetenceDate) AS Ano,
              MONTH(cfi.CompetenceDate) AS Mes,
              STR_TO_DATE(CONCAT(YEAR(cfi.CompetenceDate), '-', LPAD(MONTH(cfi.CompetenceDate), 2, '0'), '-01'), '%Y-%m-%d') AS DataReferencia,
              SUM(ABS(cfi.Value)) AS Receita
          FROM cashflowitems cfi
          WHERE cfi.Value > 0
              AND cfi.Transfer_Id IS NULL
              AND cfi.CompetenceDate >= ? AND cfi.CompetenceDate <= ?
              AND cfi.Id NOT IN (
                  SELECT DISTINCT Parent_Id 
                  FROM cashflowitems cf 
                  WHERE cf.Parent_Id IS NOT NULL AND (cf.Type <> 1 OR cf.Type IS NULL)
              )
          GROUP BY ProjetoId, Client_Id, Ano, Mes, DataReferencia
      ),
      DespesaProjeto AS (
          SELECT 
              cfi.CostCenter_Id AS ProjetoId,
              YEAR(cfi.CompetenceDate) AS Ano,
              MONTH(cfi.CompetenceDate) AS Mes,
              STR_TO_DATE(CONCAT(YEAR(cfi.CompetenceDate), '-', LPAD(MONTH(cfi.CompetenceDate), 2, '0'), '-01'), '%Y-%m-%d') AS DataReferencia,
              SUM(ABS(cfi.Value)) AS Despesa
          FROM cashflowitems cfi
          WHERE cfi.Value < 0
              AND cfi.Transfer_Id IS NULL
              AND cfi.CompetenceDate >= ? AND cfi.CompetenceDate <= ?
              AND cfi.Id NOT IN (
                  SELECT DISTINCT Parent_Id 
                  FROM cashflowitems cf 
                  WHERE cf.Parent_Id IS NOT NULL AND (cf.Type <> 1 OR cf.Type IS NULL)
              )
          GROUP BY ProjetoId, Ano, Mes, DataReferencia
      ),
      Rateio AS (
          SELECT 
              fsc.PayingProject AS ProjetoId,
              fsc.ReferenceYear AS Ano,
              fsc.ReferenceMonth AS Mes,
              STR_TO_DATE(CONCAT(fsc.ReferenceYear, '-', LPAD(fsc.ReferenceMonth, 2, '0'), '-01'), '%Y-%m-%d') AS DataReferencia,
              SUM(fsc.SharingRevenue - fsc.SharingExpense) AS RateioFinal
          FROM financesharingcaches fsc
          WHERE (fsc.ReferenceYear > ? OR (fsc.ReferenceYear = ? AND fsc.ReferenceMonth >= ?))
            AND (fsc.ReferenceYear < ? OR (fsc.ReferenceYear = ? AND fsc.ReferenceMonth <= ?))
          GROUP BY ProjetoId, Ano, Mes, DataReferencia
      )
      SELECT * FROM (
        SELECT 
            cc.Name AS Projeto,
            IFNULL(clients.Name, 'Sem Cliente') AS Cliente,
            rp.DataReferencia,
            ROUND(COALESCE(rp.Receita, 0), 2) AS Receita,
            ROUND(COALESCE(dp.Despesa, 0), 2) AS Despesa,
            ROUND(COALESCE(rp.Receita, 0) - COALESCE(dp.Despesa, 0), 2) AS MargemDireta,
            ROUND(COALESCE(r.RateioFinal, 0), 2) AS Rateio,
            ROUND(
                COALESCE(rp.Receita, 0) 
                + COALESCE(r.RateioFinal, 0) 
                - COALESCE(dp.Despesa, 0),
                2
            ) AS Resultado
        FROM ReceitaProjeto rp
        LEFT JOIN DespesaProjeto dp 
            ON rp.ProjetoId = dp.ProjetoId AND rp.DataReferencia = dp.DataReferencia
        LEFT JOIN Rateio r 
            ON rp.ProjetoId = r.ProjetoId AND rp.DataReferencia = r.DataReferencia
        LEFT JOIN costcenters cc ON rp.ProjetoId = cc.Id
        LEFT JOIN clients ON rp.Client_Id = clients.Id
      ) t
      WHERE (? = 'Todos' OR t.Projeto = ?)
        AND (? = 'Todos' OR t.Cliente = ?)
      ORDER BY t.Projeto ASC;
    `;

    const params = [
      startDate, endDate,
      startDate, endDate,
      startYear, startYear, startMonth,
      endYear, endYear, endMonth,
      projectName, projectName,
      clientName, clientName
    ];

    const dbResult = await executeQuery({
      sql: sqlProfitability,
      params,
      queryName: 'faq5_profitability_raw',
      requestId
    });

    const allRows = dbResult.rows || [];

    // Agrupamento por projeto para consolidar os resultados do projeto
    const agrupamentoProjeto = {};
    allRows.forEach(d => {
      const p = d.Projeto || 'Sem Projeto';
      if (!agrupamentoProjeto[p]) {
        agrupamentoProjeto[p] = { Projeto: p, Receita: 0, Despesa: 0, MargemDireta: 0, Rateio: 0, Resultado: 0 };
      }
      agrupamentoProjeto[p].Receita += Number(d.Receita) || 0;
      agrupamentoProjeto[p].Despesa += Number(d.Despesa) || 0;
      agrupamentoProjeto[p].MargemDireta += Number(d.MargemDireta) || 0;
      agrupamentoProjeto[p].Rateio += Number(d.Rateio) || 0;
      agrupamentoProjeto[p].Resultado += Number(d.Resultado) || 0;
    });

    // Converter para array e ordenar alfabeticamente por Projeto
    const tableResultado = Object.values(agrupamentoProjeto).sort((a, b) => a.Projeto.localeCompare(b.Projeto));

    const totalRows = tableResultado.length;
    const paginatedRows = tableResultado.slice(pagination.offset, pagination.offset + pagination.pageSize);

    return {
      summary: {
        totalRevenue: tableResultado.reduce((sum, r) => sum + r.Receita, 0),
        totalExpense: tableResultado.reduce((sum, r) => sum + r.Despesa, 0),
        totalMargin: tableResultado.reduce((sum, r) => sum + r.MargemDireta, 0),
        totalResult: tableResultado.reduce((sum, r) => sum + r.Resultado, 0)
      },
      rows: paginatedRows,
      filterOptions,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows,
        totalPages: Math.ceil(totalRows / pagination.pageSize)
      }
    };
  }

  async getCommercialDashboard({ filters, pagination, requestId }) {
    const startDate = filters.startDate || '2024-01-01';
    const endDate = filters.endDate || '2024-12-31';

    // 1. Query de Vendas (Vendas x Orçamentos)
    const sqlVendas = `
      SELECT 
          Date,
          Total AS Receitas,
          CASE 
              WHEN IsActual = 1 THEN 'Venda'
              WHEN IsActual = 0 THEN 'Orçamento'
          END AS Tipo
      FROM 
          servicesales
      WHERE
          Total > 0 
          AND ParentVersion_Id IS NULL
          AND Date BETWEEN ? AND ?
      ORDER BY Date ASC;
    `;

    // 2. Query de Compensações
    const sqlCompensacoes = `
      SELECT 
          ss.Id AS SaleId,
          ss.Date AS DataVenda,
          cf.Id AS CashFlowId,
          cf.Value AS ValorParcela,
          cf.DueDate AS DataVencimento,
          cf.Date AS DataPagamento,
          cf.Executed,
          CASE 
              WHEN cf.Executed = 1 THEN 'Compensado'
              ELSE 'Em aberto'
          END AS Status
      FROM servicesales ss
      JOIN ServiceSalePayments ssp ON ssp.Sale_Id = ss.Id
      JOIN cashflowitems cf ON cf.Id = ssp.CashFlowItem_Id
      WHERE 
          ss.IsActual = 1
          AND ss.ParentVersion_Id IS NULL
          AND cf.Value > 0
          AND (cf.DueDate BETWEEN ? AND ? OR cf.Date BETWEEN ? AND ?);
    `;

    const [vendasRes, compensacoesRes] = await Promise.all([
      executeQuery({ sql: sqlVendas, params: [startDate, endDate], queryName: 'faq2_vendas', requestId }),
      executeQuery({ sql: sqlCompensacoes, params: [startDate, endDate, startDate, endDate], queryName: 'faq2_compensacoes', requestId })
    ]);

    const vendas = vendasRes.rows || [];
    const compensacoes = compensacoesRes.rows || [];

    // LÓGICA DE KPIs
    const apenasVendas = vendas.filter(v => v.Tipo === 'Venda');
    const kpiVendas = apenasVendas.length;
    const kpiValorVendas = apenasVendas.reduce((acc, curr) => acc + (Number(curr.Receitas) || 0), 0);

    const apenasOrcamentos = vendas.filter(v => v.Tipo === 'Orçamento');
    const kpiOrcamentos = apenasOrcamentos.length;
    const kpiValorOrcamentos = apenasOrcamentos.reduce((acc, curr) => acc + (Number(curr.Receitas) || 0), 0);

    // Filtrar compensações cujo vencimento cai no período para o KPI
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const compensaçõesVencimentoNoPeriodo = compensacoes.filter(c => {
      if (!c.DataVencimento) return false;
      const d = new Date(c.DataVencimento);
      return d >= start && d <= end;
    });

    const apenasCompensadas = compensaçõesVencimentoNoPeriodo.filter(c => c.Status === 'Compensado');
    const kpiCompensado = apenasCompensadas.reduce((acc, curr) => acc + (Number(curr.ValorParcela) || 0), 0);

    // AGRUPAMENTOS PARA GRÁFICOS
    // 1. Gráfico de Linha (Vendas x Orçamentos por mês)
    const mesesMap = {};
    const formatMonthShort = (date) => {
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      return `${months[date.getMonth()]}/${date.getFullYear()}`;
    };

    vendas.forEach(v => {
      const d = new Date(v.Date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mesAno = formatMonthShort(d);

      if (!mesesMap[key]) {
        mesesMap[key] = { key, mesAno, Venda: 0, Orcamento: 0, ValorVenda: 0, ValorOrcamento: 0 };
      }

      const valor = Number(v.Receitas) || 0;
      if (v.Tipo === 'Venda') {
        mesesMap[key].Venda += 1;
        mesesMap[key].ValorVenda += valor;
      } else {
        mesesMap[key].Orcamento += 1;
        mesesMap[key].ValorOrcamento += valor;
      }
    });

    const monthlySalesTrend = Object.values(mesesMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(item => ({
        mesAno: item.mesAno,
        Venda: item.Venda,
        Orcamento: item.Orcamento,
        ValorVenda: item.ValorVenda,
        ValorOrcamento: item.ValorOrcamento
      }));

    // 2. Gráfico de Barras (Vendas por ano)
    const anosMap = {};
    apenasVendas.forEach(v => {
      const d = new Date(v.Date);
      const ano = d.getFullYear();
      if (!anosMap[ano]) {
        anosMap[ano] = { Ano: String(ano), Valor: 0 };
      }
      anosMap[ano].Valor += (Number(v.Receitas) || 0);
    });

    const yearlySalesTrend = Object.values(anosMap).sort((a, b) => Number(a.Ano) - Number(b.Ano));

    // 3. Gráfico de Vencimentos (Compensações por mês de vencimento)
    const vencimentoMap = {};
    compensaçõesVencimentoNoPeriodo.forEach(c => {
      const d = new Date(c.DataVencimento);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mesAno = formatMonthShort(d);

      if (!vencimentoMap[key]) {
        vencimentoMap[key] = { key, mesAno, Valor: 0 };
      }
      vencimentoMap[key].Valor += (Number(c.ValorParcela) || 0);
    });

    const monthlyVencimentoTrend = Object.values(vencimentoMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(item => ({ vencimento: item.mesAno, Valor: item.Valor }));

    // 4. Gráfico de Compensados (Compensações por mês de pagamento)
    const compensadoMap = {};
    compensacoes.filter(c => c.Status === 'Compensado' && c.DataPagamento).forEach(c => {
      const d = new Date(c.DataPagamento);
      if (d >= start && d <= end) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const mesAno = formatMonthShort(d);

        if (!compensadoMap[key]) {
          compensadoMap[key] = { key, mesAno, Valor: 0 };
        }
        compensadoMap[key].Valor += (Number(c.ValorParcela) || 0);
      }
    });

    const monthlyCompensadoTrend = Object.values(compensadoMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(item => ({ periodo: item.mesAno, Valor: item.Valor }));

    // Paginação para a lista detalhada de vendas
    const totalRows = apenasVendas.length;
    const paginatedRows = apenasVendas.slice(pagination.offset, pagination.offset + pagination.pageSize);

    return {
      summary: {
        kpiVendas,
        kpiValorVendas,
        kpiOrcamentos,
        kpiValorOrcamentos,
        kpiCompensado
      },
      series: {
        monthlySalesTrend,
        yearlySalesTrend,
        monthlyVencimentoTrend,
        monthlyCompensadoTrend
      },
      rows: paginatedRows,
      filterOptions: {
        projects: [],
        clients: []
      },
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows,
        totalPages: Math.ceil(totalRows / pagination.pageSize)
      }
    };
  }

  async getExpensesDashboard({ filters, pagination, requestId }) {
    const startDate = filters.startDate || '2024-01-01';
    const endDate = filters.endDate || '2024-12-31';
    const supplierName = filters.supplierName || 'Todos';
    const bankAccountName = filters.bankAccountName || 'Todas';
    const status = filters.status || 'Todos';

    // Queries Auxiliares paraDropdowns de Filtro
    const sqlSuppliers = `SELECT DISTINCT s.Name AS Fornecedor FROM suppliers s WHERE s.Active = 1 ORDER BY s.Name ASC;`;
    const sqlAccounts = `SELECT DISTINCT b.Name AS Conta FROM bankaccounts b ORDER BY b.Name ASC;`;

    const [suppliersRes, accountsRes] = await Promise.all([
      executeQuery({ sql: sqlSuppliers, params: [], queryName: 'faq3_list_suppliers', requestId }),
      executeQuery({ sql: sqlAccounts, params: [], queryName: 'faq3_list_accounts', requestId })
    ]);

    const filterOptions = {
      suppliers: suppliersRes.rows.map(r => r.Fornecedor).filter(Boolean),
      bankAccounts: accountsRes.rows.map(r => r.Conta).filter(Boolean),
      statuses: ['Todos', 'Compensada', 'Não Compensada']
    };

    // Query principal de Despesas
    const sqlExpenses = `
      WITH Expenses AS (
          SELECT 
              COALESCE(CFI.Date, CFI.DueDate) AS Date,
              ABS(CFI.Value) AS Value,
              CASE 
                  WHEN CFI.Executed = 1 THEN 'Compensado'
                  WHEN CFI.Executed = 0 THEN 'Não Compensado'
              END AS Compensado,
              CFI.Supplier_Id,
              CFI.BankAccount_Id
          FROM CashFlowItems CFI
          WHERE 
              CFI.Value < 0
              AND CFI.Transfer_Id IS NULL
              AND (CFI.Date >= ? AND CFI.Date <= ? OR (CFI.Date IS NULL AND CFI.DueDate >= ? AND CFI.DueDate <= ?))
              AND CFI.Id NOT IN (
                  SELECT DISTINCT Parent_Id 
                  FROM CashFlowItems CF 
                  WHERE CF.Parent_Id IS NOT NULL 
                  AND (CF.Type <> 1 OR CF.Type IS NULL)
              )
      ),
      SuppliersLimited AS (
          SELECT 
              DISTINCT Supplier_Id AS Id,
              Suppliers.Name
          FROM Expenses
          INNER JOIN Suppliers 
              ON Supplier_Id = Suppliers.Id 
              AND Suppliers.Active = 1
      )
      SELECT * FROM (
        SELECT 
            STR_TO_DATE(CONCAT(DATE_FORMAT(Date, '%Y-%m'), '-01'), '%Y-%m-%d') AS Data,
            S.Name AS Fornecedor,
            bankaccounts.Name AS Conta,
            CashFlowItems.Compensado,
            SUM(Value) AS Valor
        FROM Expenses AS CashFlowItems
        INNER JOIN SuppliersLimited S 
            ON CashFlowItems.Supplier_Id = S.Id
        INNER JOIN bankaccounts
            ON CashFlowItems.BankAccount_Id = bankaccounts.Id
        GROUP BY 
            Data,
            Fornecedor,
            Conta,
            CashFlowItems.Compensado
      ) t
      WHERE (? = 'Todos' OR t.Fornecedor = ?)
        AND (? = 'Todas' OR t.Conta = ?)
        AND (? = 'Todos' OR (? = 'Compensada' AND t.Compensado = 'Compensado') OR (? = 'Não Compensada' AND t.Compensado = 'Não Compensado'))
      ORDER BY t.Data DESC, t.Valor DESC;
    `;

    const params = [
      startDate, endDate,
      startDate, endDate,
      supplierName, supplierName,
      bankAccountName, bankAccountName,
      status, status, status
    ];

    const dbResult = await executeQuery({
      sql: sqlExpenses,
      params,
      queryName: 'faq3_expenses_raw',
      requestId
    });

    const allRows = dbResult.rows || [];

    // LÓGICA DE KPIs
    const totalDespesas = allRows.reduce((acc, curr) => acc + (Number(curr.Valor) || 0), 0);
    const mediaDespesas = allRows.length > 0 ? totalDespesas / allRows.length : 0;

    // AGRUPAMENTO 1: Gráfico de Barras Agrupado (Fornecedores por Mês)
    const groupedData = {};
    const uniqueFornSet = new Set();

    allRows.forEach(d => {
      if (!d.Data || !d.Fornecedor) return;
      const dateObj = new Date(d.Data);
      const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      const mesAno = `${months[dateObj.getMonth()]}/${dateObj.getFullYear()}`;

      if (!groupedData[key]) {
        groupedData[key] = { key, mesAno };
      }

      const valor = Number(d.Valor) || 0;
      if (valor > 0) {
        groupedData[key][d.Fornecedor] = (groupedData[key][d.Fornecedor] || 0) + valor;
        uniqueFornSet.add(d.Fornecedor);
      }
    });

    const barChartFornecedorData = Object.values(groupedData)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, ...rest }) => rest);

    // AGRUPAMENTO 2: Ranking por Fornecedor
    const totalsMap = {};
    allRows.forEach(d => {
      if (!d.Fornecedor) return;
      const valor = Number(d.Valor) || 0;
      totalsMap[d.Fornecedor] = (totalsMap[d.Fornecedor] || 0) + valor;
    });

    const barChartTotalFornecedorData = Object.entries(totalsMap)
      .map(([name, value]) => ({ Fornecedor: name, Valor: value }))
      .sort((a, b) => b.Valor - a.Valor);

    // Paginação para tabela detalhada
    const totalRows = allRows.length;
    const paginatedRows = allRows.slice(pagination.offset, pagination.offset + pagination.pageSize);

    return {
      summary: {
        totalDespesas,
        mediaDespesas
      },
      series: {
        barChartFornecedorData,
        barChartTotalFornecedorData,
        uniqueFornecedores: Array.from(uniqueFornSet).sort()
      },
      rows: paginatedRows,
      filterOptions,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows,
        totalPages: Math.ceil(totalRows / pagination.pageSize)
      }
    };
  }

  async getPersonalExpensesDashboard({ filters, pagination, requestId }) {
    const startDate = filters.startDate || '2024-01-01';
    const endDate = filters.endDate || '2024-12-31';

    // 1. Buscar Reportagens (horas apontadas)
    const sqlReportagem = `
      SELECT 
          r.Membro_Id,
          membro.Nome AS Colaborador,
          r.Projeto_Id,
          p.Nome AS Projeto,
          COALESCE(b.Id, 0) AS EtapaId,
          COALESCE(b.Name, 'Horas apontadas diretamente no projeto') AS EtapaName,
          COALESCE(t.Id, 0) AS TarefaId,
          COALESCE(t.Title, 'Horas apontadas diretamente no projeto') AS TarefaName,
          r.Dia,
          r.HorasTrabalhadas,
          g.Name AS GrupoName
      FROM reportagem r
      JOIN membro ON r.Membro_Id = membro.Id
      JOIN projeto p ON r.Projeto_Id = p.Id AND p.Ativo = 1
      LEFT JOIN tasks t ON r.Task_Id = t.Id
      LEFT JOIN boards b ON t.BoardId = b.Id
      LEFT JOIN memberteams mt ON mt.MemberId = membro.Id
      LEFT JOIN grupo g ON g.Id = mt.TeamId AND g.Active = 1
      WHERE r.Dia BETWEEN ? AND ?;
    `;

    // 2. Buscar Promoções
    const sqlPromocoes = `
      SELECT Membro_Id, Cargo_Id, DesdeDia, cargo.Nome AS CargoNome
      FROM promocao
      JOIN cargo ON promocao.Cargo_Id = cargo.Id
      ORDER BY DesdeDia ASC;
    `;

    // 3. Buscar Reajustes
    const sqlReajustes = `
      SELECT Cargo_Id, Valor AS ValorHora, CustoMensal, SalarioBase, Empresa, Regime, DesdeDia
      FROM reajuste
      ORDER BY DesdeDia ASC;
    `;

    // 4. Buscar Encargos
    const sqlEncargos = `
      SELECT 
          e.TipoTributacao,
          e.Regime,
          e.DesdeDia,
          ei.Nome AS EncargoNome,
          ei.Valor AS EncargoValor
      FROM encargo e
      JOIN encargo_item ei ON ei.Encargo_Id = e.Id
      ORDER BY e.DesdeDia ASC;
    `;

    // 5. Buscar Empresas
    const sqlEmpresas = `SELECT Id AS EmpresaId, taxationType FROM companies;`;

    // 6. Buscar Feriados
    const sqlFeriados = `SELECT Dia FROM feriado WHERE Dia BETWEEN ? AND ?;`;

    // 7. Buscar Carga Horária
    const sqlCargaHoraria = `SELECT Cargo_Id, DiaSemana, Carga FROM carga_horaria;`;

    const [
      reportagemRes,
      promocoesRes,
      reajustesRes,
      encargosRes,
      empresasRes,
      feriadosRes,
      cargaRes
    ] = await Promise.all([
      executeQuery({ sql: sqlReportagem, params: [startDate, endDate], queryName: 'faq4_personal_reportagem', requestId }),
      executeQuery({ sql: sqlPromocoes, params: [], queryName: 'faq4_personal_promocoes', requestId }),
      executeQuery({ sql: sqlReajustes, params: [], queryName: 'faq4_personal_reajustes', requestId }),
      executeQuery({ sql: sqlEncargos, params: [], queryName: 'faq4_personal_encargos', requestId }),
      executeQuery({ sql: sqlEmpresas, params: [], queryName: 'faq4_personal_empresas', requestId }),
      executeQuery({ sql: sqlFeriados, params: [startDate, endDate], queryName: 'faq4_personal_feriados', requestId }),
      executeQuery({ sql: sqlCargaHoraria, params: [], queryName: 'faq4_personal_carga_horaria', requestId })
    ]);

    const reportagens = reportagemRes.rows || [];
    const promocoes = promocoesRes.rows || [];
    const reajustes = reajustesRes.rows || [];
    const encargosRaw = encargosRes.rows || [];
    const empresas = empresasRes.rows || [];
    const feriados = new Set((feriadosRes.rows || []).map(f => new Date(f.Dia).toISOString().split('T')[0]));
    const cargas = cargaRes.rows || [];

    // Estruturar dados auxiliares
    const empresasMap = {};
    empresas.forEach(e => {
      empresasMap[e.EmpresaId] = e.taxationType === 0 ? 0 : 1;
    });

    const encargosMap = {};
    encargosRaw.forEach(e => {
      const key = `${e.TipoTributacao}-${e.Regime}-${new Date(e.DesdeDia).toISOString().split('T')[0]}`;
      if (!encargosMap[key]) {
        encargosMap[key] = { trabalhista: 0, social: 0 };
      }
      const valor = Number(e.EncargoValor) || 0;
      if (['13º Salário', 'Férias', 'DSR - Descanso Semanal Remunerado'].includes(e.EncargoNome)) {
        encargosMap[key].trabalhista += valor;
      } else if (['INSS', 'SAT/RAT', 'Salário Educação', 'INCRA/SEST/SEBRAE/SENAT', 'FGTS', 'FGTS/Provisão de Multa para Rescisão'].includes(e.EncargoNome)) {
        encargosMap[key].social += valor;
      }
    });

    const getEncargoVigente = (tipoTributacao, regime, data) => {
      let encargoVigente = { trabalhista: 0, social: 0 };
      let maxDate = null;
      const targetTime = new Date(data).getTime();

      Object.entries(encargosMap).forEach(([key, val]) => {
        const [trib, reg, desde] = key.split('-');
        if (Number(trib) === tipoTributacao && Number(reg) === regime) {
          const desdeTime = new Date(desde).getTime();
          if (desdeTime <= targetTime) {
            if (!maxDate || desdeTime > maxDate) {
              maxDate = desdeTime;
              encargoVigente = val;
            }
          }
        }
      });

      const totalEncargos = (encargoVigente.trabalhista * (encargoVigente.social / 100) + encargoVigente.social + encargoVigente.trabalhista) / 100;
      return totalEncargos;
    };

    // Estruturar cargas horárias por cargo
    const cargasPorCargo = {};
    cargas.forEach(c => {
      if (!cargasPorCargo[c.Cargo_Id]) {
        cargasPorCargo[c.Cargo_Id] = {};
      }
      cargasPorCargo[c.Cargo_Id][c.DiaSemana] = Number(c.Carga) || 0;
    });

    const getCargaHorariaMes = (membroId, cargoId, mesStr) => {
      const [ano, mes] = mesStr.split('-').map(Number);
      const startMonth = new Date(ano, mes - 1, 1);
      const endMonth = new Date(ano, mes, 0);
      let totalCarga = 0;

      const cargoCargas = cargasPorCargo[cargoId] || {};

      for (let day = 1; day <= endMonth.getDate(); day++) {
        const currentDate = new Date(ano, mes - 1, day);
        const dateKey = currentDate.toISOString().split('T')[0];
        
        if (feriados.has(dateKey)) continue;

        const weekday = currentDate.getDay(); // 0: Dom, 1: Seg, ..., 6: Sab
        const diaSemanaMysql = weekday === 0 ? 7 : weekday; // MySQL 1: Seg, ..., 7: Dom

        if (diaSemanaMysql >= 1 && diaSemanaMysql <= 5) {
          const cargaDia = cargoCargas[diaSemanaMysql] !== undefined ? cargoCargas[diaSemanaMysql] : 0;
          totalCarga += cargaDia;
        }
      }
      return totalCarga || 160; // fallback para 160h
    };

    const allRows = [];
    const agrupamento = {};

    reportagens.forEach(r => {
      const dObj = new Date(r.Dia);
      const mesStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
      const key = `${r.Membro_Id}-${r.Projeto_Id}-${r.EtapaId}-${r.TarefaId}-${mesStr}`;

      if (!agrupamento[key]) {
        agrupamento[key] = {
          Membro_Id: r.Membro_Id,
          Colaborador: r.Colaborador,
          Projeto_Id: r.Projeto_Id,
          Projeto: r.Projeto,
          EtapaName: r.EtapaName,
          TarefaName: r.TarefaName,
          MesStr: mesStr,
          DataRepresentativa: new Date(dObj.getFullYear(), dObj.getMonth(), 1),
          HorasApontadas: 0,
          GrupoName: r.GrupoName || 'Sem Grupo'
        };
      }
      agrupamento[key].HorasApontadas += Number(r.HorasTrabalhadas) || 0;
    });

    Object.values(agrupamento).forEach(item => {
      // 1. Descobrir Cargo Vigente na DataRepresentativa
      let cargoVigente = null;
      let maxPromocaoDate = null;
      const targetTime = item.DataRepresentativa.getTime();

      promocoes.forEach(p => {
        if (p.Membro_Id === item.Membro_Id) {
          const promoTime = new Date(p.DesdeDia).getTime();
          if (promoTime <= targetTime) {
            if (!maxPromocaoDate || promoTime > maxPromocaoDate) {
              maxPromocaoDate = promoTime;
              cargoVigente = p;
            }
          }
        }
      });

      if (!cargoVigente) return;

      // 2. Descobrir Reajuste Vigente para o Cargo na DataRepresentativa
      let reajusteVigente = null;
      let maxReajusteDate = null;

      reajustes.forEach(rj => {
        if (rj.Cargo_Id === cargoVigente.Cargo_Id) {
          const reajTime = new Date(rj.DesdeDia).getTime();
          if (reajTime <= targetTime) {
            if (!maxReajusteDate || reajTime > maxReajusteDate) {
              maxReajusteDate = reajTime;
              reajusteVigente = rj;
            }
          }
        }
      });

      if (!reajusteVigente) return;

      // 3. Obter Carga Horária Mensal
      const cargaMensal = getCargaHorariaMes(item.Membro_Id, cargoVigente.Cargo_Id, item.MesStr);

      // 4. Obter Encargos Vigentes
      const tipoTributacao = empresasMap[reajusteVigente.Empresa] !== undefined ? empresasMap[reajusteVigente.Empresa] : 0;
      const totalEncargos = getEncargoVigente(tipoTributacao, reajusteVigente.Regime, item.DataRepresentativa);

      // 5. Calcular Custo Hora e Custo Total
      const regime = reajusteVigente.Regime;
      const salarioBase = Number(reajusteVigente.SalarioBase) || 0;
      const custoMensal = Number(reajusteVigente.CustoMensal) || 0;
      const valorHora = Number(reajusteVigente.ValorHora) || 0;
      const horas = item.HorasApontadas;

      let custoHoraAdicional = 0;
      if (regime === 0) { // Mensalista
        custoHoraAdicional = (salarioBase + salarioBase * totalEncargos + custoMensal) / cargaMensal;
      } else if (regime === 1) { // Horista
        custoHoraAdicional = valorHora + valorHora * totalEncargos + (custoMensal / horas);
      } else if (regime === 2) { // Estagiário
        custoHoraAdicional = (salarioBase + custoMensal) / cargaMensal;
      } else { // Outros
        custoHoraAdicional = valorHora + (custoMensal / cargaMensal);
      }

      const custoTotal = Number((horas * custoHoraAdicional).toFixed(4));

      allRows.push({
        Colaborador: item.Colaborador,
        Grupo: item.GrupoName,
        Cargo: cargoVigente.CargoNome,
        Projeto: item.Projeto,
        Etapas: item.EtapaName,
        Tarefas: item.TarefaName,
        Mes_Ano: item.MesStr,
        MesAnoData: item.DataRepresentativa,
        HorasApontadas: horas,
        TipoVinculo: regime === 0 ? 'Mensalista' : regime === 1 ? 'Horista' : regime === 2 ? 'Estagiário' : 'Outros',
        CargaMensal: cargaMensal,
        CustoHoraAdicional: custoHoraAdicional,
        CustoTotal: custoTotal
      });
    });

    // Ordenação padrão para paridade com a query SQL: Mes_Ano, Colaborador, Cargo
    allRows.sort((a, b) => {
      const cmpMes = a.Mes_Ano.localeCompare(b.Mes_Ano);
      if (cmpMes !== 0) return cmpMes;
      const cmpColab = a.Colaborador.localeCompare(b.Colaborador);
      if (cmpColab !== 0) return cmpColab;
      return a.Cargo.localeCompare(b.Cargo);
    });

    // Extrair opções únicas para dropdowns (antes dos filtros qualitativos)
    const projSet = new Set(allRows.map(d => d.Projeto).filter(Boolean));
    const etapaSet = new Set();
    const tarefaSet = new Set();

    allRows.forEach(d => {
      if (d.Etapas) d.Etapas.split(', ').forEach(e => etapaSet.add(e));
      if (d.Tarefas) d.Tarefas.split(', ').forEach(t => tarefaSet.add(t));
    });

    const filterOptions = {
      projects: ['Todos', ...Array.from(projSet).sort()],
      etapas: ['Todas', ...Array.from(etapaSet).sort()],
      tarefas: ['Todas', ...Array.from(tarefaSet).sort()]
    };

    // Aplicar filtros qualitativos na memória
    const filteredRows = allRows.filter(d => {
      if (filters.projectName && filters.projectName !== 'Todos' && d.Projeto !== filters.projectName) return false;
      if (filters.etapaName && filters.etapaName !== 'Todas' && (!d.Etapas || !d.Etapas.includes(filters.etapaName))) return false;
      if (filters.tarefaName && filters.tarefaName !== 'Todas' && (!d.Tarefas || !d.Tarefas.includes(filters.tarefaName))) return false;
      return true;
    });

    // Calcular KPIs com base nos filtrados
    const totalGeralHoras = filteredRows.reduce((acc, curr) => acc + (Number(curr.HorasApontadas) || 0), 0);
    const totalGeralCustoTotal = filteredRows.reduce((acc, curr) => acc + (Number(curr.CustoTotal) || 0), 0);

    // Gerar pivotData e flatPivotTable com Spans (como no useMemo original)
    const pivotData = {};
    filteredRows.forEach(d => {
      const p = d.Projeto || 'Sem Projeto';
      const dateObj = d.MesAnoData ? new Date(d.MesAnoData) : new Date();
      const mesAnoStr = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

      if (!pivotData[p]) pivotData[p] = {};
      if (!pivotData[p][mesAnoStr]) pivotData[p][mesAnoStr] = [];

      pivotData[p][mesAnoStr].push({
        Colaborador: d.Colaborador || 'Sem Colaborador',
        Cargo: d.Cargo || 'Sem Cargo',
        Horas: Number(d.HorasApontadas) || 0,
        CustoPorHora: Number(d.CustoHoraAdicional) || 0,
        CustoTotal: Number(d.CustoTotal) || 0
      });
    });

    const flatPivotTable = [];
    Object.keys(pivotData).sort().forEach(p => {
      const dates = Object.keys(pivotData[p]).sort((a, b) => a.localeCompare(b));

      let projSpanCount = 0;
      dates.forEach(date => {
        projSpanCount += pivotData[p][date].length;
      });

      dates.forEach((date, dateIndex) => {
        const rowsList = pivotData[p][date];
        rowsList.forEach((row, rowIndex) => {
          flatPivotTable.push({
            Projeto: p,
            Data: date,
            Colaborador: row.Colaborador,
            Cargo: row.Cargo,
            Horas: row.Horas,
            CustoPorHora: row.CustoPorHora,
            CustoTotal: row.CustoTotal,
            isFirstOfProj: dateIndex === 0 && rowIndex === 0,
            projRowSpan: projSpanCount,
            isFirstOfDate: rowIndex === 0,
            dateRowSpan: rowsList.length
          });
        });
      });
    });

    // Paginação sobre o flatPivotTable estruturado final
    const totalRows = flatPivotTable.length;
    const paginatedRows = flatPivotTable.slice(pagination.offset, pagination.offset + pagination.pageSize);

    return {
      summary: {
        totalGeralHoras,
        totalGeralCustoTotal
      },
      rows: paginatedRows,
      filterOptions,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRows,
        totalPages: Math.ceil(totalRows / pagination.pageSize)
      }
    };
  }
}


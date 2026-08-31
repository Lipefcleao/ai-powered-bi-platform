import fs from 'fs/promises';
import path from 'path';

/**
 * Catálogo de Exemplos Canônicos (Few-Shot Examples) validados contra o MySQL.
 * Serve como "Analogia" direta para o LLM aprender a estrutura exata das queries.
 */
const FEW_SHOT_CATALOG = {
  comercial: {
    domain: 'Comercial e Vendas',
    keywords: ['venda', 'vendas', 'receita comercial', 'orçamento', 'orçamentos', 'faturamento comercial', 'comercial'],
    tables: ['servicesales', 'ServiceSalePayments', 'cashflowitems'],
    rules: [
      'BR-016: A base oficial de vendas de serviço é a tabela servicesales (para totais) e ServiceSalePayments (para parcelas).',
      'Vendas reais vs orçamentos: IsActual = 1 indica venda confirmada; IsActual = 0 indica orçamento.',
      'Sempre filtrar Total > 0 e ParentVersion_Id IS NULL para evitar duplicidade de versões de propostas.',
      'Para somar o total vendido em um ano ou período: SUM(Total) FROM servicesales WHERE IsActual = 1 AND Total > 0 AND ParentVersion_Id IS NULL AND Date >= ? AND Date <= ?'
    ],
    fewShotExamples: [
      {
        question: 'Qual o valor total de vendas realizadas no ano de 2024?',
        sql: `SELECT 
    ROUND(SUM(Total), 2) AS TotalVendas
FROM servicesales
WHERE IsActual = 1
  AND Total > 0
  AND ParentVersion_Id IS NULL
  AND Date >= '2024-01-01' 
  AND Date <= '2024-12-31';`
      },
      {
        question: 'Qual o valor total de orçamentos emitidos em 2024?',
        sql: `SELECT 
    ROUND(SUM(Total), 2) AS TotalOrcamentos
FROM servicesales
WHERE IsActual = 0
  AND Total > 0
  AND ParentVersion_Id IS NULL
  AND Date >= '2024-01-01' 
  AND Date <= '2024-12-31';`
      },
      {
        question: 'Quais foram as vendas por mês em 2024?',
        sql: `SELECT 
    DATE_FORMAT(Date, '%Y-%m') AS Mes,
    ROUND(SUM(Total), 2) AS ValorVendas
FROM servicesales
WHERE IsActual = 1
  AND Total > 0
  AND ParentVersion_Id IS NULL
  AND Date >= '2024-01-01' 
  AND Date <= '2024-12-31'
GROUP BY Mes
ORDER BY Mes ASC;`
      }
    ]
  },

  despesas: {
    domain: 'Despesas e Fornecedores',
    keywords: ['despesa', 'despesas', 'fornecedor', 'fornecedores', 'saída', 'saídas', 'gasto operacional', 'contas pagas'],
    tables: ['cashflowitems', 'Suppliers', 'bankaccounts', 'costcenters'],
    rules: [
      'BR-008 & BR-009: Despesas em cashflowitems possuem Value < 0.',
      'BR-010: Excluir transferências internas (Transfer_Id IS NULL).',
      'BR-011: Tratar quebra pai/filho excluindo pais que possuem filhos: Id NOT IN (SELECT DISTINCT Parent_Id FROM cashflowitems WHERE Parent_Id IS NOT NULL AND (Type <> 1 OR Type IS NULL)).',
      'BR-013: Status de compensação: Executed = 1 significa "Compensado" (pago), Executed = 0 significa "Não Compensado" (em aberto).',
      'Data de referência para extrato de caixa: COALESCE(Date, DueDate).'
    ],
    fewShotExamples: [
      {
        question: 'Qual o valor total de despesas compensadas (pagas) em 2024?',
        sql: `SELECT 
    ROUND(COALESCE(SUM(ABS(cfi.Value)), 0), 2) AS TotalDespesasCompensadas
FROM cashflowitems cfi
WHERE cfi.Value < 0
  AND cfi.Transfer_Id IS NULL
  AND cfi.Executed = 1
  AND COALESCE(cfi.Date, cfi.DueDate) >= '2024-01-01'
  AND COALESCE(cfi.Date, cfi.DueDate) <= '2024-12-31'
  AND cfi.Id NOT IN (
      SELECT DISTINCT Parent_Id 
      FROM cashflowitems 
      WHERE Parent_Id IS NOT NULL 
        AND (Type <> 1 OR Type IS NULL)
  );`
      },
      {
        question: 'Qual o valor total de todas as despesas (compensadas e não compensadas) em 2024?',
        sql: `SELECT 
    ROUND(COALESCE(SUM(ABS(cfi.Value)), 0), 2) AS TotalDespesasGeral
FROM cashflowitems cfi
WHERE cfi.Value < 0
  AND cfi.Transfer_Id IS NULL
  AND COALESCE(cfi.Date, cfi.DueDate) >= '2024-01-01'
  AND COALESCE(cfi.Date, cfi.DueDate) <= '2024-12-31'
  AND cfi.Id NOT IN (
      SELECT DISTINCT Parent_Id 
      FROM cashflowitems 
      WHERE Parent_Id IS NOT NULL 
        AND (Type <> 1 OR Type IS NULL)
  );`
      },
      {
        question: 'Quais são os 5 maiores fornecedores por despesa em 2024?',
        sql: `SELECT 
    COALESCE(s.Name, 'Sem fornecedor') AS Fornecedor,
    ROUND(SUM(ABS(cfi.Value)), 2) AS TotalDespesa
FROM cashflowitems cfi
LEFT JOIN Suppliers s ON cfi.Supplier_Id = s.Id
WHERE cfi.Value < 0
  AND cfi.Transfer_Id IS NULL
  AND COALESCE(cfi.Date, cfi.DueDate) >= '2024-01-01'
  AND COALESCE(cfi.Date, cfi.DueDate) <= '2024-12-31'
  AND cfi.Id NOT IN (
      SELECT DISTINCT Parent_Id 
      FROM cashflowitems 
      WHERE Parent_Id IS NOT NULL 
        AND (Type <> 1 OR Type IS NULL)
  )
GROUP BY Fornecedor
ORDER BY TotalDespesa DESC
LIMIT 5;`
      }
    ]
  },

  pessoal: {
    domain: 'Gasto com Pessoal e Salários',
    keywords: ['pessoal', 'gasto com pessoal', 'salário', 'salários', 'custo de pessoal', 'colaborador', 'colaboradores', 'folha', 'encargos'],
    tables: ['reportagem', 'membro', 'promocao', 'cargo', 'reajuste', 'encargo', 'encargo_item', 'companies'],
    rules: [
      'BR-002: Horas trabalhadas oficiais vêm de SUM(reportagem.HorasTrabalhadas).',
      'BR-003: Colaborador ativo: membro.DataDesativacao IS NULL.',
      'BR-022: Cargo vigente: promoção mais recente onde promocao.DesdeDia <= data do apontamento.',
      'Custo de pessoal é calculado através do valor da hora ou salário base do colaborador multiplicado pelas horas reportadas somado a encargos trabalhistas.'
    ],
    fewShotExamples: [
      {
        question: 'Qual o total de horas apontadas por colaborador em 2024?',
        sql: `SELECT 
    m.Nome AS Colaborador,
    ROUND(SUM(r.HorasTrabalhadas), 2) AS TotalHoras
FROM reportagem r
JOIN membro m ON r.Membro_Id = m.Id
WHERE r.Dia >= '2024-01-01' AND r.Dia <= '2024-12-31'
  AND m.DataDesativacao IS NULL
GROUP BY m.Nome
ORDER BY TotalHoras DESC;`
      },
      {
        question: 'Qual o custo total de pessoal (gasto com pessoal) em 2024?',
        sql: `SELECT 
    ROUND(SUM(r.HorasTrabalhadas * COALESCE(h.CostPerHour, rj.Valor, 20.00)), 2) AS CustoTotalPessoal
FROM reportagem r
JOIN membro m ON r.Membro_Id = m.Id
LEFT JOIN (
    SELECT MemberId, ProjectId, CostPerHour, StartDuration, EndDuration
    FROM CostSaleWorkedHoursHistory
) h ON h.MemberId = r.Membro_Id AND h.ProjectId = r.Projeto_Id
   AND r.Dia >= h.StartDuration AND (h.EndDuration IS NULL OR r.Dia <= h.EndDuration)
LEFT JOIN (
    SELECT p.Membro_Id, r.Valor
    FROM promocao p
    JOIN reajuste r ON r.Cargo_Id = p.Cargo_Id
) rj ON rj.Membro_Id = r.Membro_Id
WHERE r.Dia >= '2024-01-01' AND r.Dia <= '2024-12-31';`
      }
    ]
  },

  alocacao_horas: {
    domain: 'Alocação de Horas – Estimado x Reportado',
    keywords: ['alocação', 'estimado x reportado', 'horas estimadas', 'horas reportadas', 'esforço', 'tarefas do projeto', 'horas'],
    tables: ['tasks', 'boards', 'costcenters', 'membro', 'reportagem'],
    rules: [
      'BR-001: Projeto oficial de uma tarefa vive em boards.CostCenterId.',
      'BR-002: Horas estimadas vêm de tasks.EstimatedEffort; Horas reais vêm de SUM(reportagem.HorasTrabalhadas).',
      'CRÍTICO (PREVENÇÃO DE MULTIPLICAÇÃO): Nunca faça JOIN simples direto de 1:N entre tasks e reportagem sem pré-agregar as horas por tarefa em uma subquery/CTE!'
    ],
    fewShotExamples: [
      {
        question: 'Qual o total de horas estimadas e reportadas para o projeto BI - Teste?',
        sql: `WITH HorasPorTarefa AS (
    SELECT 
        Task_Id,
        SUM(HorasTrabalhadas) AS TotalReportado
    FROM reportagem
    WHERE Task_Id IS NOT NULL
    GROUP BY Task_Id
)
SELECT 
    c.Name AS Projeto,
    ROUND(SUM(t.EstimatedEffort), 2) AS HorasEstimadas,
    ROUND(SUM(COALESCE(h.TotalReportado, 0)), 2) AS HorasReportadas
FROM tasks t
JOIN boards b ON t.BoardId = b.Id
JOIN costcenters c ON b.CostCenterId = c.Id
LEFT JOIN HorasPorTarefa h ON h.Task_Id = t.Id
WHERE c.Name LIKE '%BI - Teste%'
  AND t.Active = 1
GROUP BY c.Name;`
      },
      {
        question: 'Qual o total de horas estimadas vs reportadas por etapa no projeto BI - Teste?',
        sql: `WITH HorasPorTarefa AS (
    SELECT 
        Task_Id,
        SUM(HorasTrabalhadas) AS TotalReportado
    FROM reportagem
    WHERE Task_Id IS NOT NULL
    GROUP BY Task_Id
)
SELECT 
    b.Name AS Etapa,
    ROUND(SUM(t.EstimatedEffort), 2) AS HorasEstimadas,
    ROUND(SUM(COALESCE(h.TotalReportado, 0)), 2) AS HorasReportadas
FROM tasks t
JOIN boards b ON t.BoardId = b.Id
JOIN costcenters c ON b.CostCenterId = c.Id
LEFT JOIN HorasPorTarefa h ON h.Task_Id = t.Id
WHERE c.Name LIKE '%BI - Teste%'
  AND t.Active = 1
GROUP BY b.Name
ORDER BY HorasEstimadas DESC;`
      }
    ]
  },

  resultado_financeiro: {
    domain: 'Resultado Financeiro (Receitas, Despesas e Margem)',
    keywords: ['resultado financeiro', 'lucro líquido', 'margem líquida', 'receitas e despesas', 'saldo financeiro', 'fluxo financeiro'],
    tables: ['cashflowitems', 'costcenters', 'clients', 'bankaccounts', 'cashflowcategories'],
    rules: [
      'BR-009: Receitas = SUM(ABS(Value)) WHERE Value > 0; Despesas = SUM(ABS(Value)) WHERE Value < 0.',
      'Resultado Líquido / Margem = Receitas - Despesas = SUM(Value).',
      'BR-010: Excluir transferências internas (Transfer_Id IS NULL).',
      'BR-011: Excluir registros pai que possuem filhos desmembrados.'
    ],
    fewShotExamples: [
      {
        question: 'Qual o resultado financeiro líquido acumulado em 2024?',
        sql: `SELECT 
    ROUND(SUM(CASE WHEN Value > 0 THEN Value ELSE 0 END), 2) AS TotalReceitas,
    ROUND(SUM(CASE WHEN Value < 0 THEN ABS(Value) ELSE 0 END), 2) AS TotalDespesas,
    ROUND(SUM(Value), 2) AS ResultadoLiquido
FROM cashflowitems
WHERE Transfer_Id IS NULL
  AND COALESCE(Date, DueDate) >= '2024-01-01'
  AND COALESCE(Date, DueDate) <= '2024-12-31'
  AND Id NOT IN (
      SELECT DISTINCT Parent_Id 
      FROM cashflowitems 
      WHERE Parent_Id IS NOT NULL 
        AND (Type <> 1 OR Type IS NULL)
  );`
      }
    ]
  },

  projetos: {
    domain: 'Projetos e Status',
    keywords: ['projeto', 'projetos', 'status do projeto', 'projetos ativos', 'quantos projetos'],
    tables: ['projeto', 'costcenters', 'membro'],
    rules: [
      'Projetos ativos: projeto.Ativo = 1.',
      'Identificador operacional: projeto.Id, Nome do projeto: projeto.Nome.'
    ],
    fewShotExamples: [
      {
        question: 'Quantos projetos estão ativos no momento?',
        sql: `SELECT COUNT(*) AS TotalProjetosAtivos
FROM projeto
WHERE Ativo = 1;`
      },
      {
        question: 'Liste os projetos ativos e suas datas de início e fim planejado.',
        sql: `SELECT 
    Nome AS Projeto,
    DATE_FORMAT(DataInicial, '%Y-%m-%d') AS DataInicio,
    DATE_FORMAT(DataFinal, '%Y-%m-%d') AS DataFim
FROM projeto
WHERE Ativo = 1
ORDER BY Nome ASC
LIMIT 50;`
      }
    ]
  }
};

export class SqlRagService {
  static knowledgeBaseContent = null;

  /**
   * Carrega a base de conhecimento semântica v2 do arquivo bi_text_to_sql_knowledge_base_v2.md
   */
  static async getKnowledgeBase() {
    if (!this.knowledgeBaseContent) {
      try {
        const kbPath = path.resolve(process.cwd(), 'bi_text_to_sql_knowledge_base_v2.md');
        this.knowledgeBaseContent = await fs.readFile(kbPath, 'utf8');
      } catch (err) {
        console.warn('[SqlRagService] Falha ao ler bi_text_to_sql_knowledge_base_v2.md:', err.message);
        this.knowledgeBaseContent = '';
      }
    }
    return this.knowledgeBaseContent;
  }

  /**
   * Identifica o domínio e intenção da pergunta do usuário para Schema Linking e Few-Shot Retrieval.
   */
  static identifyIntents(userMessage) {
    const lower = userMessage.toLowerCase();
    const matchedDomains = [];

    for (const [key, catalog] of Object.entries(FEW_SHOT_CATALOG)) {
      const matchScore = catalog.keywords.reduce((score, kw) => {
        return lower.includes(kw.toLowerCase()) ? score + 1 : score;
      }, 0);

      if (matchScore > 0) {
        matchedDomains.push({ key, catalog, score: matchScore });
      }
    }

    matchedDomains.sort((a, b) => b.score - a.score);

    // Se nenhum domínio específico casar, entrega Comercial + Despesas + Alocação como contexto padrão
    if (matchedDomains.length === 0) {
      return [
        { key: 'alocacao_horas', catalog: FEW_SHOT_CATALOG.alocacao_horas },
        { key: 'comercial', catalog: FEW_SHOT_CATALOG.comercial },
        { key: 'despesas', catalog: FEW_SHOT_CATALOG.despesas }
      ];
    }

    return matchedDomains.slice(0, 2);
  }

  /**
   * Constrói o Prompt In-Context com Analogias (Few-Shot Examples), Regras de Negócio e Restrições.
   */
  static async buildTargetedSystemPrompt(userMessage) {
    const matched = this.identifyIntents(userMessage);
    const kb = await this.getKnowledgeBase();

    let fewShotSection = '';
    let rulesSection = '';
    let tablesSection = new Set();

    matched.forEach(({ catalog }) => {
      catalog.tables.forEach(t => tablesSection.add(t));
      catalog.rules.forEach(r => { rulesSection += `  - ${r}\n`; });

      catalog.fewShotExamples.forEach(ex => {
        fewShotSection += `
  Pergunta: "${ex.question}"
  SQL de Analogia Validado:
  ${ex.sql}
`;
      });
    });

    const prompt = `
Você é um especialista em banco de dados MySQL e Engenheiro de Analytics/BI Senior.

SUA MISSÃO:
Converter a pergunta em linguagem natural do usuário em uma consulta SQL MySQL (somente SELECT) perfeitamente otimizada, precisa e aderente às regras oficiais do negócio.

REGRAS TÉCNICAS INVIOLÁVEIS (SQL):
1. SOMENTE SELECT: Gere apenas instruções SELECT puras. Nunca gere INSERT, UPDATE, DELETE, DROP, CREATE, etc.
2. RETORNE APENAS O CÓDIGO SQL: Sem explicações, sem texto introdutório, sem tags markdown (apenas SQL puro).
3. ARREDONDAMENTO: Use SEMPRE ROUND(valor, 2) em métricas e somas financeiras e de horas.
4. NOMES DE TABELAS E COLUNAS (CASE-SENSITIVE):
   - 'projeto' (Id, Nome, Ativo, DataInicial, DataFinal)
   - 'costcenters' (Id, Name, Active)
   - 'boards' (Id, Name, CostCenterId, Active)
   - 'tasks' (Id, Title, EstimatedEffort, BoardId, Active, UserId)
   - 'reportagem' (Id, HorasTrabalhadas, Dia, Task_Id, Projeto_Id, Membro_Id)
   - 'membro' (Id, Nome, DataDesativacao)
   - 'servicesales' (Id, Total, IsActual, Date, ParentVersion_Id)
   - 'cashflowitems' (Id, Value, Executed, Date, DueDate, CompetenceDate, Transfer_Id, Supplier_Id, CostCenter_Id, Parent_Id)
   - 'Suppliers' (Id, Name, Active)
   - 'bankaccounts' (Id, Name, Active)
5. COLABORADORES ATIVOS: Sempre use 'membro.DataDesativacao IS NULL' a menos que peçam inativos.
6. PREVENÇÃO DE MULTIPLICAÇÃO (1:N):
   - Ao cruzar tasks (estimativas) com reportagem (horas reais), NUNCA faça JOIN simples direto. Agrupe as horas de reportagem por Task_Id em uma CTE ou subquery primeiro.
7. FILTROS DE TEXTO: Para busca por nome de projeto ou membro, prefira LIKE '%Nome%' com COLLATE utf8mb4_0900_ai_ci.
8. CONSULTAS AGREGADAS GLOBAIS: Se a pergunta for sobre totais anuais/globais (ex: "Qual o total de vendas em 2024?"), calcule o SUM() diretamente sobre as tabelas autorizadas correspondentes SEM exigir que o usuário especifique um projeto!

REGRAS DE NEGÓCIO OFICIAIS DO DOMÍNIO IDENTIFICADO:
${rulesSection}

============================================================
EXEMPLOS DE CONSULTAS VALIDADAS PARA USAR COMO ANALOGIA (FEW-SHOT):
============================================================
${fewShotSection}

============================================================
BASE DE CONHECIMENTO COMPLETA (ONTOLOGIA RAG V2):
============================================================
${kb.slice(0, 18000)}
`;

    return prompt;
  }
}

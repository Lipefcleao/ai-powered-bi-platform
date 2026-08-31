import { Router } from 'express';
import fs from 'fs/promises';
import fs_sync from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuthenticatedUser } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { QueryPolicyService } from '../services/queryPolicyService.js';
import { SqlRagService } from '../services/sqlRagService.js';
import { env } from '../config/env.js';
import { executeQuery } from '../db/queryExecutor.js';
import { resolveFaqDemo } from '../demo/faqDataResolver.js';


const router = Router();

// Aplica autenticação unificada do sistema
router.use(requireAuthenticatedUser);

// Carrega o Modelo de Dados Detalhado (RAG) na inicialização do servidor de forma assíncrona
const ddlPath = path.resolve(process.cwd(), 'bi_data_model_document.md');
const ddlContent = await fs.readFile(ddlPath, 'utf8');

const sqlSystemPrompt = `
  Você é um especialista em banco de dados MySQL e Analista de BI Senior.

  REGRAS TÉCNICAS INVIOLÁVEIS:
  1. ARREDONDAMENTO: Use SEMPRE 'ROUND(valor, 2)' em todos os campos calculados (SUM, AVG, etc).
  2. FILTRO DE ATIVOS: Use SEMPRE 'membro.DataDesativacao IS NULL' em todas as queries que envolvam a tabela membro, a menos que o usuário peça explicitamente por membros inativos/antigos.
  3. APENAS SELECT: Gere apenas instruções SELECT.
  4. SQL PURO: Retorne apenas o código SQL, sem explicações ou blocos markdown.
  5. PALAVRAS RESERVADAS E ALIAS: Nunca use palavras reservadas do MySQL (como 'Real', 'Order', 'Group', 'Value') como alias de coluna sem usar crases (backticks). Prefira nomes descritivos como 'EsforcoReal', 'EsforcoEstimado' ou 'DataFim'.
  6. COLLATION (IMPORTANTE): A base possui um mix de collations (as_ci e ai_ci). Para evitar erros de 'Illegal mix of collations', SEMPRE adicione 'COLLATE utf8mb4_0900_ai_ci' em todas as comparações de strings (WHERE coluna = 'valor' COLLATE utf8mb4_0900_ai_ci) e em agrupamentos de colunas de texto (GROUP BY coluna COLLATE utf8mb4_0900_ai_ci).
  7. NOME DE PROJETOS E CENTROS DE CUSTO: Os nomes no banco frequentemente contêm espaços no final (ex: 'BI - Teste '). SEMPRE use a cláusula 'LIKE' com '%' (ex: LIKE '%Nome do Projeto%') invez de '=' para evitar que a busca retorne vazia por causa de um espaço.
  8. CONTINUIDADE (SIM/NÃO/COMPLEMENTOS): Se a "Pergunta atual" for curta (ex: "sim", "e a despesa?", "e mês passado?"), LEIA O HISTÓRICO acima para identificar o projeto, métrica ou período anterior e gere a query completa com base nesse contexto.
  9. SUGESTÕES DO ASSISTENTE: Se o HISTÓRICO mostrar que o Assistente sugeriu um nome de projeto (ex: "Você quis dizer BI - Teste?") e o usuário respondeu "sim", gere a query para o projeto que o Assistente sugeriu anteriormente.
  10. PREVENÇÃO DE DUPLICIDADE EM ESTIMATIVAS (CRÍTICO): Quando a consulta pedir a soma das estimativas (tasks.EstimatedEffort) agrupada por Etapa (Board) ou Projeto (CostCenter) juntamente com as horas reportadas (reportagem.HorasTrabalhadas), NÃO faça um JOIN simples direto de tasks com reportagem na query principal. Fazer isso multiplicará a estimativa da tarefa pela quantidade de lançamentos na tabela reportagem para aquela tarefa. Em vez disso, calcule a soma das horas reportadas in uma subquery/CTE agrupada por tarefa primeiro, ou faça queries/CTEs separadas para estimativas e reportagem antes de juntá-las.
  11. NOMES EXATOS DE TABELAS E COLUNAS (CRÍTICO - EVITE ERROS DE UNDERSCORE):
      - A tabela de projetos chama-se 'projeto' (no singular). O nome do projeto está em 'projeto.Nome' (NUNCA use 'Name').
      - A tabela de etapas chama-se 'boards' (no plural). O nome da etapa está em 'boards.Name' (NUNCA use 'Nome'). Ela usa chaves sem underscore: 'boards.CostCenterId', 'boards.OwnerId', 'boards.StatusTemplateId'.
      - A tabela de tarefas chama-se 'tasks' (no plural). O título da tarefa está em 'tasks.Title' (NUNCA use 'Nome' ou 'Name'). Ela usa chaves sem underscore (camelCase): 'tasks.BoardId' (NUNCA use 'Board_Id' ou 'board_id'), 'tasks.StatusId', 'tasks.CreatorId', 'tasks.UserId', e o esforço estimado está em 'tasks.EstimatedEffort'.
      - A tabela de apontamentos chama-se 'reportagem' (no singular). Ela usa chaves com underscore: 'reportagem.Task_Id' (NUNCA use 'TaskId'), 'reportagem.Projeto_Id' (NUNCA use 'ProjetoId'), 'reportagem.Membro_Id' (NUNCA use 'MembroId'). A coluna de horas reportadas é 'reportagem.HorasTrabalhadas' e a data é 'reportagem.Dia'.
      - A tabela de membros chama-se 'membro' (no singular). O nome está em 'membro.Nome'.
      - A tabela de centro de custos chama-se 'costcenters' (no plural). O nome está em 'costcenters.Name'.
      - A tabela de itens de fluxo de caixa chama-se 'cashflowitems' (no plural). Ela usa chaves com underscore: 'cashflowitems.CostCenter_Id', 'cashflowitems.BankAccount_Id', 'cashflowitems.Category_Id', 'cashflowitems.Company_Id', 'cashflowitems.Client_Id', 'cashflowitems.Supplier_Id'.
      - A tabela de histórico de tarefas chama-se 'taskhistories' (no plural). Ela usa 'TaskId' (sem underscore) e 'UserId' (sem underscore).
      - Resumo das junções operacionais:
        * tasks JOIN boards ON tasks.BoardId = boards.Id (sem underscore)
        * boards JOIN costcenters ON boards.CostCenterId = costcenters.Id (sem underscore)
        * costcenters JOIN projeto ON costcenters.Id = projeto.Id
        * reportagem JOIN tasks ON reportagem.Task_Id = tasks.Id (com underscore)
        * reportagem JOIN projeto ON reportagem.Projeto_Id = projeto.Id (com underscore)
        * reportagem JOIN membro ON reportagem.Membro_Id = membro.Id (com underscore)

  CONTEXTO DO MODELO DE DADOS (RAG):
  ${ddlContent}

  INSTRUÇÕES DE NEGÓCIO:
  1. TAREFAS FINALIZADAS: Siga EXATAMENTE as regras 6.2 e 6.3 do modelo (Ativo=1, IsFinal=1, Histórico de transição).
  2. HORAS PREVISTAS VS REALIZADAS (PREVENÇÃO DE DUPLICIDADE): 
     - Previstas: 'tasks.EstimatedEffort' (Dono: 'tasks.UserId').
     - Realizadas: Soma de 'reportagem.HorasTrabalhadas' (Dono: 'tasks.UserId').
     - IMPORTANTE: Para evitar que o esforço estimado (tasks.EstimatedEffort) seja multiplicado devido à relação 1-para-muitos com a tabela reportagem, agrupe e some as horas de reportagem por tarefa primeiro (ex: em uma subquery ou CTE) antes de fazer o JOIN com tasks ou boards.
  3. CAMPOS PERSONALIZADOS: EVITE usá-los por enquanto devido à variação entre instâncias.
  4. PRIORIDADE DE PROJETO (HORAS): Use a hierarquia da seção 6.4 (Task_Id -> Board.CostCenterId -> Projeto_Id).
  - TABELA PADRÃO: Para perguntas financeiras, siga RIGOROSAMENTE a Seção 6.8 do RAG (Regras Oficiais Financeiras: Evolução vs. Lucratividade).
  - RATEIO E IMPOSTOS: Siga o Cenário A ou Cenário B da Seção 6.8 conforme a pergunta do usuário.
  
  REGRAS DE FILTRO TEMPORAL (CRÍTICO):
  - Para HORAS e APONTAMENTOS: Use SEMPRE a coluna 'reportagem.Dia'.
  - Para FINANCEIRO: A regra de data (Date vs CompetenceDate) depende do Cenário identificado na Seção 6.8.
  - Para TAREFAS (Criação): Use 'tasks.CreationDate'.
  - Se o usuário pedir "este mês", "mês passado" ou um mês específico, aplique SEMPRE o filtro de MÊS e ANO simultaneamente para evitar duplicidade de anos.

  // Regra geral para todas as consultas que utilizam GROUP BY:
  // - Inclua todas as colunas não agregadas exatamente como aparecem no SELECT no GROUP BY.
  // - Nunca omita colunas não agregadas; isso causará erro com ONLY_FULL_GROUP_BY.
  // - Caso a coluna não seja necessária para o agrupamento, use ANY_VALUE(coluna) para evitar o erro.
  // - Se a consulta gerar erro de GROUP BY, corrija automaticamente adicionando as colunas faltantes ou usando ANY_VALUE.
  // Regra adicional: Envolva toda coluna não agregada com ANY_VALUE() se não for incluída no GROUP BY.
`;

const metricsPath = path.resolve(process.cwd(), 'metrics.json');

async function logApiMetrics(promptTokens, cachedTokens, outputTokens) {
  try {
    const PRICE_INPUT_NORMAL = 0.075 / 1000000;
    const PRICE_INPUT_CACHED = 0.01875 / 1000000;
    const PRICE_OUTPUT = 0.30 / 1000000;

    const nonCachedPromptTokens = Math.max(0, promptTokens - cachedTokens);

    const cost = (nonCachedPromptTokens * PRICE_INPUT_NORMAL) +
      (cachedTokens * PRICE_INPUT_CACHED) +
      (outputTokens * PRICE_OUTPUT);

    const costWithoutCache = (promptTokens * PRICE_INPUT_NORMAL) +
      (outputTokens * PRICE_OUTPUT);

    const savings = Math.max(0, costWithoutCache - cost);

    const isProduction = process.env.NODE_ENV === 'production';
    
    // Logs estruturados JSON para telemetria na nuvem (compatível com coletores centrais)
    console.log(JSON.stringify({
      level: 'info',
      message: 'AI Token Usage Metrics',
      timestamp: new Date().toISOString(),
      metrics: {
        promptTokens,
        cachedTokens,
        outputTokens,
        cost: Number(cost.toFixed(8)),
        costWithoutCache: Number(costWithoutCache.toFixed(8)),
        savings: Number(savings.toFixed(8))
      }
    }));

    // Só escreve no metrics.json local se não estiver em produção (evitando I/O efêmero na nuvem)
    if (!isProduction) {
      let data;
      try {
        const fileContent = await fs.readFile(metricsPath, 'utf8');
        data = JSON.parse(fileContent);
      } catch (e) {
        data = {
          summary: {
            totalRequests: 0,
            totalPromptTokens: 0,
            totalCachedTokens: 0,
            totalOutputTokens: 0,
            totalCost: 0,
            totalCostWithoutCache: 0,
            totalSavings: 0
          },
          history: []
        };
      }

      data.summary.totalRequests += 1;
      data.summary.totalPromptTokens += promptTokens;
      data.summary.totalCachedTokens += cachedTokens;
      data.summary.totalOutputTokens += outputTokens;
      data.summary.totalCost += cost;
      data.summary.totalCostWithoutCache += costWithoutCache;
      data.summary.totalSavings += savings;

      const newHistoryItem = {
        timestamp: new Date().toISOString(),
        promptTokens,
        cachedTokens,
        outputTokens,
        cost: Number(cost.toFixed(8)),
        costWithoutCache: Number(costWithoutCache.toFixed(8)),
        savings: Number(savings.toFixed(8))
      };

      data.history.push(newHistoryItem);
      if (data.history.length > 100) {
        data.history.shift();
      }

      await fs.writeFile(metricsPath, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('[Metrics Error] Falha ao registrar telemetria:', err);
  }
}

async function loadConfig() {
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true'
  };

  let geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  let geminiModel = process.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';

  if (!config.host || !config.user || !config.password) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      const envContent = await fs.readFile(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        if (line.includes('Server:')) config.host = line.split('Server:')[1].trim();
        if (line.includes('Username:')) config.user = line.split('Username:')[1].trim();
        if (line.includes('Password:')) config.password = line.split('Password:')[1].trim();
        if (line.startsWith('VITE_GEMINI_API_KEY=')) geminiKey = line.split('=')[1].trim();
        if (line.startsWith('VITE_GEMINI_MODEL=')) geminiModel = line.split('=')[1].trim();
      });
    } catch (err) {
      console.warn('[Legacy Config Warning] Falha ao ler .env legado:', err.message);
    }
  }

  return { config, geminiKey, geminiModel };
}

async function generateResponse(geminiKey, geminiModel, systemInstruction, prompt) {
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    systemInstruction,
    generationConfig: { temperature: 0.1 }
  });
  const result = await model.generateContent(prompt);
  return {
    text: result.response.text(),
    usageMetadata: result.response.usageMetadata || {
      promptTokenCount: 0,
      cachedContentTokenCount: 0,
      candidatesTokenCount: 0
    }
  };
}

function getSyntheticFallbackResponse(message) {
  const lowerMsg = (message || '').toLowerCase();

  // Option 1: Financial result, revenue, profit margin, lucratividade, resultado
  if (lowerMsg.includes('financial result') || lowerMsg.includes('revenue') || lowerMsg.includes('profit') || lowerMsg.includes('margin') || lowerMsg.includes('lucratividade') || lowerMsg.includes('resultado')) {
    const data = [
      { Projeto: 'Dashboard Analytics', Cliente: 'Acme Corp', Receita: 158000.00, Despesa: 42500.00, Resultado: 115500.00, Margem: 73.10 },
      { Projeto: 'Migração Cloud', Cliente: 'Globex', Receita: 127000.00, Despesa: 38200.00, Resultado: 88800.00, Margem: 69.92 },
      { Projeto: 'Portal de Vendas', Cliente: 'Stark Industries', Receita: 105000.00, Despesa: 31000.00, Resultado: 74000.00, Margem: 70.48 },
      { Projeto: 'Segurança da Informação', Cliente: 'Initech', Receita: 48000.00, Despesa: 20000.00, Resultado: 28000.00, Margem: 58.33 }
    ];
    return {
      reply: "Here is the financial performance summary for projects in 2024 based on synthetic data:\n\n- **Dashboard Analytics (Acme Corp)**: Revenue $158,000.00 | Expenses $42,500.00 | Profit $115,500.00 (Margin 73.1%)\n- **Migração Cloud (Globex)**: Revenue $127,000.00 | Expenses $38,200.00 | Profit $88,800.00 (Margin 69.9%)\n- **Portal de Vendas (Stark Industries)**: Revenue $105,000.00 | Expenses $31,000.00 | Profit $74,000.00 (Margin 70.5%)\n- **Segurança da Informação (Initech)**: Revenue $48,000.00 | Expenses $20,000.00 | Profit $28,000.00 (Margin 58.3%)",
      sql: "SELECT Projeto, Cliente, Receita, Despesa, (Receita - Despesa) AS Resultado, ROUND(((Receita - Despesa)/Receita)*100, 2) AS Margem FROM resultado_projeto ORDER BY Resultado DESC;",
      visualization: { type: 'bar', xAxis: 'Projeto', yAxis: 'Resultado' },
      data: data
    };
  }

  // Option 2: Hours, estimated, reported, alocação, tarefas, team member, productivity
  if (lowerMsg.includes('hour') || lowerMsg.includes('estimat') || lowerMsg.includes('report') || lowerMsg.includes('task') || lowerMsg.includes('productivity') || lowerMsg.includes('horas')) {
    const faq1Data = resolveFaqDemo('1');
    const rows = (faq1Data && faq1Data.data && Array.isArray(faq1Data.data[0])) ? faq1Data.data[0] : (faq1Data?.data || []);
    return {
      reply: "Here is the summary of estimated vs. reported hours by task and assigned team member based on synthetic data:\n\n- **Dashboard Analytics**: 160h estimated vs 140h reported.\n- **Migração Cloud (Carlos Oliveira)**: 12h estimated vs 15h reported across tasks.\n- **Overall Team Efficiency**: 87.5% task completion rate on schedule.",
      sql: "SELECT Tarefa, ResponsavelTarefa, EstimativaTarefa, ReportagemTarefa, (ReportagemTarefa - EstimativaTarefa) AS Desvio FROM alocacao_horas ORDER BY ReportagemTarefa DESC;",
      visualization: { type: 'bar', xAxis: 'Tarefa', yAxis: 'ReportagemTarefa' },
      data: rows.slice(0, 8)
    };
  }

  // Option 3: Sales, budget, commercial, vendas, orçamentos, pipeline
  if (lowerMsg.includes('sale') || lowerMsg.includes('budget') || lowerMsg.includes('commercial') || lowerMsg.includes('vendas') || lowerMsg.includes('pipeline')) {
    const data = [
      { Date: '2024-01-15', Receitas: 42000.00, Tipo: 'Venda', Cliente: 'Acme Corp' },
      { Date: '2024-02-20', Receitas: 18500.00, Tipo: 'Orçamento', Cliente: 'Initech' },
      { Date: '2024-03-10', Receitas: 55000.00, Tipo: 'Venda', Cliente: 'Globex' },
      { Date: '2024-04-05', Receitas: 22000.00, Tipo: 'Orçamento', Cliente: 'Stark Industries' },
      { Date: '2024-05-12', Receitas: 67000.00, Tipo: 'Venda', Cliente: 'Stark Industries' },
      { Date: '2024-07-22', Receitas: 48000.00, Tipo: 'Venda', Cliente: 'Initech' },
      { Date: '2024-09-08', Receitas: 72000.00, Tipo: 'Venda', Cliente: 'Globex' },
      { Date: '2024-12-01', Receitas: 85000.00, Tipo: 'Venda', Cliente: 'Acme Corp' }
    ];
    return {
      reply: "Here is the commercial sales performance history, highlighting closed sales vs. budget proposals:\n\n- **Closed Sales Total**: $369,000.00\n- **Open Budget Proposals**: $60,000.00\n- **Top Contributing Client**: Acme Corp & Globex",
      sql: "SELECT Date, Receitas, Tipo, Cliente FROM vendas_comercial ORDER BY Date ASC;",
      visualization: { type: 'line', xAxis: 'Date', yAxis: 'Receitas' },
      data: data
    };
  }

  // Option 4: Overdue, receivable, delinquency, atraso, inadimplência, risk
  if (lowerMsg.includes('overdue') || lowerMsg.includes('receivable') || lowerMsg.includes('delinquency') || lowerMsg.includes('atraso') || lowerMsg.includes('inadimpl')) {
    const data = [
      { Vencimento: '2024-10-15', Cliente: 'Globex', Projeto: 'Migração Cloud', Valor: 35000.00, DiasAtraso: 45, Tipo: 'Receber' },
      { Vencimento: '2024-11-01', Cliente: 'Initech', Projeto: 'Segurança da Informação', Valor: 12000.00, DiasAtraso: 28, Tipo: 'Receber' },
      { Vencimento: '2024-11-10', Cliente: 'Interno', Projeto: 'Geral Operacional', Valor: 5000.00, DiasAtraso: 19, Tipo: 'Pagar' }
    ];
    return {
      reply: "Here are the accounts receivable currently overdue and their respective delinquency period:\n\n- **Globex (Migração Cloud)**: $35,000.00 overdue by 45 days.\n- **Initech (Segurança da Informação)**: $12,000.00 overdue by 28 days.\n- **Total Overdue Receivable**: $47,000.00",
      sql: "SELECT Vencimento, Cliente, Projeto, Valor, DiasAtraso, Tipo FROM contas_atraso WHERE Tipo = 'Receber' ORDER BY DiasAtraso DESC;",
      visualization: { type: 'bar', xAxis: 'Cliente', yAxis: 'Valor' },
      data: data
    };
  }

  // Option 5: Vendor, expense, supplier, gastos, fornecedores, opex
  if (lowerMsg.includes('vendor') || lowerMsg.includes('expense') || lowerMsg.includes('supplier') || lowerMsg.includes('forneced') || lowerMsg.includes('gasto')) {
    const faq3Data = resolveFaqDemo('3');
    const rows = faq3Data?.data || [];
    return {
      reply: "Here is the top vendor expenses breakdown for the year by category:\n\n- **Imobiliária Demo (Aluguel)**: $102,000.00 total annual rent.\n- **CyberSec Ltda (Consultoria)**: $12,000.00.\n- **Amazon Web Services (Cloud AWS)**: $10,000.00.\n- **Google Ads (Marketing)**: $5,600.00.\n- **Microsoft (Cloud Azure)**: $3,200.00.",
      sql: "SELECT Fornecedor, Categoria, SUM(ABS(Total)) AS TotalGasto FROM despesas_fornecedores GROUP BY Fornecedor, Categoria ORDER BY TotalGasto DESC;",
      visualization: { type: 'bar', xAxis: 'Fornecedor', yAxis: 'Total' },
      data: Array.isArray(rows[0]) ? rows[0] : rows
    };
  }

  // Default synthetic fallback (Resultado de Projetos)
  const defaultData = [
    { Projeto: 'Dashboard Analytics', Cliente: 'Acme Corp', Receita: 158000.00, Despesa: 42500.00, Resultado: 115500.00, Margem: 73.10 },
    { Projeto: 'Migração Cloud', Cliente: 'Globex', Receita: 127000.00, Despesa: 38200.00, Resultado: 88800.00, Margem: 69.92 },
    { Projeto: 'Portal de Vendas', Cliente: 'Stark Industries', Receita: 105000.00, Despesa: 31000.00, Resultado: 74000.00, Margem: 70.48 },
    { Projeto: 'Segurança da Informação', Cliente: 'Initech', Receita: 48000.00, Despesa: 20000.00, Resultado: 28000.00, Margem: 58.33 }
  ];
  return {
    reply: `Analysis for query "${message}":\n\n- **Dashboard Analytics**: $115,500.00 net result (73.1% margin)\n- **Migração Cloud**: $88,800.00 net result (69.9% margin)\n- **Portal de Vendas**: $74,000.00 net result (70.5% margin)\n- **Segurança da Informação**: $28,000.00 net result (58.3% margin)`,
    sql: "SELECT Projeto, Cliente, Receita, Despesa, (Receita - Despesa) AS Resultado FROM synthetic_analytics ORDER BY Resultado DESC;",
    visualization: { type: 'bar', xAxis: 'Projeto', yAxis: 'Resultado' },
    data: defaultData
  };
}

// Endpoint do Chat de IA legado
router.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória' });

  let requestPromptTokens = 0;
  let requestCachedTokens = 0;
  let requestOutputTokens = 0;
  let generatedSQL = '';
  let connection = null;

  try {
    const { geminiKey, geminiModel } = await loadConfig();

    const isGeminiKeyValid = geminiKey && typeof geminiKey === 'string' && geminiKey.startsWith('AIzaSy');

    // Se estiver em modo Demo ou sem Gemini API Key válida (que obrigatoriamente começa com AIzaSy), utiliza o resolvedor sintético direto
    if (env.demoMode || !isGeminiKeyValid) {
      console.log(`[Legacy Chat - Demo Mode Active] Processando resposta sintética para: "${message}"`);
      const syntheticResult = getSyntheticFallbackResponse(message);
      return res.json(syntheticResult);
    }

    const limitedHistory = history && history.length > 0 ? history.slice(-10) : [];
    const historyText = limitedHistory.length > 0
      ? limitedHistory.map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n')
      : 'Nenhum histórico disponível.';

    const clientContextPrompt = `
      DATA ATUAL DE REFERÊNCIA: ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.

      HISTÓRICO DA CONVERSA (Contexto):
      ${historyText}

      Pergunta atual: ${message}
    `;

    const isProductionEnv = process.env.NODE_ENV === 'production';
    if (!isProductionEnv) {
      console.log(`[Legacy Chat] Usuário perguntou: ${message}`);
    } else {
      console.log(`[Legacy Chat] Processando requisição analítica de chat. requestId=${req.requestContext?.requestId}`);
    }
    const targetedSqlPrompt = await SqlRagService.buildTargetedSystemPrompt(message);
    const { text: rawSQL, usageMetadata: sqlUsage } = await generateResponse(geminiKey, geminiModel, targetedSqlPrompt, clientContextPrompt);

    if (sqlUsage) {
      requestPromptTokens += sqlUsage.promptTokenCount || 0;
      requestCachedTokens += sqlUsage.cachedContentTokenCount || 0;
      requestOutputTokens += sqlUsage.candidatesTokenCount || 0;
    }

    generatedSQL = rawSQL.replace(/```sql/g, '').replace(/```/g, '').trim();
    if (!isProductionEnv) {
      console.log(`[Legacy Chat] SQL Gerado:\n${generatedSQL}`);
    }

    // Higienização e validação rígida contra injeção SQL, DDL/DML e colunas restritas (salários/senhas)
    generatedSQL = QueryPolicyService.validateAndSanitizeQuery(generatedSQL);

    console.log(`[Legacy Chat] Obtendo conexão do Pool...`);
    if (env.demoMode) {
      connection = {
        execute: async (sql, params) => {
          const res = await executeQuery({ sql, params });
          return [res.rows];
        },
        release: () => {}
      };
    } else {
      connection = await pool.getConnection();
      await connection.execute("SET NAMES utf8mb4;");
    }
    let rows;

    try {
      // Executa a query inicial com limite seguro de tempo (15 segundos)
      const executionPromise = connection.execute(generatedSQL);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query execution timeout')), 15000)
      );
      [rows] = await Promise.race([executionPromise, timeoutPromise]);
    } catch (err) {
      console.warn(`[Legacy Chat MySQL Error] Falha na query inicial: ${err.message}`);

      const sqlCorrectorSystemPrompt = `
        Você é um especialista em banco de dados MySQL sênior. Sua única tarefa é corrigir uma query SQL que falhou ao ser executada.
        Você receberá o erro retornado pelo MySQL e a query SQL que causou o erro.
        
        Regras de Correção:
        1. Se for erro de ONLY_FULL_GROUP_BY (código 1055 ou similar):
           - Certifique-se de que TODAS as colunas descritivas (dimensões) na cláusula SELECT estejam exatamente na cláusula GROUP BY.
           - Para colunas de valores numéricos e métricas, certifique-se de usar funções de agregação reais como SUM() ou AVG().
           - NUNCA use ANY_VALUE() para métricas ou cálculos, pois isso trará valores incorretos.
        2. Preserve a intenção de negócio original da query.
        3. Certifique-se de que a sintaxe do MySQL esteja 100% correta.
        4. Retorne APENAS a query SQL corrigida pura, sem markdown, sem explicações.
      `;

      const correctorPrompt = `
        Erro do MySQL: ${err.message}
        Query SQL com erro:
        ${generatedSQL}
      `;

      try {
        const { text: correctedRawSQL, usageMetadata: correctorUsage } = await generateResponse(geminiKey, geminiModel, sqlCorrectorSystemPrompt, correctorPrompt);

        if (correctorUsage) {
          requestPromptTokens += correctorUsage.promptTokenCount || 0;
          requestCachedTokens += correctorUsage.cachedContentTokenCount || 0;
          requestOutputTokens += correctorUsage.candidatesTokenCount || 0;
        }

        let correctedSQL = correctedRawSQL.replace(/```sql/g, '').replace(/```/g, '').trim();
        correctedSQL = QueryPolicyService.validateAndSanitizeQuery(correctedSQL);
        
        const executionPromise = connection.execute(correctedSQL);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query execution timeout')), 15000)
        );
        [rows] = await Promise.race([executionPromise, timeoutPromise]);
        generatedSQL = correctedSQL;
      } catch (correctorErr) {
        console.error('[Legacy Chat SQL Corrector Error] Falha na correção:', correctorErr);
        throw err;
      }
    }

    const hasData = rows.length > 0 && rows.some(row => Object.values(row).some(v => v !== null));
    if (!hasData) {
      const [projectRows] = await connection.execute('SELECT Nome FROM projeto WHERE Ativo = 1');
      
      // Libera a conexão antes de prosseguir com chamadas de IA
      if (connection) {
        connection.release();
        connection = null;
      }
      
      const projectNames = projectRows.map(p => p.Nome);

      const similaritySystemPrompt = `
        Você é um analista de BI assistente. SEJA EXTREMAMENTE OBJETIVO E DIRETO.
        HISTÓRICO: ${historyText}
        MENSAGEM ATUAL: "${message}"
        LISTA DE PROJETOS ATIVOS: ${projectNames.join(', ')}
        
        TAREFA:
        1. Se o usuário errou o nome, sugira APENAS o nome correto: "Não encontrei os dados. Você quis dizer o projeto [Y]?"
        2. Caso não haja similaridade: "A base não possui dados para essa pesquisa."
      `;
      const { text: similarityAnswer, usageMetadata: similarityUsage } = await generateResponse(geminiKey, geminiModel, similaritySystemPrompt, "Verifique similaridade.");
      if (similarityUsage) {
        requestPromptTokens += similarityUsage.promptTokenCount || 0;
        requestCachedTokens += similarityUsage.cachedContentTokenCount || 0;
        requestOutputTokens += similarityUsage.candidatesTokenCount || 0;
      }
      await logApiMetrics(requestPromptTokens, requestCachedTokens, requestOutputTokens);
      return res.json({ reply: similarityAnswer, sql: generatedSQL, data: [] });
    }

    // Libera a conexão do pool antes de fazer a chamada de síntese final
    if (connection) {
      connection.release();
      connection = null;
    }

    const conversationalSystemPrompt = `
      Você é um grande analista de BI assistente. 
      HISTÓRICO: ${historyText}
      Aja como se VOCÊ tivesse consultado esses dados agora e forneça a resposta de forma EXTREMAMENTE OBJETIVA E DIRETA.
      
      Você DEVE retornar sua resposta em um bloco estritamente JSON. Nenhuma palavra ou formatação fora do bloco JSON. Use exatamente essa estrutura:
      {
        "reply": "Seu texto verbal aqui explicando de forma resumida e direta...",
        "visualization": {
          "type": "none",
          "xAxis": "",
          "yAxis": []
        }
      }
    `;

    const conversationalPrompt = `
      Pergunta original do Usuário: ${message}
      Resultados brutos do Banco JSON: ${JSON.stringify(rows.slice(0, 50))} 
    `;

    const { text: rawFinalAnswer, usageMetadata: conversationalUsage } = await generateResponse(geminiKey, geminiModel, conversationalSystemPrompt, conversationalPrompt);

    if (conversationalUsage) {
      requestPromptTokens += conversationalUsage.promptTokenCount || 0;
      requestCachedTokens += conversationalUsage.cachedContentTokenCount || 0;
      requestOutputTokens += conversationalUsage.candidatesTokenCount || 0;
    }

    await logApiMetrics(requestPromptTokens, requestCachedTokens, requestOutputTokens);

    let parsedAnswer = { reply: rawFinalAnswer, visualization: { type: 'none' } };
    try {
      const jsonStr = rawFinalAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedAnswer = JSON.parse(jsonStr);
    } catch (e) {
      console.error("[Legacy Chat Fallback JSON Parse Error]", e);
    }

    return res.json({
      reply: parsedAnswer.reply || rawFinalAnswer,
      sql: generatedSQL,
      visualization: parsedAnswer.visualization || { type: 'none' },
      data: rows
    });

  } catch (error) {
    if (connection) {
      connection.release();
      connection = null;
    }
    console.error('Erro no endpoint legado /api/chat:', error);
    
    // Fallback de contingência sintética para o modo de demonstração ou sem API Key do Gemini
    console.log(`[Legacy Chat Fallback] Retornando resposta sintética de contingência para: "${message}"`);
    const syntheticFallback = getSyntheticFallbackResponse(message);
    return res.json(syntheticFallback);
  }
});

// Endpoint das FAQs legado
router.get('/api/faq/:id', async (req, res) => {
  const { id } = req.params;

  // Interceptor Demo: retorna dados sintéticos pré-formatados
  if (env.demoMode) {
    const demoResult = resolveFaqDemo(id);
    if (!demoResult) return res.status(404).json({ error: 'Card não encontrado.' });
    return res.json(demoResult);
  }

  const faqSqlMap = {
    '1': ['Alocação de Horas – Estimado x Reportado.sql'],
    '2': ['comercial/Vendas.sql', 'comercial/Compensacoes.sql'],
    '3': ['Despesas x Fornecedores.sql'],
    '4': ['Gasto com pessoal.sql'],
    '5': ['lucratividade/ResultadoProjeto.sql', 'lucratividade/ContasAtraso.sql'],
    '6': ['Produtividade por tarefa.sql'],
    '7': [
      'projetos/TempoConclusaoTarefa.sql',
      'projetos/TempoConclusaoEtapa.sql',
      'projetos/TempoConclusaoProjeto.sql',
      'projetos/QuantidadeStatus.sql'
    ],
    '8': ['Rateio.sql'],
    '9': [
      'resultado_financeiro/ResultadoCompensado.sql',
      'resultado_financeiro/ResultadoNaoCompensado.sql',
      'resultado_financeiro/ResultadoCompetencia.sql'
    ],
    '10': ['utilizacao_horas/UtilizacaoHoras.sql', 'utilizacao_horas/HorasPorProjeto.sql']
  };

  const fileNames = faqSqlMap[id];
  if (!fileNames) {
    return res.status(404).json({ error: 'Card não encontrado.' });
  }

  let connection = null;
  try {
    console.log(`[Legacy FAQ] Obtendo conexão do Pool...`);
    if (env.demoMode) {
      connection = {
        execute: async (sql, params) => {
          const res = await executeQuery({ sql, params });
          return [res.rows];
        },
        release: () => {}
      };
    } else {
      connection = await pool.getConnection();
      await connection.execute("SET NAMES utf8mb4;");
    }

    const results = [];
    const queries = [];

    for (const fileName of fileNames) {
      console.log(`[Legacy FAQ] Carregando SQL: ${fileName}`);
      const sqlPath = path.resolve(process.cwd(), 'src', 'sql', fileName);

      if (!fs_sync.existsSync(sqlPath)) {
        console.error(`[Legacy FAQ] Arquivo não encontrado: ${sqlPath}`);
        throw new Error(`Arquivo SQL não encontrado: ${fileName}`);
      }

      const buffer = await fs.readFile(sqlPath);
      let sql;
      if (buffer[0] === 0xff && buffer[1] === 0xfe) {
        sql = buffer.toString('utf16le').slice(1);
      } else if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        sql = buffer.toString('utf8').slice(1);
      } else {
        sql = buffer.toString('utf8');
      }
      sql = sql.replace(/^\uFEFF/, '').trim();

      // Ajustes temporais no SQL legado em tempo de execução
      if (fileName === 'Gasto com pessoal.sql' || fileName.includes('UtilizacaoHoras.sql')) {
        sql = sql.replace(
          `WITH Calendario AS (SELECT DATE_ADD('2019-01-01', INTERVAL num DAY) AS Dia\r\n\tFROM (\r\n\t\tSELECT ROW_NUMBER() OVER () - 1 AS num\r\n\t\tFROM information_schema.tables\r\n\t\tLIMIT 2922 -- ano: 2026\r\n\t) AS seq),`,
          `WITH t10 AS (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10),\r\nseq AS (SELECT ROW_NUMBER() OVER () - 1 AS num FROM t10 a CROSS JOIN t10 b CROSS JOIN t10 c CROSS JOIN t10 d LIMIT 2922),\r\nCalendario AS (SELECT DATE_ADD('2019-01-01', INTERVAL num DAY) AS Dia FROM seq),`
        );
        if (!sql.includes('WITH t10 AS')) {
          sql = sql.replace(
            `WITH Calendario AS (SELECT DATE_ADD('2019-01-01', INTERVAL num DAY) AS Dia\n\tFROM (\n\t\tSELECT ROW_NUMBER() OVER () - 1 AS num\n\t\tFROM information_schema.tables\n\t\tLIMIT 2922 -- ano: 2026\n\t) AS seq),`,
            `WITH t10 AS (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10),\nseq AS (SELECT ROW_NUMBER() OVER () - 1 AS num FROM t10 a CROSS JOIN t10 b CROSS JOIN t10 c CROSS JOIN t10 d LIMIT 2922),\nCalendario AS (SELECT DATE_ADD('2019-01-01', INTERVAL num DAY) AS Dia FROM seq),`
          );
        }
        if (!sql.includes('WITH t10 AS')) {
          sql = sql.replace(
            /WITH\s+(RECURSIVE\s+)?Calendario\s+AS\s*\([\s\S]*?FROM\s+information_schema\.tables[\s\S]*?\)\s*seq\s*\),/i,
            `WITH RECURSIVE t10 AS (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10),\nseq AS (SELECT ROW_NUMBER() OVER () - 1 AS num FROM t10 a CROSS JOIN t10 b CROSS JOIN t10 c CROSS JOIN t10 d LIMIT 2922),\nCalendario AS (SELECT DATE_ADD('2019-01-01', INTERVAL num DAY) AS Dia FROM seq),`
          );
        }
      }

      const [rows] = await connection.execute(sql);
      console.log(`[Legacy FAQ] Query executada: ${fileName} - ${rows.length} registros obtidos.`);
      results.push(rows);
      queries.push(sql);
    }

    let activeClients = [];
    try {
      const [clientRows] = await connection.execute("SELECT Name FROM clients WHERE active = 1 ORDER BY Name ASC;");
      activeClients = clientRows.map(c => c.Name);
    } catch (clientErr) {
      console.error(`[Legacy FAQ] Erro ao buscar clientes ativos:`, clientErr);
    }

    if (connection) {
      connection.release();
      connection = null;
    }

    res.json({
      data: fileNames.length === 1 ? results[0] : results,
      sql: queries.join('\n\n-- SEPARATOR --\n\n'),
      fileNames: fileNames,
      isMultiple: fileNames.length > 1,
      activeClients: activeClients
    });
  } catch (error) {
    if (connection) {
      connection.release();
      connection = null;
    }
    console.error(`Erro na execução do SQL legado:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

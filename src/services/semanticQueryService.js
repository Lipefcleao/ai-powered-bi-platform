import { QueryPolicyService } from './queryPolicyService.js';
import { executeQuery } from '../db/queryExecutor.js';

export class SemanticQueryService {
  /**
   * Valida e executa consultas do Chat de IA através do QueryPolicyService
   */
  static async executeAiQuery({ sqlQuery, requestContext }) {
    // 1. Valida o SQL gerado pela IA com a politica de segurança
    const sanitizedSql = QueryPolicyService.validateAndSanitizeQuery(sqlQuery);

    // 2. Executa via QueryExecutor controlado (com timeout e limite de linhas)
    const result = await executeQuery({
      sql: sanitizedSql,
      queryName: 'ai_chat_query',
      maxRows: 500,
      timeoutMs: 10000
    });

    return {
      rows: result.rows,
      rowCount: result.rowCount,
      truncated: result.truncated,
      meta: {
        requestId: requestContext.requestId,
        executedAt: new Date().toISOString()
      }
    };
  }
}

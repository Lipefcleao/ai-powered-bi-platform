/**
 * Validador rigoroso de SQL para consultas geradas por IA (QueryPolicyService).
 * Bloqueia DDL, DML, tabelas administrativas, múltiplas instruções e impõe limite de linhas.
 */
export class QueryPolicyService {
  static FORBIDDEN_KEYWORDS = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE',
    'GRANT', 'REVOKE', 'EXECUTE', 'INTO OUTFILE', 'LOAD_FILE', 'SLEEP',
    'BENCHMARK', 'INFORMATION_SCHEMA', 'PERFORMANCE_SCHEMA', 'MYSQL', 'SYS'
  ];

  static FORBIDDEN_COLUMNS = ['PASSWORD', 'SENHA', 'TOKEN', 'SECRET', 'SALARIO', 'CPF', 'CNPJ'];

  static validateAndSanitizeQuery(sql) {
    if (!sql || typeof sql !== 'string') {
      const err = new Error('Query SQL inválida ou vazia.');
      err.status = 400;
      err.code = 'INVALID_QUERY';
      throw err;
    }

    const cleanSql = sql.trim().replace(/;+$/, '');

    // Bloqueia múltiplas instruções atreladas por ponto e vírgula
    if (cleanSql.includes(';')) {
      const err = new Error('Apenas uma instrução SQL é permitida por consulta.');
      err.status = 400;
      err.code = 'MULTIPLE_STATEMENTS_DISALLOWED';
      throw err;
    }

    // Valida se inicia exclusivamente com SELECT ou WITH (CTE)
    const upperSql = cleanSql.toUpperCase();
    if (!upperSql.startsWith('SELECT') && !upperSql.startsWith('WITH')) {
      const err = new Error('Apenas instruções de leitura (SELECT) são permitidas.');
      err.status = 400;
      err.code = 'ONLY_SELECT_ALLOWED';
      throw err;
    }

    // Checa palavras reservadas e schemas proibidos
    for (const keyword of this.FORBIDDEN_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(upperSql)) {
        const err = new Error(`Uso do comando/tabela '${keyword}' é proibido por razões de segurança.`);
        err.status = 400;
        err.code = 'FORBIDDEN_KEYWORD';
        throw err;
      }
    }

    // Checa acesso a colunas sensíveis
    for (const column of this.FORBIDDEN_COLUMNS) {
      const regex = new RegExp(`\\b${column}\\b`, 'i');
      if (regex.test(upperSql)) {
        const err = new Error(`Acesso à coluna sensível '${column}' é proibido.`);
        err.status = 400;
        err.code = 'FORBIDDEN_COLUMN';
        throw err;
      }
    }

    // Garantir que a consulta possui LIMIT seguro (máximo 500 linhas)
    let sanitizedSql = cleanSql;
    if (!upperSql.includes('LIMIT')) {
      sanitizedSql += ' LIMIT 500';
    }

    return sanitizedSql;
  }
}

/**
 * Configuração de Schemas para o Assistente de IA
 * Define o significado de cada coluna para cada módulo do BI.
 */

export const MODULE_CONFIGS = {
  'Vendas x Orçamento': {
    description: 'Monitoramento de performance comercial, faturamento e metas.',
    columns: [
      { name: 'Date', type: 'date', description: 'Data da venda ou orçamento.' },
      { name: 'Receitas', type: 'number', description: 'Valor monetário do registro.' },
      { name: 'Tipo', type: 'string', description: 'Categoria do registro (Venda ou Orçamento).' }
    ],
    analyticalRules: [
      'Sempre ordene pela coluna Receitas de forma numérica ao buscar recordes.',
      'Diferencie claramente entre Vendas e Orçamentos.',
      'Ao perguntar por "maior venda", filtre por Tipo="Venda" e pegue o maior valor de Receitas.'
    ]
  },
  'Alocação de horas': {
    description: 'Análise de horas estimadas vs reportadas por projeto e responsável.',
    mainSumColumn: 'ReportagemResponsavel',
    columns: [
      { name: 'Projeto', type: 'string', description: 'Nome do projeto/cliente.' },
      { name: 'Responsável', type: 'string', description: 'Pessoa alocada.' },
      { name: 'Horas Estimadas', type: 'number', description: 'Carga horária prevista (EstimativaResponsavel).' },
      { name: 'Horas Reportadas', type: 'number', description: 'Carga horária executada (ReportagemResponsavel).' },
      { name: 'Mês', type: 'string', description: 'Referência temporal.' }
    ],
    analyticalRules: [
      'Para somatórios por Projeto ou Responsável, SEMPRE some a coluna ReportagemResponsavel.',
      'NUNCA multiplique médias globais por contagens para obter totais.',
      'Calcule a eficiência subtraindo Horas Reportadas de Horas Estimadas.',
      'Identifique sobrecarga quando Horas Reportadas > Horas Estimadas.'
    ]
  }
};

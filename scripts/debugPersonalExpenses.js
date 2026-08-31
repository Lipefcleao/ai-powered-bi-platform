import { DashboardService } from '../src/services/dashboardService.js';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente a partir do arquivo .env
dotenv.config();

async function run() {
  console.log('🚀 Iniciando testes do Dashboard v2 (Gasto com Pessoal)...');
  
  const requestContext = {
    requestId: 'test-request-personal-123',
    user: {
      id: 1,
      email: 'test@example.com',
      roles: ['admin'],
      tenantId: 'test_tenant'
    }
  };

  try {
    console.log(`\n==================================================`);
    console.log(`📊 Testando Endpoint Gasto com Pessoal (FAQ 4)`);
    console.log(`==================================================`);
    
    const result = await DashboardService.queryDashboard({
      dashboardId: 'faq4',
      payload: {
        view: 'personal_expenses',
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          projectName: 'Todos',
          etapaName: 'Todas',
          tarefaName: 'Todas'
        },
        pagination: {
          page: 1,
          pageSize: 15
        }
      },
      requestContext
    });

    console.log('✅ Sucesso!');
    console.log('📌 Summary KPIs:', result.summary);
    console.log('📌 Rows (Primeira Página de Lançamentos Pivotados):', result.rows.length);
    if (result.rows.length > 0) {
      console.log('   Exemplo Linha Tabela:', result.rows[0]);
    }
    console.log('📌 Filter Options:');
    console.log('   - Projetos dropdown:', result.filterOptions.projects.length);
    console.log('   - Etapas dropdown:', result.filterOptions.etapas.length);
    console.log('   - Tarefas dropdown:', result.filterOptions.tarefas.length);
    console.log('📌 Pagination Info:', result.pagination);
    console.log('📌 Meta:', result.meta);
  } catch (err) {
    console.error(`❌ Erro ao executar teste de pessoal:`, err.message);
    console.error(err.stack);
  }

  process.exit(0);
}

run();

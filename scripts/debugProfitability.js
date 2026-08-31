import { DashboardService } from '../src/services/dashboardService.js';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente a partir do arquivo .env
dotenv.config();

async function run() {
  console.log('🚀 Iniciando testes do Dashboard v2 (Lucratividade)...');
  
  const requestContext = {
    requestId: 'test-request-profitability-123',
    user: {
      id: 1,
      email: 'test@example.com',
      roles: ['admin'],
      tenantId: 'test_tenant'
    }
  };

  const testCases = [
    {
      view: 'profitability',
      filters: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        projectName: 'Todos',
        clientName: 'Todos'
      }
    },
    {
      view: 'overdue',
      filters: {
        projectName: 'Todos',
        clientName: 'Todos'
      }
    }
  ];

  for (const tc of testCases) {
    console.log(`\n==================================================`);
    console.log(`📊 Testando View: ${tc.view.toUpperCase()}`);
    console.log(`==================================================`);
    
    try {
      const result = await DashboardService.queryDashboard({
        dashboardId: 'faq5',
        payload: {
          view: tc.view,
          filters: tc.filters,
          pagination: {
            page: 1,
            pageSize: 10
          }
        },
        requestContext
      });

      console.log('✅ Sucesso!');
      console.log('📌 Summary KPIs:', result.summary);
      console.log('📌 Rows Length:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('   Exemplo de Linha (Primeira):', result.rows[0]);
      }
      console.log('📌 Filter Options:');
      console.log('   Projetos:', result.filterOptions.projects.length);
      console.log('   Clientes:', result.filterOptions.clients.length);
      console.log('📌 Pagination:', result.pagination);
      console.log('📌 Meta:', result.meta);
    } catch (err) {
      console.error(`❌ Erro ao executar teste de lucratividade na view ${tc.view}:`, err.message);
      console.error(err.stack);
    }
  }

  process.exit(0);
}

run();

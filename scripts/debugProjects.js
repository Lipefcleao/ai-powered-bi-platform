import { DashboardService } from '../src/services/dashboardService.js';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente a partir do arquivo .env
dotenv.config();

async function run() {
  console.log('🚀 Iniciando testes do Dashboard v2 (Projetos - FAQ 7)...');
  
  const requestContext = {
    requestId: 'test-projects-request-id-123',
    user: {
      id: 1,
      email: 'test@example.com',
      roles: ['admin'],
      tenantId: 'test_tenant'
    }
  };

  const views = ['status', 'tempo_projeto', 'tempo_etapa', 'tempo_tarefa'];

  for (const view of views) {
    try {
      console.log(`\n==================================================`);
      console.log(`📊 Testando Query de Projetos (View: ${view})`);
      console.log(`==================================================`);
      
      const result = await DashboardService.queryDashboard({
        dashboardId: 'faq7',
        payload: {
          view,
          filters: {
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            clientName: 'Todos',
            projectName: 'Todos',
            projectStatus: 'Todos',
            responsibleName: 'Todos'
          },
          pagination: {
            page: 1,
            pageSize: 5
          }
        },
        requestContext
      });

      console.log('✅ Sucesso!');
      console.log('📌 Summary:', result.summary);
      console.log('📌 Rows Length:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('  👉 Exemplo de Row:', result.rows[0]);
      }
      if (view === 'status') {
        console.log('📌 Chart Data Length:', result.chartData.length);
      }
      console.log('📌 Filter Options (Clients):', result.filterOptions?.clients?.length);
      console.log('📌 Filter Options (Projects):', result.filterOptions?.projects?.length);
      console.log('📌 Meta:', result.meta);

    } catch (err) {
      console.error(`❌ Erro ao executar consulta de Projetos (View: ${view}):`, err.message);
      console.error(err.stack);
    }
  }

  process.exit(0);
}

run();

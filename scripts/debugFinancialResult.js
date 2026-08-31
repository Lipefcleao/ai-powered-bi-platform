import { DashboardService } from '../src/services/dashboardService.js';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente a partir do arquivo .env
dotenv.config();

async function run() {
  console.log('🚀 Iniciando testes do Dashboard v2 (Resultado Financeiro)...');
  
  const requestContext = {
    requestId: 'test-request-id-123',
    user: {
      id: 1,
      email: 'test@example.com',
      roles: ['admin'],
      tenantId: 'test_tenant'
    }
  };

  const views = ['compensated', 'uncompensated', 'competence'];

  for (const view of views) {
    console.log(`\n==================================================`);
    console.log(`📊 Testando View: ${view.toUpperCase()}`);
    console.log(`==================================================`);
    
    try {
      const result = await DashboardService.queryDashboard({
        dashboardId: 'faq9',
        payload: {
          view,
          filters: {
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            projectIds: []
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
      console.log('📌 Series Length:', result.series.length);
      console.log('📌 Rows Length:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('📌 Exemplo de Row (Primeira):', result.rows[0]);
      }
      console.log('📌 Meta:', result.meta);
    } catch (err) {
      console.error(`❌ Erro ao executar view ${view}:`, err.message);
      console.error(err.stack);
    }
  }

  process.exit(0);
}

run();

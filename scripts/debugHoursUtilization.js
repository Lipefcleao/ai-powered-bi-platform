import { DashboardService } from '../src/services/dashboardService.js';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente a partir do arquivo .env
dotenv.config();

async function run() {
  console.log('🚀 Iniciando testes do Dashboard v2 (Utilização de Horas - FAQ 10)...');
  
  const requestContext = {
    requestId: 'test-hours-request-id-123',
    user: {
      id: 1,
      email: 'test@example.com',
      roles: ['admin'],
      tenantId: 'test_tenant'
    }
  };

  try {
    console.log(`\n==================================================`);
    console.log(`📊 Testando Query de Utilização de Horas`);
    console.log(`==================================================`);
    
    const result = await DashboardService.queryDashboard({
      dashboardId: 'faq10',
      payload: {
        view: 'utilization',
        filters: {
          year: 2024,
          month: 0, // Janeiro (0-indexed)
          collaborator: 'Todos',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        },
        pagination: {
          page: 1,
          pageSize: 10
        }
      },
      requestContext
    });

    console.log('✅ Sucesso!');
    console.log('📌 Summary:', result.summary);
    console.log('📌 Project Hours Length:', result.projectHours.length);
    if (result.projectHours.length > 0) {
      console.log('  👉 Exemplo Project Hour:', result.projectHours[0]);
    }
    console.log('📌 Monthly Trend Length:', result.monthlyTrend.length);
    if (result.monthlyTrend.length > 0) {
      console.log('  👉 Exemplo Trend:', result.monthlyTrend[0]);
    }
    console.log('📌 Collaborators Length:', result.collaborators.length);
    if (result.collaborators.length > 0) {
      console.log('  👉 Exemplo Colaborador:', result.collaborators[0]);
    }
    console.log('📌 Active Collaborators Length:', result.activeCollaborators.length);
    console.log('📌 Meta:', result.meta);

  } catch (err) {
    console.error('❌ Erro ao executar consulta de Utilização de Horas:', err.message);
    console.error(err.stack);
  }

  process.exit(0);
}

run();

import { DashboardService } from '../src/services/dashboardService.js';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente a partir do arquivo .env
dotenv.config();

async function run() {
  console.log('🚀 Iniciando testes do Dashboard v2 (Rateio)...');
  
  const requestContext = {
    requestId: 'test-request-apportionment-123',
    user: {
      id: 1,
      email: 'test@example.com',
      roles: ['admin'],
      tenantId: 'test_tenant'
    }
  };

  try {
    console.log(`\n==================================================`);
    console.log(`📊 Testando Endpoint do Rateio (FAQ 8)`);
    console.log(`==================================================`);
    
    const result = await DashboardService.queryDashboard({
      dashboardId: 'faq8',
      payload: {
        view: 'apportionment',
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          ratedProjectName: 'Todos',
          recipientProjectName: 'Todos',
          rateioMethod: 'Todos'
        },
        pagination: {
          page: 1,
          pageSize: 10
        }
      },
      requestContext
    });

    console.log('✅ Sucesso!');
    console.log('📌 Summary KPIs:', result.summary);
    console.log('📌 Series Length (Gráfico):', result.series.length);
    if (result.series.length > 0) {
      console.log('   Exemplo de Série:', result.series[0]);
    }
    console.log('📌 Rows Length (Tabela linearizada):', result.rows.length);
    if (result.rows.length > 0) {
      console.log('   Exemplo de Linha (Primeira):', result.rows[0]);
    }
    console.log('📌 Filter Options:', result.filterOptions);
    console.log('   Projetos Origem:', result.filterOptions.ratedProjects.length);
    console.log('   Projetos Destino:', result.filterOptions.recipientProjects.length);
    console.log('📌 Pagination Info:', result.pagination);
    console.log('📌 Meta:', result.meta);
  } catch (err) {
    console.error(`❌ Erro ao executar teste de rateio:`, err.message);
    console.error(err.stack);
  }

  process.exit(0);
}

run();

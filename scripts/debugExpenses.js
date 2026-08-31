import { DashboardService } from '../src/services/dashboardService.js';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente a partir do arquivo .env
dotenv.config();

async function run() {
  console.log('🚀 Iniciando testes do Dashboard v2 (Despesas x Fornecedores)...');
  
  const requestContext = {
    requestId: 'test-request-expenses-123',
    user: {
      id: 1,
      email: 'test@example.com',
      roles: ['admin'],
      tenantId: 'test_tenant'
    }
  };

  try {
    console.log(`\n==================================================`);
    console.log(`📊 Testando Endpoint Despesas x Fornecedores (FAQ 3)`);
    console.log(`==================================================`);
    
    const result = await DashboardService.queryDashboard({
      dashboardId: 'faq3',
      payload: {
        view: 'expenses',
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          supplierName: 'Todos',
          bankAccountName: 'Todas',
          status: 'Todos'
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
    console.log('📌 Series (Gráficos):');
    console.log('   - barChartFornecedorData length:', result.series.barChartFornecedorData.length);
    if (result.series.barChartFornecedorData.length > 0) {
      console.log('     Exemplo Evolução Fornecedores:', result.series.barChartFornecedorData[0]);
    }
    console.log('   - barChartTotalFornecedorData length:', result.series.barChartTotalFornecedorData.length);
    if (result.series.barChartTotalFornecedorData.length > 0) {
      console.log('     Exemplo Ranking Fornecedores:', result.series.barChartTotalFornecedorData[0]);
    }
    console.log('   - uniqueFornecedores length:', result.series.uniqueFornecedores.length);
    console.log('📌 Rows (Primeira Página de Lançamentos):', result.rows.length);
    if (result.rows.length > 0) {
      console.log('   Exemplo Lançamento:', result.rows[0]);
    }
    console.log('📌 Filter Options:');
    console.log('   - Fornecedores dropdown:', result.filterOptions.suppliers.length);
    console.log('   - Contas dropdown:', result.filterOptions.bankAccounts.length);
    console.log('📌 Pagination Info:', result.pagination);
    console.log('📌 Meta:', result.meta);
  } catch (err) {
    console.error(`❌ Erro ao executar teste de despesas:`, err.message);
    console.error(err.stack);
  }

  process.exit(0);
}

run();

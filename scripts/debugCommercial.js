import { DashboardService } from '../src/services/dashboardService.js';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente a partir do arquivo .env
dotenv.config();

async function run() {
  console.log('🚀 Iniciando testes do Dashboard v2 (Comercial)...');
  
  const requestContext = {
    requestId: 'test-request-commercial-123',
    user: {
      id: 1,
      email: 'test@example.com',
      roles: ['admin'],
      tenantId: 'test_tenant'
    }
  };

  try {
    console.log(`\n==================================================`);
    console.log(`📊 Testando Endpoint Comercial (FAQ 2)`);
    console.log(`==================================================`);
    
    const result = await DashboardService.queryDashboard({
      dashboardId: 'faq2',
      payload: {
        view: 'commercial',
        filters: {
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
    console.log('📌 Summary KPIs:', result.summary);
    console.log('📌 Series (Gráficos):');
    console.log('   - monthlySalesTrend length:', result.series.monthlySalesTrend.length);
    if (result.series.monthlySalesTrend.length > 0) {
      console.log('     Exemplo Sales Trend:', result.series.monthlySalesTrend[0]);
    }
    console.log('   - yearlySalesTrend length:', result.series.yearlySalesTrend.length);
    if (result.series.yearlySalesTrend.length > 0) {
      console.log('     Exemplo Yearly Sales:', result.series.yearlySalesTrend[0]);
    }
    console.log('   - monthlyVencimentoTrend length:', result.series.monthlyVencimentoTrend.length);
    if (result.series.monthlyVencimentoTrend.length > 0) {
      console.log('     Exemplo Vencimento Trend:', result.series.monthlyVencimentoTrend[0]);
    }
    console.log('   - monthlyCompensadoTrend length:', result.series.monthlyCompensadoTrend.length);
    if (result.series.monthlyCompensadoTrend.length > 0) {
      console.log('     Exemplo Compensado Trend:', result.series.monthlyCompensadoTrend[0]);
    }
    console.log('📌 Rows (Primeira Página de Vendas):', result.rows.length);
    if (result.rows.length > 0) {
      console.log('   Exemplo Venda:', result.rows[0]);
    }
    console.log('📌 Pagination Info:', result.pagination);
    console.log('📌 Meta:', result.meta);
  } catch (err) {
    console.error(`❌ Erro ao executar teste comercial:`, err.message);
    console.error(err.stack);
  }

  process.exit(0);
}

run();

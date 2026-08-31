import React, { useState } from 'react';
import { useDashboardQuery } from '../hooks/useDashboardQuery.js';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Filter, 
  RefreshCw, 
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Percent
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

/**
 * Componente Modular Premium do Dashboard Piloto: FAQ 9 - Resultado Financeiro.
 * Suporta as visões Compensado, Não Compensado e Competência com gráficos e tabelas paginadas no servidor.
 */
export function FinancialResultDashboard() {
  const [view, setView] = useState('compensated'); // 'compensated' | 'uncompensated' | 'competence'
  
  const [filters, setFilters] = useState({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    projectIds: []
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15
  });

  const { data, loading, error, refetch } = useDashboardQuery('faq9', filters, pagination, view);

  const summary = data?.summary || { totalRevenue: 0, totalExpenses: 0, netMargin: 0 };
  const series = data?.series || [];
  const rows = data?.rows || [];
  const meta = data?.meta || {};

  // Formatação de valores monetários
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formatação compacta para eixos de gráficos (ex: 15.5k)
  const formatKLabel = (val) => {
    const num = Number(val);
    if (Math.abs(num) >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toFixed(0);
  };

  // Manipuladores de filtros
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reseta para primeira página ao filtrar
  };

  const handleViewChange = (newView) => {
    setView(newView);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Cálculo da Margem Percentual (Receitas vs Despesas)
  const revenueNum = Number(summary.totalRevenue || 0);
  const expensesNum = Number(summary.totalExpenses || 0);
  const netMarginPercent = revenueNum > 0 
    ? ((revenueNum - expensesNum) / revenueNum) * 100 
    : 0;

  return (
    <div className="financial-dashboard p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      
      {/* Top Bar - Título e Status de Cache */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">⚡</span>
            Resultado Financeiro (API v2)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Análise detalhada de fluxo de caixa consolidado, impostos de serviços e regime de competência.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {meta.cacheHit !== undefined && (
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold font-mono flex items-center gap-1.5 transition-all ${
              meta.cacheHit 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}>
              <span className={`w-2 h-2 rounded-full ${meta.cacheHit ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
              {meta.cacheHit ? 'Cache Hit (5m)' : 'Database Fetch'}
            </span>
          )}
          
          <button 
            onClick={refetch} 
            disabled={loading}
            className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition-all"
            title="Recarregar dados"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Seletor de Visões e Filtros Rápidos */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          
          {/* Abas de Navegação das Views */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => handleViewChange('compensated')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'compensated' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Compensado (Realizado)
            </button>
            <button
              onClick={() => handleViewChange('uncompensated')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'uncompensated' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Não Compensado (Previsto)
            </button>
            <button
              onClick={() => handleViewChange('competence')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'competence' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Regime de Competência
            </button>
          </div>

          {/* Filtros de Data */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date" 
                name="startDate"
                value={filters.startDate}
                onChange={handleDateChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none"
              />
              <span className="text-slate-300">até</span>
              <input 
                type="date" 
                name="endDate"
                value={filters.endDate}
                onChange={handleDateChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Cards de KPIs de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI: Receitas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Receitas Totais</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalRevenue)}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* KPI: Despesas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Despesas Totais</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalExpenses)}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <TrendingDown size={24} />
          </div>
        </div>

        {/* KPI: Saldo Líquido */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resultado Líquido</p>
            <p className={`text-2xl font-bold ${Number(summary.netMargin) >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatCurrency(summary.netMargin)}
            </p>
          </div>
          <div className={`p-3 rounded-2xl ${Number(summary.netMargin) >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
            <DollarSign size={24} />
          </div>
        </div>

        {/* KPI: Margem % */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Margem Líquida</p>
            <p className="text-2xl font-bold text-slate-900">{netMarginPercent.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Percent size={24} />
          </div>
        </div>

      </div>

      {/* Gráfico de Evolução Temporal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Evolução Financeira Mensal</h3>
            <p className="text-xs text-slate-500 mt-0.5">Comparativo temporal de faturamento e despesas operacionais.</p>
          </div>
        </div>

        <div className="w-100 h-80">
          {series.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
              Sem dados temporais disponíveis no período selecionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="period" 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                  style={{ fontSize: '12px', fill: '#94a3b8', fontWeight: '500' }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-10}
                  tickFormatter={formatKLabel}
                  style={{ fontSize: '12px', fill: '#94a3b8' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  formatter={(value) => [formatCurrency(value), '']}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area 
                  name="Receita" 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
                <Area 
                  name="Despesa" 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Estados de Carregamento e Erros no Grid */}
      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3">
          <RefreshCw className="animate-spin text-blue-600" size={32} />
          <p className="text-sm font-semibold text-slate-500">Buscando dados consolidados no MySQL...</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div>
            <p className="font-bold text-lg">Erro na carga do Dashboard</p>
            <p className="text-sm mt-1">{error.message || 'Falha de comunicação com o servidor.'}</p>
            {error.requestId && (
              <p className="text-xs text-rose-500 font-mono mt-2 bg-white px-2 py-1 rounded w-fit border border-rose-100">
                Request ID: {error.requestId}
              </p>
            )}
          </div>
          <button 
            onClick={refetch} 
            className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-sm active:scale-95 transition-all text-sm"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Tabela de Detalhes de Lançamentos */}
      {!loading && !error && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Listagem de Lançamentos Paginada</h3>
              <p className="text-xs text-slate-500 mt-0.5">Mostrando registros individuais apropriados por categoria e centro de custo.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-slate-400 text-xs font-semibold uppercase">
                  <th className="px-6 py-4 text-left tracking-wider">Competência/Data</th>
                  <th className="px-6 py-4 text-left tracking-wider">Projeto (Centro de Custo)</th>
                  <th className="px-6 py-4 text-left tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-left tracking-wider">Conta</th>
                  <th className="px-6 py-4 text-left tracking-wider">Categoria / Descrição</th>
                  <th className="px-6 py-4 text-center tracking-wider">Fluxo</th>
                  <th className="px-6 py-4 text-right tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                      {row.competenceDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-semibold">
                      {row.projectId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {row.clientName || 'Sem cliente'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {row.accountName || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[240px] truncate" title={row.description}>
                      {row.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        row.type === 'Income' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {row.type === 'Income' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${
                      row.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {row.type === 'Income' ? '+' : '-'} {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}
                
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-slate-400 font-medium bg-slate-50/50">
                      Nenhum registro encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginação Avançados */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 text-xs font-semibold text-slate-500">
            <span>Página {pagination.page} (Exibindo até {pagination.pageSize} registros por página)</span>
            
            <div className="flex gap-2">
              <button 
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 transition-all"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              
              <button 
                disabled={rows.length < pagination.pageSize || loading}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 transition-all"
              >
                Próxima
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

        </div>
      )}
      
    </div>
  );
}

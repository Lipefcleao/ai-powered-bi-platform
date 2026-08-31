import React, { useState } from 'react';
import { useDashboardQuery } from '../hooks/useDashboardQuery.js';
import { 
  DollarSign, 
  Calendar, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Briefcase,
  Layers,
  CheckCircle,
  TrendingDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';

export function ExpensesDashboard() {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [selectedSupplier, setSelectedSupplier] = useState('Todos');
  const [selectedAccount, setSelectedAccount] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15
  });

  const filters = {
    startDate,
    endDate,
    supplierName: selectedSupplier,
    bankAccountName: selectedAccount,
    status: selectedStatus
  };

  const { data, loading, error, refetch } = useDashboardQuery('faq3', filters, pagination, 'expenses');

  const summary = data?.summary || { totalDespesas: 0, mediaDespesas: 0 };
  const series = data?.series || { barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [] };
  const rows = data?.rows || [];
  const filterOptions = data?.filterOptions || { suppliers: [], bankAccounts: [], statuses: [] };
  const pageInfo = data?.pagination || { page: 1, pageSize: 15, totalRows: 0, totalPages: 0 };
  const meta = data?.meta || {};

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getSupplierColor = (supplierName, index) => {
    return ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#e879f9'][index % 7];
  };

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="expenses-dashboard p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      
      {/* Top Bar - Título e Status de Cache */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-red-50 text-red-600 rounded-xl">💸</span>
            Despesas x Fornecedores (API v2)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Análise detalhada de custos de saídas operacionais, fornecedores parceiros e conciliação bancária de pagamentos.
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

      {/* Barra de Filtros */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          
          {/* Data Início */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Início</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date"
                value={startDate}
                onChange={handleFilterChange(setStartDate)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Data Fim */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fim</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date"
                value={endDate}
                onChange={handleFilterChange(setEndDate)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Fornecedor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fornecedor</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Briefcase size={16} className="text-slate-400" />
              <select 
                value={selectedSupplier} 
                onChange={handleFilterChange(setSelectedSupplier)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {filterOptions.suppliers.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conta Bancária */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conta Bancária</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Layers size={16} className="text-slate-400" />
              <select 
                value={selectedAccount} 
                onChange={handleFilterChange(setSelectedAccount)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todas">Todas</option>
                {filterOptions.bankAccounts.map(acc => (
                  <option key={acc} value={acc}>{acc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <CheckCircle size={16} className="text-slate-400" />
              <select 
                value={selectedStatus} 
                onChange={handleFilterChange(setSelectedStatus)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                {filterOptions.statuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Loading & Error States */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">Ocorreu um erro ao carregar os dados</p>
            <p className="text-sm opacity-90">{error.message || 'Erro desconhecido.'}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4 min-h-[300px]">
          <RefreshCw size={36} className="text-red-600 animate-spin" />
          <p className="text-slate-500 font-semibold">Carregando despesas e fornecedores...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Cards de KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* KPI: Total de Despesas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Despesas</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(summary.totalDespesas)}</p>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                <TrendingDown size={24} />
              </div>
            </div>

            {/* KPI: Média por Lançamento */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Despesa Média por Lançamento</p>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(summary.mediaDespesas)}</p>
              </div>
              <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
                <DollarSign size={24} />
              </div>
            </div>

          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Evolução por Fornecedor (Barras Empilhadas) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-red-600 rounded-full" />
                Evolução de Despesas por Fornecedor
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series.barChartFornecedorData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="mesAno" stroke="#94a3b8" tick={{ fontSize: '11px', fontWeight: '500' }} />
                    <YAxis 
                      stroke="#94a3b8" 
                      tick={{ fontSize: '11px' }} 
                      tickFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      formatter={(v, name) => [formatCurrency(v), name]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '15px' }} />
                    {series.uniqueFornecedores.map((forn, idx) => (
                      <Bar 
                        key={forn} 
                        dataKey={forn} 
                        stackId="a"
                        fill={getSupplierColor(forn, idx)} 
                        radius={[0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranking de Fornecedores (Barras Simples) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-blue-600 rounded-full" />
                Ranking de Despesas por Fornecedor
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series.barChartTotalFornecedorData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="Fornecedor" stroke="#94a3b8" tick={{ fontSize: '9px', fontWeight: '500' }} />
                    <YAxis 
                      stroke="#94a3b8" 
                      tick={{ fontSize: '11px' }} 
                      tickFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                      formatter={(v) => [formatCurrency(v), 'Total Pago']}
                    />
                    <Bar dataKey="Valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Tabela de Lançamentos de Despesas */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Lançamentos de Saídas</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tabela analítica de contas registradas e quitadas no período selecionado.
                </p>
              </div>
              <div className="text-sm font-semibold text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-lg flex-shrink-0">
                Página {pageInfo.page} de {pageInfo.totalPages || 1} ({pageInfo.totalRows} registros)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50">
                    <th className="p-4">Data</th>
                    <th className="p-4">Fornecedor</th>
                    <th className="p-4">Conta Bancária</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length > 0 ? (
                    rows.map((row, idx) => (
                      <tr key={idx} className="transition-colors hover:bg-slate-50/50">
                        <td className="p-4 font-semibold text-slate-900">
                          {row.Data ? new Date(row.Data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                        </td>
                        <td className="p-4 text-slate-950 font-medium">{row.Fornecedor}</td>
                        <td className="p-4 text-slate-600">{row.Conta}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            row.Compensado === 'Compensado' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {row.Compensado}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-red-500">
                          - {formatCurrency(row.Valor)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                        Nenhum lançamento de despesa encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação inferior */}
            {pageInfo.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-500">
                  Mostrando registros {(pageInfo.page - 1) * pageInfo.pageSize + 1} - {Math.min(pageInfo.page * pageInfo.pageSize, pageInfo.totalRows)} de {pageInfo.totalRows}
                </span>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pageInfo.page === 1}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-all cursor-pointer text-slate-600"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-600 px-2">
                    {pageInfo.page} / {pageInfo.totalPages}
                  </span>
                  <button 
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pageInfo.totalPages, prev.page + 1) }))}
                    disabled={pageInfo.page === pageInfo.totalPages}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-all cursor-pointer text-slate-600"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}

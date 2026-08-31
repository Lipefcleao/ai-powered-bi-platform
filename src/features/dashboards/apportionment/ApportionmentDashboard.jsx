import React, { useState } from 'react';
import { useDashboardQuery } from '../hooks/useDashboardQuery.js';
import { 
  SplitSquareHorizontal,
  Clock, 
  Users, 
  DollarSign, 
  Calendar, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LabelList
} from 'recharts';

export function ApportionmentDashboard() {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [selectedRatedProj, setSelectedRatedProj] = useState('Todos');
  const [selectedRecipientProj, setSelectedRecipientProj] = useState('Todos');
  const [selectedMethod, setSelectedMethod] = useState('Todos');

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 200
  });

  const filters = {
    startDate,
    endDate,
    ratedProjectName: selectedRatedProj,
    recipientProjectName: selectedRecipientProj,
    rateioMethod: selectedMethod
  };

  const { data, loading, error, refetch } = useDashboardQuery('faq8', filters, pagination, 'apportionment');

  const summary = data?.summary || { totalHoursBase: 0, totalPeopleBase: 0, totalRevenueBase: 0 };
  const series = data?.series || [];
  const rows = data?.rows || [];
  const filterOptions = data?.filterOptions || { ratedProjects: [], recipientProjects: [], methods: [] };
  const pageInfo = data?.pagination || { page: 1, pageSize: 200, totalRows: 0, totalPages: 0 };
  const meta = data?.meta || {};

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getProjectColor = (projectName, index) => {
    const name = projectName || '';
    if (name.includes('Daggio')) return '#3b82f6'; // Blue
    if (name.includes('DevOps')) return '#10b981'; // Green
    if (name.includes('Revenue') || name.includes('Receita')) return '#8b5cf6'; // Purple
    if (name.includes('Tech Squad') || name.includes('Pessoas')) return '#ef4444'; // Red
    return ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4'][index % 6];
  };

  return (
    <div className="apportionment-dashboard p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      
      {/* Top Bar - Título e Status de Cache */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">📊</span>
            Dashboard de Rateio (API v2)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Visualização de fatores, bases e valores proporcionais rateados entre centros de custo de origem e destino.
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
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
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

          {/* Projeto Origem */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projeto Origem</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <SplitSquareHorizontal size={16} className="text-slate-400" />
              <select 
                value={selectedRatedProj} 
                onChange={handleFilterChange(setSelectedRatedProj)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {filterOptions.ratedProjects.map(proj => (
                  <option key={proj} value={proj}>{proj}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Projeto Destino */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projeto Destino</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <SplitSquareHorizontal size={16} className="text-slate-400" />
              <select 
                value={selectedRecipientProj} 
                onChange={handleFilterChange(setSelectedRecipientProj)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {filterOptions.recipientProjects.map(proj => (
                  <option key={proj} value={proj}>{proj}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Método */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Método de Rateio</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <RefreshCw size={16} className="text-slate-400" />
              <select 
                value={selectedMethod} 
                onChange={handleFilterChange(setSelectedMethod)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {filterOptions.methods.map(method => (
                  <option key={method} value={method}>{method}</option>
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
            {error.requestId && (
              <p className="text-xs font-mono bg-red-100/50 px-2 py-1 rounded inline-block mt-2">
                Request ID: {error.requestId}
              </p>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4 min-h-[300px]">
          <RefreshCw size={36} className="text-blue-600 animate-spin" />
          <p className="text-slate-500 font-semibold">Carregando dados de rateio...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Cards de KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* KPI: Base de Horas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Base Rateada (Horas)</p>
                <p className="text-3xl font-bold text-slate-900">{summary.totalHoursBase.toLocaleString('pt-BR')}h</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Clock size={24} />
              </div>
            </div>

            {/* KPI: Base de Pessoas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Base Rateada (Pessoas)</p>
                <p className="text-3xl font-bold text-slate-900">{summary.totalPeopleBase.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
                <Users size={24} />
              </div>
            </div>

            {/* KPI: Base de Receitas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Base Rateada (Receita)</p>
                <p className="text-3xl font-bold text-slate-900">
                  {summary.totalRevenueBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <DollarSign size={24} />
              </div>
            </div>

          </div>

          {/* Gráfico de Barras */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-blue-600 rounded-full" />
              Valores Rateados por Mês
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: '11px', fontWeight: '500' }} />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fontSize: '11px' }} 
                    tickFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    itemStyle={{ fontSize: '13px' }}
                    formatter={(value, name) => {
                      if (!value || Number(value) === 0) return null;
                      return [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '15px' }} 
                    formatter={(value) => <span className="text-slate-600 font-semibold text-xs">{value}</span>}
                  />
                  {filterOptions.ratedProjects.map((proj, idx) => (
                    <Bar 
                      key={proj} 
                      dataKey={proj} 
                      stackId="a"
                      fill={getProjectColor(proj, idx)} 
                      radius={[0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Dinâmica de Rateio */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-bottom border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tabela de Rateios</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lista hierárquica detalhada por data, método de cálculo e projetos participantes.
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
                    <th className="p-4">Método de Rateio</th>
                    <th className="p-4">Projeto Origem (Rateado)</th>
                    <th className="p-4">Projeto Destino (Padrão)</th>
                    <th className="p-4 text-right">Total (Base)</th>
                    <th className="p-4 text-right">Fator</th>
                    <th className="p-4 text-right">Valor Rateado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length > 0 ? (
                    rows.map((row, idx) => {
                      const isSub = row.isSubtotal;
                      return (
                        <tr 
                          key={idx} 
                          className={`transition-colors hover:bg-slate-50/50 ${isSub ? 'bg-slate-50 font-bold' : ''}`}
                        >
                          {row.isFirstOfDate ? (
                            <td 
                              rowSpan={row.dateRowSpan} 
                              className="p-4 font-semibold text-slate-900 border-r border-slate-100 align-middle bg-white"
                            >
                              {row.displayDate}
                            </td>
                          ) : null}

                          {row.isFirstOfMethod ? (
                            <td 
                              rowSpan={row.methodRowSpan} 
                              className="p-4 font-semibold text-slate-700 border-r border-slate-100 align-middle bg-white"
                            >
                              {row.displayMethod}
                            </td>
                          ) : null}

                          {isSub ? (
                            <td className="p-4 text-slate-900 border-b-2 border-slate-200">
                              Totais para {row.displayRatedProj}
                            </td>
                          ) : (
                            row.isFirstOfRatedProj ? (
                              <td 
                                rowSpan={row.ratedProjRowSpan} 
                                className="p-4 font-semibold text-slate-800 border-r border-slate-100 align-middle bg-white"
                              >
                                {row.displayRatedProj}
                              </td>
                            ) : null
                          )}

                          <td className={`p-4 ${isSub ? 'text-slate-400 border-b-2 border-slate-200' : 'text-slate-600'}`}>
                            {isSub ? '-' : row.displayRecipient}
                          </td>

                          <td className={`p-4 text-right ${isSub ? 'border-b-2 border-slate-200' : ''}`}>
                            {row.displayTotal !== null 
                              ? (row.displayMethod === 'Receitas' 
                                  ? row.displayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                  : row.displayTotal.toLocaleString('pt-BR')) 
                              : '-'}
                          </td>

                          <td className={`p-4 text-right ${isSub ? 'border-b-2 border-slate-200' : ''}`}>
                            {row.displayPercent !== null 
                              ? `${row.displayPercent.toFixed(2).replace('.', ',')}%` 
                              : '-'}
                          </td>

                          <td className={`p-4 text-right ${isSub ? 'text-blue-600 border-b-2 border-slate-200' : 'font-semibold text-slate-700'}`}>
                            {row.displayRateio !== null 
                              ? row.displayRateio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                              : '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        Nenhum registro de rateio encontrado no período selecionado.
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

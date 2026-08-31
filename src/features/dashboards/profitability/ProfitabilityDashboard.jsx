import React, { useState } from 'react';
import { useDashboardQuery } from '../hooks/useDashboardQuery.js';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';

export function ProfitabilityDashboard() {
  const [activeTab, setActiveTab] = useState('resultado'); // 'resultado' | 'atraso'
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [selectedProject, setSelectedProject] = useState('Todos');
  const [selectedClient, setSelectedClient] = useState('Todos');

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15
  });

  const filters = {
    startDate: activeTab === 'resultado' ? startDate : null,
    endDate: activeTab === 'resultado' ? endDate : null,
    projectName: selectedProject,
    clientName: selectedClient
  };

  const view = activeTab === 'resultado' ? 'profitability' : 'overdue';

  const { data, loading, error, refetch } = useDashboardQuery('faq5', filters, pagination, view);

  const summary = data?.summary || {};
  const rows = data?.rows || [];
  const filterOptions = data?.filterOptions || { projects: [], clients: [] };
  const pageInfo = data?.pagination || { page: 1, pageSize: 15, totalRows: 0, totalPages: 0 };
  const meta = data?.meta || {};

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="profitability-dashboard p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      
      {/* Top Bar - Título e Status de Cache */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">💰</span>
            Lucratividade (API v2)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Análise de lucratividade agregada por projeto (receitas, despesas, margens, rateios) e recebimentos vencidos em atraso.
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

      {/* Sub-Abas de Navegação */}
      <div className="flex gap-4 border-b border-slate-200 pb-0">
        <button
          onClick={() => handleTabChange('resultado')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 cursor-pointer ${
            activeTab === 'resultado' 
              ? 'border-blue-600 text-blue-600 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Resultado do projeto
        </button>
        <button
          onClick={() => handleTabChange('atraso')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 cursor-pointer ${
            activeTab === 'atraso' 
              ? 'border-blue-600 text-blue-600 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Recebimentos em atraso
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Datas (apenas para aba de Resultado) */}
          {activeTab === 'resultado' ? (
            <>
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
            </>
          ) : (
            <div className="hidden md:block col-span-2" />
          )}

          {/* Filtro Projeto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projeto</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <FileText size={16} className="text-slate-400" />
              <select 
                value={selectedProject} 
                onChange={handleFilterChange(setSelectedProject)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {filterOptions.projects.map(proj => (
                  <option key={proj} value={proj}>{proj}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtro Cliente */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <FileText size={16} className="text-slate-400" />
              <select 
                value={selectedClient} 
                onChange={handleFilterChange(setSelectedClient)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {filterOptions.clients.map(cli => (
                  <option key={cli} value={cli}>{cli}</option>
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
          <p className="text-slate-500 font-semibold">Carregando informações...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* KPI Summary Cards */}
          {activeTab === 'resultado' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Receitas */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Receitas</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {(summary.totalRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <DollarSign size={24} />
                </div>
              </div>

              {/* Despesas */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Despesas</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {(summary.totalExpense || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <DollarSign size={24} />
                </div>
              </div>

              {/* Margem Direta */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Margem Direta</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {(summary.totalMargin || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <TrendingUp size={24} />
                </div>
              </div>

              {/* Resultado */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resultado Final</p>
                  <p className={`text-2xl font-bold ${(summary.totalResult || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {(summary.totalResult || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl ${(summary.totalResult || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  <DollarSign size={24} />
                </div>
              </div>

            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Contagem em atraso */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantidade em Atraso</p>
                  <p className="text-3xl font-bold text-slate-900">{summary.totalOverdueCount || 0}</p>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <Clock size={24} />
                </div>
              </div>

              {/* Valor total em atraso */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor Total Vencido</p>
                  <p className="text-3xl font-bold text-red-600">
                    {(summary.totalOverdueValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <DollarSign size={24} />
                </div>
              </div>

            </div>
          )}

          {/* Tabelas de Dados */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {activeTab === 'resultado' ? 'Resultado Consolidado do Projeto' : 'Contas a Receber em Atraso'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTab === 'resultado' 
                    ? 'Valores acumulados por projeto, margens e rateio final de custos.' 
                    : 'Listagem detalhada de faturas e pagamentos vencidos sem conciliação.'}
                </p>
              </div>
              <div className="text-sm font-semibold text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-lg flex-shrink-0">
                Página {pageInfo.page} de {pageInfo.totalPages || 1} ({pageInfo.totalRows} registros)
              </div>
            </div>

            <div className="overflow-x-auto">
              {activeTab === 'resultado' ? (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50">
                      <th className="p-4">Projeto</th>
                      <th className="p-4 text-right">Receita</th>
                      <th className="p-4 text-right">Despesa</th>
                      <th className="p-4 text-right">Margem Direta</th>
                      <th className="p-4 text-right">Rateio</th>
                      <th className="p-4 text-right">Resultado Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length > 0 ? (
                      rows.map((row, idx) => (
                        <tr key={idx} className="transition-colors hover:bg-slate-50/50">
                          <td className="p-4 font-semibold text-slate-950">{row.Projeto}</td>
                          <td className="p-4 text-right">
                            {row.Receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-4 text-right text-red-500">
                            {row.Despesa > 0 ? `- ${row.Despesa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'R$ 0,00'}
                          </td>
                          <td className={`p-4 text-right font-medium ${row.MargemDireta >= 0 ? 'text-slate-700' : 'text-red-500'}`}>
                            {row.MargemDireta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-4 text-right text-slate-600">
                            {row.Rateio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className={`p-4 text-right font-bold ${row.Resultado >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {row.Resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                          Nenhum resultado encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50">
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Projeto</th>
                      <th className="p-4 text-right">Valor Vencido</th>
                      <th className="p-4">Data Vencimento</th>
                      <th className="p-4">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length > 0 ? (
                      rows.map((row, idx) => (
                        <tr key={idx} className="transition-colors hover:bg-slate-50/50">
                          <td className="p-4 font-semibold text-slate-950">{row.Client || '-'}</td>
                          <td className="p-4 text-slate-600">{row.Project || '-'}</td>
                          <td className="p-4 text-right font-bold text-red-500">
                            {(Number(row.Value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-4 text-slate-600 font-mono">
                            {row.DueDate ? new Date(row.DueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                          </td>
                          <td className="p-4 text-slate-500 max-w-xs truncate" title={row.Description}>
                            {row.Description || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                          Nenhuma conta em atraso encontrada para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
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

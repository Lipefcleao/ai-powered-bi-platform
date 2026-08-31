import React, { useState } from 'react';
import { useDashboardQuery } from '../hooks/useDashboardQuery.js';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Briefcase,
  Layers,
  Settings
} from 'lucide-react';

export function PersonalExpensesDashboard() {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [selectedProject, setSelectedProject] = useState('Todos');
  const [selectedEtapa, setSelectedEtapa] = useState('Todas');
  const [selectedTarefa, setSelectedTarefa] = useState('Todas');

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15
  });

  const filters = {
    startDate,
    endDate,
    projectName: selectedProject,
    etapaName: selectedEtapa,
    tarefaName: selectedTarefa
  };

  const { data, loading, error, refetch } = useDashboardQuery('faq4', filters, pagination, 'personal_expenses');

  const summary = data?.summary || { totalGeralHoras: 0, totalGeralCustoTotal: 0 };
  const rows = data?.rows || [];
  const filterOptions = data?.filterOptions || { projects: [], etapas: [], tarefas: [] };
  const pageInfo = data?.pagination || { page: 1, pageSize: 15, totalRows: 0, totalPages: 0 };
  const meta = data?.meta || {};

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="personal-expenses-dashboard p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      
      {/* Top Bar - Título e Status de Cache */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">👥</span>
            Gasto com Pessoal (API v2)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Análise mensal de apontamentos de horas trabalhadas por colaboradores, projetos e cargos com cálculo de encargos e benefícios.
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

          {/* Projeto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projeto</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Briefcase size={16} className="text-slate-400" />
              <select 
                value={selectedProject} 
                onChange={handleFilterChange(setSelectedProject)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                {filterOptions.projects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Etapa */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Etapa</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Layers size={16} className="text-slate-400" />
              <select 
                value={selectedEtapa} 
                onChange={handleFilterChange(setSelectedEtapa)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                {filterOptions.etapas.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tarefa */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarefa</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Settings size={16} className="text-slate-400" />
              <select 
                value={selectedTarefa} 
                onChange={handleFilterChange(setSelectedTarefa)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                {filterOptions.tarefas.map(t => (
                  <option key={t} value={t}>{t}</option>
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
            <p className="font-bold">Ocorreu um erro ao carregar os dados de pessoal</p>
            <p className="text-sm opacity-90">{error.message || 'Erro desconhecido.'}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4 min-h-[300px]">
          <RefreshCw size={36} className="text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-semibold">Carregando gastos com pessoal...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Cards de KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* KPI: Gasto Total */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custo Total de Pessoal</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(summary.totalGeralCustoTotal)}</p>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                <DollarSign size={24} />
              </div>
            </div>

            {/* KPI: Total de Horas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Horas Apontadas</p>
                <p className="text-3xl font-bold text-indigo-900">{summary.totalGeralHoras.toLocaleString('pt-BR')} h</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users size={24} />
              </div>
            </div>

          </div>

          {/* Tabela Pivotada */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Detalhamento por Projeto e Mês</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualização pivotada contendo o agrupamento dos lançamentos de colaboradores e cargos.
                </p>
              </div>
              <div className="text-sm font-semibold text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-lg flex-shrink-0">
                Página {pageInfo.page} de {pageInfo.totalPages || 1} ({pageInfo.totalRows} linhas na tabela)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50">
                    <th className="p-4 border-r border-slate-100">Projeto</th>
                    <th className="p-4 border-r border-slate-100">Data</th>
                    <th className="p-4">Colaborador</th>
                    <th className="p-4">Cargo</th>
                    <th className="p-4 text-right">Horas</th>
                    <th className="p-4 text-right">Custo por Hora</th>
                    <th className="p-4 text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length > 0 ? (
                    rows.map((row, idx) => (
                      <tr key={idx} className="transition-colors hover:bg-slate-50/30">
                        
                        {/* Span do Projeto */}
                        {row.isFirstOfProj && (
                          <td 
                            rowSpan={row.projRowSpan} 
                            className="p-4 font-bold text-slate-900 border-r border-slate-100 align-top bg-slate-50/40 text-center select-none"
                            style={{ minWidth: '150px' }}
                          >
                            {row.Projeto}
                          </td>
                        )}

                        {/* Span da Data */}
                        {row.isFirstOfDate && (
                          <td 
                            rowSpan={row.dateRowSpan} 
                            className="p-4 font-semibold text-slate-700 border-r border-slate-100 align-top bg-slate-50/20 text-center select-none capitalize"
                            style={{ minWidth: '130px' }}
                          >
                            {row.Data}
                          </td>
                        )}

                        {/* Informações detalhadas do colaborador */}
                        <td className="p-4 font-medium text-slate-900">{row.Colaborador}</td>
                        <td className="p-4 text-slate-500">{row.Cargo}</td>
                        <td className="p-4 text-right font-mono text-slate-700">{row.Horas}h</td>
                        <td className="p-4 text-right font-mono text-slate-500">{formatCurrency(row.CustoPorHora)}</td>
                        <td className="p-4 text-right font-bold text-red-500">{formatCurrency(row.CustoTotal)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        Nenhum registro encontrado para os filtros selecionados.
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

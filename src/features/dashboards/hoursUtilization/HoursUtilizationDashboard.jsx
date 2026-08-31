import React, { useState } from 'react';
import { useDashboardQuery } from '../hooks/useDashboardQuery.js';
import { 
  Clock, 
  User, 
  Calendar, 
  TrendingUp, 
  PieChart as PieIcon, 
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
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';

const COLORS = ['#facc15', '#fb7185', '#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#e879f9', '#60a5fa'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

export function HoursUtilizationDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(2024); // Fixado em 2024 pois é o ano que tem dados no banco de dev
  const [selectedCollaborator, setSelectedCollaborator] = useState('Todos');

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15
  });

  // Filtros enviados à API v2
  const filters = {
    year: selectedYear,
    month: selectedMonth,
    collaborator: selectedCollaborator,
    // Definimos startDate e endDate correspondentes ao ano selecionado para obter a tendência anual inteira
    startDate: `${selectedYear}-01-01`,
    endDate: `${selectedYear}-12-31`
  };

  const { data, loading, error, refetch } = useDashboardQuery('faq10', filters, pagination, 'utilization');

  const summary = data?.summary || { totalUsefulHours: 0, totalWorkedHours: 0, totalBalanceHours: 0, averageUtilizationRate: 0 };
  const projectHours = data?.projectHours || [];
  const monthlyTrend = data?.monthlyTrend || [];
  const collaborators = data?.collaborators || [];
  const activeCollaborators = data?.activeCollaborators || [];
  const meta = data?.meta || {};
  const pageInfo = data?.pagination || { page: 1, pageSize: 15, totalRows: 0, totalPages: 0 };

  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value, 10));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value, 10));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCollaboratorChange = (e) => {
    setSelectedCollaborator(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Formatação para exibição de horas com precisão
  const formatHours = (val) => {
    const num = Number(val || 0);
    return `${num.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
  };

  // Preparação de dados para o gráfico de barras de utilização individual
  const barChartData = collaborators.map(c => ({
    name: c.collaboratorName,
    'Horas Úteis': c.usefulHours,
    'Horas Trabalhadas': c.workedHours,
    'Saldo de Horas': c.balanceHours,
    'Taxa de Utilização (%)': c.utilizationRate
  }));

  return (
    <div className="hours-utilization-dashboard p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      
      {/* Top Bar - Título e Status de Cache */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">🕒</span>
            Utilização de Horas (API v2)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Análise detalhada de taxas de utilização individual, horas trabalhadas por projeto e saldo do banco de horas.
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Filtro de Mês */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mês</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Calendar size={16} className="text-slate-400" />
              <select 
                value={selectedMonth} 
                onChange={handleMonthChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                {MONTHS.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtro de Ano */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ano</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Calendar size={16} className="text-slate-400" />
              <select 
                value={selectedYear} 
                onChange={handleYearChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtro de Colaborador */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Colaborador</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <User size={16} className="text-slate-400" />
              <select 
                value={selectedCollaborator} 
                onChange={handleCollaboratorChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {activeCollaborators.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI: Horas Úteis */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Horas Úteis no Mês</p>
            <p className="text-2xl font-bold text-slate-900">{formatHours(summary.totalUsefulHours)}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Clock size={24} />
          </div>
        </div>

        {/* KPI: Horas Trabalhadas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Horas Trabalhadas</p>
            <p className="text-2xl font-bold text-slate-900">{formatHours(summary.totalWorkedHours)}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* KPI: Saldo de Horas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo de Horas</p>
            <p className={`text-2xl font-bold ${summary.totalBalanceHours >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatHours(summary.totalBalanceHours)}
            </p>
          </div>
          <div className={`p-3 rounded-2xl ${summary.totalBalanceHours >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
            <Clock size={24} />
          </div>
        </div>

        {/* KPI: Taxa de Utilização */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taxa Média do Mês</p>
            <p className="text-2xl font-bold text-slate-900">{summary.averageUtilizationRate.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <PieIcon size={24} />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Utilização Mensal por Colaborador */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[450px]">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Utilização de Horas por Colaboradores</h3>
            <p className="text-xs text-slate-500 mt-0.5">Visão de horas úteis, trabalhadas e saldo para o período.</p>
          </div>
          
          <div className="flex-grow min-h-[300px]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
            ) : barChartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Nenhum dado encontrado para o filtro.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fontSize: '11px', fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: '11px', fill: 'var(--text-muted)' }} />
                  <Tooltip cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Horas Úteis" fill="#8dc63f" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Horas Trabalhadas" fill="#80cbc4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saldo de Horas" fill="#8e7cc3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Horas trabalhadas por projeto */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[450px]">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Horas Trabalhadas por Projeto</h3>
            <p className="text-xs text-slate-500 mt-0.5">Distribuição das horas reportadas nos projetos do mês ativo.</p>
          </div>

          <div className="flex-grow relative flex items-center justify-center min-h-[300px]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
            ) : projectHours.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Nenhum dado reportado no mês selecionado.</div>
            ) : (
              <>
                <div className="absolute text-center pointer-events-none">
                  <div className="text-2xl font-bold text-slate-900 leading-tight">
                    {formatHours(summary.totalWorkedHours)}
                  </div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider">TOTAL</div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectHours}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ percent }) => percent > 0.02 ? `${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}
                    >
                      {projectHours.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}h`} />
                    <Legend 
                      layout="horizontal" 
                      align="center" 
                      verticalAlign="bottom" 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
                      formatter={(value) => <span className="text-slate-600 font-semibold">{value.length > 20 ? `${value.slice(0, 18)}...` : value}</span>} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Tabela de Utilização Individual */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-bottom border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Total Horas por Colaboradores</h3>
            <p className="text-xs text-slate-500 mt-0.5">Indicadores individuais detalhados para o mês ativo.</p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Registros {((pagination.page - 1) * pagination.pageSize) + 1} a {Math.min(pagination.page * pagination.pageSize, pageInfo.totalRows)} de {pageInfo.totalRows}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4 text-right">Horas Úteis</th>
                <th className="px-6 py-4 text-right">Horas Trabalhadas</th>
                <th className="px-6 py-4 text-right">Saldo de Horas</th>
                <th className="px-6 py-4 text-right">Taxa do Mês</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Carregando dados...</td>
                </tr>
              ) : collaborators.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum colaborador encontrado para os filtros ativos.</td>
                </tr>
              ) : (
                collaborators.map((row, idx) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{row.collaboratorName}</td>
                    <td className="px-6 py-4 text-right">{formatHours(row.usefulHours)}</td>
                    <td className="px-6 py-4 text-right">{formatHours(row.workedHours)}</td>
                    <td className={`px-6 py-4 text-right font-medium ${row.balanceHours >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {formatHours(row.balanceHours)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-blue-600">{row.utilizationRate.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação da Tabela de Colaboradores */}
        {pageInfo.totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-3">
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1 || loading}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              Página {pagination.page} de {pageInfo.totalPages}
            </span>
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pageInfo.totalPages, prev.page + 1) }))}
              disabled={pagination.page === pageInfo.totalPages || loading}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Tabelas de Evolução Mensal e Geral */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tabela de Tendência Mensal */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Total de Horas por Mês</h3>
            <p className="text-xs text-slate-500 mt-0.5">Evolução dos indicadores de utilização ao longo do ano.</p>
          </div>
          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Mês</th>
                  <th className="px-6 py-4 text-right">Horas Úteis</th>
                  <th className="px-6 py-4 text-right">Horas Trabalhadas</th>
                  <th className="px-6 py-4 text-right">Saldo</th>
                  <th className="px-6 py-4 text-right">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Carregando...</td>
                  </tr>
                ) : monthlyTrend.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Sem dados.</td>
                  </tr>
                ) : (
                  monthlyTrend.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 text-capitalize">{row.mesLabel}</td>
                      <td className="px-6 py-4 text-right">{formatHours(row.horasUteis)}</td>
                      <td className="px-6 py-4 text-right">{formatHours(row.horasTrabalhadas)}</td>
                      <td className={`px-6 py-4 text-right font-medium ${row.saldo >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        {formatHours(row.saldo)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-blue-600">{row.taxa.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de Consolidado Geral */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Total Geral de Horas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Indicador consolidado acumulativo do ano inteiro.</p>
          </div>
          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 text-right">Horas Úteis</th>
                  <th className="px-6 py-4 text-right">Horas Trabalhadas</th>
                  <th className="px-6 py-4 text-right">Saldo de Horas</th>
                  <th className="px-6 py-4 text-right">Taxa Média</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Carregando...</td>
                  </tr>
                ) : (
                  <tr className="border-b border-slate-50">
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatHours(summary.totalUsefulHours)}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatHours(summary.totalWorkedHours)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${summary.totalBalanceHours >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {formatHours(summary.totalBalanceHours)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600">{summary.averageUtilizationRate.toFixed(1)}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-start gap-3">
            <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Nota sobre Carga Horária:</strong> As horas úteis são baseadas na carga horária semanal cadastrada de cada colaborador, descontando feriados nacionais vigentes e os períodos de férias/vacations aprovados no sistema.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

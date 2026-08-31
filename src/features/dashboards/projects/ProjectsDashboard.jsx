import React, { useState } from 'react';
import { useDashboardQuery } from '../hooks/useDashboardQuery.js';
import { 
  Calendar, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Folder, 
  CheckSquare, 
  Layers, 
  Users 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LabelList 
} from 'recharts';

export function ProjectsDashboard() {
  const [view, setView] = useState('status'); // 'status' | 'tempo_projeto' | 'tempo_etapa' | 'tempo_tarefa'
  
  const [filters, setFilters] = useState({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    clientName: 'Todos',
    projectName: 'Todos',
    projectStatus: 'Todos',
    responsibleName: 'Todos'
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15
  });

  const { data, loading, error, refetch } = useDashboardQuery('faq7', filters, pagination, view);

  const summary = data?.summary || {};
  const chartData = data?.chartData || [];
  const rows = data?.rows || [];
  const filterOptions = data?.filterOptions || { clients: [], projects: [], statuses: [], responsibles: [] };
  const meta = data?.meta || {};
  const pageInfo = data?.pagination || { page: 1, pageSize: 15, totalRows: 0, totalPages: 0 };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewChange = (newView) => {
    setView(newView);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusBadgeBg = (status) => {
    if (!status) return '#f1f5f9';
    const s = status.toLowerCase();
    if (s.includes('atraso') || s.includes('atrasado')) return '#fef2f2'; // Vermelho
    if (s.includes('no prazo') || s.includes('no prazo')) return '#f0fdf4'; // Verde
    if (s.includes('concluído no prazo')) return '#ecfdf5'; // Verde esmeralda
    if (s.includes('próximo')) return '#fffbeb'; // Amarelo
    return '#f8fafc'; // Cinza padrão
  };

  const getStatusBadgeColor = (status) => {
    if (!status) return '#475569';
    const s = status.toLowerCase();
    if (s.includes('atraso') || s.includes('atrasado')) return '#dc2626';
    if (s.includes('no prazo') || s.includes('no prazo')) return '#16a34a';
    if (s.includes('concluído no prazo')) return '#059669';
    if (s.includes('próximo')) return '#d97706';
    return '#475569';
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="projects-dashboard p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      
      {/* Top Bar - Título e Cache */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">📊</span>
            Dashboard de Projetos (API v2)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestão operacional de status de entrega, prazos de tarefas, etapas de boards e métricas de conclusão de projetos.
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

      {/* Sub-abas de Navegação */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => handleViewChange('status')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              view === 'status' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Folder size={16} />
            Status dos Projetos
          </button>
          <button
            onClick={() => handleViewChange('tempo_projeto')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              view === 'tempo_projeto' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Folder size={16} />
            Tempo do Projeto
          </button>
          <button
            onClick={() => handleViewChange('tempo_etapa')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              view === 'tempo_etapa' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={16} />
            Tempo da Etapa
          </button>
          <button
            onClick={() => handleViewChange('tempo_tarefa')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              view === 'tempo_tarefa' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare size={16} />
            Tempo da Tarefa
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Calendário */}
          <div className="flex flex-col gap-1.5 xl:col-span-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Período de Data</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date" 
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full"
              />
              <span className="text-slate-300">a</span>
              <input 
                type="date" 
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Filtro: Cliente */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Filter size={16} className="text-slate-400" />
              <select 
                name="clientName"
                value={filters.clientName}
                onChange={handleFilterChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {filterOptions.clients.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtro: Projeto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projeto</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Filter size={16} className="text-slate-400" />
              <select 
                name="projectName"
                value={filters.projectName}
                onChange={handleFilterChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {filterOptions.projects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtro: Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Filter size={16} className="text-slate-400" />
              <select 
                name="projectStatus"
                value={filters.projectStatus}
                onChange={handleFilterChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                <option value="Sem prazo">Sem prazo</option>
                <option value="No prazo">No prazo</option>
                <option value="Atrasado">Atrasado</option>
                <option value="Prazo próximo">Prazo próximo</option>
                <option value="Concluído no prazo">Concluído no prazo</option>
                <option value="Concluído com atraso">Concluído com atraso</option>
              </select>
            </div>
          </div>

          {/* Filtro: Responsável */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsável</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm">
              <Users size={16} className="text-slate-400" />
              <select 
                name="responsibleName"
                value={filters.responsibleName}
                onChange={handleFilterChange}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none w-full cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {filterOptions.responsibles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* KPI Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {view === 'status' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projetos Ativos</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalActiveProjects || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Folder size={24} />
            </div>
          </div>
        )}

        {view === 'tempo_projeto' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Projetos</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalProjects || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Folder size={24} />
            </div>
          </div>
        )}

        {view === 'tempo_etapa' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Etapas</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalStages || 0}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Layers size={24} />
            </div>
          </div>
        )}

        {view === 'tempo_tarefa' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Tarefas</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalTasks || 0}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <CheckSquare size={24} />
            </div>
          </div>
        )}
      </div>

      {/* Gráfico de Status do Projeto */}
      {view === 'status' && chartData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Quantidade de Projetos por Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Distribuição do volume de projetos nas etapas de andamento.</p>
          </div>
          <div className="w-100 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="Status" tick={{ fontSize: '11px', fill: 'var(--text-muted)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: '11px', fill: 'var(--text-muted)' }} />
                <Tooltip cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }} />
                <Bar dataKey="Quantidade de Projetos" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Quantidade de Projetos" position="top" style={{ fill: 'var(--text-main)', fontWeight: '600', fontSize: '11px' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {view === 'status' && 'Projetos Ativos'}
              {view === 'tempo_projeto' && 'Tempo de Conclusão do Projeto'}
              {view === 'tempo_etapa' && 'Tempo de Conclusão da Etapa'}
              {view === 'tempo_tarefa' && 'Tempo de Conclusão da Tarefa'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Relatório operacional sargable paginado no servidor.</p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Registros {((pagination.page - 1) * pagination.pageSize) + 1} a {Math.min(pagination.page * pagination.pageSize, pageInfo.totalRows)} de {pageInfo.totalRows}
          </div>
        </div>

        <div className="overflow-x-auto">
          {view === 'status' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Projeto</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Nenhum projeto encontrado.</td></tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{row.NomeProjeto}</td>
                      <td className="px-6 py-4">{row.Cliente || '-'}</td>
                      <td className="px-6 py-4">{row.Responsavel || 'Sem responsável'}</td>
                      <td className="px-6 py-4">
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: getStatusBadgeBg(row.StatusProjeto),
                          color: getStatusBadgeColor(row.StatusProjeto)
                        }}>{row.StatusProjeto || 'Sem status'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {view === 'tempo_projeto' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Projeto</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4">Início</th>
                  <th className="px-6 py-4">Prazo</th>
                  <th className="px-6 py-4">Fim</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Tempo Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Nenhum projeto encontrado.</td></tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      {row.isFirstOfClient ? (
                        <td rowSpan={row.clientRowSpan} className="px-6 py-4 font-semibold text-slate-900 bg-slate-50/50 align-top border-r border-slate-100">
                          {row.ClienteExibicao}
                        </td>
                      ) : null}
                      <td className="px-6 py-4 font-semibold text-slate-900">{row.Projeto}</td>
                      <td className="px-6 py-4">{row.ResponsavelProjeto || 'Sem responsável'}</td>
                      <td className="px-6 py-4">{formatDate(row.ProjetoInicio)}</td>
                      <td className="px-6 py-4">{formatDate(row.ProjetoPrazo)}</td>
                      <td className="px-6 py-4">{formatDate(row.ProjetoFim)}</td>
                      <td className="px-6 py-4">
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: getStatusBadgeBg(row.StatusProjeto),
                          color: getStatusBadgeColor(row.StatusProjeto)
                        }}>{row.StatusProjeto || 'Sem status'}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {row.TempoProjetoMeses !== null && row.TempoProjetoMeses !== undefined
                          ? `${row.TempoProjetoMeses} meses`
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {view === 'tempo_etapa' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Projeto</th>
                  <th className="px-6 py-4">Etapa</th>
                  <th className="px-6 py-4">Início</th>
                  <th className="px-6 py-4">Prazo</th>
                  <th className="px-6 py-4">Fim</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Tempo Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Nenhuma etapa encontrada.</td></tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">{row.Cliente || '-'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{row.Projeto}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{row.Etapa}</td>
                      <td className="px-6 py-4">{formatDate(row.EtapaInicio)}</td>
                      <td className="px-6 py-4">{formatDate(row.EtapaPrazo)}</td>
                      <td className="px-6 py-4">{formatDate(row.EtapaFim)}</td>
                      <td className="px-6 py-4">
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: getStatusBadgeBg(row.StatusEtapa),
                          color: getStatusBadgeColor(row.StatusEtapa)
                        }}>{row.StatusEtapa || 'Sem status'}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {row.TempoEtapaDias !== null && row.TempoEtapaDias !== undefined
                          ? `${row.TempoEtapaDias} dias`
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {view === 'tempo_tarefa' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Projeto</th>
                  <th className="px-6 py-4">Etapa</th>
                  <th className="px-6 py-4">Tarefa</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4">Início</th>
                  <th className="px-6 py-4">Prazo</th>
                  <th className="px-6 py-4">Fim</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">Nenhuma tarefa encontrada.</td></tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">{row.Cliente || '-'}</td>
                      <td className="px-6 py-4">{row.Projeto}</td>
                      <td className="px-6 py-4">{row.Etapa}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{row.TituloTarefa}</td>
                      <td className="px-6 py-4">{row.ResponsavelTarefa}</td>
                      <td className="px-6 py-4">{formatDate(row.TarefaInicio || row.TarefaCriacao)}</td>
                      <td className="px-6 py-4">{formatDate(row.TarefaPrazo)}</td>
                      <td className="px-6 py-4">{formatDate(row.TarefaFim)}</td>
                      <td className="px-6 py-4">
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: getStatusBadgeBg(row.StatusTarefa),
                          color: getStatusBadgeColor(row.StatusTarefa)
                        }}>{row.StatusTarefa || 'Sem status'}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {row.TempoTarefaDias !== null && row.TempoTarefaDias !== undefined
                          ? `${row.TempoTarefaDias} dias`
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginação */}
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

    </div>
  );
}

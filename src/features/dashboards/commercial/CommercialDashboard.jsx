import React, { useState } from 'react';
import { useDashboardQuery } from '../hooks/useDashboardQuery.js';
import { 
  ShoppingCart, 
  DollarSign, 
  Calendar, 
  RefreshCw, 
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
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

export function CommercialDashboard() {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10
  });

  const filters = {
    startDate,
    endDate
  };

  const { data, loading, error, refetch } = useDashboardQuery('faq2', filters, pagination, 'commercial');

  const summary = data?.summary || { kpiVendas: 0, kpiValorVendas: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0, kpiCompensado: 0 };
  const series = data?.series || { monthlySalesTrend: [], yearlySalesTrend: [], monthlyVencimentoTrend: [], monthlyCompensadoTrend: [] };
  const meta = data?.meta || {};

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="commercial-dashboard p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      
      {/* Top Bar - Título e Status de Cache */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">📈</span>
            Painel Comercial (API v2)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhamento de funil comercial (orçamentos e vendas), tendências temporais e conciliação de recebimentos.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          
          {/* Data Início */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Início</label>
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
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Fim</label>
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

        </div>
      </div>

      {/* Loading & Error States */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-start gap-3">
          <RefreshCw size={20} className="mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">Ocorreu um erro ao carregar o painel comercial</p>
            <p className="text-sm opacity-90">{error.message || 'Erro desconhecido.'}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4 min-h-[400px]">
          <RefreshCw size={36} className="text-blue-600 animate-spin" />
          <p className="text-slate-500 font-semibold">Carregando painel comercial...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Grid de KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* KPI 1: Quantidade de Vendas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantidade de Vendas</p>
                <p className="text-3xl font-bold text-slate-900">{summary.kpiVendas}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <ShoppingCart size={24} />
              </div>
            </div>

            {/* KPI 2: Valor de Vendas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor de Vendas</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.kpiValorVendas)}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <DollarSign size={24} />
              </div>
            </div>

            {/* KPI 3: Quantidade de Orçamentos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Qtd. de Orçamentos</p>
                <p className="text-3xl font-bold text-slate-900">{summary.kpiOrcamentos}</p>
              </div>
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                <ShoppingCart size={24} />
              </div>
            </div>

            {/* KPI 4: Valor de Orçamentos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor de Orçamentos</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.kpiValorOrcamentos)}</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <DollarSign size={24} />
              </div>
            </div>

          </div>

          {/* Gráficos de Vendas x Orçamentos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico 1: Quantidade por Mês */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-blue-600 rounded-full" />
                Vendas x Orçamentos por Mês (Quantidade)
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series.monthlySalesTrend} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="mesAno" stroke="#94a3b8" tick={{ fontSize: '11px', fontWeight: '500' }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: '11px' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ paddingTop: '15px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="Venda" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }}
                    >
                      <LabelList dataKey="Venda" position="top" style={{ fill: '#3b82f6', fontSize: '10px', fontWeight: 'bold' }} />
                    </Line>
                    <Line 
                      type="monotone" 
                      dataKey="Orcamento" 
                      name="Orçamento" 
                      stroke="#f97316" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#fff', stroke: '#f97316', strokeWidth: 2 }}
                    >
                      <LabelList dataKey="Orcamento" position="top" style={{ fill: '#f97316', fontSize: '10px', fontWeight: 'bold' }} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Valor por Mês */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-emerald-600 rounded-full" />
                Vendas x Orçamentos por Mês (Valor)
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series.monthlySalesTrend} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="mesAno" stroke="#94a3b8" tick={{ fontSize: '11px', fontWeight: '500' }} />
                    <YAxis 
                      stroke="#94a3b8" 
                      tick={{ fontSize: '11px' }} 
                      tickFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    />
                    <Tooltip 
                      formatter={(v) => formatCurrency(v)} 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} 
                    />
                    <Legend wrapperStyle={{ paddingTop: '15px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="ValorVenda" 
                      name="Venda" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ValorOrcamento" 
                      name="Orçamento" 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#fff', stroke: '#f59e0b', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Gráficos Financeiros e Anuais */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfico 3: Vendas por Ano */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-1">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-blue-500 rounded-full" />
                Vendas por Ano
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series.yearlySalesTrend} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="Ano" stroke="#94a3b8" tick={{ fontSize: '11px', fontWeight: '500' }} />
                    <YAxis 
                      stroke="#94a3b8" 
                      tick={{ fontSize: '11px' }} 
                      tickFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                    <Bar dataKey="Valor" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 4: Vencimento no Período */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-1">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-cyan-600 rounded-full" />
                Vencimento no Período
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series.monthlyVencimentoTrend} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="vencimento" stroke="#94a3b8" tick={{ fontSize: '11px', fontWeight: '500' }} />
                    <YAxis 
                      stroke="#94a3b8" 
                      tick={{ fontSize: '11px' }} 
                      tickFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="Valor" 
                      stroke="#06b6d4" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#fff', stroke: '#06b6d4', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 5: Compensado no Período */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-1">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-teal-600 rounded-full" />
                Compensado no Período
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series.monthlyCompensadoTrend} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="periodo" stroke="#94a3b8" tick={{ fontSize: '11px', fontWeight: '500' }} />
                    <YAxis 
                      stroke="#94a3b8" 
                      tick={{ fontSize: '11px' }} 
                      tickFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="Valor" 
                      stroke="#14b8a6" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#fff', stroke: '#14b8a6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}

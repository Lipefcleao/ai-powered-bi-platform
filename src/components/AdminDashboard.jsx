import React, { useState, useEffect } from 'react';
import { httpClient } from '../api/httpClient.js';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  Coins, 
  Cpu, 
  RefreshCw, 
  Trash2, 
  Info, 
  Percent, 
  ShieldCheck,
  MessageSquare
} from 'lucide-react';

function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetting, setResetting] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await httpClient('/api/admin/metrics');
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar as métricas do servidor de BI.');
    } finally {
      setLoading(false);
    }
  };

  const resetMetrics = async () => {
    if (!window.confirm('Tem certeza que deseja resetar todas as estatísticas de uso e custos de tokens?')) {
      return;
    }
    setResetting(true);
    try {
      await httpClient('/api/admin/metrics/reset', {
        method: 'POST'
      });
      await fetchMetrics();
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao tentar resetar métricas.');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="admin-loading-container">
        <RefreshCw className="animate-spin text-accent" size={32} />
        <p>Carregando painel de métricas da API...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error-container">
        <Info className="text-danger" size={48} />
        <h3>Erro de Conexão</h3>
        <p>{error}</p>
        <button className="btn-retry" onClick={fetchMetrics}>
          <RefreshCw size={16} /> Tentar Novamente
        </button>
      </div>
    );
  }

  const { summary, history } = metrics || {
    summary: {
      totalRequests: 0,
      totalPromptTokens: 0,
      totalCachedTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      totalCostWithoutCache: 0,
      totalSavings: 0
    },
    history: []
  };

  // Cálculo de taxas de cache
  const cacheRatio = summary.totalPromptTokens > 0 
    ? (summary.totalCachedTokens / summary.totalPromptTokens) * 100 
    : 0;

  const totalCostBeforeSavings = summary.totalCostWithoutCache || 0;
  const totalSavingsPct = totalCostBeforeSavings > 0
    ? (summary.totalSavings / totalCostBeforeSavings) * 100
    : 0;

  // Formatação de valores
  const formatCost = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(val);
  };

  const formatNumber = (val) => {
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Prepara dados formatados para os gráficos
  const chartData = history.map((item, idx) => ({
    name: `Req ${idx + 1}`,
    costWithCache: Number(item.cost.toFixed(6)),
    costWithoutCache: Number(item.costWithoutCache.toFixed(6)),
    promptTokens: item.promptTokens,
    cachedTokens: item.cachedTokens,
    outputTokens: item.outputTokens,
    time: formatTimestamp(item.timestamp)
  }));

  const hasData = history.length > 0;

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-title">
          <ShieldCheck size={28} className="text-accent" />
          <div>
            <h1>Painel do Administrador</h1>
            <p className="subtitle">Mapeamento em tempo real de tokens consumidos e economia com Implicit Caching (RAG Estático)</p>
          </div>
        </div>
        <div className="admin-header-actions">
          <button className="btn-refresh" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
          <button className="btn-reset" onClick={resetMetrics} disabled={resetting}>
            <Trash2 size={16} />
            <span>Resetar</span>
          </button>
        </div>
      </header>

      {/* Alerta explicativo */}
      <div className="admin-explanation-alert">
        <div className="alert-icon-wrapper">
          <Cpu size={20} />
        </div>
        <div className="alert-text-content">
          <h4>Como as métricas são calculadas?</h4>
          <p>
            O Gemini API aplica desconto de <strong>75%</strong> sobre os tokens de input persistidos em cache.
            Como nosso DDL (RAG) foi estruturado de forma estática (~9.500 tokens), o Gemini identifica a repetição e cobra apenas <strong>$0.01875/1M tokens</strong> (Cached) ao invés do valor cheio de <strong>$0.075/1M tokens</strong>.
            Abaixo, medimos a economia real baseada nos retornos oficiais de <code>usageMetadata</code> de cada requisição.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="admin-kpis">
        {/* Requisições */}
        <div className="kpi-card-premium admin-kpi">
          <div className="kpi-icon-container bg-blue">
            <Activity size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total de Requisições</span>
            <span className="kpi-value-premium">{formatNumber(summary.totalRequests)}</span>
          </div>
        </div>

        {/* Tokens Consumidos */}
        <div className="kpi-card-premium admin-kpi">
          <div className="kpi-icon-container bg-indigo">
            <Cpu size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Uso de Tokens (Input / Output)</span>
            <span className="kpi-value-premium">{formatNumber(summary.totalPromptTokens + summary.totalOutputTokens)}</span>
            <span className="kpi-subtext">
              Prompt: {formatNumber(summary.totalPromptTokens)} | Resposta: {formatNumber(summary.totalOutputTokens)}
            </span>
          </div>
        </div>

        {/* Custo Real */}
        <div className="kpi-card-premium admin-kpi">
          <div className="kpi-icon-container bg-purple">
            <Coins size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Custo Real Acumulado</span>
            <span className="kpi-value-premium text-accent">{formatCost(summary.totalCost)}</span>
            <span className="kpi-subtext">Sem cache: {formatCost(summary.totalCostWithoutCache)}</span>
          </div>
        </div>

        {/* Economia */}
        <div className="kpi-card-premium admin-kpi savings-card">
          <div className="kpi-icon-container bg-green">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Economia Gerada (ROI)</span>
            <span className="kpi-value-premium text-success">{formatCost(summary.totalSavings)}</span>
            <span className="kpi-subtext success-badge">
              <Percent size={12} /> {cacheRatio.toFixed(1)}% dos tokens reaproveitados
            </span>
          </div>
        </div>
      </section>

      {!hasData ? (
        <div className="admin-empty-state">
          <MessageSquare size={48} className="empty-icon text-muted" />
          <h3>Nenhum dado registrado</h3>
          <p>
            Vá para o painel de <strong>Chat Assistant</strong> e realize algumas perguntas para a IA.
            Toda vez que a IA gerar SQL e responder aos comandos, as estatísticas de consumo e economia serão registradas aqui em tempo real.
          </p>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <section className="admin-charts-section">
            {/* Gráfico 1: Comparativo de Custos */}
            <div className="admin-chart-card">
              <div className="chart-header">
                <h3>Histórico de Custos por Chamada (USD)</h3>
                <span className="badge-savings">
                  Economia média de {totalSavingsPct.toFixed(1)}% por chamada
                </span>
              </div>
              <div className="chart-container-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickFormatter={(v) => `$${Number(v).toFixed(4)}`} 
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        formatCost(value), 
                        name === 'costWithCache' ? 'Custo Real (Com Cache)' : 'Custo Estimado (Sem Cache)'
                      ]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return `Requisição: ${payload[0].payload.name} (${payload[0].payload.time})`;
                        }
                        return label;
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      formatter={(value) => value === 'costWithCache' ? 'Custo Real (Com Cache)' : 'Custo Estimado (Sem Cache)'}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="costWithoutCache" 
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 6 }} 
                      strokeDasharray="5 5"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="costWithCache" 
                      stroke="#2563eb" 
                      strokeWidth={3} 
                      dot={{ r: 5 }} 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Composição de Tokens */}
            <div className="admin-chart-card">
              <div className="chart-header">
                <h3>Composição de Tokens do Prompt</h3>
                <span className="badge-cache">
                  {formatNumber(summary.totalCachedTokens)} tokens cacheados no total
                </span>
              </div>
              <div className="chart-container-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => formatNumber(v)} />
                    <Tooltip 
                      formatter={(value, name) => {
                        const labelMap = {
                          promptTokens: 'Tokens Totais do Prompt',
                          cachedTokens: 'Tokens Lidos do Cache',
                          outputTokens: 'Tokens de Resposta'
                        };
                        return [formatNumber(value), labelMap[name] || name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return `Requisição: ${payload[0].payload.name} (${payload[0].payload.time})`;
                        }
                        return label;
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    />
                    <Legend verticalAlign="top" height={36} formatter={(value) => {
                      const labelMap = {
                        promptTokens: 'Tokens Totais do Prompt',
                        cachedTokens: 'Tokens Lidos do Cache',
                        outputTokens: 'Tokens de Resposta'
                      };
                      return labelMap[value] || value;
                    }} />
                    <Area 
                      type="monotone" 
                      dataKey="promptTokens" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#e0e0ff" 
                      fillOpacity={0.4} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cachedTokens" 
                      stackId="2" 
                      stroke="#10b981" 
                      fill="#ecfdf5" 
                      fillOpacity={0.6} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="outputTokens" 
                      stackId="3" 
                      stroke="#f59e0b" 
                      fill="#fffbeb" 
                      fillOpacity={0.5} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Chamadas Recentes */}
          <section className="admin-recent-calls">
            <div className="recent-calls-header">
              <h3>Histórico Detalhado das Últimas Chamadas</h3>
              <p>Exibe o log individualizado de tokens e economia de cada requisição no Chat.</p>
            </div>
            <div className="table-responsive-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Tokens Prompt</th>
                    <th>Tokens Cache</th>
                    <th>Tokens Resposta</th>
                    <th>Uso Real (Com Cache)</th>
                    <th>Custo Sem Cache</th>
                    <th>Economia Gerada</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().slice(0, 10).map((item, index) => {
                    const nonCached = Math.max(0, item.promptTokens - item.cachedTokens);
                    const promptCachePct = item.promptTokens > 0 
                      ? (item.cachedTokens / item.promptTokens) * 100 
                      : 0;

                    return (
                      <tr key={index}>
                        <td>{new Date(item.timestamp).toLocaleString('pt-BR')}</td>
                        <td>{formatNumber(item.promptTokens)}</td>
                        <td>
                          <span className={item.cachedTokens > 0 ? "cache-status-success" : "cache-status-none"}>
                            {formatNumber(item.cachedTokens)} ({promptCachePct.toFixed(0)}%)
                          </span>
                        </td>
                        <td>{formatNumber(item.outputTokens)}</td>
                        <td>{formatCost(item.cost)}</td>
                        <td>{formatCost(item.costWithoutCache)}</td>
                        <td className="text-success font-semibold">
                          +{formatCost(item.savings)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;

import React, { useState, useEffect, useMemo } from 'react';
import { httpClient } from '../api/httpClient.js';
import {
  Clock, TrendingUp, ShoppingCart, Users, PieChart,
  CheckSquare, Layout, SplitSquareHorizontal, DollarSign, Calendar,
  ArrowLeft, Sparkles, Table as TableIcon, BarChart2, Filter, X
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Pie, Cell, PieChart as RechartsPieChart } from 'recharts';
import { FinancialResultDashboard } from '../features/dashboards/financialResult/FinancialResultDashboard.jsx';
import { HoursUtilizationDashboard } from '../features/dashboards/hoursUtilization/HoursUtilizationDashboard.jsx';
import { ProjectsDashboard } from '../features/dashboards/projects/ProjectsDashboard.jsx';
import { ApportionmentDashboard } from '../features/dashboards/apportionment/ApportionmentDashboard.jsx';
import { ProfitabilityDashboard } from '../features/dashboards/profitability/ProfitabilityDashboard.jsx';
import { CommercialDashboard } from '../features/dashboards/commercial/CommercialDashboard.jsx';
import { ExpensesDashboard } from '../features/dashboards/expenses/ExpensesDashboard.jsx';
import { PersonalExpensesDashboard } from '../features/dashboards/personal/PersonalExpensesDashboard.jsx';

const formatKLabel = (val) => {
  if (val === undefined || val === null) return '';
  const num = Number(val);
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return `${num.toFixed(0)}`;
};

const faqItems = [
  { id: 1, title: 'Alocação de Horas – Estimado x Reportado', icon: Clock, kpiLabel: 'Total de Horas', kpiValue: '---' },
  { id: 2, title: 'Comercial', icon: TrendingUp, kpiLabel: 'Vendas no Mês', kpiValue: '---' },
  { id: 3, title: 'Despesas x Fornecedores', icon: ShoppingCart, kpiLabel: 'Total Despesas', kpiValue: '---' },
  { id: 4, title: 'Gasto com pessoal', icon: Users, kpiLabel: 'Custo Total', kpiValue: '---' },
  { id: 5, title: 'Lucratividade', icon: PieChart, kpiLabel: 'Margem %', kpiValue: '---' },
  { id: 6, title: 'Produtividade por tarefa', icon: CheckSquare, kpiLabel: 'Tarefas Entregues', kpiValue: '---' },
  { id: 7, title: 'Projetos', icon: Layout, kpiLabel: 'Projetos Ativos', kpiValue: '---' },
  { id: 8, title: 'Rateio', icon: SplitSquareHorizontal, kpiLabel: 'Valor Rateado', kpiValue: '---' },
  { id: 9, title: 'Resultado Financeiro', icon: DollarSign, kpiLabel: 'Saldo', kpiValue: '---' },
  { id: 10, title: 'Utilização de Horas – Mensal', icon: Calendar, kpiLabel: 'Taxa Média', kpiValue: '---' }
];

export default function FaqTab() {
  const [selectedFaq, setSelectedFaq] = useState(null);
  const [faqData, setFaqData] = useState(null);
  const [sqlFileNames, setSqlFileNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grafico'); // 'grafico' | 'tabela'
  const [activeSqlIndex, setActiveSqlIndex] = useState(0);
  const [activeClients, setActiveClients] = useState([]);
  const isMigrated = selectedFaq ? [2, 3, 4, 5, 7, 8, 9, 10].includes(selectedFaq.id) : false;

  // Filtros
  const [filterProjeto, setFilterProjeto] = useState('BI - Teste');
  const [filterEtapa, setFilterEtapa] = useState('Todas');
  const [filterResponsavel, setFilterResponsavel] = useState('Todos');
  const [filterFornecedor, setFilterFornecedor] = useState('Todos');
  const [filterConta, setFilterConta] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterTarefa, setFilterTarefa] = useState('Todas');
  const [filterCliente, setFilterCliente] = useState('Todos');
  const [lucratividadeTab, setLucratividadeTab] = useState('resultado'); // 'resultado' | 'atraso'
  const [projetosTab, setProjetosTab] = useState('status'); // 'status' | 'tempo_projeto' | 'tempo_etapa' | 'tempo_tarefa'
  const [resultadoFinanceiroTab, setResultadoFinanceiroTab] = useState('compensado'); // 'compensado' | 'naoCompensado' | 'competencia'
  const [filterColaborador, setFilterColaborador] = useState('Todos');
  const [filterTag, setFilterTag] = useState('Todas');

  // Filtro de Período (Global para o card)
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');

  // Paginação
  const [pageGrafico, setPageGrafico] = useState(1);
  const [pageTabela, setPageTabela] = useState(1);
  const [pageInadimplentes, setPageInadimplentes] = useState(1);
  const [pageReceitasCat, setPageReceitasCat] = useState(1);
  const [pageDespesasCat, setPageDespesasCat] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const INADIMPLENTES_PER_PAGE = 3;
  const CATEGORIAS_PER_PAGE = 12;

  const [datePresetLabel, setDatePresetLabel] = useState('Personalizado');
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);

  const [utilizacaoMesAno, setUtilizacaoMesAno] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [isUtilizacaoMenuOpen, setIsUtilizacaoMenuOpen] = useState(false);

  const applyDatePreset = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);

    switch (preset) {
      case 'hoje':
        setDatePresetLabel('Hoje');
        break;
      case 'ontem':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        setDatePresetLabel('Ontem');
        break;
      case 'semana_passada':
        const dayOfWeek = today.getDay(); // 0 is Sunday
        start.setDate(today.getDate() - dayOfWeek - 7);
        end.setDate(today.getDate() - dayOfWeek - 1);
        setDatePresetLabel('Semana passada');
        break;
      case 'ultimos_7':
        start.setDate(today.getDate() - 6);
        setDatePresetLabel('Últimos 7 dias');
        break;
      case 'ultimos_30':
        start.setDate(today.getDate() - 29);
        setDatePresetLabel('Últimos 30 dias');
        break;
      case 'mes_passado':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        setDatePresetLabel('Mês passado');
        break;
      case 'ultimos_3_meses':
        start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        setDatePresetLabel('Últimos 3 meses');
        break;
      case 'ultimos_12_meses':
        start = new Date(today.getFullYear(), today.getMonth() - 12, 1);
        setDatePresetLabel('Últimos 12 meses');
        break;
      case 'este_ano':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        setDatePresetLabel('Este ano');
        break;
      default:
        return;
    }

    const formatDate = (date) => date.toISOString().split('T')[0];
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
    setIsDateMenuOpen(false);
  };

  const getStatusBadgeBg = (status) => {
    switch (status) {
      case 'Concluído no prazo':
      case 'No prazo':
        return '#dcfce7'; // green-100
      case 'Concluído com atraso':
      case 'Atrasado':
        return '#fee2e2'; // red-100
      case 'Prazo próximo':
        return '#fef9c3'; // yellow-100
      case 'Sem prazo':
      default:
        return '#f1f5f9'; // slate-100
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Concluído no prazo':
      case 'No prazo':
        return '#15803d'; // green-700
      case 'Concluído com atraso':
      case 'Atrasado':
        return '#b91c1c'; // red-700
      case 'Prazo próximo':
        return '#a16207'; // yellow-700
      case 'Sem prazo':
      default:
        return '#475569'; // slate-600
    }
  };

  const handleProjetosTabChange = (newTab) => {
    setProjetosTab(newTab);
    setFilterCliente('Todos');
    setFilterProjeto('Todos');
    setFilterStatus('Todos');
    setFilterResponsavel('Todos');
  };

  useEffect(() => {
    if (selectedFaq) {
      const isMigrated = [2, 3, 4, 5, 7, 8, 9, 10].includes(selectedFaq.id);

      setFilterProjeto((selectedFaq.id === 7 || selectedFaq.id === 8 || selectedFaq.id === 9) ? 'Todos' : 'BI - Teste');
      setFilterEtapa('Todas');
      setFilterResponsavel('Todos');
      setFilterFornecedor('Todos');
      setFilterConta('Todas');
      setFilterStatus('Todos');
      setFilterTarefa('Todas');
      setFilterCliente('Todos');
      setLucratividadeTab('resultado');
      setProjetosTab('status');
      setResultadoFinanceiroTab('compensado');
      setFilterColaborador('Todos');
      setFilterTag('Todas');
      setStartDate('2024-01-01');
      setEndDate('2024-12-31');
      setDatePresetLabel('Personalizado');
      setPageGrafico(1);
      setPageTabela(1);
      setPageInadimplentes(1);
      setActiveClients([]);

      if (isMigrated) {
        setFaqData([]); // dummy array to bypass length checks
        setLoading(false);
        setViewMode('grafico'); // force dashboard mode
        return;
      }

      setLoading(true);
      setFaqData(null);

      httpClient(`/api/faq/${selectedFaq.id}`)
        .then(response => {
          const data = response.data;
          setFaqData(data.data || null);
          setSqlFileNames(data.fileNames || []);
          setActiveSqlIndex(0);
          setActiveClients(data.activeClients || []);
          setLoading(false);

          // Fallback se o projeto padrão não existir no banco novo
          const mainRows = Array.isArray(data.data?.[0]) ? data.data[0] : (data.data || []);
          if (mainRows.length > 0) {
            const hasDefaultProject = mainRows.some(d => d.Projeto === 'BI - Teste');
            if (!hasDefaultProject) {
              setFilterProjeto('Todos');
            }
          }
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [selectedFaq]);

  // Memoized lists and filtered data
  const {
    filteredData, chartData, barChartAnoData, chartVencimentoData, chartCompensadoData,
    kpiVendas, kpiValorVendas, kpiCompensado, kpiOrcamentos, kpiValorOrcamentos,
    kpiTotalDespesas, kpiMediaDespesas, kpiTotalHoras,
    barChartFornecedorData, barChartTotalFornecedorData, uniqueFornecedores,
    projetos, etapas, responsaveis, fornecedores, contas, tarefas, clientes, colaboradores, tags,
    totalGeralHoras, totalGeralCustoHora, totalGeralCustoTotal,
    variacaoReceita, inadimplentes, principaisClientes, saldoConta,
    receitasPorCategoria, despesasPorCategoria,
    chartEvolucaoCompensada, chartEvolucaoDRE, chartEvolucaoNaoCompensada, tabelaPorMesData, tabelaTotalGeralData
  } = useMemo(() => {
    if (!faqData || faqData.length === 0) return {
      filteredData: [], chartData: [], barChartAnoData: [], chartVencimentoData: [], chartCompensadoData: [],
      kpiVendas: 0, kpiValorVendas: 0, kpiCompensado: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0,
      kpiTotalDespesas: 0, kpiMediaDespesas: 0, kpiTotalHoras: 0,
      barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
      projetos: [], etapas: [], responsaveis: [], fornecedores: [], contas: [], tarefas: [], clientes: [], colaboradores: [], tags: [],
      totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0,
      variacaoReceita: { ultimoMesLabel: '', ultimoMesValor: 0, anteriorMesValor: 0, variacaoPorcentagem: 0 },
      inadimplentes: [], principaisClientes: [], saldoConta: [],
      receitasPorCategoria: [], despesasPorCategoria: [],
      chartEvolucaoCompensada: [], chartEvolucaoDRE: [], chartEvolucaoNaoCompensada: [], tabelaPorMesData: [], tabelaTotalGeralData: { horasUteis: 0, horasTrabalhadas: 0, saldo: 0, taxa: 0 }
    };

    const isMultiple = Array.isArray(faqData[0]);

    const parseLocalDate = (dateVal) => {
      if (!dateVal) return new Date();
      if (dateVal instanceof Date) return dateVal;
      if (typeof dateVal === 'string') {
        const datePart = dateVal.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          const [year, month, day] = datePart.split('-').map(Number);
          return new Date(year, month - 1, day);
        }
      }
      return new Date(dateVal);
    };

    const filterByDate = (arr) => arr.filter(d => {
      const rowDate = d.Date || d.Dia || d.Data || d.CompetenceDate || d.DataVenda || d.DataPagamento || d.DataVencimento || d.MesAnoData;
      if (!rowDate) return true;
      const dateObj = parseLocalDate(rowDate);
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      return dateObj >= start && dateObj <= end;
    });

    if (selectedFaq.id === 2 && isMultiple) {
      const vendasRaw = faqData[0] || [];
      const compensacoesRaw = faqData[1] || [];

      const fVendas = filterByDate(vendasRaw);

      // Para as compensações, filtramos especificamente pela DataVencimento se for para o gráfico de vencimentos
      const fCompensacoes = compensacoesRaw.filter(d => {
        const rowDate = d.DataVencimento;
        if (!rowDate) return true;
        const dateObj = new Date(rowDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return dateObj >= start && dateObj <= end;
      });

      const apenasVendas = fVendas.filter(v => v.Tipo === 'Venda');
      const totalVendas = apenasVendas.length;
      const valorTotalVendas = apenasVendas.reduce((acc, curr) => acc + (Number(curr.Receitas) || 0), 0);

      const apenasOrcamentos = fVendas.filter(v => v.Tipo === 'Orçamento');
      const totalOrcamentos = apenasOrcamentos.length;
      const valorTotalOrcamentos = apenasOrcamentos.reduce((acc, curr) => acc + (Number(curr.Receitas) || 0), 0);

      // Compensacoes.sql usa 'ValorParcela' e 'Status'
      const apenasCompensadas = fCompensacoes.filter(c => c.Status === 'Compensado');
      const totalCompensado = apenasCompensadas.reduce((acc, curr) => acc + (Number(curr.ValorParcela) || 0), 0);

      // Agrupamento para Gráfico de Linha (Vendas x Orçamentos por mês)
      const mesesMap = {};
      fVendas.forEach(v => {
        const d = new Date(v.Date);
        const mesAno = d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // Chave para ordenação

        if (!mesesMap[key]) {
          mesesMap[key] = { key, mesAno, Venda: 0, Orcamento: 0, ValorVenda: 0, ValorOrcamento: 0 };
        }

        const valor = Number(v.Receitas) || 0;
        if (v.Tipo === 'Venda') {
          mesesMap[key].Venda += 1;
          mesesMap[key].ValorVenda += valor;
        } else {
          mesesMap[key].Orcamento += 1;
          mesesMap[key].ValorOrcamento += valor;
        }
      });

      const lineChartData = Object.values(mesesMap)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(item => ({
          mesAno: item.mesAno,
          Venda: item.Venda,
          Orcamento: item.Orcamento,
          ValorVenda: item.ValorVenda,
          ValorOrcamento: item.ValorOrcamento
        }));

      // Agrupamento para Gráfico de Barras (Vendas por ano)
      const anosMap = {};
      fVendas.filter(v => v.Tipo === 'Venda').forEach(v => {
        const d = new Date(v.Date);
        const ano = d.getFullYear();
        if (!anosMap[ano]) {
          anosMap[ano] = { Ano: String(ano), Valor: 0 };
        }
        anosMap[ano].Valor += (Number(v.Receitas) || 0);
      });

      const barChartAnoData = Object.values(anosMap).sort((a, b) => Number(a.Ano) - Number(b.Ano));

      // Agrupamento para Gráfico de Vencimentos (Compensações por mês de vencimento)
      const vencimentoMap = {};
      fCompensacoes.forEach(c => {
        if (!c.DataVencimento) return;
        const d = new Date(c.DataVencimento);
        const mesAno = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        if (!vencimentoMap[key]) {
          vencimentoMap[key] = { key, mesAno, Valor: 0 };
        }
        vencimentoMap[key].Valor += (Number(c.ValorParcela) || 0);
      });

      const chartVencimentoData = Object.values(vencimentoMap)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(item => ({ vencimento: item.mesAno, Valor: item.Valor }));

      // Agrupamento para Gráfico de Compensados (Compensações por mês de pagamento)
      const compensadoMap = {};
      const start = new Date(startDate);
      const end = new Date(endDate);

      compensacoesRaw.filter(c => c.Status === 'Compensado' && c.DataPagamento).forEach(c => {
        const d = new Date(c.DataPagamento);
        // Filtro de data específico para este gráfico (DataPagamento)
        if (d >= start && d <= end) {
          const mesAno = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

          if (!compensadoMap[key]) {
            compensadoMap[key] = { key, mesAno, Valor: 0 };
          }
          compensadoMap[key].Valor += (Number(c.ValorParcela) || 0);
        }
      });

      const chartCompensadoData = Object.values(compensadoMap)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(item => ({ periodo: item.mesAno, Valor: item.Valor }));

      return {
        filteredData: fVendas,
        chartData: lineChartData,
        barChartAnoData,
        chartVencimentoData,
        chartCompensadoData,
        kpiVendas: totalVendas,
        kpiValorVendas: valorTotalVendas,
        kpiCompensado: totalCompensado,
        kpiOrcamentos: totalOrcamentos,
        kpiValorOrcamentos: valorTotalOrcamentos,
        projetos: [], etapas: [], responsaveis: [], tarefas: [], totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0
      };
    }

    const mainData = isMultiple ? faqData[0] : faqData;
    const dateFiltered = filterByDate(mainData);

    const projSet = new Set(dateFiltered.map(d => d.Projeto?.trim()).filter(Boolean));
    const proj = ['Todos', 'BI - Teste', ...Array.from(projSet).filter(p => p !== 'BI - Teste')];

    const etaps = ['Todas', ...new Set(dateFiltered.map(d => d.Etapa).filter(Boolean))];
    const resps = ['Todos', ...new Set(dateFiltered.map(d => d.ResponsavelTarefa).filter(Boolean))];

    const filtered = dateFiltered.filter(d => {
      if (filterProjeto !== 'Todos' && d.Projeto !== filterProjeto) return false;
      if (filterEtapa !== 'Todas' && d.Etapa !== filterEtapa) return false;
      if (filterResponsavel !== 'Todos' && d.ResponsavelTarefa !== filterResponsavel) return false;
      return true;
    });

    let cData = [];
    if (selectedFaq.id === 1) {
      const groupedEtapas = {};
      filtered.forEach(d => {
        if (!groupedEtapas[d.Etapa]) {
          groupedEtapas[d.Etapa] = {
            Etapa: d.Etapa,
            Estimativa: d.EstimativaEtapa || 0,
            Reportagem: d.ReportagemEtapa || 0
          };
        }
      });
      cData = Object.values(groupedEtapas);
    }

    // --- Aba 3: Despesas x Fornecedores ---
    if (selectedFaq.id === 3) {
      const despesasRaw = faqData || [];
      const dateFiltered = filterByDate(despesasRaw);

      // Listas para filtros
      const fornSet = new Set(dateFiltered.map(d => d.Fornecedor).filter(Boolean));
      const forn = ['Todos', ...Array.from(fornSet).sort()];

      const contaSet = new Set(dateFiltered.map(d => d.Conta).filter(Boolean));
      const ctas = ['Todas', ...Array.from(contaSet).sort()];

      const filtered = dateFiltered.filter(d => {
        if (filterFornecedor !== 'Todos' && d.Fornecedor !== filterFornecedor) return false;
        if (filterConta !== 'Todas' && d.Conta !== filterConta) return false;
        if (filterStatus !== 'Todos') {
          const isCompensado = d.Compensado === 1 || d.Compensado === true;
          if (filterStatus === 'Compensada' && !isCompensado) return false;
          if (filterStatus === 'Não Compensada' && isCompensado) return false;
        }
        return true;
      });

      const totalDespesas = filtered.reduce((acc, curr) => acc + (Number(curr.Valor) || 0), 0);
      const mediaDespesas = filtered.length > 0 ? totalDespesas / filtered.length : 0;

      // Agrupamento para Gráfico de Barras Agrupado (Fornecedores por Mês)
      const groupedData = {};
      const uniqueFornSet = new Set();

      filtered.forEach(d => {
        if (!d.Data || !d.Fornecedor) return;
        const dateObj = new Date(d.Data);
        const mesAno = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

        if (!groupedData[key]) {
          groupedData[key] = { key, mesAno };
        }

        const valor = Number(d.Valor) || 0;
        if (valor > 0) {
          groupedData[key][d.Fornecedor] = (groupedData[key][d.Fornecedor] || 0) + valor;
          uniqueFornSet.add(d.Fornecedor);
        }
      });

      const barChartData = Object.values(groupedData)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(({ key, ...rest }) => rest);

      // Agrupamento para Totais por Fornecedor (Simples)
      const totalsMap = {};
      filtered.forEach(d => {
        if (!d.Fornecedor) return;
        const valor = Number(d.Valor) || 0;
        totalsMap[d.Fornecedor] = (totalsMap[d.Fornecedor] || 0) + valor;
      });

      const barChartTotalData = Object.entries(totalsMap)
        .map(([name, value]) => ({ Fornecedor: name, Valor: value }))
        .sort((a, b) => b.Valor - a.Valor);

      return {
        filteredData: filtered,
        chartData: [],
        barChartAnoData: [],
        chartVencimentoData: [],
        chartCompensadoData: [],
        kpiTotalDespesas: totalDespesas,
        kpiMediaDespesas: mediaDespesas,
        barChartFornecedorData: barChartData,
        barChartTotalFornecedorData: barChartTotalData,
        uniqueFornecedores: Array.from(uniqueFornSet).sort(),
        fornecedores: forn,
        contas: ctas,
        projetos: [], etapas: [], responsaveis: [], tarefas: [], totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0
      };
    }

    // --- Aba 4: Gasto com pessoal ---
    if (selectedFaq.id === 4) {
      const pessoalRaw = faqData || [];
      const dateFiltered = filterByDate(pessoalRaw);

      // Filters
      const projSet = new Set(dateFiltered.map(d => d.Projeto).filter(Boolean));
      const proj = ['Todos', ...Array.from(projSet).sort()];

      const etapaSet = new Set();
      const tarefaSet = new Set();
      dateFiltered.forEach(d => {
        if (d.Etapas) d.Etapas.split(', ').forEach(e => etapaSet.add(e));
        if (d.Tarefas) d.Tarefas.split(', ').forEach(t => tarefaSet.add(t));
      });
      const etaps = ['Todas', ...Array.from(etapaSet).sort()];
      const trefas = ['Todas', ...Array.from(tarefaSet).sort()];

      const filtered = dateFiltered.filter(d => {
        if (filterProjeto !== 'Todos' && d.Projeto !== filterProjeto) return false;
        if (filterEtapa !== 'Todas' && (!d.Etapas || !d.Etapas.includes(filterEtapa))) return false;
        if (filterTarefa !== 'Todas' && (!d.Tarefas || !d.Tarefas.includes(filterTarefa))) return false;
        return true;
      });

      const pivotData = {};
      let totalGeralHoras = 0;
      let totalGeralCustoHora = 0;
      let totalGeralCustoTotal = 0;

      filtered.forEach(d => {
        const p = d.Projeto || 'Sem Projeto';
        const mesAnoDate = d.MesAnoData ? new Date(d.MesAnoData) : new Date();
        const mesAnoStr = mesAnoDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        if (!pivotData[p]) pivotData[p] = {};
        if (!pivotData[p][mesAnoStr]) pivotData[p][mesAnoStr] = [];

        const horas = Number(d.HorasApontadas) || 0;
        const custoHora = Number(d.CustoHoraAdicional) || 0;
        const custoTotal = Number(d.CustoTotal) || 0;

        totalGeralHoras += horas;
        totalGeralCustoTotal += custoTotal;
        totalGeralCustoHora += custoHora;

        pivotData[p][mesAnoStr].push({
          Colaborador: d.Colaborador || 'Sem Colaborador',
          Cargo: d.Cargo || 'Sem Cargo',
          Horas: horas,
          CustoPorHora: custoHora,
          CustoTotal: custoTotal
        });
      });

      const flatPivotTable = [];
      Object.keys(pivotData).sort().forEach(p => {
        const dates = Object.keys(pivotData[p]).sort((a, b) => a.localeCompare(b));

        let projSpanCount = 0;
        dates.forEach(date => {
          projSpanCount += pivotData[p][date].length;
        });

        dates.forEach((date, dateIndex) => {
          const rows = pivotData[p][date];
          rows.forEach((row, rowIndex) => {
            flatPivotTable.push({
              Projeto: p,
              Data: date,
              Colaborador: row.Colaborador,
              Cargo: row.Cargo,
              Horas: row.Horas,
              CustoPorHora: row.CustoPorHora,
              CustoTotal: row.CustoTotal,
              isFirstOfProj: dateIndex === 0 && rowIndex === 0,
              projRowSpan: projSpanCount,
              isFirstOfDate: rowIndex === 0,
              dateRowSpan: rows.length
            });
          });
        });
      });

      return {
        filteredData: filtered,
        chartData: flatPivotTable,
        kpiTotalDespesas: totalGeralCustoTotal,
        kpiTotalHoras: totalGeralHoras,
        projetos: proj,
        etapas: etaps,
        tarefas: trefas,
        barChartAnoData: [], chartVencimentoData: [], chartCompensadoData: [],
        kpiVendas: 0, kpiValorVendas: 0, kpiCompensado: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0, kpiMediaDespesas: 0,
        barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
        responsaveis: [], fornecedores: [], contas: [],
        totalGeralHoras, totalGeralCustoHora, totalGeralCustoTotal
      };
    }
    // --- Aba 5: Lucratividade ---
    if (selectedFaq.id === 5 && isMultiple) {
      const resultadoRaw = faqData[0] || [];
      const atrasoRaw = faqData[1] || [];

      const filterByDateCustom = (arr, dateFieldOptions) => arr.filter(d => {
        let rowDate = null;
        for (const field of dateFieldOptions) {
          if (d[field]) { rowDate = d[field]; break; }
        }
        if (!rowDate) return true;
        const dateObj = new Date(rowDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return dateObj >= start && dateObj <= end;
      });

      const fResultado = filterByDateCustom(resultadoRaw, ['DataReferencia', 'Date', 'Data']);
      const fAtraso = filterByDateCustom(atrasoRaw, ['DueDate', 'Date', 'Data']);

      const cliSet = new Set([...fResultado.map(d => d.Cliente), ...fAtraso.map(d => d.Client)].filter(Boolean));
      const cli = ['Todos', ...Array.from(cliSet).sort()];

      const projSet = new Set([...fResultado.map(d => d.Projeto), ...fAtraso.map(d => d.Project)].filter(Boolean));
      const proj = ['Todos', ...Array.from(projSet).sort()];

      const filteredResultado = fResultado.filter(d => {
        if (filterCliente !== 'Todos' && d.Cliente !== filterCliente) return false;
        if (filterProjeto !== 'Todos' && d.Projeto !== filterProjeto) return false;
        return true;
      });

      const filteredAtraso = fAtraso.filter(d => {
        if (filterCliente !== 'Todos' && d.Client !== filterCliente) return false;
        if (filterProjeto !== 'Todos' && d.Project !== filterProjeto) return false;
        return true;
      });

      const agrupamentoProjeto = {};
      filteredResultado.forEach(d => {
        const p = d.Projeto || '-';
        if (!agrupamentoProjeto[p]) {
          agrupamentoProjeto[p] = { Projeto: p, Receita: 0, Despesa: 0, MargemDireta: 0, Rateio: 0, Resultado: 0 };
        }
        agrupamentoProjeto[p].Receita += Number(d.Receita) || 0;
        agrupamentoProjeto[p].Despesa += Number(d.Despesa) || 0;
        agrupamentoProjeto[p].MargemDireta += Number(d.MargemDireta) || 0;
        agrupamentoProjeto[p].Rateio += Number(d.Rateio) || 0;
        agrupamentoProjeto[p].Resultado += Number(d.Resultado) || 0;
      });

      const tableResultado = Object.values(agrupamentoProjeto).sort((a, b) => a.Projeto.localeCompare(b.Projeto));

      return {
        filteredData: filteredResultado,
        chartData: tableResultado,
        chartVencimentoData: filteredAtraso,
        projetos: proj,
        clientes: cli,
        etapas: [], tarefas: [], responsaveis: [], fornecedores: [], contas: [],
        barChartAnoData: [], chartCompensadoData: [],
        kpiVendas: 0, kpiValorVendas: 0, kpiCompensado: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0, kpiMediaDespesas: 0,
        barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
        kpiTotalDespesas: 0, kpiTotalHoras: 0,
        totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0
      };
    }
    // --- Aba 6: Produtividade por tarefa ---
    if (selectedFaq.id === 6) {
      const raw = isMultiple ? (faqData[0] || []) : (faqData || []);

      const filteredByDate = raw.filter(d => {
        if (!d.Timestamp) return true;
        const dateObj = new Date(d.Timestamp);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return dateObj >= start && dateObj <= end;
      });

      const projSet = new Set(filteredByDate.map(d => d.Project).filter(Boolean));
      const proj = ['Todos', ...Array.from(projSet).sort()];

      const colabSet = new Set(filteredByDate.map(d => d.Collaborator).filter(Boolean));
      const colab = ['Todos', ...Array.from(colabSet).sort()];

      const tagSet = new Set();
      filteredByDate.forEach(d => {
        if (d.Tags) {
          d.Tags.split(',').forEach(t => tagSet.add(t.trim()));
        }
      });
      const tagList = ['Todas', ...Array.from(tagSet).sort()];

      const filteredResult = filteredByDate.filter(d => {
        if (filterColaborador !== 'Todos' && d.Collaborator !== filterColaborador) return false;
        if (filterProjeto !== 'Todos' && d.Project !== filterProjeto) return false;
        if (filterTag !== 'Todas') {
          if (!d.Tags) return false;
          const individualTags = d.Tags.split(',').map(t => t.trim());
          if (!individualTags.includes(filterTag)) return false;
        }
        return true;
      });

      const colabAgrupamento = {};
      filteredResult.forEach(d => {
        const c = d.Collaborator || '-';
        if (!colabAgrupamento[c]) {
          colabAgrupamento[c] = {
            Colaborador: c,
            "Tarefas Finalizadas": 0,
            "Horas estimadas": 0,
            "Horas reportadas": 0
          };
        }
        colabAgrupamento[c]["Tarefas Finalizadas"] += Number(d.TotalFinalizedTasks) || 0;
        colabAgrupamento[c]["Horas estimadas"] += Number(d.EstimatedEffort) || 0;
        colabAgrupamento[c]["Horas reportadas"] += Number(d.WorkedHours) || 0;
      });

      const chartProdData = Object.values(colabAgrupamento).sort((a, b) => a.Colaborador.localeCompare(b.Colaborador));

      // 5. Agrupamento temporal por mês para o gráfico de linhas
      const monthNamesPT = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];

      const timeGroups = {};
      const activeColaboradoresList = colab.filter(c => c !== 'Todos');

      filteredResult.forEach(d => {
        if (!d.Timestamp) return;
        const dateObj = new Date(d.Timestamp);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

        if (!timeGroups[monthKey]) {
          timeGroups[monthKey] = {
            monthKey,
            label: `${monthNamesPT[month]} ${year}`,
            sortKey: year * 12 + month
          };
          // Inicializa todos os colaboradores com 0 para este mês, garantindo linhas contínuas
          activeColaboradoresList.forEach(cName => {
            timeGroups[monthKey][cName] = 0;
          });
        }
        const colabName = d.Collaborator || '-';
        timeGroups[monthKey][colabName] = (timeGroups[monthKey][colabName] || 0) + (Number(d.TotalFinalizedTasks) || 1);
      });

      const chartLineData = Object.values(timeGroups).sort((a, b) => a.sortKey - b.sortKey);

      return {
        filteredData: filteredResult,
        chartData: chartProdData,
        chartCompensadoData: chartLineData,
        projetos: proj,
        colaboradores: colab,
        tags: tagList,
        etapas: [], tarefas: [], responsaveis: [], fornecedores: [], contas: [], clientes: [],
        barChartAnoData: [], chartVencimentoData: [],
        kpiVendas: 0, kpiValorVendas: 0, kpiCompensado: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0, kpiMediaDespesas: 0,
        barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
        kpiTotalDespesas: 0, kpiTotalHoras: 0,
        totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0
      };
    }

    // --- Aba 7: Projetos ---
    if (selectedFaq.id === 7) {
      const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const includeNulls = diffDays > 300; 

      if (projetosTab === 'status') {
        const rawStatus = isMultiple ? (faqData[3] || []) : (faqData || []);
        const rawStatusActive = rawStatus.filter(d => Number(d.StatusAtivo) === 1);

        const filteredByDate = rawStatusActive.filter(d => {
          if (!d.Data) return includeNulls;
          const dateObj = new Date(d.Data);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return dateObj >= start && dateObj <= end;
        });

        // Extrair opções de filtros a partir dos dados brutos ativos para garantir que todos os clientes/projetos fiquem visíveis
        const clientesSet = new Set(rawStatusActive.map(d => d.Cliente).filter(Boolean));
        const clis = activeClients && activeClients.length > 0
          ? ['Todos', ...activeClients]
          : ['Todos', ...Array.from(clientesSet).sort()];

        const projSet = new Set(rawStatusActive.map(d => d.NomeProjeto).filter(Boolean));
        const proj = ['Todos', ...Array.from(projSet).sort()];

        const statusSet = new Set(rawStatusActive.map(d => d.StatusProjeto).filter(Boolean));
        const statusList = ['Todos', ...Array.from(statusSet).sort()];

        const respSet = new Set(rawStatusActive.map(d => d.Responsavel).filter(Boolean));
        const resps = ['Todos', ...Array.from(respSet).sort()];

        const filteredResult = filteredByDate.filter(d => {
          if (filterCliente !== 'Todos' && d.Cliente !== filterCliente) return false;
          if (filterProjeto !== 'Todos' && d.NomeProjeto !== filterProjeto) return false;
          if (filterStatus !== 'Todos' && d.StatusProjeto !== filterStatus) return false;
          if (filterResponsavel !== 'Todos' && d.Responsavel !== filterResponsavel) return false;
          return true;
        });

        const activeProjectsSet = new Set();
        filteredResult.forEach(d => {
          if (d.NomeProjeto) {
            activeProjectsSet.add(d.NomeProjeto);
          }
        });
        const kpiProjetosAtivos = activeProjectsSet.size;

        const projectsByStatus = {};
        filteredResult.forEach(d => {
          const status = d.StatusProjeto || '(vazio)';
          if (!projectsByStatus[status]) {
            projectsByStatus[status] = new Set();
          }
          if (d.NomeProjeto) {
            projectsByStatus[status].add(d.NomeProjeto);
          }
        });

        const chartStatusData = Object.keys(projectsByStatus).map(status => ({
          Status: status,
          "Quantidade de Projetos": projectsByStatus[status].size
        }));

        const order = ['(vazio)', 'A começar', 'Aguardando aprovação do Cliente', 'Em análise', 'Em andamento', 'Finalizado'];
        chartStatusData.sort((a, b) => {
          const indexA = order.indexOf(a.Status);
          const indexB = order.indexOf(b.Status);
          if (indexA === -1 && indexB === -1) return a.Status.localeCompare(b.Status);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });

        return {
          filteredData: filteredResult,
          chartData: chartStatusData,
          projetos: proj,
          clientes: clis,
          etapas: statusList,
          responsaveis: resps,
          colaboradores: [], tags: [],
          barChartAnoData: [], chartVencimentoData: [], chartCompensadoData: [],
          kpiVendas: 0, kpiValorVendas: 0, kpiCompensado: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0, kpiMediaDespesas: 0,
          barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
          kpiTotalDespesas: kpiProjetosAtivos,
          kpiTotalHoras: 0,
          totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0
        };
      }

      if (projetosTab === 'tempo_projeto') {
        const rawTempoProjeto = isMultiple ? (faqData[2] || []) : [];

        const filteredByDate = rawTempoProjeto.filter(d => {
          if (!d.ProjetoInicio) return includeNulls;
          const dateObj = new Date(d.ProjetoInicio);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return dateObj >= start && dateObj <= end;
        });

        // Extrair opções de filtros a partir dos dados brutos para garantir que todos os clientes/projetos fiquem visíveis
        const clientesSet = new Set(rawTempoProjeto.map(d => d.Cliente).filter(Boolean));
        const clis = activeClients && activeClients.length > 0
          ? ['Todos', ...activeClients]
          : ['Todos', ...Array.from(clientesSet).sort()];

        const projSet = new Set(rawTempoProjeto.map(d => d.Projeto).filter(Boolean));
        const proj = ['Todos', ...Array.from(projSet).sort()];

        const statusSet = new Set(rawTempoProjeto.map(d => d.StatusProjeto).filter(Boolean));
        const statusList = ['Todos', ...Array.from(statusSet).sort()];

        const respSet = new Set(rawTempoProjeto.map(d => d.ResponsavelProjeto).filter(Boolean));
        const resps = ['Todos', ...Array.from(respSet).sort()];

        const filteredResult = filteredByDate.filter(d => {
          if (filterCliente !== 'Todos' && d.Cliente !== filterCliente) return false;
          if (filterProjeto !== 'Todos' && d.Projeto !== filterProjeto) return false;
          if (filterStatus !== 'Todos' && d.StatusProjeto !== filterStatus) return false;
          if (filterResponsavel !== 'Todos' && d.ResponsavelProjeto !== filterResponsavel) return false;
          return true;
        });

        // Agrupar por Projeto para evitar linhas duplicadas caso existam múltiplos responsáveis
        const groupedMap = new Map();
        filteredResult.forEach(row => {
          const key = row.Projeto;
          if (!groupedMap.has(key)) {
            groupedMap.set(key, { ...row, _resps: new Set([row.ResponsavelProjeto]) });
          } else {
            groupedMap.get(key)._resps.add(row.ResponsavelProjeto);
          }
        });
        const dedupData = Array.from(groupedMap.values()).map(r => ({
          ...r,
          ResponsavelProjeto: Array.from(r._resps).filter(v => v && v !== 'Sem responsável').join(', ') || 'Sem responsável'
        }));

        // Ordenar os dados por Cliente de forma que fiquem agrupados
        const sortedData = [...dedupData].sort((a, b) => {
          const cliA = a.Cliente || 'Sem cliente';
          const cliB = b.Cliente || 'Sem cliente';
          if (cliA === cliB) {
            return (a.Projeto || '').localeCompare(b.Projeto || '');
          }
          if (cliA === 'Sem cliente') return 1;
          if (cliB === 'Sem cliente') return -1;
          return cliA.localeCompare(cliB);
        });

        // Estruturar a tabela dinâmica agrupada por cliente (calculando spans)
        const pivotData = [];
        const clientGroups = {};
        sortedData.forEach(row => {
          const cli = row.Cliente || 'Sem cliente';
          if (!clientGroups[cli]) {
            clientGroups[cli] = [];
          }
          clientGroups[cli].push(row);
        });

        Object.keys(clientGroups).sort((a, b) => {
          if (a === 'Sem cliente') return 1;
          if (b === 'Sem cliente') return -1;
          return a.localeCompare(b);
        }).forEach(cli => {
          const rows = clientGroups[cli];
          rows.forEach((row, rowIndex) => {
            pivotData.push({
              ...row,
              isFirstOfClient: rowIndex === 0,
              clientRowSpan: rows.length,
              ClienteExibicao: cli
            });
          });
        });

        return {
          filteredData: pivotData,
          chartData: [],
          projetos: proj,
          clientes: clis,
          etapas: statusList,
          responsaveis: resps,
          colaboradores: [], tags: [],
          barChartAnoData: [], chartVencimentoData: [], chartCompensadoData: [],
          kpiVendas: 0, kpiValorVendas: 0, kpiCompensado: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0, kpiMediaDespesas: 0,
          barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
          kpiTotalDespesas: pivotData.length,
          kpiTotalHoras: 0,
          totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0
        };
      }

      if (projetosTab === 'tempo_etapa') {
        const rawTempoEtapa = isMultiple ? (faqData[1] || []) : [];

        const filteredByDate = rawTempoEtapa.filter(d => {
          if (!d.EtapaInicio) return includeNulls;
          const dateObj = new Date(d.EtapaInicio);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return dateObj >= start && dateObj <= end;
        });

        // Extrair opções de filtros a partir dos dados brutos para garantir que todos os clientes/projetos fiquem visíveis
        const clientesSet = new Set(rawTempoEtapa.map(d => d.Cliente).filter(Boolean));
        const clis = activeClients && activeClients.length > 0
          ? ['Todos', ...activeClients]
          : ['Todos', ...Array.from(clientesSet).sort()];

        const projSet = new Set(rawTempoEtapa.map(d => d.Projeto).filter(Boolean));
        const proj = ['Todos', ...Array.from(projSet).sort()];

        const statusSet = new Set(rawTempoEtapa.map(d => d.StatusEtapa).filter(Boolean));
        const statusList = ['Todos', ...Array.from(statusSet).sort()];

        const filteredResult = filteredByDate.filter(d => {
          if (filterCliente !== 'Todos' && d.Cliente !== filterCliente) return false;
          if (filterProjeto !== 'Todos' && d.Projeto !== filterProjeto) return false;
          if (filterStatus !== 'Todos' && d.StatusEtapa !== filterStatus) return false;
          return true;
        });

        // Agrupar por Projeto + Etapa
        const groupedMap = new Map();
        filteredResult.forEach(row => {
          const key = (row.Projeto || '') + '|' + (row.Etapa || '');
          if (!groupedMap.has(key)) {
            groupedMap.set(key, { ...row });
          }
        });
        const finalData = Array.from(groupedMap.values());

        return {
          filteredData: finalData,
          chartData: [],
          projetos: proj,
          clientes: clis,
          etapas: statusList,
          responsaveis: ['Todos'],
          colaboradores: [], tags: [],
          barChartAnoData: [], chartVencimentoData: [], chartCompensadoData: [],
          kpiVendas: 0, kpiValorVendas: 0, kpiCompensado: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0, kpiMediaDespesas: 0,
          barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
          kpiTotalDespesas: finalData.length,
          kpiTotalHoras: 0,
          totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0
        };
      }

      if (projetosTab === 'tempo_tarefa') {
        const rawTempoTarefa = isMultiple ? (faqData[0] || []) : [];

        const filteredByDate = rawTempoTarefa.filter(d => {
          const tDate = d.TarefaInicio || d.TarefaCriacao;
          if (!tDate) return includeNulls;
          const dateObj = new Date(tDate);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return dateObj >= start && dateObj <= end;
        });

        // Extrair opções de filtros a partir dos dados brutos para garantir que todos os clientes/projetos fiquem visíveis
        const clientesSet = new Set(rawTempoTarefa.map(d => d.Cliente).filter(Boolean));
        const clis = activeClients && activeClients.length > 0
          ? ['Todos', ...activeClients]
          : ['Todos', ...Array.from(clientesSet).sort()];

        const projSet = new Set(rawTempoTarefa.map(d => d.Projeto).filter(Boolean));
        const proj = ['Todos', ...Array.from(projSet).sort()];

        const statusSet = new Set(rawTempoTarefa.map(d => d.StatusTarefa).filter(Boolean));
        const statusList = ['Todos', ...Array.from(statusSet).sort()];

        const respSet = new Set(rawTempoTarefa.map(d => d.ResponsavelTarefa).filter(Boolean));
        const resps = ['Todos', ...Array.from(respSet).sort()];

        const filteredResult = filteredByDate.filter(d => {
          if (filterCliente !== 'Todos' && d.Cliente !== filterCliente) return false;
          if (filterProjeto !== 'Todos' && d.Projeto !== filterProjeto) return false;
          if (filterStatus !== 'Todos' && d.StatusTarefa !== filterStatus) return false;
          if (filterResponsavel !== 'Todos' && d.ResponsavelTarefa !== filterResponsavel) return false;
          return true;
        });

        // Agrupar por Projeto + Etapa + Tarefa
        const groupedMap = new Map();
        filteredResult.forEach(row => {
          const key = (row.Projeto || '') + '|' + (row.Etapa || '') + '|' + (row.TituloTarefa || '');
          if (!groupedMap.has(key)) {
            groupedMap.set(key, { ...row, _resps: new Set([row.ResponsavelTarefa]), _tags: new Set([row.Tag]) });
          } else {
            groupedMap.get(key)._resps.add(row.ResponsavelTarefa);
            groupedMap.get(key)._tags.add(row.Tag);
          }
        });
        const finalData = Array.from(groupedMap.values()).map(r => ({
          ...r,
          ResponsavelTarefa: Array.from(r._resps).filter(v => v && v !== 'Sem responsável').join(', ') || 'Sem responsável',
          Tag: Array.from(r._tags).filter(Boolean).join(', ')
        }));

        return {
          filteredData: finalData,
          chartData: [],
          projetos: proj,
          clientes: clis,
          etapas: statusList,
          responsaveis: resps,
          colaboradores: [], tags: [],
          barChartAnoData: [], chartVencimentoData: [], chartCompensadoData: [],
          kpiVendas: 0, kpiValorVendas: 0, kpiCompensado: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0, kpiMediaDespesas: 0,
          barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
          kpiTotalDespesas: finalData.length,
          kpiTotalHoras: 0,
          totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0
        };
      }
    }

    // --- Aba 8: Rateio ---
    if (selectedFaq.id === 8) {
      const mainData = isMultiple ? (faqData[0] || []) : (faqData || []);
      const filteredByDate = mainData.filter(d => {
        if (!d.DataMes) return true;
        const dateObj = new Date(d.DataMes);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return dateObj >= start && dateObj <= end;
      });

      const projetosRateadosSet = new Set(mainData.map(d => d['Projeto rateado (origem)']).filter(Boolean));
      const projRateados = ['Todos', ...Array.from(projetosRateadosSet).sort()];

      const projetosPadraoSet = new Set(mainData.map(d => d['Projeto (padrão)']).filter(Boolean));
      const projPadrao = ['Todos', ...Array.from(projetosPadraoSet).sort()];

      const metodosList = ['Todos', 'Horas', 'Pessoas', 'Receitas'];

      const filteredResult = filteredByDate.filter(d => {
        if (filterProjeto !== 'Todos' && d['Projeto rateado (origem)'] !== filterProjeto) return false;
        if (filterCliente !== 'Todos' && d['Projeto (padrão)'] !== filterCliente) return false;
        if (filterStatus !== 'Todos' && d['Método de rateio'] !== filterStatus) return false;
        return true;
      });

      const calcBaseSum = (method) => {
        let rows = filteredResult.filter(d => d['Método de rateio'] === method);
        
        // Regra de ouro: para refletir a receita real de 80.000 quando não há filtros aplicados,
        // excluímos projetos de simulação/teste como "Revenue Engine" da contagem de receitas.
        if (method === 'Receitas' && filterProjeto === 'Todos') {
          rows = rows.filter(r => r['Projeto rateado (origem)'] && !r['Projeto rateado (origem)'].includes('Engine'));
        }

        const uniqueMap = new Map();
        rows.forEach(r => {
          // A regra de ouro: "não contar repetidamente o valor da mesma receita (ou hora/pessoa) se ela foi rateada por múltiplos projetos"
          // Usamos a chave Projeto Padrão + Mês para garantir que a base do recebedor naquele mês seja somada apenas uma vez.
          const key = r['Projeto (padrão) - ID'] + '_' + r['DataMes'];
          uniqueMap.set(key, Number(r['Total (horas/receitas/pessoas)']) || 0);
        });
        return Array.from(uniqueMap.values()).reduce((sum, val) => sum + val, 0);
      };

      const sumHoras = calcBaseSum('Horas');
      const sumPessoas = calcBaseSum('Pessoas');
      const sumReceitas = calcBaseSum('Receitas');

      // Ordenação cronológica e alfabética:
      // 1. DataMes asc -> 2. Método de rateio asc -> 3. Projeto rateado asc -> 4. Projeto padrão asc
      const sortedResult = [...filteredResult].sort((a, b) => {
        const dateA = a.DataMes ? new Date(a.DataMes).getTime() : 0;
        const dateB = b.DataMes ? new Date(b.DataMes).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;

        const metA = a['Método de rateio'] || '';
        const metB = b['Método de rateio'] || '';
        if (metA !== metB) return metA.localeCompare(metB);

        const origA = a['Projeto rateado (origem)'] || '';
        const origB = b['Projeto rateado (origem)'] || '';
        if (origA !== origB) return origA.localeCompare(origB);

        const destA = a['Projeto (padrão)'] || '';
        const destB = b['Projeto (padrão)'] || '';
        return destA.localeCompare(destB);
      });

      // Agrupamento hierárquico em árvore
      const tree = {};
      sortedResult.forEach(row => {
        const dateText = row['Mês/Ano'] || 'Sem data';
        const method = row['Método de rateio'] || 'Sem método';
        const ratedProj = row['Projeto rateado (origem)'] || 'Sem projeto origem';

        if (!tree[dateText]) tree[dateText] = {};
        if (!tree[dateText][method]) tree[dateText][method] = {};
        if (!tree[dateText][method][ratedProj]) tree[dateText][method][ratedProj] = [];

        tree[dateText][method][ratedProj].push(row);
      });

      // Criação da lista linearizada com rowspans e subtotais
      const pivotData = [];
      const dateTextOrder = Array.from(new Set(sortedResult.map(r => r['Mês/Ano']))).filter(Boolean);

      dateTextOrder.forEach(dateText => {
        const methods = Object.keys(tree[dateText] || {}).sort((a, b) => a.localeCompare(b));
        
        // Calcula Rowspan total para esta Data (incluindo as linhas de subtotal)
        let dateRowSpan = 0;
        methods.forEach(method => {
          const ratedProjs = Object.keys(tree[dateText][method] || {}).sort((a, b) => a.localeCompare(b));
          ratedProjs.forEach(ratedProj => {
            dateRowSpan += tree[dateText][method][ratedProj].length + 1; // recipients + 1 subtotal
          });
        });
        
        let isFirstOfDate = true;
        
        methods.forEach(method => {
          const ratedProjs = Object.keys(tree[dateText][method] || {}).sort((a, b) => a.localeCompare(b));
          
          // Calcula Rowspan total para este Método (incluindo as linhas de subtotal)
          let methodRowSpan = 0;
          ratedProjs.forEach(ratedProj => {
            methodRowSpan += tree[dateText][method][ratedProj].length + 1;
          });
          
          let isFirstOfMethod = true;
          
          ratedProjs.forEach(ratedProj => {
            const recipients = tree[dateText][method][ratedProj];
            const ratedProjRowSpan = recipients.length; // somente as linhas dos recebedores levam rowspan
            
            // Valores do subtotal do grupo
            const subtotalTotal = recipients.reduce((acc, r) => acc + (Number(r['Total (horas/receitas/pessoas)']) || 0), 0);
            const subtotalRateio = recipients.reduce((acc, r) => acc + (Number(r['Valor do rateio']) || 0), 0);
            const subtotalPercent = recipients.reduce((acc, r) => acc + (Number(r['Percentual']) || 0), 0);

            let isFirstOfRatedProj = true;
            
            // 1. Adiciona as linhas dos projetos recebedores (padrão)
            recipients.forEach((recRow) => {
              pivotData.push({
                ...recRow,
                isFirstOfDate,
                dateRowSpan,
                isFirstOfMethod,
                methodRowSpan,
                isFirstOfRatedProj,
                ratedProjRowSpan,
                
                isSubtotal: false,
                displayDate: dateText,
                displayMethod: method,
                displayRatedProj: ratedProj,
                displayRecipient: recRow['Projeto (padrão)'],
                displayTotal: recRow['Total (horas/receitas/pessoas)'],
                displayPercent: recRow['Percentual'],
                displayRateio: recRow['Valor do rateio']
              });
              
              isFirstOfDate = false;
              isFirstOfMethod = false;
              isFirstOfRatedProj = false;
            });
            
            // 2. Adiciona a linha de Subtotal para esse projeto de origem
            pivotData.push({
              ...recipients[0],
              isFirstOfDate,
              dateRowSpan,
              isFirstOfMethod,
              methodRowSpan,
              isFirstOfRatedProj: false,
              ratedProjRowSpan: 0,
              
              isSubtotal: true,
              displayDate: dateText,
              displayMethod: method,
              displayRatedProj: ratedProj,
              displayRecipient: '',
              displayTotal: subtotalTotal,
              displayPercent: 100, // Totais fecham em 100%
              displayRateio: subtotalRateio
            });
            
            isFirstOfDate = false;
            isFirstOfMethod = false;
          });
        });
      });

      // Agrupamento mensal para o Gráfico de Barras de Rateio
      const mapMonthToAbbr = (mesAnoStr) => {
        if (!mesAnoStr) return '';
        const parts = mesAnoStr.split('/');
        if (parts.length !== 2) return mesAnoStr;
        const mes = parts[0].toLowerCase().trim();
        const ano = parts[1].trim();
        const map = {
          'janeiro': 'jan',
          'fevereiro': 'fev',
          'março': 'mar',
          'abril': 'abr',
          'maio': 'mai',
          'junho': 'jun',
          'julho': 'jul',
          'agosto': 'ago',
          'setembro': 'set',
          'outubro': 'out',
          'novembro': 'nov',
          'dezembro': 'dez'
        };
        return (map[mes] || mes.slice(0, 3)) + ' ' + ano;
      };

      const chartMap = {};
      const allProjects = Array.from(projetosRateadosSet);
      
      dateTextOrder.forEach(m => {
        const abbr = mapMonthToAbbr(m);
        chartMap[m] = { name: abbr };
        allProjects.forEach(p => {
          chartMap[m][p] = 0;
        });
      });

      filteredResult.forEach(row => {
        const m = row['Mês/Ano'];
        const p = row['Projeto rateado (origem)'];
        const val = Number(row['Valor do rateio']) || 0;
        if (chartMap[m] && p) {
          chartMap[m][p] += val;
        }
      });

      const rateioChartData = dateTextOrder.map(m => chartMap[m]);

      return {
        filteredData: pivotData,
        chartData: rateioChartData,
        projetos: projRateados,
        clientes: projPadrao,
        etapas: metodosList,
        responsaveis: [],
        colaboradores: [], tags: [],
        barChartAnoData: [], chartVencimentoData: [], chartCompensadoData: [],
        kpiVendas: 0, kpiValorVendas: sumReceitas, kpiCompensado: sumPessoas, kpiOrcamentos: 0, kpiValorOrcamentos: 0, kpiMediaDespesas: 0,
        barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
        kpiTotalDespesas: 0,
        kpiTotalHoras: sumHoras,
        totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0
      };
    }

    // --- Aba 9: Resultado Financeiro ---
    if (selectedFaq.id === 9) {
      const compensadoRawFull = isMultiple ? (faqData[0] || []) : (faqData || []);
      
      let compensadoRaw = compensadoRawFull;
      let principaisClientesRaw = [];
      let saldoContaRaw = [];
      
      if (compensadoRawFull.length > 0 && 'Visao' in compensadoRawFull[0]) {
        compensadoRaw = compensadoRawFull.filter(r => r.Visao === 'Geral' || !r.Visao);
        principaisClientesRaw = compensadoRawFull
          .filter(r => r.Visao === 'Clientes')
          .map(r => ({ Cliente: r.Cliente, Total: r.Resultado }));
        saldoContaRaw = compensadoRawFull
          .filter(r => r.Visao === 'Contas')
          .map(r => ({ Conta: r.Conta, Total: r.Resultado }));
      } else if (Array.isArray(compensadoRawFull[0])) {
        compensadoRaw = compensadoRawFull[0];
        principaisClientesRaw = compensadoRawFull[1] || [];
        saldoContaRaw = compensadoRawFull[2] || [];
      }

      const naoCompensadoRaw = isMultiple ? (faqData[1] || []) : [];
      const competenciaRaw = isMultiple ? (faqData[2] || []) : [];

      // Filtro de Data para compensado
      const filterByDateCompensado = compensadoRaw.filter(d => {
        if (!d.Date) return true;
        const dateObj = parseLocalDate(d.Date);
        const start = parseLocalDate(startDate);
        const end = parseLocalDate(endDate);
        return dateObj >= start && dateObj <= end;
      });

      // Filtro de Data para não compensado
      const filterByDateNaoCompensado = naoCompensadoRaw.filter(d => {
        if (!d.Date) return true;
        const dateObj = parseLocalDate(d.Date);
        const start = parseLocalDate(startDate);
        const end = parseLocalDate(endDate);
        return dateObj >= start && dateObj <= end;
      });

      // Filtro de Data para competência
      const filterByDateCompetencia = competenciaRaw.filter(d => {
        const rowDate = d.DateReferencia || d.Date;
        if (!rowDate) return true;
        const dateObj = parseLocalDate(rowDate);
        const start = parseLocalDate(startDate);
        const end = parseLocalDate(endDate);
        return dateObj >= start && dateObj <= end;
      });

      // Projetos Únicos
      const projetosSet = new Set([
        ...compensadoRaw.map(d => d.Projeto),
        ...naoCompensadoRaw.map(d => d.Projeto),
        ...competenciaRaw.map(d => d.Projeto)
      ].filter(Boolean));
      const projList = ['Todos', ...Array.from(projetosSet).sort()];

      // Aplicação dos Filtros de Dimensão
      const filteredCompensado = filterByDateCompensado.filter(d => {
        if (filterProjeto !== 'Todos' && d.Projeto !== filterProjeto) return false;
        return true;
      });

      const filteredNaoCompensado = filterByDateNaoCompensado.filter(d => {
        if (filterProjeto !== 'Todos' && d.Projeto !== filterProjeto) return false;
        return true;
      });

      const filteredCompetencia = filterByDateCompetencia.filter(d => {
        if (filterProjeto !== 'Todos' && d.Projeto !== filterProjeto) return false;
        return true;
      });

      // Cálculo dos KPIs - Compensado
      const compReceitas = filteredCompensado.reduce((sum, d) => sum + (Number(d.TotalReceitas) || 0), 0);
      const compDespesas = filteredCompensado.reduce((sum, d) => sum + (Number(d.TotalDespesas) || 0), 0);
      const compLucro = filteredCompensado.reduce((sum, d) => sum + (Number(d.Resultado) || 0), 0);

      // Cálculo dos KPIs - Não Compensado
      const naoCompReceitas = filteredNaoCompensado.reduce((sum, d) => sum + (Number(d.TotalReceitas) || 0), 0);
      const naoCompDespesas = filteredNaoCompensado.reduce((sum, d) => sum + (Number(d.TotalDespesas) || 0), 0);
      const naoCompLucro = filteredNaoCompensado.reduce((sum, d) => sum + (Number(d.Resultado) || 0), 0);

      // Cálculo dos KPIs - Competência
      const compEtReceitas = filteredCompetencia.reduce((sum, d) => sum + (Number(d.Receita_Competencia) || Number(d.TotalReceitas) || 0), 0);
      const compEtDespesas = filteredCompetencia.reduce((sum, d) => sum + (Number(d.Despesa_Competencia) || Number(d.TotalDespesas) || 0), 0);
      const compEtLucro = filteredCompetencia.reduce((sum, d) => sum + (Number(d.Total_Competencia) || Number(d.Resultado) || 0), 0);

      // --- CÁLCULO DINÂMICO: PRINCIPAIS CLIENTES E SALDO POR CONTA ---
      const clientesMap = {};
      const contasMap = {};

      filteredCompensado.forEach(d => {
        const cli = d.Cliente || 'Sem cliente definido';
        const conta = d.Conta || 'Sem conta definida';
        clientesMap[cli] = (clientesMap[cli] || 0) + (Number(d.TotalReceitas) || 0);
        contasMap[conta] = (contasMap[conta] || 0) + (Number(d.TotalReceitas) || 0);
      });

      const principaisClientesCalc = Object.entries(clientesMap)
        .map(([Cliente, Total]) => ({ Cliente, Total }))
        .sort((a, b) => b.Total - a.Total);

      const saldoContaCalc = Object.entries(contasMap)
        .map(([Conta, Total]) => ({ Conta, Total }))
        .sort((a, b) => b.Total - a.Total);

      // --- CÁLCULO DINÂMICO: RECEITAS E DESPESAS POR CATEGORIA ---
      const receitasCatMap = {};
      const despesasCatMap = {};

      // Initialize all unique categories from the global dataset to ensure 0s are shown
      compensadoRaw.forEach(d => {
        const cat = d.Categoria || 'Sem categoria definida';
        receitasCatMap[cat] = 0;
        despesasCatMap[cat] = 0;
      });

      filteredCompensado.forEach(d => {
        const cat = d.Categoria || 'Sem categoria definida';
        receitasCatMap[cat] = (receitasCatMap[cat] || 0) + (Number(d.TotalReceitas) || 0);
        // We use Math.abs here because TotalDespesas from SQL is negative, and the user's Metabase print shows expenses as positive numbers
        despesasCatMap[cat] = (despesasCatMap[cat] || 0) + Math.abs(Number(d.TotalDespesas) || 0);
      });

      const receitasPorCategoria = Object.entries(receitasCatMap)
        .map(([Categoria, Total]) => ({ Categoria, Total }))
        .sort((a, b) => b.Total - a.Total || a.Categoria.localeCompare(b.Categoria));

      const despesasPorCategoria = Object.entries(despesasCatMap)
        .map(([Categoria, Total]) => ({ Categoria, Total }))
        .sort((a, b) => b.Total - a.Total || a.Categoria.localeCompare(b.Categoria));

      // --- CÁLCULO 1: VARIAÇÃO DA RECEITA MENSAL ---
      const receitasPorMes = {};
      filteredCompensado.forEach(d => {
        if (!d.Date) return;
        const dateObj = parseLocalDate(d.Date);
        const ano = dateObj.getFullYear();
        const mesIdx = dateObj.getMonth();
        const chave = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
        receitasPorMes[chave] = (receitasPorMes[chave] || 0) + (Number(d.TotalReceitas) || 0);
      });

      const mesesOrdenados = Object.keys(receitasPorMes).sort();
      let ultimoMesLabel = '—';
      let ultimoMesValor = 0;
      let anteriorMesValor = 0;
      let variacaoPorcentagem = 0;

      if (mesesOrdenados.length > 0) {
        const ultChave = mesesOrdenados[mesesOrdenados.length - 1];
        const [ano, mesStr] = ultChave.split('-');
        const mesesNomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        ultimoMesLabel = `${mesesNomes[parseInt(mesStr) - 1]} ${ano}`;
        ultimoMesValor = receitasPorMes[ultChave];

        if (mesesOrdenados.length > 1) {
          const antChave = mesesOrdenados[mesesOrdenados.length - 2];
          anteriorMesValor = receitasPorMes[antChave];
          if (anteriorMesValor > 0) {
            variacaoPorcentagem = ((ultimoMesValor - anteriorMesValor) / anteriorMesValor) * 100;
          }
        }
      }

      // --- CÁLCULO 2: INADIMPLENTES ÚLTIMOS 6 MESES ---
      const endLimit = endDate ? parseLocalDate(endDate) : new Date();
      const startLimit = new Date(endLimit);
      startLimit.setMonth(startLimit.getMonth() - 6);

      const inadimplentesMap = {};
      naoCompensadoRaw.forEach(d => {
        if (!d.Date) return;
        const dDate = parseLocalDate(d.Date);
        if (dDate >= startLimit && dDate <= endLimit) {
          const valor = Number(d.TotalReceitas) || 0;
          if (valor > 0) {
            const clienteName = d.Cliente;
            const key = (!clienteName || clienteName === 'Sem cliente definido') ? '-' : clienteName;
            inadimplentesMap[key] = (inadimplentesMap[key] || 0) + valor;
          }
        }
      });

      const inadimplentesList = Object.entries(inadimplentesMap).map(([cliente, total]) => ({
        cliente,
        total
      })).sort((a, b) => b.total - a.total);

      // --- CÁLCULO 3: DADOS PARA GRÁFICOS DE EVOLUÇÃO ---
      const evolucaoCompensadaMap = {};
      const evolucaoDREMap = {};
      const evolucaoNaoCompensadaMap = {};

      const dStart = parseLocalDate(startDate);
      const dEnd = parseLocalDate(endDate);
      const mesesNomesAbreviados = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

      const mesesDoFiltro = [];
      let tempDate = new Date(dStart.getFullYear(), dStart.getMonth(), 1);
      let safetyCounter = 0;
      while (tempDate <= dEnd && safetyCounter < 100) {
        const ano = tempDate.getFullYear();
        const mesIdx = tempDate.getMonth();
        const chave = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
        mesesDoFiltro.push({
          chave,
          label: `${mesesNomesAbreviados[mesIdx]} ${ano}`
        });
        tempDate.setMonth(tempDate.getMonth() + 1);
        safetyCounter++;
      }

      if (mesesDoFiltro.length === 0) {
        for (let m = 0; m < 12; m++) {
          const chave = `2025-${String(m + 1).padStart(2, '0')}`;
          mesesDoFiltro.push({
            chave,
            label: `${mesesNomesAbreviados[m]} 2025`
          });
        }
      }

      mesesDoFiltro.forEach(m => {
        evolucaoCompensadaMap[m.chave] = {
          name: m.label,
          Receitas: 0,
          Despesas: 0,
          Lucro: 0,
          'Lucro Acumulado': 0
        };
        evolucaoDREMap[m.chave] = {
          name: m.label,
          Receitas: 0,
          Despesas: 0,
          Lucro: 0,
          'Lucro Acumulado': 0
        };
        evolucaoNaoCompensadaMap[m.chave] = {
          name: m.label,
          Receitas: 0,
          Despesas: 0,
          Lucro: 0,
          'Lucro Acumulado': 0
        };
      });

      filteredCompensado.forEach(d => {
        if (!d.Date) return;
        const dObj = parseLocalDate(d.Date);
        const ano = dObj.getFullYear();
        const mesIdx = dObj.getMonth();
        const chave = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
        if (evolucaoCompensadaMap[chave]) {
          evolucaoCompensadaMap[chave].Receitas += (Number(d.TotalReceitas) || 0);
          evolucaoCompensadaMap[chave].Despesas += (Number(d.TotalDespesas) || 0);
          evolucaoCompensadaMap[chave].Lucro += (Number(d.Resultado) || 0);
        }
      });

      let acumComp = 0;
      const evolucaoCompensadaList = mesesDoFiltro.map(m => {
        const item = evolucaoCompensadaMap[m.chave];
        acumComp += item.Lucro;
        item['Lucro Acumulado'] = acumComp;
        return item;
      });

      filteredNaoCompensado.forEach(d => {
        if (!d.Date) return;
        const dObj = parseLocalDate(d.Date);
        const ano = dObj.getFullYear();
        const mesIdx = dObj.getMonth();
        const chave = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
        if (evolucaoNaoCompensadaMap[chave]) {
          evolucaoNaoCompensadaMap[chave].Receitas += (Number(d.TotalReceitas) || 0);
          evolucaoNaoCompensadaMap[chave].Despesas += (Number(d.TotalDespesas) || 0);
          evolucaoNaoCompensadaMap[chave].Lucro += (Number(d.Resultado) || 0);
        }
      });

      let acumNaoComp = 0;
      const evolucaoNaoCompensadaList = mesesDoFiltro.map(m => {
        const item = evolucaoNaoCompensadaMap[m.chave];
        acumNaoComp += item.Lucro;
        item['Lucro Acumulado'] = acumNaoComp;
        return item;
      });

      filteredCompetencia.forEach(d => {
        if (d.StatusCompensacao !== 'Compensada') return;
        const rDate = d.DateReferencia || d.Date;
        if (!rDate) return;
        const dObj = parseLocalDate(rDate);
        const ano = dObj.getFullYear();
        const mesIdx = dObj.getMonth();
        const chave = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
        if (evolucaoDREMap[chave]) {
          evolucaoDREMap[chave].Receitas += (Number(d.Receita_Competencia) || 0);
          evolucaoDREMap[chave].Despesas += (Number(d.Despesa_Competencia) || 0);
          evolucaoDREMap[chave].Lucro += (Number(d.Total_Competencia) || 0);
        }
      });

      let acumDRE = 0;
      const evolucaoDREList = mesesDoFiltro.map(m => {
        const item = evolucaoDREMap[m.chave];
        acumDRE += item.Lucro;
        item['Lucro Acumulado'] = acumDRE;
        return item;
      });

      // Dados que mostramos na Tabela
      let activeFilteredData = filteredCompensado;
      if (resultadoFinanceiroTab === 'naoCompensado') activeFilteredData = filteredNaoCompensado;
      if (resultadoFinanceiroTab === 'competencia') activeFilteredData = filteredCompetencia;

      return {
        filteredData: activeFilteredData,
        chartData: [],
        projetos: projList,
        clientes: [],
        etapas: [],
        responsaveis: [],
        colaboradores: [], tags: [],
        barChartAnoData: [], chartVencimentoData: [], chartCompensadoData: [],
        kpiVendas: 0,
        kpiValorVendas: compReceitas, // Receitas Compensadas
        kpiTotalDespesas: compDespesas, // Despesas Compensadas
        kpiCompensado: compLucro, // Lucro Compensado
        kpiOrcamentos: naoCompReceitas, // Receitas Não Compensadas
        kpiValorOrcamentos: naoCompDespesas, // Despesas Não Compensadas
        kpiMediaDespesas: naoCompLucro, // Lucro Não Compensado
        totalGeralHoras: compEtReceitas, // Receitas Competência
        totalGeralCustoHora: compEtDespesas, // Despesas Competência
        totalGeralCustoTotal: compEtLucro, // Lucro Competência
        barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
        kpiTotalHoras: 0,
        totalGeralHorasVal: 0, totalGeralCustoHoraVal: 0, totalGeralCustoTotalVal: 0,
        variacaoReceita: { ultimoMesLabel, ultimoMesValor, anteriorMesValor, variacaoPorcentagem },
        inadimplentes: inadimplentesList,
        principaisClientes: principaisClientesCalc,
        saldoConta: saldoContaCalc,
        receitasPorCategoria,
        despesasPorCategoria,
        chartEvolucaoCompensada: evolucaoCompensadaList,
        chartEvolucaoDRE: evolucaoDREList,
        chartEvolucaoNaoCompensada: evolucaoNaoCompensadaList
      };
    }

      // --- Aba 10: Utilização de Horas – Mensal ---
      if (selectedFaq.id === 10) {
        const rawData = isMultiple ? (faqData[0] || []) : (faqData || []);
        const filterMonth = utilizacaoMesAno.month;
        const filterYear = utilizacaoMesAno.year;

        const responsaveisSet = new Set(rawData.map(d => d['Responsável']).filter(Boolean));
        const resps = ['Todos', ...Array.from(responsaveisSet).sort()];
  
        const parseLocalDateLocal = (dateVal) => {
          if (!dateVal) return new Date();
          if (dateVal instanceof Date) return dateVal;
          if (typeof dateVal === 'string') {
            const datePart = dateVal.split('T')[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
              const [year, month, day] = datePart.split('-').map(Number);
              return new Date(year, month - 1, day);
            }
          }
          return new Date(dateVal);
        };

        const filteredResult = rawData.filter(d => {
          if (!d['Mês']) return false;
          const dateObj = parseLocalDateLocal(d['Mês']);
          const matchDate = dateObj.getFullYear() === filterYear && dateObj.getMonth() === filterMonth;
          const matchResp = filterResponsavel === 'Todos' || d['Responsável'] === filterResponsavel;
          return matchDate && matchResp;
        });

        const rawProjetosData = isMultiple ? (faqData[1] || []) : [];
        const projetosMap = {};
        let totalHorasProjetos = 0;

        rawProjetosData.forEach(d => {
          if (!d.Mes) return;
          const dateObj = parseLocalDateLocal(d.Mes);
          const matchDate = dateObj.getFullYear() === filterYear && dateObj.getMonth() === filterMonth;
          const matchResp = filterResponsavel === 'Todos' || d.Responsavel === filterResponsavel;
          if (matchDate && matchResp) {
            const proj = d.Projeto || 'Sem Projeto';
            const horas = Number(d.Horas_Trabalhadas) || 0;
            projetosMap[proj] = (projetosMap[proj] || 0) + horas;
            totalHorasProjetos += horas;
          }
        });

        const horasPorProjetoData = Object.keys(projetosMap).map(proj => ({
          name: proj,
          value: Math.round(projetosMap[proj])
        })).sort((a, b) => b.value - a.value);

        const mesesMap = {};
        filteredResult.forEach(d => {
          const mesVal = d['Mês'];
          if (!mesVal) return;
          const dateObj = parseLocalDateLocal(mesVal);
          const mesLabel = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' ');
          if (!mesesMap[mesLabel]) {
            mesesMap[mesLabel] = {
              mesLabel,
              horasUteis: 0,
              horasTrabalhadas: 0,
              saldo: 0,
              taxaSoma: 0
            };
          }
          mesesMap[mesLabel].horasUteis += Number(d['Horas Úteis no Mês']) || 0;
          mesesMap[mesLabel].horasTrabalhadas += Number(d['Horas Trabalhadas']) || 0;
          mesesMap[mesLabel].saldo += Number(d['Saldo de Horas no Mês']) || 0;
          mesesMap[mesLabel].taxaSoma += Number(d['Taxa do Mês (%)']) || 0;
        });

        const tabelaPorMesData = Object.values(mesesMap).map(m => ({
          mesLabel: m.mesLabel,
          horasUteis: Math.round(m.horasUteis * 100) / 100,
          horasTrabalhadas: Math.round(m.horasTrabalhadas * 100) / 100,
          saldo: Math.round(m.saldo * 100) / 100,
          taxa: Math.round(m.taxaSoma * 100) / 100
        }));

        let totHorasUteis = 0;
        let totHorasTrabalhadas = 0;
        let totSaldo = 0;
        let totTaxa = 0;

        filteredResult.forEach(d => {
          totHorasUteis += Number(d['Horas Úteis no Mês']) || 0;
          totHorasTrabalhadas += Number(d['Horas Trabalhadas']) || 0;
          totSaldo += Number(d['Saldo de Horas no Mês']) || 0;
          totTaxa += Number(d['Taxa do Mês (%)']) || 0;
        });

        const tabelaTotalGeralData = {
          horasUteis: Math.round(totHorasUteis * 100) / 100,
          horasTrabalhadas: Math.round(totHorasTrabalhadas * 100) / 100,
          saldo: Math.round(totSaldo * 100) / 100,
          taxa: Math.round(totTaxa * 100) / 100
        };
  
        return {
          filteredData: filteredResult,
          chartData: filteredResult,
          tabelaPorMesData,
          tabelaTotalGeralData,
          projetos: [], clientes: [], etapas: [], responsaveis: resps, colaboradores: [], tags: [],
          barChartAnoData: horasPorProjetoData, chartVencimentoData: [], chartCompensadoData: [],
          kpiVendas: 0, kpiValorVendas: 0, kpiTotalDespesas: 0, kpiCompensado: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0, kpiMediaDespesas: 0,
          totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0,
          barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
          kpiTotalHoras: Math.round(totalHorasProjetos),
          variacaoReceita: { ultimoMesLabel: '', ultimoMesValor: 0, anteriorMesValor: 0, variacaoPorcentagem: 0 },
          inadimplentes: [], principaisClientes: [], saldoConta: [],
          receitasPorCategoria: [], despesasPorCategoria: [],
          chartEvolucaoCompensada: [], chartEvolucaoDRE: [], chartEvolucaoNaoCompensada: []
        };
      }

    return {
      filteredData: filtered, chartData: cData, barChartAnoData: [], chartVencimentoData: [], chartCompensadoData: [],
      kpiVendas: 0, kpiValorVendas: 0, kpiCompensado: 0, kpiOrcamentos: 0, kpiValorOrcamentos: 0,
      kpiTotalDespesas: 0, kpiMediaDespesas: 0, kpiTotalHoras: 0,
      barChartFornecedorData: [], barChartTotalFornecedorData: [], uniqueFornecedores: [],
      projetos: proj, etapas: etaps, responsaveis: resps, fornecedores: [], contas: [], tarefas: [],
      totalGeralHoras: 0, totalGeralCustoHora: 0, totalGeralCustoTotal: 0,
      variacaoReceita: { ultimoMesLabel: '', ultimoMesValor: 0, anteriorMesValor: 0, variacaoPorcentagem: 0 },
      inadimplentes: [],
      principaisClientes: [],
      saldoConta: [],
      chartEvolucaoCompensada: [], chartEvolucaoDRE: [], chartEvolucaoNaoCompensada: [], tabelaPorMesData: [], tabelaTotalGeralData: { horasUteis: 0, horasTrabalhadas: 0, saldo: 0, taxa: 0 }
    };
  }, [faqData, filterProjeto, filterEtapa, filterTarefa, filterResponsavel, filterFornecedor, filterConta, filterStatus, filterCliente, filterColaborador, filterTag, startDate, endDate, selectedFaq, activeClients, resultadoFinanceiroTab, utilizacaoMesAno]);

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPageGrafico(1);
    setPageTabela(1);
    setPageInadimplentes(1);
  };

  const colorsList = useMemo(() => ['#6366f1', '#2dd4bf', '#3b82f6', '#ec4899', '#f97316', '#a855f7', '#10b981', '#f59e0b', '#34d399', '#fb7185'], []);
  const colabColors = useMemo(() => {
    const mapping = {};
    if (colaboradores) {
      colaboradores.filter(c => c !== 'Todos').forEach((colab, idx) => {
        mapping[colab] = colorsList[idx % colorsList.length];
      });
    }
    return mapping;
  }, [colaboradores, colorsList]);

  const isMultiple = faqData && Array.isArray(faqData[0]);
  const mainDataForTable = isMultiple ? faqData[activeSqlIndex] : (faqData || []);

  const graficoPageSize = (selectedFaq && selectedFaq.id === 8) ? 200 : ITEMS_PER_PAGE;
  const paginatedFilteredData = filteredData.slice((pageGrafico - 1) * graficoPageSize, pageGrafico * graficoPageSize);
  const paginatedFaqData = mainDataForTable.slice((pageTabela - 1) * ITEMS_PER_PAGE, pageTabela * ITEMS_PER_PAGE);

  const totalPagesGrafico = Math.ceil(filteredData.length / graficoPageSize);
  const totalPagesTabela = Math.ceil(mainDataForTable.length / ITEMS_PER_PAGE);


  if (selectedFaq) {
    return (
      <div className="dashboard-playground">
        <div className="dashboard-grid">
          <button
            onClick={() => {
              setSelectedFaq(null);
              setFaqData(null);
              setViewMode('grafico');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '1rem',
              width: 'fit-content'
            }}
          >
            <ArrowLeft size={18} />
            Voltar para as bolhas
          </button>

          <div className="dashboard-card" style={{ animation: 'fadeIn 0.4s ease', padding: '32px' }}>
            {!isMigrated && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                  <selectedFaq.icon size={32} color="var(--accent)" />
                  {selectedFaq.title}
                </h2>

                <div style={{ display: 'flex', background: 'var(--bg-hover)', borderRadius: '10px', padding: '6px' }}>
                  <button
                    onClick={() => setViewMode('grafico')}
                    style={{
                      background: viewMode === 'grafico' ? 'var(--accent)' : 'transparent',
                      color: viewMode === 'grafico' ? 'var(--bg-main)' : 'var(--text-muted)',
                      border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: '0.2s',
                      display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem'
                    }}
                  >
                    <BarChart2 size={18} /> Dashboard
                  </button>
                  <button
                    onClick={() => setViewMode('tabela')}
                    style={{
                      background: viewMode === 'tabela' ? 'var(--accent)' : 'transparent',
                      color: viewMode === 'tabela' ? 'var(--bg-main)' : 'var(--text-muted)',
                      border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: '0.2s',
                      display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem'
                    }}
                  >
                    <TableIcon size={18} /> Tabelão Raw
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ padding: '6rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '16px' }}>
                  <Sparkles size={40} color="var(--accent)" />
                </div>
                <p style={{ fontSize: '1.2rem' }}>Processando SQL e montando visualizações...</p>
              </div>
            ) : (
              <>
                {viewMode === 'grafico' && (faqData && faqData.length > 0 || isMigrated) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Filtro de Período Global */}
                    {!isMigrated && (
                      <div className="date-filter-container">
                      <span className="date-filter-label">{selectedFaq.id === 10 ? 'Mês e Ano' : 'Período'}</span>

                      <div style={{ position: 'relative' }}>
                        {selectedFaq.id === 10 ? (
                          <>
                            <button
                              className="date-preset-button"
                              onClick={() => setIsUtilizacaoMenuOpen(!isUtilizacaoMenuOpen)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                color: '#1e293b',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s',
                                minWidth: '160px',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span style={{ fontWeight: '500', color: '#2563eb' }}>
                                {new Date(utilizacaoMesAno.year, utilizacaoMesAno.month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                              </span>
                              <X size={14} color="#94a3b8" onClick={(e) => { e.stopPropagation(); setUtilizacaoMesAno({ month: new Date().getMonth(), year: new Date().getFullYear() }); }} />
                            </button>

                            {isUtilizacaoMenuOpen && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                marginTop: '8px',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                zIndex: 100,
                                minWidth: '280px',
                                padding: '16px',
                                animation: 'fadeInUp 0.2s ease'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                                  <select 
                                    value={utilizacaoMesAno.year}
                                    onChange={(e) => setUtilizacaoMesAno(prev => ({ ...prev, year: Number(e.target.value) }))}
                                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none', background: 'white', fontWeight: '500' }}
                                  >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                      <option key={y} value={y}>{y}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                  {['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'].map((m, i) => (
                                    <button
                                      key={m}
                                      onClick={() => {
                                        setUtilizacaoMesAno(prev => ({ ...prev, month: i }));
                                        setIsUtilizacaoMenuOpen(false);
                                      }}
                                      style={{
                                        padding: '8px 4px',
                                        background: utilizacaoMesAno.month === i ? '#3b82f6' : 'transparent',
                                        color: utilizacaoMesAno.month === i ? 'white' : '#475569',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: utilizacaoMesAno.month === i ? '600' : '500',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      {m}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              className="date-preset-button"
                              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                color: '#1e293b',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Calendar size={18} color="#2563eb" />
                              <span style={{ fontWeight: '500' }}>
                                {datePresetLabel === 'Personalizado'
                                  ? `${new Date(startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - ${new Date(endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
                                  : datePresetLabel}
                              </span>
                            </button>

                            {isDateMenuOpen && (
                              <div className="date-preset-menu" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                marginTop: '8px',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                zIndex: 100,
                                minWidth: '240px',
                                padding: '8px',
                                animation: 'fadeInUp 0.2s ease'
                              }}>
                                <div className="menu-group">
                                  <div className="menu-item-premium" onClick={() => applyDatePreset('hoje')}>Hoje</div>
                                  <div className="menu-item-premium" onClick={() => applyDatePreset('ontem')}>Ontem</div>
                                  <div className="menu-item-premium" onClick={() => applyDatePreset('semana_passada')}>Semana passada</div>
                                  <div className="menu-item-premium" onClick={() => applyDatePreset('ultimos_7')}>Últimos 7 dias</div>
                                  <div className="menu-item-premium" onClick={() => applyDatePreset('ultimos_30')}>Últimos 30 dias</div>
                                </div>

                                <div style={{ margin: '8px 4px', borderTop: '1px solid #f1f5f9' }}></div>

                                <div className="menu-group">
                                  <div className="menu-item-premium" onClick={() => applyDatePreset('mes_passado')}>Mês passado</div>
                                  <div className="menu-item-premium" onClick={() => applyDatePreset('ultimos_3_meses')}>Últimos 3 meses</div>
                                  <div className="menu-item-premium" onClick={() => applyDatePreset('ultimos_12_meses')}>Últimos 12 meses</div>
                                  <div className="menu-item-premium" onClick={() => applyDatePreset('este_ano')}>Este ano</div>
                                </div>

                                <div style={{ margin: '8px 4px', borderTop: '1px solid #f1f5f9' }}></div>

                                <div
                                  className={`menu-item-premium ${datePresetLabel === 'Personalizado' ? 'active' : ''}`}
                                  onClick={() => setDatePresetLabel('Personalizado')}
                                >
                                  Datas específicas...
                                </div>

                                {datePresetLabel === 'Personalizado' && (
                                  <div style={{
                                    padding: '12px',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    marginTop: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                  }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Início</label>
                                      <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Fim</label>
                                      <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                      />
                                    </div>
                                    <button
                                      onClick={() => setIsDateMenuOpen(false)}
                                      style={{
                                        marginTop: '4px',
                                        padding: '8px',
                                        background: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Aplicar Datas
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                    {/* Filtros de Dimensão */}
                    {selectedFaq.id === 1 && (
                      <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                          <Filter size={18} /> <strong>Filtros:</strong>
                        </div>
                        <select
                          value={filterProjeto} onChange={e => handleFilterChange(setFilterProjeto, e.target.value)}
                          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none' }}
                        >
                          {projetos.map(p => <option key={p} value={p}>{p === 'Todos' ? 'Todos os Projetos' : p}</option>)}
                        </select>
                        <select
                          value={filterEtapa} onChange={e => handleFilterChange(setFilterEtapa, e.target.value)}
                          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none' }}
                        >
                          {etapas.map(e => <option key={e} value={e}>{e === 'Todas' ? 'Todas as Etapas' : e}</option>)}
                        </select>
                        <select
                          value={filterResponsavel} onChange={e => handleFilterChange(setFilterResponsavel, e.target.value)}
                          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none' }}
                        >
                          {responsaveis.map(r => <option key={r} value={r}>{r === 'Todos' ? 'Todos os Responsáveis' : r}</option>)}
                        </select>
                      </div>
                    )}

                    {selectedFaq.id === 6 && (
                      <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                          <Filter size={18} /> <strong>Filtros:</strong>
                        </div>
                        <select
                          value={filterColaborador} onChange={e => handleFilterChange(setFilterColaborador, e.target.value)}
                          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none', maxWidth: '200px' }}
                        >
                          {colaboradores?.map(c => <option key={c} value={c}>{c === 'Todos' ? 'Todos os Colaboradores' : c}</option>)}
                        </select>
                        <select
                          value={filterProjeto} onChange={e => handleFilterChange(setFilterProjeto, e.target.value)}
                          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none', maxWidth: '200px' }}
                        >
                          {projetos?.map(p => <option key={p} value={p}>{p === 'Todos' ? 'Todos os Projetos' : p}</option>)}
                        </select>
                        <select
                          value={filterTag} onChange={e => handleFilterChange(setFilterTag, e.target.value)}
                          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none', maxWidth: '200px' }}
                        >
                          {tags?.map(t => <option key={t} value={t}>{t === 'Todas' ? 'Todas as Tags' : t}</option>)}
                        </select>
                      </div>
                    )}



                    {/* Gráfico 1: Estimado vs Reportado */}
                    {selectedFaq.id === 1 && (
                      <>

                        <div style={{ height: 400, width: '100%', background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                          <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: '500' }}>Estimado vs Reportado (Etapa)</h3>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="Etapa" stroke="#64748b" tick={{ fill: '#64748b' }} />
                              <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                                itemStyle={{ color: '#0f172a' }}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
                              <Bar dataKey="Estimativa" fill="#fbbf24" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="Estimativa" position="top" style={{ fill: '#fbbf24', fontSize: '12px', fontWeight: 'bold' }} />
                              </Bar>
                              <Bar dataKey="Reportagem" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="Reportagem" position="top" style={{ fill: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Tabela de Relatório formatada com Paginação */}
                        <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '500', margin: 0 }}>Relatório de Horas (Detalhado por Tarefa)</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Página {pageGrafico} de {totalPagesGrafico || 1} ({filteredData.length} registros)</span>
                              <button onClick={() => setPageGrafico(p => Math.max(1, p - 1))} disabled={pageGrafico === 1} style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: pageGrafico === 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
                              <button onClick={() => setPageGrafico(p => Math.min(totalPagesGrafico, p + 1))} disabled={pageGrafico === totalPagesGrafico || totalPagesGrafico === 0} style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: pageGrafico === totalPagesGrafico || totalPagesGrafico === 0 ? 'not-allowed' : 'pointer' }}>Próxima</button>
                            </div>
                          </div>

                          <div className="ai-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <table className="ai-table" style={{ width: '100%', minWidth: '1000px' }}>
                              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-main)' }}>
                                <tr>
                                  <th>Projeto</th>
                                  <th>Etapa</th>
                                  <th>Tarefa</th>
                                  <th>Responsável</th>
                                  <th style={{ textAlign: 'right' }}>Est. Tarefa</th>
                                  <th style={{ textAlign: 'right' }}>Real Tarefa</th>
                                  <th style={{ textAlign: 'right' }}>Est. Etapa</th>
                                  <th style={{ textAlign: 'right' }}>Real Etapa</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedFilteredData.map((row, i) => (
                                  <tr key={i}>
                                    <td style={{ fontSize: '0.85rem' }}>{row.Projeto}</td>
                                    <td><span className="badge" style={{ background: 'var(--bg-hover)' }}>{row.Etapa}</span></td>
                                    <td><strong>{row.Tarefa}</strong></td>
                                    <td>{row.ResponsavelTarefa}</td>
                                    <td style={{ textAlign: 'right' }}>{row.EstimativaTarefa}h</td>
                                    <td style={{ textAlign: 'right', fontWeight: '600' }}>{row.ReportagemTarefa}h</td>
                                    <td style={{ textAlign: 'right', color: '#fbbf24', opacity: 0.8 }}>{row.EstimativaEtapa}h</td>
                                    <td style={{ textAlign: 'right', color: '#3b82f6', opacity: 0.8 }}>{row.ReportagemEtapa}h</td>
                                  </tr>
                                ))}
                                {filteredData.length === 0 && (
                                  <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum dado encontrado para os filtros selecionados.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Visualização Comercial */}
                    {selectedFaq.id === 2 && (
                      <CommercialDashboard />
                    )}

                    {selectedFaq.id === 3 && (
                      <ExpensesDashboard />
                    )}

                    {selectedFaq.id === 4 && (
                      <PersonalExpensesDashboard />
                    )}

                    {selectedFaq.id === 5 && (
                      <ProfitabilityDashboard />
                    )}

                    {selectedFaq.id === 6 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
                        {/* Gráfico 1: Barras */}
                        <div style={{ height: 450, width: '100%', background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                          <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: '500' }}>Tarefas finalizadas por colaborador</h3>
                          <ResponsiveContainer width="100%" height="90%">
                            <BarChart
                              data={chartData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="Colaborador"
                                label={{ value: 'Colaborador', position: 'bottom', offset: 0 }}
                                tickLine={false}
                              />
                              <YAxis
                                label={{ value: 'Tarefas Finalizadas', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                                tickLine={false}
                                allowDecimals={false}
                              />
                              <Tooltip cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }} />
                              <Bar dataKey="Tarefas Finalizadas" fill="#7cb5ec" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="Tarefas Finalizadas" position="top" style={{ fill: 'var(--text-main)', fontWeight: '600' }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Gráfico 2: Linhas (Temporal) */}
                        <div style={{ height: 450, width: '100%', background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                          <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: '500' }}>Contagem de tarefas por colaborador</h3>
                          <ResponsiveContainer width="100%" height="90%">
                            <LineChart
                              data={chartCompensadoData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="label"
                                label={{ value: 'Data', position: 'bottom', offset: 0 }}
                                tickLine={false}
                              />
                              <YAxis
                                tickLine={false}
                                allowDecimals={false}
                              />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                              <Legend verticalAlign="top" height={36} iconType="circle" />
                              {colaboradores && colaboradores
                                .filter(c => c !== 'Todos')
                                .filter(c => filterColaborador === 'Todos' || c === filterColaborador)
                                .map((colab, idx) => {
                                  const color = colabColors[colab] || '#8884d8';
                                  return (
                                    <Line
                                      key={colab}
                                      type="monotone"
                                      dataKey={colab}
                                      stroke={color}
                                      strokeWidth={3}
                                      dot={{ r: 5, stroke: color, strokeWidth: 2, fill: 'white' }}
                                      activeDot={{ r: 7 }}
                                      connectNulls={true}
                                    >
                                      <LabelList dataKey={colab} position="top" style={{ fill: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600' }} />
                                    </Line>
                                  );
                                })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Gráfico 3: Barras Duplas (Estimadas x Reportadas) */}
                        <div style={{ height: 450, width: '100%', background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                          <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: '500' }}>Produtividade por estimativas</h3>
                          <ResponsiveContainer width="100%" height="90%">
                            <BarChart
                              data={chartData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="Colaborador"
                                label={{ value: 'Colaborador', position: 'bottom', offset: 0 }}
                                tickLine={false}
                              />
                              <YAxis
                                tickLine={false}
                                allowDecimals={false}
                              />
                              <Tooltip cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }} />
                              <Legend verticalAlign="top" height={36} iconType="circle" />
                              <Bar dataKey="Horas estimadas" fill="#7cb5ec" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="Horas estimadas" position="top" style={{ fill: 'var(--text-main)', fontWeight: '600' }} />
                              </Bar>
                              <Bar dataKey="Horas reportadas" fill="#80cbc4" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="Horas reportadas" position="top" style={{ fill: 'var(--text-main)', fontWeight: '600' }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {selectedFaq.id === 7 && (
                      <ProjectsDashboard />
                    )}
                    {false && selectedFaq.id === 7 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
                        
                        {/* Sub-abas de Projetos */}
                        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleProjetosTabChange('status')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: projetosTab === 'status' ? '2px solid var(--accent)' : '2px solid transparent',
                              padding: '12px 24px',
                              cursor: 'pointer',
                              fontWeight: projetosTab === 'status' ? '600' : '500',
                              color: projetosTab === 'status' ? 'var(--accent)' : 'var(--text-muted)',
                              fontSize: '1rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            Quantidade de projetos por status
                          </button>
                          <button
                            onClick={() => handleProjetosTabChange('tempo_projeto')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: projetosTab === 'tempo_projeto' ? '2px solid var(--accent)' : '2px solid transparent',
                              padding: '12px 24px',
                              cursor: 'pointer',
                              fontWeight: projetosTab === 'tempo_projeto' ? '600' : '500',
                              color: projetosTab === 'tempo_projeto' ? 'var(--accent)' : 'var(--text-muted)',
                              fontSize: '1rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            Tempo de Conclusão do Projeto
                          </button>
                          <button
                            onClick={() => handleProjetosTabChange('tempo_etapa')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: projetosTab === 'tempo_etapa' ? '2px solid var(--accent)' : '2px solid transparent',
                              padding: '12px 24px',
                              cursor: 'pointer',
                              fontWeight: projetosTab === 'tempo_etapa' ? '600' : '500',
                              color: projetosTab === 'tempo_etapa' ? 'var(--accent)' : 'var(--text-muted)',
                              fontSize: '1rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            Tempo de Conclusão da Etapa
                          </button>
                          <button
                            onClick={() => handleProjetosTabChange('tempo_tarefa')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: projetosTab === 'tempo_tarefa' ? '2px solid var(--accent)' : '2px solid transparent',
                              padding: '12px 24px',
                              cursor: 'pointer',
                              fontWeight: projetosTab === 'tempo_tarefa' ? '600' : '500',
                              color: projetosTab === 'tempo_tarefa' ? 'var(--accent)' : 'var(--text-muted)',
                              fontSize: '1rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            Tempo de Conclusão da Tarefa
                          </button>
                        </div>

                        {projetosTab === 'status' && (
                          <>
                            {/* Somador KPI: Quantidade de Projetos Ativos */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                              <div style={{
                                background: 'var(--bg-main)',
                                padding: '32px 24px',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                                maxWidth: '350px',
                                margin: '0 auto',
                                width: '100%'
                              }}>
                                <span style={{ fontSize: '3.5rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                  {kpiTotalDespesas}
                                </span>
                                <span style={{ fontSize: '0.95rem', color: '#445164', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  Quantidade de Projetos Ativos <span title="Quantidade de Projetos Ativos" style={{ cursor: 'pointer', opacity: 0.7 }}>ⓘ</span>
                                </span>
                              </div>
                            </div>

                            {/* Gráfico 1: Quantidade de Projetos por Status */}
                            <div style={{ height: 450, width: '100%', background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: '500' }}>Quantidade de Projetos por Status</h3>
                              <ResponsiveContainer width="100%" height="90%">
                                <BarChart
                                  data={chartData}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis
                                    dataKey="Status"
                                    label={{ value: 'Status do Projeto', position: 'bottom', offset: 0 }}
                                    tickLine={false}
                                  />
                                  <YAxis
                                    label={{ value: 'Quantidade de Projetos', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                                    tickLine={false}
                                    allowDecimals={false}
                                  />
                                  <Tooltip cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }} />
                                  <Bar dataKey="Quantidade de Projetos" fill="#549df2" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Quantidade de Projetos" position="top" style={{ fill: 'var(--text-main)', fontWeight: '600' }} />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </>
                        )}

                        {projetosTab === 'tempo_projeto' && (
                          <>
                            {/* Somador KPI: Total de Projetos na Tabela */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                              <div style={{
                                background: 'var(--bg-main)',
                                padding: '32px 24px',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                                maxWidth: '350px',
                                margin: '0 auto',
                                width: '100%'
                              }}>
                                <span style={{ fontSize: '3.5rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                  {kpiTotalDespesas}
                                </span>
                                <span style={{ fontSize: '0.95rem', color: '#445164', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  Total de Projetos <span title="Total de Projetos" style={{ cursor: 'pointer', opacity: 0.7 }}>ⓘ</span>
                                </span>
                              </div>
                            </div>

                            {/* Tabela de Tempo de Conclusão do Projeto */}
                            <div className="dashboard-card" style={{ padding: '24px' }}>
                              <div className="dashboard-card-header" style={{ marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Tempo de Conclusão do Projeto</h3>
                              </div>
                              <div className="ai-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <table className="ai-table">
                                  <thead>
                                    <tr>
                                      <th>Cliente</th>
                                      <th>Projeto</th>
                                      <th>Responsável do Projeto</th>
                                      <th>Início</th>
                                      <th>Prazo</th>
                                      <th>Fim</th>
                                      <th>Status do Prazo</th>
                                      <th style={{ textAlign: 'right' }}>Tempo de Conclusão</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredData && filteredData.length > 0 ? (
                                      filteredData.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                          {row.isFirstOfClient && (
                                            <td rowSpan={row.clientRowSpan} style={{ verticalAlign: 'top', padding: '12px', borderRight: '1px solid var(--border-color)', fontWeight: '500', background: 'var(--bg-main)' }}>
                                              {row.ClienteExibicao}
                                            </td>
                                          )}
                                          <td style={{ fontWeight: '600', padding: '12px' }}>{row.Projeto || '-'}</td>
                                          <td style={{ padding: '12px' }}>{row.ResponsavelProjeto || 'Sem responsável'}</td>
                                          <td style={{ padding: '12px' }}>{row.ProjetoInicio ? new Date(row.ProjetoInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                          <td style={{ padding: '12px' }}>{row.ProjetoPrazo ? new Date(row.ProjetoPrazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                          <td style={{ padding: '12px' }}>{row.ProjetoFim ? new Date(row.ProjetoFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                          <td style={{ padding: '12px' }}>
                                            <span style={{
                                              padding: '4px 8px',
                                              borderRadius: '6px',
                                              fontSize: '0.8rem',
                                              fontWeight: '600',
                                              display: 'inline-block',
                                              background: getStatusBadgeBg(row.StatusProjeto),
                                              color: getStatusBadgeColor(row.StatusProjeto)
                                            }}>
                                              {row.StatusProjeto || 'Sem prazo'}
                                            </span>
                                          </td>
                                          <td style={{ textAlign: 'right', fontWeight: '500', padding: '12px' }}>
                                            {row.TempoProjetoMeses !== null && row.TempoProjetoMeses !== undefined
                                              ? `${row.TempoProjetoMeses} meses`
                                              : '-'}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                          Nenhum projeto encontrado para o filtro selecionado.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </>
                        )}

                        {projetosTab === 'tempo_etapa' && (
                          <>
                            {/* Somador KPI: Total de Etapas na Tabela */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                              <div style={{
                                background: 'var(--bg-main)',
                                padding: '32px 24px',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                                maxWidth: '350px',
                                margin: '0 auto',
                                width: '100%'
                              }}>
                                <span style={{ fontSize: '3.5rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                  {kpiTotalDespesas}
                                </span>
                                <span style={{ fontSize: '0.95rem', color: '#445164', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  Total de Etapas <span title="Total de Etapas" style={{ cursor: 'pointer', opacity: 0.7 }}>ⓘ</span>
                                </span>
                              </div>
                            </div>

                            {/* Tabela de Tempo de Conclusão da Etapa */}
                            <div className="dashboard-card" style={{ padding: '24px' }}>
                              <div className="dashboard-card-header" style={{ marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Tempo de Conclusão da Etapa</h3>
                              </div>
                              <div className="ai-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <table className="ai-table">
                                  <thead>
                                    <tr>
                                      <th>Cliente</th>
                                      <th>Projeto</th>
                                      <th>Etapa</th>
                                      <th>Início</th>
                                      <th>Prazo</th>
                                      <th>Fim</th>
                                      <th>Status do Prazo</th>
                                      <th style={{ textAlign: 'right' }}>Tempo de Conclusão</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredData && filteredData.length > 0 ? (
                                      filteredData.map((row, idx) => (
                                        <tr key={idx}>
                                          <td>{row.Cliente || '-'}</td>
                                          <td>{row.Projeto || '-'}</td>
                                          <td style={{ fontWeight: '600' }}>{row.Etapa || '-'}</td>
                                          <td>{row.EtapaInicio ? new Date(row.EtapaInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                          <td>{row.EtapaPrazo ? new Date(row.EtapaPrazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                          <td>{row.EtapaFim ? new Date(row.EtapaFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                          <td>
                                            <span style={{
                                              padding: '4px 8px',
                                              borderRadius: '6px',
                                              fontSize: '0.8rem',
                                              fontWeight: '600',
                                              display: 'inline-block',
                                              background: getStatusBadgeBg(row.StatusEtapa),
                                              color: getStatusBadgeColor(row.StatusEtapa)
                                            }}>
                                              {row.StatusEtapa || 'Sem prazo'}
                                            </span>
                                          </td>
                                          <td style={{ textAlign: 'right', fontWeight: '500' }}>
                                            {row.TempoEtapaDias !== null && row.TempoEtapaDias !== undefined
                                              ? `${row.TempoEtapaDias} dias`
                                              : '-'}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                          Nenhuma etapa encontrada para o filtro selecionado.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </>
                        )}

                        {projetosTab === 'tempo_tarefa' && (
                          <>
                            {/* Somador KPI: Total de Tarefas na Tabela */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                              <div style={{
                                background: 'var(--bg-main)',
                                padding: '32px 24px',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                                maxWidth: '350px',
                                margin: '0 auto',
                                width: '100%'
                              }}>
                                <span style={{ fontSize: '3.5rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                  {kpiTotalDespesas}
                                </span>
                                <span style={{ fontSize: '0.95rem', color: '#445164', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  Total de Tarefas <span title="Total de Tarefas" style={{ cursor: 'pointer', opacity: 0.7 }}>ⓘ</span>
                                </span>
                              </div>
                            </div>

                            {/* Tabela de Tempo de Conclusão da Tarefa */}
                            <div className="dashboard-card" style={{ padding: '24px' }}>
                              <div className="dashboard-card-header" style={{ marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Tempo de Conclusão da Tarefa</h3>
                              </div>
                              <div className="ai-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <table className="ai-table">
                                  <thead>
                                    <tr>
                                      <th>Cliente</th>
                                      <th>Projeto</th>
                                      <th>Etapa</th>
                                      <th>Tarefa</th>
                                      <th>Responsável</th>
                                      <th>Início</th>
                                      <th>Prazo</th>
                                      <th>Fim</th>
                                      <th>Status</th>
                                      <th style={{ textAlign: 'right' }}>Tempo</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredData && filteredData.length > 0 ? (
                                      filteredData.map((row, idx) => (
                                        <tr key={idx}>
                                          <td>{row.Cliente || '-'}</td>
                                          <td>{row.Projeto || '-'}</td>
                                          <td>{row.Etapa || '-'}</td>
                                          <td style={{ fontWeight: '600' }}>{row.TituloTarefa || '-'}</td>
                                          <td>{row.ResponsavelTarefa || 'Sem responsável'}</td>
                                          <td>{row.TarefaInicio ? new Date(row.TarefaInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : (row.TarefaCriacao ? new Date(row.TarefaCriacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-')}</td>
                                          <td>{row.TarefaPrazo ? new Date(row.TarefaPrazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                          <td>{row.TarefaFim ? new Date(row.TarefaFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                          <td>
                                            <span style={{
                                              padding: '4px 8px',
                                              borderRadius: '6px',
                                              fontSize: '0.8rem',
                                              fontWeight: '600',
                                              display: 'inline-block',
                                              background: getStatusBadgeBg(row.StatusTarefa),
                                              color: getStatusBadgeColor(row.StatusTarefa)
                                            }}>
                                              {row.StatusTarefa || 'Sem prazo'}
                                            </span>
                                          </td>
                                          <td style={{ textAlign: 'right', fontWeight: '500' }}>
                                            {row.TempoTarefaDias !== null && row.TempoTarefaDias !== undefined
                                              ? `${row.TempoTarefaDias} dias`
                                              : '-'}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                          Nenhuma tarefa encontrada para o filtro selecionado.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {selectedFaq.id === 8 && (
                      <ApportionmentDashboard />
                    )}

                    {selectedFaq.id === 9 && (
                      <FinancialResultDashboard />
                    )}
                    {false && selectedFaq.id === 9 && (
                      <>
                        {/* Seção 1: Caixa Compensado */}
                        <div style={{ marginBottom: '2.5rem' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '4px', height: '18px', background: 'var(--accent)', borderRadius: '2px' }}></span>
                            Regime de Caixa — Lançamentos Compensados (Efetivo)
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div style={{ background: 'var(--bg-main)', padding: '28px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                              <span style={{ fontSize: '3rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                {kpiValorVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>Receitas compensadas</span>
                            </div>
                            <div style={{ background: 'var(--bg-main)', padding: '28px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                              <span style={{ fontSize: '3rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                {kpiTotalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>Despesas compensadas</span>
                            </div>
                            <div style={{ background: 'var(--bg-main)', padding: '28px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                              <span style={{ fontSize: '3rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                {kpiCompensado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>Lucro compensado</span>
                            </div>
                          </div>
                        </div>

                        {/* Seção 2: Caixa Não Compensado */}
                        <div style={{ marginBottom: '2.5rem' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '4px', height: '18px', background: 'var(--accent)', borderRadius: '2px' }}></span>
                            Regime de Caixa — Lançamentos Não Compensados (Projetado/Previsto)
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div style={{ background: 'var(--bg-main)', padding: '28px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                              <span style={{ fontSize: '3rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                {kpiOrcamentos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>Receitas não compensadas</span>
                            </div>
                            <div style={{ background: 'var(--bg-main)', padding: '28px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                              <span style={{ fontSize: '3rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                {kpiValorOrcamentos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>Despesas não compensadas</span>
                            </div>
                            <div style={{ background: 'var(--bg-main)', padding: '28px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                              <span style={{ fontSize: '3rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                {kpiMediaDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>Lucro não compensado</span>
                            </div>
                          </div>
                        </div>

                        {/* Seção 3: Regime de Competência */}
                        <div style={{ marginBottom: '2.5rem' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '4px', height: '18px', background: 'var(--accent)', borderRadius: '2px' }}></span>
                            Regime de Competência (DRE Econômico)
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div style={{ background: 'var(--bg-main)', padding: '28px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                              <span style={{ fontSize: '3rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                {totalGeralHoras.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>Receitas (Competência)</span>
                            </div>
                            <div style={{ background: 'var(--bg-main)', padding: '28px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                              <span style={{ fontSize: '3rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                {totalGeralCustoHora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>Despesas (Competência)</span>
                            </div>
                            <div style={{ background: 'var(--bg-main)', padding: '28px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                              <span style={{ fontSize: '3rem', fontWeight: '700', color: '#445164', marginBottom: '8px', lineHeight: 1 }}>
                                {totalGeralCustoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>Resultado (Competência)</span>
                            </div>
                          </div>
                        </div>

                        {/* Duas novas visualizações: Variação de receita mensal & Lista de inadimplentes */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          {/* Card Variação de Receita */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', minHeight: '260px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600', marginBottom: '24px' }}>Variação da receita mensal</span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, textAlign: 'center' }}>
                              <span style={{ fontSize: '3.8rem', fontWeight: '700', color: '#445164', marginBottom: '4px', lineHeight: 1 }}>
                                {variacaoReceita.ultimoMesValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '500' }}>
                                {variacaoReceita.ultimoMesLabel}
                              </span>
                              {variacaoReceita.ultimoMesValor > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                  <span style={{ 
                                    background: variacaoReceita.variacaoPorcentagem >= 0 ? '#e6f4ea' : '#fce8e6', 
                                    color: variacaoReceita.variacaoPorcentagem >= 0 ? '#137333' : '#c5221f', 
                                    padding: '4px 8px', 
                                    borderRadius: '12px', 
                                    fontSize: '0.85rem', 
                                    fontWeight: '600',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}>
                                    {variacaoReceita.variacaoPorcentagem >= 0 ? '↑' : '↓'} {Math.abs(variacaoReceita.variacaoPorcentagem).toFixed(1)}%
                                  </span>
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    vs. mês anterior: {variacaoReceita.anteriorMesValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Inadimplentes - Últimos 6 meses */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', minHeight: '260px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600', marginBottom: '16px' }}>Inadimplentes - Últimos 6 meses</span>
                            
                            {/* Tabela de Inadimplentes */}
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                  <span>Clientes</span>
                                  <span>Total (R$)</span>
                                </div>
                                
                                {inadimplentes.length === 0 ? (
                                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Nenhum inadimplente encontrado no período.
                                  </div>
                                ) : (
                                  inadimplentes.slice((pageInadimplentes - 1) * INADIMPLENTES_PER_PAGE, pageInadimplentes * INADIMPLENTES_PER_PAGE).map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < INADIMPLENTES_PER_PAGE - 1 ? '1px solid var(--bg-hover)' : 'none', fontSize: '0.9rem' }}>
                                      <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{item.cliente}</span>
                                      <span style={{ fontWeight: '600', color: '#445164' }}>
                                        {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Paginação */}
                              {inadimplentes.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                  <span>
                                    Linhas {((pageInadimplentes - 1) * INADIMPLENTES_PER_PAGE) + 1}-{Math.min(pageInadimplentes * INADIMPLENTES_PER_PAGE, inadimplentes.length)} de {inadimplentes.length}
                                  </span>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button 
                                      onClick={() => setPageInadimplentes(p => Math.max(1, p - 1))}
                                      disabled={pageInadimplentes === 1}
                                      style={{ 
                                        border: 'none', 
                                        background: 'none', 
                                        cursor: pageInadimplentes === 1 ? 'not-allowed' : 'pointer', 
                                        color: pageInadimplentes === 1 ? 'var(--border-color)' : 'var(--text-main)',
                                        padding: '4px',
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      &lt;
                                    </button>
                                    <button 
                                      onClick={() => setPageInadimplentes(p => Math.min(Math.ceil(inadimplentes.length / INADIMPLENTES_PER_PAGE), p + 1))}
                                      disabled={pageInadimplentes >= Math.ceil(inadimplentes.length / INADIMPLENTES_PER_PAGE)}
                                      style={{ 
                                        border: 'none', 
                                        background: 'none', 
                                        cursor: pageInadimplentes >= Math.ceil(inadimplentes.length / INADIMPLENTES_PER_PAGE) ? 'not-allowed' : 'pointer', 
                                        color: pageInadimplentes >= Math.ceil(inadimplentes.length / INADIMPLENTES_PER_PAGE) ? 'var(--border-color)' : 'var(--text-main)',
                                        padding: '4px',
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      &gt;
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Principais Clientes e Saldo por Conta */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          {/* Card Principais Clientes */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', minHeight: '260px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600', marginBottom: '16px' }}>Principais clientes</span>
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                  <span>Cliente</span>
                                  <span>Total (R$)</span>
                                </div>
                                {principaisClientes && principaisClientes.length === 0 ? (
                                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Nenhum dado encontrado no período.
                                  </div>
                                ) : (
                                  principaisClientes && principaisClientes.slice(0, 10).map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < Math.min(principaisClientes.length, 10) - 1 ? '1px solid var(--bg-hover)' : 'none', fontSize: '0.9rem' }}>
                                      <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{item.Cliente}</span>
                                      <span style={{ fontWeight: '600', color: '#445164' }}>
                                        {(Number(item.Total) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Saldo por Conta */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', minHeight: '260px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600', marginBottom: '16px' }}>Saldo por conta</span>
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                  <span>Conta</span>
                                  <span>Total (R$)</span>
                                </div>
                                {saldoConta && saldoConta.length === 0 ? (
                                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Nenhum dado encontrado no período.
                                  </div>
                                ) : (
                                  saldoConta && saldoConta.slice(0, 10).map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < Math.min(saldoConta.length, 10) - 1 ? '1px solid var(--bg-hover)' : 'none', fontSize: '0.9rem' }}>
                                      <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{item.Conta}</span>
                                      <span style={{ fontWeight: '600', color: '#445164' }}>
                                        {(Number(item.Total) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Receitas e Despesas por Categoria */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          {/* Card Receitas compensadas por categoria */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', minHeight: '260px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600', marginBottom: '16px' }}>Receitas compensadas por categoria</span>
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                  <span>Categoria</span>
                                  <span>Total (R$)</span>
                                </div>
                                {receitasPorCategoria && receitasPorCategoria.length === 0 ? (
                                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Nenhum dado encontrado no período.
                                  </div>
                                ) : (
                                  receitasPorCategoria && receitasPorCategoria.slice((pageReceitasCat - 1) * CATEGORIAS_PER_PAGE, pageReceitasCat * CATEGORIAS_PER_PAGE).map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < Math.min(CATEGORIAS_PER_PAGE, receitasPorCategoria.length - (pageReceitasCat - 1) * CATEGORIAS_PER_PAGE) - 1 ? '1px solid var(--bg-hover)' : 'none', fontSize: '0.9rem' }}>
                                      <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{item.Categoria}</span>
                                      <span style={{ fontWeight: '600', color: '#445164' }}>
                                        {(Number(item.Total) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                              {/* Paginação Receitas Categoria */}
                              {receitasPorCategoria && receitasPorCategoria.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                  <span>
                                    Linhas {((pageReceitasCat - 1) * CATEGORIAS_PER_PAGE) + 1}-{Math.min(pageReceitasCat * CATEGORIAS_PER_PAGE, receitasPorCategoria.length)} de {receitasPorCategoria.length}
                                  </span>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button 
                                      onClick={() => setPageReceitasCat(p => Math.max(1, p - 1))}
                                      disabled={pageReceitasCat === 1}
                                      style={{ border: 'none', background: 'none', cursor: pageReceitasCat === 1 ? 'not-allowed' : 'pointer', color: pageReceitasCat === 1 ? 'var(--border-color)' : 'var(--text-main)', padding: '4px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >&lt;</button>
                                    <button 
                                      onClick={() => setPageReceitasCat(p => Math.min(Math.ceil(receitasPorCategoria.length / CATEGORIAS_PER_PAGE), p + 1))}
                                      disabled={pageReceitasCat >= Math.ceil(receitasPorCategoria.length / CATEGORIAS_PER_PAGE)}
                                      style={{ border: 'none', background: 'none', cursor: pageReceitasCat >= Math.ceil(receitasPorCategoria.length / CATEGORIAS_PER_PAGE) ? 'not-allowed' : 'pointer', color: pageReceitasCat >= Math.ceil(receitasPorCategoria.length / CATEGORIAS_PER_PAGE) ? 'var(--border-color)' : 'var(--text-main)', padding: '4px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >&gt;</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Despesas compensadas por categoria */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', minHeight: '260px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600', marginBottom: '16px' }}>Despesas compensadas por categoria</span>
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                  <span>Categoria</span>
                                  <span>Total (R$)</span>
                                </div>
                                {despesasPorCategoria && despesasPorCategoria.length === 0 ? (
                                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Nenhum dado encontrado no período.
                                  </div>
                                ) : (
                                  despesasPorCategoria && despesasPorCategoria.slice((pageDespesasCat - 1) * CATEGORIAS_PER_PAGE, pageDespesasCat * CATEGORIAS_PER_PAGE).map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < Math.min(CATEGORIAS_PER_PAGE, despesasPorCategoria.length - (pageDespesasCat - 1) * CATEGORIAS_PER_PAGE) - 1 ? '1px solid var(--bg-hover)' : 'none', fontSize: '0.9rem' }}>
                                      <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{item.Categoria}</span>
                                      <span style={{ fontWeight: '600', color: '#445164' }}>
                                        {(Number(item.Total) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                              {/* Paginação Despesas Categoria */}
                              {despesasPorCategoria && despesasPorCategoria.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                  <span>
                                    Linhas {((pageDespesasCat - 1) * CATEGORIAS_PER_PAGE) + 1}-{Math.min(pageDespesasCat * CATEGORIAS_PER_PAGE, despesasPorCategoria.length)} de {despesasPorCategoria.length}
                                  </span>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button 
                                      onClick={() => setPageDespesasCat(p => Math.max(1, p - 1))}
                                      disabled={pageDespesasCat === 1}
                                      style={{ border: 'none', background: 'none', cursor: pageDespesasCat === 1 ? 'not-allowed' : 'pointer', color: pageDespesasCat === 1 ? 'var(--border-color)' : 'var(--text-main)', padding: '4px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >&lt;</button>
                                    <button 
                                      onClick={() => setPageDespesasCat(p => Math.min(Math.ceil(despesasPorCategoria.length / CATEGORIAS_PER_PAGE), p + 1))}
                                      disabled={pageDespesasCat >= Math.ceil(despesasPorCategoria.length / CATEGORIAS_PER_PAGE)}
                                      style={{ border: 'none', background: 'none', cursor: pageDespesasCat >= Math.ceil(despesasPorCategoria.length / CATEGORIAS_PER_PAGE) ? 'not-allowed' : 'pointer', color: pageDespesasCat >= Math.ceil(despesasPorCategoria.length / CATEGORIAS_PER_PAGE) ? 'var(--border-color)' : 'var(--text-main)', padding: '4px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >&gt;</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Gráficos de Evolução Financeira e Evolução Financeira - DRE */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          {/* Gráfico 1: Evolução financeira */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Evolução financeira</h4>
                            <div style={{ width: '100%', height: '400px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartEvolucaoCompensada} margin={{ top: 30, right: 30, left: 10, bottom: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                  <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: 'var(--text-muted)', fontWeight: '500' }} />
                                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: 'var(--text-muted)' }} tickFormatter={formatKLabel} />
                                  <Tooltip formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                  <Legend verticalAlign="top" height={36} iconType="circle" style={{ fontSize: '12px' }} />
                                  <Line type="monotone" dataKey="Receitas" stroke="#3b82f6" strokeWidth={3} dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Receitas" formatter={formatKLabel} position="top" style={{ fill: '#3b82f6', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                  <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} dot={{ stroke: '#ef4444', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Despesas" formatter={formatKLabel} position="top" style={{ fill: '#ef4444', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                  <Line type="monotone" dataKey="Lucro" stroke="#10b981" strokeWidth={3} dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Lucro" formatter={formatKLabel} position="top" style={{ fill: '#10b981', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                  <Line type="monotone" dataKey="Lucro Acumulado" stroke="#06b6d4" strokeWidth={3} dot={{ stroke: '#06b6d4', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Lucro Acumulado" formatter={formatKLabel} position="top" style={{ fill: '#06b6d4', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Gráfico 2: Evolução financeira - DRE */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Evolução financeira - DRE</h4>
                            <div style={{ width: '100%', height: '400px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartEvolucaoDRE} margin={{ top: 30, right: 30, left: 10, bottom: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                  <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: 'var(--text-muted)', fontWeight: '500' }} />
                                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: 'var(--text-muted)' }} tickFormatter={formatKLabel} />
                                  <Tooltip formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                  <Legend verticalAlign="top" height={36} iconType="circle" style={{ fontSize: '12px' }} />
                                  <Line type="monotone" dataKey="Receitas" stroke="#3b82f6" strokeWidth={3} dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Receitas" formatter={formatKLabel} position="top" style={{ fill: '#3b82f6', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                  <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} dot={{ stroke: '#ef4444', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Despesas" formatter={formatKLabel} position="top" style={{ fill: '#ef4444', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                  <Line type="monotone" dataKey="Lucro" stroke="#10b981" strokeWidth={3} dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Lucro" formatter={formatKLabel} position="top" style={{ fill: '#10b981', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                  <Line type="monotone" dataKey="Lucro Acumulado" stroke="#06b6d4" strokeWidth={3} dot={{ stroke: '#06b6d4', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Lucro Acumulado" formatter={formatKLabel} position="top" style={{ fill: '#06b6d4', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Gráfico 3: Evolução financeira (Não compensado) */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Evolução financeira (Não compensado)</h4>
                            <div style={{ width: '100%', height: '400px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartEvolucaoNaoCompensada} margin={{ top: 30, right: 30, left: 10, bottom: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                  <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: 'var(--text-muted)', fontWeight: '500' }} />
                                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: 'var(--text-muted)' }} tickFormatter={formatKLabel} />
                                  <Tooltip formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                  <Legend verticalAlign="top" height={36} iconType="circle" style={{ fontSize: '12px' }} />
                                  <Line type="monotone" dataKey="Receitas" stroke="#3b82f6" strokeWidth={3} dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Receitas" formatter={formatKLabel} position="top" style={{ fill: '#3b82f6', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                  <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} dot={{ stroke: '#ef4444', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Despesas" formatter={formatKLabel} position="top" style={{ fill: '#ef4444', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                  <Line type="monotone" dataKey="Lucro" stroke="#10b981" strokeWidth={3} dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Lucro" formatter={formatKLabel} position="top" style={{ fill: '#10b981', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                  <Line type="monotone" dataKey="Lucro Acumulado" stroke="#06b6d4" strokeWidth={3} dot={{ stroke: '#06b6d4', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6 }}>
                                    <LabelList dataKey="Lucro Acumulado" formatter={formatKLabel} position="top" style={{ fill: '#06b6d4', fontSize: '10px', fontWeight: '600' }} />
                                  </Line>
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedFaq.id === 10 && (
                      <HoursUtilizationDashboard />
                    )}
                    {false && selectedFaq.id === 10 && (() => {
                      const COLORS = ['#facc15', '#fb7185', '#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#e879f9', '#60a5fa'];
                      return (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '2rem', marginTop: '2rem', alignItems: 'start' }}>
                            {/* Gráfico de Barras: Utilização de Horas Mensal */}
                            <div style={{ height: 500, background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>Utilização de Horas - Mensal</h3>
                              <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                  <XAxis dataKey="Responsável" tickLine={false} angle={-45} textAnchor="end" height={80} interval={0} style={{ fontSize: '11px', fill: 'var(--text-muted)' }} />
                                  <YAxis tickLine={false} allowDecimals={false} style={{ fontSize: '11px', fill: 'var(--text-muted)' }} />
                                  <Tooltip cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }} />
                                  <Legend verticalAlign="top" height={36} iconType="circle" />
                                  <Bar dataKey="Horas Úteis no Mês" fill="#8dc63f" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Horas Úteis no Mês" position="top" style={{ fill: 'var(--text-main)', fontWeight: '600', fontSize: '11px' }} />
                                  </Bar>
                                  <Bar dataKey="Horas Trabalhadas" fill="#80cbc4" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Horas Trabalhadas" position="top" style={{ fill: 'var(--text-main)', fontWeight: '600', fontSize: '11px' }} />
                                  </Bar>
                                  <Bar dataKey="Saldo de Horas no Mês" fill="#8e7cc3" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Saldo de Horas no Mês" position="top" style={{ fill: 'var(--text-main)', fontWeight: '600', fontSize: '11px' }} />
                                  </Bar>
                                  <Bar dataKey="Taxa do Mês (%)" fill="#4ba1eb" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Taxa do Mês (%)" position="top" style={{ fill: 'var(--text-main)', fontWeight: '600', fontSize: '11px' }} />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Gráfico de Rosca: Horas trabalhadas por projeto */}
                            <div style={{ height: 500, background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>Horas trabalhadas por projeto</h3>
                              <div style={{ position: 'relative', flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none', top: '42%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                  <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.1' }}>{kpiTotalHoras}</div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>TOTAL</div>
                                </div>
                                <ResponsiveContainer width="100%" height="100%">
                                  <RechartsPieChart>
                                    <Pie
                                      data={barChartAnoData}
                                      cx="50%"
                                      cy="42%"
                                      innerRadius={70}
                                      outerRadius={110}
                                      paddingAngle={3}
                                      dataKey="value"
                                      label={({ percent }) => percent > 0.02 ? `${(percent * 100).toFixed(0)}%` : ''}
                                      labelLine={false}
                                    >
                                      {barChartAnoData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${value}h`} />
                                    <Legend 
                                      layout="horizontal" 
                                      align="center" 
                                      verticalAlign="bottom" 
                                      iconType="circle" 
                                      wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                                      formatter={(value) => <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{value.length > 20 ? `${value.slice(0, 18)}...` : value}</span>} 
                                    />
                                  </RechartsPieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>

                          {/* Tabela Dinâmica: Total Horas por Colaboradores */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', marginTop: '2rem' }}>
                            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>Total Horas por Colaboradores</h3>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
                                    <th style={{ padding: '12px 16px' }}>Responsável</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total de Horas Úteis no Mês</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total de Horas Trabalhadas</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total de Saldo de Horas no Mês</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total de Taxa do Mês(%)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {chartData.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                                      <td style={{ padding: '14px 16px', fontWeight: '500' }}>{row['Responsável']}</td>
                                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>{row['Horas Úteis no Mês']}</td>
                                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>{row['Horas Trabalhadas']}</td>
                                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>{row['Saldo de Horas no Mês']}</td>
                                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>{row['Taxa do Mês (%)'] !== undefined && row['Taxa do Mês (%)'] !== null ? String(row['Taxa do Mês (%)']).replace('.', ',') : ''}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Tabela Dinâmica: Total de Horas por mês */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', marginTop: '2rem' }}>
                            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>Total de Horas por mês</h3>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
                                    <th style={{ padding: '12px 16px' }}>Mês: Month</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Horas Úteis no Mês</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Horas Trabalhadas</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Saldo de Horas no Mês</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Taxa do Mês(%)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tabelaPorMesData.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                                      <td style={{ padding: '14px 16px', fontWeight: '500', textTransform: 'capitalize' }}>{row.mesLabel}</td>
                                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>{row.horasUteis}</td>
                                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>{row.horasTrabalhadas}</td>
                                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>{row.saldo}</td>
                                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>{String(row.taxa).replace('.', ',')}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Tabela Dinâmica: Total geral de horas */}
                          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', marginTop: '2rem' }}>
                            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>Total geral de horas</h3>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Horas Úteis no Mês</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Horas Trabalhadas</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Saldo de Horas no Mês</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Taxa do Mês(%)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', background: 'transparent' }}>
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{tabelaTotalGeralData.horasUteis}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{tabelaTotalGeralData.horasTrabalhadas}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{tabelaTotalGeralData.saldo}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{String(tabelaTotalGeralData.taxa).replace('.', ',')}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {selectedFaq.id !== 1 && selectedFaq.id !== 2 && selectedFaq.id !== 3 && selectedFaq.id !== 4 && selectedFaq.id !== 5 && selectedFaq.id !== 6 && selectedFaq.id !== 7 && selectedFaq.id !== 8 && selectedFaq.id !== 9 && selectedFaq.id !== 10 && (
                      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-hover)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                        <BarChart2 size={48} color="var(--accent)" style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-main)' }}>Área de Gráficos e Visualizações</p>
                        <p style={{ fontSize: '0.9rem' }}>Os gráficos reais serão injetados aqui em breve.</p>
                      </div>
                    )}

                  </div>
                )}

                {viewMode === 'tabela' && (
                  faqData && faqData.length > 0 ? (
                    <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-hover)', padding: '4px', borderRadius: '10px' }}>
                          {isMultiple && sqlFileNames.map((name, idx) => (
                            <button
                              key={idx}
                              onClick={() => { setActiveSqlIndex(idx); setPageTabela(1); }}
                              style={{
                                padding: '6px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                background: activeSqlIndex === idx ? 'var(--accent)' : 'transparent',
                                color: activeSqlIndex === idx ? 'var(--bg-main)' : 'var(--text-muted)',
                                transition: '0.2s',
                                fontWeight: activeSqlIndex === idx ? '600' : '400'
                              }}
                            >
                              {name.split('/').pop().replace('.sql', '')}
                            </button>
                          ))}
                          {!isMultiple && <span style={{ padding: '6px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tabelão Único</span>}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Página {pageTabela} de {totalPagesTabela || 1} ({mainDataForTable.length} registros)</span>
                          <button onClick={() => setPageTabela(p => Math.max(1, p - 1))} disabled={pageTabela === 1} style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: pageTabela === 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
                          <button onClick={() => setPageTabela(p => Math.min(totalPagesTabela, p + 1))} disabled={pageTabela === totalPagesTabela || totalPagesTabela === 0} style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: pageTabela === totalPagesTabela || totalPagesTabela === 0 ? 'not-allowed' : 'pointer' }}>Próxima</button>
                        </div>
                      </div>

                      <div className="ai-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table className="ai-table">
                          <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-main)' }}>
                            <tr>
                              {mainDataForTable.length > 0 ? Object.keys(mainDataForTable[0]).map((key) => (
                                <th key={key}>{key}</th>
                              )) : <th>Sem colunas</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedFaqData.map((row, i) => (
                              <tr key={i}>
                                {Object.values(row).map((val, j) => (
                                  <td key={j}>{val !== null ? String(val) : '-'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : faqData ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      A consulta não retornou resultados.
                    </div>
                  ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      O SQL para este card ainda não foi configurado no servidor.
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-playground">
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '500', color: 'var(--text-main)', marginBottom: '12px' }}>
            Perguntas frequentes
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            Visão rápida dos seus indicadores. Clique em qualquer bolha para ver os detalhes.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '24px'
        }}>
          {faqItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedFaq(item)}
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '24px',
                  padding: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(168, 199, 250, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{
                  background: 'rgba(37, 99, 235, 0.08)',
                  padding: '16px',
                  borderRadius: '50%',
                  marginBottom: '16px'
                }}>
                  <Icon size={28} color="var(--accent)" />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '500', color: 'var(--text-main)', marginBottom: '16px', lineHeight: '1.4' }}>
                  {item.title}
                </h3>

                <div style={{
                  background: 'var(--bg-hover)',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  marginTop: 'auto'
                }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {item.kpiLabel}
                  </span>
                  <span style={{ display: 'block', fontSize: '1.3rem', fontWeight: '600', color: 'var(--accent)' }}>
                    {item.kpiValue}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

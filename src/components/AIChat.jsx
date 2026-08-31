import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, Loader2, Database, BarChart3, X, LayoutDashboard, MessageSquare } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { httpClient } from '../api/httpClient.js';

function AIChat() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('aiChatMessages');
    if (saved) return JSON.parse(saved);
    return [{
      role: 'assistant',
      content: `Olá! Sou a F.A.S.T AI, sua assistente conectada ao banco de dados. \n\nVocê pode me perguntar livremente sobre projetos, membros, tarefas e todas as tabelas mapeadas no DDL.`
    }];
  });
  
  const [activeTab, setActiveTab] = useState('chat');
  
  const [dashboardItems, setDashboardItems] = useState(() => {
    const saved = localStorage.getItem('aiDashboardItems');
    if (saved) return JSON.parse(saved);
    return [];
  });
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Efeitos de persistência
  useEffect(() => {
    localStorage.setItem('aiChatMessages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('aiDashboardItems', JSON.stringify(dashboardItems));
  }, [dashboardItems]);

  const handleClearHistory = () => {
    if (window.confirm('Tem certeza que deseja apagar todo o histórico de chat e os gráficos gerados?')) {
      const defaultMessages = [{
        role: 'assistant',
        content: `Olá! Sou a F.A.S.T AI, sua assistente conectada ao banco de dados. \n\nVocê pode me perguntar livremente sobre projetos, membros, tarefas e todas as tabelas mapeadas no DDL.`
      }];
      setMessages(defaultMessages);
      setDashboardItems([]);
      localStorage.setItem('aiChatMessages', JSON.stringify(defaultMessages));
      localStorage.setItem('aiDashboardItems', JSON.stringify([]));
    }
  };

  const handleRemoveDashboardItem = (id) => {
    setDashboardItems(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => !m.content.startsWith('Erro ao processar:'))
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));
      
      const response = await httpClient('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          message: userMessage,
          history: history 
        })
      });

      const data = response.data;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.reply,
        hasChart: data.visualization && data.visualization.type !== 'none'
      }]);

      if (data.visualization && data.visualization.type !== 'none' && data.data && data.data.length > 0) {
        const newItem = {
          id: Date.now().toString(),
          title: userMessage,
          visualization: data.visualization,
          data: data.data
        };
        setDashboardItems(prev => [newItem, ...prev]);
        setActiveTab('dashboard'); // Força a mudança visual impactante
      }
    } catch (error) {
      console.error("Erro na API Backend:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Erro ao processar: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderVisualization = (item) => {
    const { visualization, data, id, title } = item;
    const { type, xAxis, yAxis } = visualization;

    // Garante que yAxisKeys seja sempre um Array
    const yAxisKeys = Array.isArray(yAxis) ? yAxis : (yAxis ? [yAxis] : []);

    // Cores padrão vibrantes mas agradáveis
    const colors = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'];

    return (
      <div className="dashboard-card" key={id}>
        <div className="dashboard-card-header">
          <h3>{title}</h3>
          <button 
            className="dashboard-close-btn" 
            onClick={() => handleRemoveDashboardItem(id)}
            title="Remover visualização"
          >
            <X size={16} />
          </button>
        </div>
        
        {type === 'table' && (
          <div className="ai-table-container">
            <table className="ai-table">
              <thead>
                <tr>{Object.keys(data[0] || {}).map(k => <th key={k}>{k}</th>)}</tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>{Object.keys(data[0] || {}).map(k => <td key={k}>{row[k]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {type === 'bar' && (
          <div className="ai-chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={xAxis} tick={{fill: '#64748b'}} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: 'rgba(0,0,0,0.05)'}} 
                  formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
                  contentStyle={{backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a'}}
                />
                <Legend verticalAlign="top" height={36} />
                {yAxisKeys.map((key, index) => (
                  <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]}>
                    <LabelList 
                      dataKey={key} 
                      position="top" 
                      style={{ fill: '#64748b', fontSize: 12 }}
                      formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value} 
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {type === 'line' && (
          <div className="ai-chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={xAxis} tick={{fill: '#64748b'}} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{fill: '#64748b'}} />
                <Tooltip 
                  formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
                  contentStyle={{backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a'}}
                />
                <Legend verticalAlign="top" height={36} />
                {yAxisKeys.map((key, index) => (
                  <Line 
                    key={key} 
                    type="monotone" 
                    dataKey={key} 
                    stroke={colors[index % colors.length]} 
                    strokeWidth={3}
                    activeDot={{ r: 6 }} 
                  >
                    <LabelList 
                      dataKey={key} 
                      position="top" 
                      style={{ fill: '#64748b', fontSize: 12 }}
                      formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value} 
                    />
                  </Line>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ai-chat-fullscreen">
      
      {/* Abas Superiores Nav */}
      <div className="tabs-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={16} />
            Chat Assistant
          </button>
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={16} />
            Playground BI {dashboardItems.length > 0 && <span className="badge">{dashboardItems.length}</span>}
          </button>
        </div>

        <button 
          onClick={handleClearHistory}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            transition: '0.2s',
            marginRight: '1rem'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          <X size={16} /> Limpar Histórico
        </button>
      </div>

      {activeTab === 'chat' && (
        <>
          <div className="chat-area" ref={scrollRef}>
            <div className="chat-welcome">
              <Sparkles className="sparkle-icon" size={48} />
              <h1>Como posso ajudar com seus dados hoje?</h1>
            </div>

            <div className="messages-container">
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'assistant' ? <Sparkles size={20} /> : <User size={20} />}
                  </div>
                  <div className="message-content">
                    {msg.content.split('\n').map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                    
                    {/* Alerta de gráfico gerado */}
                    {msg.hasChart && (
                      <div 
                        className="chart-alert" 
                        onClick={() => setActiveTab('dashboard')}
                      >
                        <BarChart3 size={16}/> Um novo gráfico foi criado! Clique aqui para ver no Playground BI.
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message-row assistant">
                  <div className="message-avatar">
                    <Sparkles size={20} />
                  </div>
                  <div className="message-content loader-content">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Analisando tabelas e gerando SQL...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="chat-input-wrapper">
            <div className="chat-input-container">
              <textarea
                ref={textareaRef}
                placeholder="Pergunte sobre horas, tarefas, membros..."
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button 
                className="send-button"
                onClick={handleSend} 
                disabled={loading || !input.trim()}
              >
                <Send size={18} />
              </button>
            </div>
            <p className="chat-disclaimer">
              F.A.S.T AI pode cometer erros. Considere verificar as informações geradas através da query.
            </p>
          </div>
        </>
      )}

      {activeTab === 'dashboard' && (
        <div className="dashboard-playground">
          {dashboardItems.length === 0 ? (
            <div className="dashboard-empty-state">
              <BarChart3 size={48} className="empty-icon" />
              <h2>Seu ambiente de BI está vazio</h2>
              <p>Pergunte no Chat sobre seus painéis e finanças, e as respostas visuais aparecerão aqui magicamente.</p>
              <button className="btn-go-chat" onClick={() => setActiveTab('chat')}>Conversar com AI</button>
            </div>
          ) : (
            <div className="dashboard-grid">
              {dashboardItems.map(item => renderVisualization(item))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AIChat;

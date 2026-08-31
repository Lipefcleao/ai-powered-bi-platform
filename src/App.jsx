import React, { useState, useEffect } from 'react';
import AIChat from './components/AIChat';
import FaqTab from './components/FaqTab';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import { Settings, MessageSquare, HelpCircle, BarChart2, LogOut } from 'lucide-react';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('bi_auth_user');
      const token = localStorage.getItem('bi_auth_token');
      return savedUser && token ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('chat');

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth_logout', handleLogout);
    return () => {
      window.removeEventListener('auth_logout', handleLogout);
    };
  }, []);

  const handleLogoutClick = () => {
    localStorage.removeItem('bi_auth_token');
    localStorage.removeItem('bi_auth_user');
    setUser(null);
  };

  // Se não estiver autenticado, exibe a tela de login
  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  const isAdmin = user.roles && user.roles.includes('admin');
  const isAnalyst = user.roles && (user.roles.includes('analyst') || user.roles.includes('admin'));

  return (
    <div className="app-layout">
      {/* Sidebar / Menu esquerdo */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">⚡</div>
          <h2>NovaBI AI</h2>
        </div>
        
        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={18} />
            <span>Chat Assistant</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            <HelpCircle size={18} />
            <span>Perguntas frequentes</span>
          </div>
          
          {/* Exibe painel Admin apenas se o usuário tiver papel de administrador */}
          {isAdmin && (
            <div 
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <BarChart2 size={18} />
              <span>Admin Dashboard</span>
            </div>
          )}
        </nav>
        
        <div className="sidebar-footer">
          <div className="nav-item" onClick={handleLogoutClick}>
            <LogOut size={18} />
            <span>Sair do Painel</span>
          </div>
          <div className="user-profile-sm">
            <div className="avatar-circle">
              {user.id ? user.id.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="user-info-text">
              <span className="user-name">{user.id}</span>
              <span className="user-role">{isAdmin ? 'Administrador' : isAnalyst ? 'Analista' : 'Visualizador'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="app-main">
        {activeTab === 'chat' && <AIChat user={user} />}
        {activeTab === 'faq' && <FaqTab user={user} />}
        {activeTab === 'admin' && isAdmin && <AdminDashboard user={user} />}
      </main>
    </div>
  );
}

export default App;


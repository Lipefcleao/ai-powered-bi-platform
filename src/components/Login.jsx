import React, { useState } from 'react';
import { httpClient } from '../api/httpClient';
import { Lock, User, AlertCircle, Loader } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Por favor, informe a senha de acesso.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await httpClient('/api/login', {
        body: JSON.stringify({ username, password })
      });

      const { token, user } = response.data;
      localStorage.setItem('bi_auth_token', token);
      localStorage.setItem('bi_auth_user', JSON.stringify(user));
      
      onLoginSuccess(user);
    } catch (err) {
      console.error('[Login Error]', err);
      setError(err.message || 'Falha ao autenticar. Por favor, verifique a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-glow-orb-1"></div>
      <div className="login-glow-orb-2"></div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-icon">⚡</div>
          <h1>NovaBI AI</h1>
          <p>Business Intelligence & Analytics Hub</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="login-input-group">
            <label htmlFor="username">Usuário</label>
            <div className="login-input-wrapper">
              <User className="input-icon" size={18} />
              <input
                id="username"
                type="text"
                placeholder="Ex: admin ou viewer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="password">Senha de Acesso</label>
            <div className="login-input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>
                <Loader className="spinner" size={18} />
                <span>Autenticando...</span>
              </>
            ) : (
              <span>Entrar no Painel</span>
            )}
          </button>
        </form>
        
        <div className="login-footer" style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '0.75rem' }}>
            <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '0.25rem' }}>🔑 Modo de Demonstração (Demo)</strong>
            <span>Usuário: <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#f8fafc' }}>admin</code> | Senha: <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#f8fafc' }}>demo</code></span>
          </div>
          <p>Ambiente seguro e monitorado corporativamente.</p>
        </div>
      </div>
    </div>
  );
}

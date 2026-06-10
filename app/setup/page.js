'use client';
import { useState } from 'react';

export default function Setup() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function runMigration() {
    setStatus('loading');
    setMessage('Executando migração...');

    try {
      const r = await fetch('/api/setup', { method: 'POST' });
      const data = await r.json();

      if (r.ok) {
        setStatus('success');
        setMessage('Banco de dados configurado com sucesso! ✅');
      } else {
        setStatus('error');
        setMessage(`Erro: ${data.error}`);
      }
    } catch (err) {
      setStatus('error');
      setMessage(`Erro: ${err.message}`);
    }
  }

  return (
    <div className="adminBody">
      <header>
        <div className="alogo script">Essência no Pote</div>
        <div className="sub">Configuração Inicial</div>
      </header>

      <div className="awrap">
        <div className="item" style={{ textAlign: 'center', marginTop: 40 }}>
          <h2 style={{ marginBottom: 20 }}>🗄️ Configurar Banco de Dados</h2>
          <p style={{ marginBottom: 20, color: 'var(--pink-soft)' }}>
            Clique no botão abaixo para criar as tabelas no Supabase.
          </p>

          {status === 'idle' && (
            <button className="abtn" onClick={runMigration}>
              Configurar Supabase
            </button>
          )}

          {status === 'loading' && (
            <>
              <div className="spin" />
              <p>{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
              <p style={{ color: '#27ae60', fontWeight: 700 }}>{message}</p>
              <a href="/" className="abtn" style={{ display: 'inline-block', marginTop: 20, textDecoration: 'none' }}>
                Acessar Loja
              </a>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
              <p style={{ color: '#e74c3c', fontWeight: 700 }}>{message}</p>
              <button className="abtn" onClick={runMigration} style={{ marginTop: 20 }}>
                Tentar novamente
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

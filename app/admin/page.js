'use client';
import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';

const fmt = v => 'R$ ' + v.toFixed(2).replace('.', ',');
const statusTxt = {
  aguardando_pagamento: 'Aguardando pgto',
  pagamento_informado: 'Conferir pgto ⚠️',
  pago: 'Pago ✓',
  cancelado: 'Cancelado'
};

export default function Admin() {
  const [pin, setPin] = useState('');
  const [logado, setLogado] = useState(false);
  const [aba, setAba] = useState('pedidos');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [flavors, setFlavors] = useState([]);
  const [novo, setNovo] = useState({ name: '', desc: '', price: '', stock: '', emoji: '' });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [ajustes, setAjustes] = useState(null);
  const [salvandoAjustes, setSalvandoAjustes] = useState(false);

  const H = useCallback(() => ({ 'Content-Type': 'application/json', 'x-pin': pin }), [pin]);

  const carregarTudo = useCallback(async (p) => {
    const h = { 'Content-Type': 'application/json', 'x-pin': p || pin };
    const [rs, ro, rf, rc] = await Promise.all([
      fetch('/api/admin/resumo', { headers: h }),
      fetch('/api/admin/orders', { headers: h }),
      fetch('/api/admin/flavors', { headers: h }),
      fetch('/api/admin/config', { headers: h })
    ]);
    if (rs.ok) setStats(await rs.json());
    if (ro.ok) setOrders(await ro.json());
    if (rf.ok) setFlavors(await rf.json());
    if (rc.ok) setAjustes(await rc.json());
  }, [pin]);

  useEffect(() => {
    const saved = sessionStorage.getItem('pin');
    if (saved) {
      fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: saved }) })
        .then(r => { if (r.ok) { setPin(saved); setLogado(true); carregarTudo(saved); } });
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!logado) return;
    const t = setInterval(() => carregarTudo(), 30000);
    return () => clearInterval(t);
  }, [logado, carregarTudo]);

  async function entrar() {
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    if (!r.ok) { alert('PIN incorreto'); return; }
    sessionStorage.setItem('pin', pin);
    setLogado(true);
    carregarTudo();
  }

  async function mudarStatus(id, status) {
    await fetch(`/api/admin/orders/${id}/status`, { method: 'POST', headers: H(), body: JSON.stringify({ status }) });
    carregarTudo();
  }
  async function editarSabor(id, body) {
    await fetch('/api/admin/flavors/' + id, { method: 'PUT', headers: H(), body: JSON.stringify(body) });
    carregarTudo();
  }
  async function excluirSabor(id) {
    await fetch('/api/admin/flavors/' + id, { method: 'DELETE', headers: H() });
    carregarTudo();
  }
  async function novoSabor() {
    if (!novo.name || !novo.price) { alert('Preencha nome e preço'); return; }
    const r = await fetch('/api/admin/flavors', { method: 'POST', headers: H(), body: JSON.stringify(novo) });
    if (r.ok) { setNovo({ name: '', desc: '', price: '', stock: '', emoji: '' }); carregarTudo(); }
  }

  async function gerarQRCode() {
    const url = window.location.origin;
    const qr = await QRCode.toDataURL(url, {
      width: 300, margin: 2, color: { dark: '#3D2010', light: '#ffffff' }
    });
    setQrCodeUrl(qr);
  }

  async function salvarAjustes() {
    setSalvandoAjustes(true);
    const r = await fetch('/api/admin/config', {
      method: 'POST', headers: H(),
      body: JSON.stringify({
        infinitePayHandle: ajustes?.infinitePayHandle || '',
        whatsapp: ajustes?.whatsapp || ''
      })
    });
    if (r.ok) {
      setAjustes(await r.json());
      alert('Ajustes salvos! ✅');
    } else {
      alert('Erro ao salvar ajustes');
    }
    setSalvandoAjustes(false);
  }

  return (
    <div className="adminBody">
      <header>
        <a href="/" className="back-link">← Voltar à loja</a>
        <div className="alogo script">Essência no Pote</div>
        <div className="sub">Painel de Controle</div>
      </header>

      <div className="awrap">
        {!logado && (
          <div className="loginbox">
            <h2>Acesso restrito 🔒</h2>
            <input type="password" placeholder="PIN" inputMode="numeric" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()} />
            <button className="abtn" onClick={entrar}>Entrar</button>
          </div>
        )}

        {logado && (
          <>
            {stats && (
              <div className="stats">
                <div className="stat"><div className="v">{stats.pendentes}</div><div className="l">A confirmar</div></div>
                <div className="stat"><div className="v">{fmt(stats.vendasHoje)}</div><div className="l">Vendas hoje</div></div>
                <div className="stat"><div className="v">{fmt(stats.vendasTotal)}</div><div className="l">Total vendido</div></div>
                <div className="stat"><div className="v">{stats.totalPedidos}</div><div className="l">Pedidos</div></div>
              </div>
            )}

            <div className="tabs">
              <button className={aba === 'pedidos' ? 'on' : ''} onClick={() => setAba('pedidos')}>📋 Pedidos</button>
              <button className={aba === 'sabores' ? 'on' : ''} onClick={() => setAba('sabores')}>🍰 Sabores</button>
              <button className={aba === 'qrcode' ? 'on' : ''} onClick={() => { setAba('qrcode'); gerarQRCode(); }}>📱 QR Code</button>
              <button className={aba === 'ajustes' ? 'on' : ''} onClick={() => setAba('ajustes')}>⚙️ Ajustes</button>
            </div>

            {aba === 'pedidos' && (
              <div>
                {orders.length === 0 && <div className="empty">Nenhum pedido ainda. 🍰</div>}
                {orders.map(o => (
                  <div className="item" key={o.id}>
                    <div className="head">
                      <div>
                        <h3>#{o.id} · {o.customerName}</h3>
                        <div className="sub2">
                          {new Date(o.createdAt).toLocaleString('pt-BR')}
                          {o.customerPhone ? ' · 📱 ' + o.customerPhone : ''}
                        </div>
                      </div>
                      <span className={'pill p-' + o.status}>{statusTxt[o.status] || o.status}</span>
                    </div>
                    <div className="itens-list">{o.items.map(i => `${i.qty}× ${i.name}`).join(' · ')}</div>
                    <div className="head">
                      <span className="atot">{fmt(o.total)}</span>
                      <div className="acts">
                        {o.status !== 'pago' && o.status !== 'cancelado' &&
                          <button className="abtn sm ok" onClick={() => mudarStatus(o.id, 'pago')}>Confirmar pgto ✓</button>}
                        {o.status !== 'cancelado' &&
                          <button className="abtn sm no" onClick={() => confirm(`Cancelar pedido #${o.id}? O estoque será devolvido.`) && mudarStatus(o.id, 'cancelado')}>Cancelar</button>}
                        <button className="abtn sm dark" onClick={() => window.open('/recibo/' + o.id, '_blank')}>Recibo 🧾</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {aba === 'sabores' && (
              <div>
                <div className="item">
                  <h3 style={{ marginBottom: 10 }}>Novo sabor</h3>
                  <div className="fgrid">
                    <div className="full"><label>Nome</label>
                      <input type="text" value={novo.name} onChange={e => setNovo({ ...novo, name: e.target.value })} /></div>
                    <div className="full"><label>Descrição</label>
                      <input type="text" value={novo.desc} onChange={e => setNovo({ ...novo, desc: e.target.value })} /></div>
                    <div><label>Preço (R$)</label>
                      <input type="number" step="0.50" min="0" value={novo.price} onChange={e => setNovo({ ...novo, price: e.target.value })} /></div>
                    <div><label>Estoque</label>
                      <input type="number" min="0" value={novo.stock} onChange={e => setNovo({ ...novo, stock: e.target.value })} /></div>
                    <div><label>Emoji</label>
                      <input type="text" maxLength={4} placeholder="🍰" value={novo.emoji} onChange={e => setNovo({ ...novo, emoji: e.target.value })} /></div>
                    <div style={{ display: 'flex', alignItems: 'end' }}>
                      <button className="abtn" style={{ width: '100%' }} onClick={novoSabor}>Adicionar +</button>
                    </div>
                  </div>
                </div>
                {flavors.map(f => (
                  <div className={'item' + (f.stock === 0 ? ' out-of-stock' : '')} key={f.id}>
                    <div className="head">
                      <h3>
                        {f.emoji || '🍰'} {f.name}
                        {!f.active && <span className="pill p-cancelado">inativo</span>}
                        {f.stock === 0 && <span className="pill p-esgotado">ESGOTADO</span>}
                        {f.stock > 0 && f.stock <= 3 && <span className="pill p-baixo">últimas {f.stock}!</span>}
                      </h3>
                      <span className="atot">{fmt(f.price)}</span>
                    </div>
                    <div className="sub2">{f.desc}</div>
                    <div className="acts">
                      <label style={{ margin: 0 }}>Estoque:</label>
                      <div className="stock-control">
                        <button className="stock-btn" onClick={() => editarSabor(f.id, { stock: Math.max(0, f.stock - 1) })}>−</button>
                        <input type="number" style={{ width: 60, textAlign: 'center' }} min="0" value={f.stock}
                          onChange={e => editarSabor(f.id, { stock: Math.max(0, +e.target.value) })} />
                        <button className="stock-btn" onClick={() => editarSabor(f.id, { stock: f.stock + 1 })}>+</button>
                        <button className="stock-btn add-stock" onClick={() => {
                          const qtd = prompt(`Adicionar estoque para ${f.name}:`, '10');
                          if (qtd && +qtd > 0) editarSabor(f.id, { stock: f.stock + +qtd });
                        }}>+N</button>
                      </div>
                      <label style={{ margin: 0 }}>Preço:</label>
                      <input type="number" style={{ width: 90 }} step="0.50" min="0" value={f.price}
                        onChange={e => editarSabor(f.id, { price: +e.target.value })} />
                      <button className="abtn sm" onClick={() => editarSabor(f.id, { active: !f.active })}>{f.active ? 'Desativar' : 'Ativar'}</button>
                      <button className="abtn sm no" onClick={() => confirm(`Excluir ${f.name}?`) && excluirSabor(f.id)}>Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {aba === 'qrcode' && (
              <div className="item" style={{ textAlign: 'center' }}>
                <h3 style={{ marginBottom: 16 }}>QR Code da Loja</h3>
                <p className="sub2" style={{ marginBottom: 20 }}>
                  Imprima este QR Code e distribua para seus clientes acessarem a loja facilmente.
                </p>
                {qrCodeUrl ? (
                  <>
                    <div className="qr-acesso">
                      <img src={qrCodeUrl} alt="QR Code da Loja" />
                    </div>
                    <div className="qr-instrucoes">
                      <h4>Como usar:</h4>
                      <ol>
                        <li>Baixe o QR Code</li>
                        <li>Imprima em cartões, panfletos ou mesa</li>
                        <li>Clientes escaneiam e acessam a loja</li>
                      </ol>
                    </div>
                    <button className="abtn" onClick={() => {
                      const link = document.createElement('a');
                      link.download = 'qrcode-essencia-no-pote.png';
                      link.href = qrCodeUrl;
                      link.click();
                    }}>📥 Baixar QR Code</button>
                  </>
                ) : (
                  <div className="spin" />
                )}
              </div>
            )}

            {aba === 'ajustes' && (
              <div className="item">
                <h3 style={{ marginBottom: 10 }}>Pagamento (InfinitePay)</h3>
                <p className="sub2" style={{ marginBottom: 14 }}>
                  Informe seu InfiniteTag (handle) — é o nome de usuário do app InfinitePay, sem o
                  &quot;$&quot;. Ele é usado para gerar os links de pagamento da loja.
                </p>
                <label>InfiniteTag (handle)</label>
                <input type="text" placeholder="ex: essencianopote"
                  value={ajustes?.infinitePayHandle || ''}
                  disabled={ajustes?.infinitePayHandleFromEnv}
                  onChange={e => setAjustes({ ...ajustes, infinitePayHandle: e.target.value })} />
                {ajustes?.infinitePayHandleFromEnv && (
                  <p className="sub2" style={{ marginTop: 6 }}>
                    Definido pela variável de ambiente INFINITEPAY_HANDLE (tem prioridade sobre este campo).
                  </p>
                )}
                <label style={{ marginTop: 12 }}>WhatsApp (contato)</label>
                <input type="text" placeholder="5531999999999"
                  value={ajustes?.whatsapp || ''}
                  onChange={e => setAjustes({ ...ajustes, whatsapp: e.target.value })} />
                <button className="abtn" style={{ marginTop: 14 }} onClick={salvarAjustes} disabled={salvandoAjustes}>
                  {salvandoAjustes ? 'Salvando...' : 'Salvar ajustes'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {logado && <button className="refresh" title="Atualizar" onClick={() => carregarTudo()}>↻</button>}
    </div>
  );
}

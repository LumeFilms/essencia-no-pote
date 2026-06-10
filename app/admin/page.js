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

function ConfirmModal({ modal, onClose, onConfirm }) {
  if (!modal) return null;
  return (
    <div className="modal-overlay" onClick={() => !modal.loading && onClose()}>
      <div className="modal-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>{modal.title}</h3>
        <p>{modal.message}</p>
        {modal.detail && (
          <div className={'modal-detail' + (modal.variant === 'danger' ? ' warn' : '')}>
            {modal.detail}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="abtn sm ghost-btn" onClick={onClose} disabled={modal.loading}>
            Cancelar
          </button>
          <button
            type="button"
            className={'abtn sm ' + (modal.variant === 'danger' ? 'del' : 'no')}
            onClick={onConfirm}
            disabled={modal.loading}
          >
            {modal.loading ? 'Aguarde...' : modal.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const [pin, setPin] = useState('');
  const [logado, setLogado] = useState(false);
  const [aba, setAba] = useState('pedidos');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [flavors, setFlavors] = useState([]);
  const [novo, setNovo] = useState({ name: '', desc: '', price: '', stock: '' });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [ajustes, setAjustes] = useState(null);
  const [salvandoAjustes, setSalvandoAjustes] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const H = useCallback(() => ({ 'Content-Type': 'application/json', 'x-pin': pin }), [pin]);

  const recarregarDoBanco = useCallback(async (p, { silencioso = false } = {}) => {
    if (!silencioso) setCarregando(true);
    const h = { 'Content-Type': 'application/json', 'x-pin': p || pin };
    const ts = Date.now();
    try {
      const [rs, ro, rf, rc] = await Promise.all([
        fetch(`/api/admin/resumo?_=${ts}`, { headers: h, cache: 'no-store' }),
        fetch(`/api/admin/orders?_=${ts}`, { headers: h, cache: 'no-store' }),
        fetch(`/api/admin/flavors?_=${ts}`, { headers: h, cache: 'no-store' }),
        fetch(`/api/admin/config?_=${ts}`, { headers: h, cache: 'no-store' })
      ]);
      if (rs.ok) setStats(await rs.json());
      if (ro.ok) setOrders(await ro.json());
      if (rf.ok) setFlavors(await rf.json());
      if (rc.ok) setAjustes(await rc.json());
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, [pin]);

  useEffect(() => {
    const saved = sessionStorage.getItem('pin');
    if (saved) {
      fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: saved }) })
        .then(r => { if (r.ok) { setPin(saved); setLogado(true); recarregarDoBanco(saved); } });
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!logado) return;
    const t = setInterval(() => recarregarDoBanco(undefined, { silencioso: true }), 30000);
    return () => clearInterval(t);
  }, [logado, recarregarDoBanco]);

  function abrirConfirmacao(config) {
    setConfirmModal({ ...config, loading: false });
  }

  function fecharModal() {
    if (confirmModal?.loading) return;
    setConfirmModal(null);
  }

  async function executarConfirmacao() {
    if (!confirmModal?.onConfirm) return;
    setConfirmModal(m => ({ ...m, loading: true }));
    try {
      await confirmModal.onConfirm();
      setConfirmModal(null);
    } catch {
      setConfirmModal(m => ({ ...m, loading: false }));
      alert('Erro na operação. Tente novamente.');
    }
  }

  async function entrar() {
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    if (!r.ok) { alert('PIN incorreto'); return; }
    sessionStorage.setItem('pin', pin);
    setLogado(true);
    recarregarDoBanco();
  }

  async function mudarStatus(id, status) {
    const r = await fetch(`/api/admin/orders/${id}/status`, {
      method: 'POST', headers: H(), body: JSON.stringify({ status }), cache: 'no-store'
    });
    if (!r.ok) { alert('Erro ao atualizar pedido'); return; }
    await recarregarDoBanco();
  }

  function pedirCancelarPedido(order) {
    abrirConfirmacao({
      title: 'Cancelar pedido?',
      message: `#${order.id} · ${order.customerName}`,
      detail: order.status === 'pago'
        ? 'O estoque será devolvido automaticamente.'
        : 'O pedido será marcado como cancelado.',
      confirmLabel: 'Sim, cancelar',
      variant: 'warning',
      onConfirm: () => mudarStatus(order.id, 'cancelado')
    });
  }

  function pedirExcluirPedido(order) {
    abrirConfirmacao({
      title: 'Excluir pedido?',
      message: `#${order.id} · ${order.customerName} · ${fmt(order.total)}`,
      detail: order.status === 'pago'
        ? 'O estoque será devolvido e o pedido será removido permanentemente do banco de dados.'
        : 'O pedido será removido permanentemente do banco de dados. Esta ação não pode ser desfeita.',
      confirmLabel: 'Sim, excluir',
      variant: 'danger',
      onConfirm: async () => {
        const r = await fetch(`/api/admin/orders/${order.id}`, { method: 'DELETE', headers: H(), cache: 'no-store' });
        if (!r.ok) throw new Error('delete failed');
        setOrders(prev => prev.filter(o => o.id !== order.id));
        await recarregarDoBanco();
      }
    });
  }

  function pedirExcluirSabor(flavor) {
    abrirConfirmacao({
      title: 'Excluir sabor?',
      message: flavor.name,
      detail: 'O sabor será removido permanentemente do banco de dados.',
      confirmLabel: 'Sim, excluir',
      variant: 'danger',
      onConfirm: async () => {
        const r = await fetch('/api/admin/flavors/' + flavor.id, { method: 'DELETE', headers: H(), cache: 'no-store' });
        if (!r.ok) throw new Error('delete failed');
        setFlavors(prev => prev.filter(f => f.id !== flavor.id));
        await recarregarDoBanco();
      }
    });
  }

  async function editarSabor(id, body) {
    await fetch('/api/admin/flavors/' + id, { method: 'PUT', headers: H(), body: JSON.stringify(body), cache: 'no-store' });
    await recarregarDoBanco(undefined, { silencioso: true });
  }

  async function novoSabor() {
    if (!novo.name || !novo.price) { alert('Preencha nome e preço'); return; }
    const r = await fetch('/api/admin/flavors', { method: 'POST', headers: H(), body: JSON.stringify(novo), cache: 'no-store' });
    if (r.ok) { setNovo({ name: '', desc: '', price: '', stock: '' }); await recarregarDoBanco(); }
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
        paymentMode: ajustes?.paymentMode || 'pix',
        pixKey: ajustes?.pixKey || '',
        pixKeyType: ajustes?.pixKeyType || 'telefone',
        merchantName: ajustes?.merchantName || '',
        merchantCity: ajustes?.merchantCity || '',
        infinitePayHandle: ajustes?.infinitePayHandle || '',
        whatsapp: ajustes?.whatsapp || ''
      }),
      cache: 'no-store'
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
      <ConfirmModal modal={confirmModal} onClose={fecharModal} onConfirm={executarConfirmacao} />

      <header>
        <a href="/" className="back-link">← Voltar à loja</a>
        <div className="alogo script">Essência no Pote</div>
        <div className="sub">Painel de Controle</div>
      </header>

      <div className="awrap">
        {!logado && (
          <div className="loginbox">
            <h2>Painel restrito</h2>
            <p>Área exclusiva para gerenciar pedidos e estoque</p>
            <input type="password" placeholder="PIN" inputMode="numeric" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()} />
            <button type="button" className="abtn" onClick={entrar}>Entrar</button>
          </div>
        )}

        {logado && (
          <>
            {carregando && <div className="loading-bar">Atualizando dados...</div>}

            {stats && (
              <div className="stats">
                <div className="stat"><div className="v">{stats.pendentes}</div><div className="l">A confirmar</div></div>
                <div className="stat"><div className="v">{fmt(stats.vendasHoje)}</div><div className="l">Vendas hoje</div></div>
                <div className="stat"><div className="v">{fmt(stats.vendasTotal)}</div><div className="l">Total vendido</div></div>
                <div className="stat"><div className="v">{stats.totalPedidos}</div><div className="l">Pedidos</div></div>
              </div>
            )}

            <div className="tabs">
              <button type="button" className={aba === 'pedidos' ? 'on' : ''} onClick={() => setAba('pedidos')}>Pedidos</button>
              <button type="button" className={aba === 'sabores' ? 'on' : ''} onClick={() => setAba('sabores')}>Sabores</button>
              <button type="button" className={aba === 'qrcode' ? 'on' : ''} onClick={() => { setAba('qrcode'); gerarQRCode(); }}>QR Code</button>
              <button type="button" className={aba === 'ajustes' ? 'on' : ''} onClick={() => setAba('ajustes')}>Ajustes</button>
            </div>

            {aba === 'pedidos' && (
              <div>
                {orders.length === 0 && !carregando && <div className="empty">Nenhum pedido no banco de dados</div>}
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
                          <button type="button" className="abtn sm ok" onClick={() => mudarStatus(o.id, 'pago')}>Confirmar pgto ✓</button>}
                        {o.status !== 'cancelado' &&
                          <button type="button" className="abtn sm no" onClick={() => pedirCancelarPedido(o)}>Cancelar</button>}
                        <button type="button" className="abtn sm dark" onClick={() => window.open('/recibo/' + o.id, '_blank')}>Recibo 🧾</button>
                        <button type="button" className="abtn sm del" onClick={() => pedirExcluirPedido(o)}>Excluir</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {aba === 'sabores' && (
              <div className="flavors-admin">
                <div className="flavor-form-card">
                  <div className="flavor-form-head">
                    <h3 className="serif">Novo sabor</h3>
                    <p>Adicione um produto ao cardápio da loja</p>
                  </div>
                  <div className="flavor-form-grid">
                    <div className="ffull">
                      <label>Nome do sabor</label>
                      <input type="text" placeholder="Ex: Brigadeiro" value={novo.name}
                        onChange={e => setNovo({ ...novo, name: e.target.value })} />
                    </div>
                    <div className="ffull">
                      <label>Descrição</label>
                      <input type="text" placeholder="Breve descrição para o cliente" value={novo.desc}
                        onChange={e => setNovo({ ...novo, desc: e.target.value })} />
                    </div>
                    <div>
                      <label>Preço (R$)</label>
                      <input type="number" step="0.50" min="0" placeholder="12.00" value={novo.price}
                        onChange={e => setNovo({ ...novo, price: e.target.value })} />
                    </div>
                    <div>
                      <label>Estoque inicial</label>
                      <input type="number" min="0" placeholder="20" value={novo.stock}
                        onChange={e => setNovo({ ...novo, stock: e.target.value })} />
                    </div>
                    <div className="ffull">
                      <button type="button" className="abtn flavor-add-btn" onClick={novoSabor}>
                        Adicionar ao cardápio
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flavor-list-head">
                  <h3 className="serif">Cardápio</h3>
                  <span className="flavor-count">{flavors.length} {flavors.length === 1 ? 'sabor' : 'sabores'}</span>
                </div>

                {flavors.length === 0 && !carregando && (
                  <div className="empty">Nenhum sabor cadastrado</div>
                )}

                {flavors.map(f => (
                  <div className={'flavor-card' + (!f.active ? ' inactive' : '') + (f.stock === 0 ? ' sold' : '')} key={f.id}>
                    <div className="flavor-card-top">
                      <div className="flavor-info">
                        <h4 className="serif">{f.name}</h4>
                        {f.desc && <p className="flavor-desc">{f.desc}</p>}
                        <div className="flavor-badges">
                          {!f.active && <span className="pill p-cancelado">Inativo</span>}
                          {f.active && f.stock === 0 && <span className="pill p-esgotado">Esgotado</span>}
                          {f.active && f.stock > 0 && f.stock <= 3 && <span className="pill p-baixo">Últimas {f.stock}</span>}
                          {f.active && f.stock > 3 && <span className="pill p-ativo">Disponível</span>}
                        </div>
                      </div>
                      <div className="flavor-price-tag">{fmt(f.price)}</div>
                    </div>

                    <div className="flavor-controls">
                      <div className="flavor-field">
                        <label>Estoque</label>
                        <div className="stock-control premium">
                          <button type="button" className="stock-btn" onClick={() => editarSabor(f.id, { stock: Math.max(0, f.stock - 1) })}>−</button>
                          <span className="stock-val">{f.stock}</span>
                          <button type="button" className="stock-btn" onClick={() => editarSabor(f.id, { stock: f.stock + 1 })}>+</button>
                          <button type="button" className="stock-btn add-stock" onClick={() => {
                            const qtd = prompt(`Adicionar estoque para ${f.name}:`, '10');
                            if (qtd && +qtd > 0) editarSabor(f.id, { stock: f.stock + +qtd });
                          }}>+10</button>
                        </div>
                      </div>
                      <div className="flavor-field">
                        <label>Preço</label>
                        <input type="number" className="flavor-price-input" step="0.50" min="0" value={f.price}
                          onChange={e => editarSabor(f.id, { price: +e.target.value })} />
                      </div>
                      <div className="flavor-actions">
                        <button type="button" className="abtn sm ghost-btn" onClick={() => editarSabor(f.id, { active: !f.active })}>
                          {f.active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button type="button" className="abtn sm del" onClick={() => pedirExcluirSabor(f)}>Excluir</button>
                      </div>
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
                    <button type="button" className="abtn" onClick={() => {
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
                <h3 style={{ marginBottom: 10 }}>Pagamento</h3>
                <p className="sub2" style={{ marginBottom: 14 }}>
                  Para venda presencial (sem entrega), use <strong>Pix com QR Code</strong> — o cliente
                  só vê o QR na loja. O <strong>InfinitePay</strong> pede nome, e-mail, telefone e CEP
                  como checkout de entrega; use só se precisar de confirmação automática com taxa.
                </p>
                <label>Modo de pagamento</label>
                <select
                  value={ajustes?.paymentMode || 'pix'}
                  onChange={e => setAjustes({ ...ajustes, paymentMode: e.target.value })}
                  style={{ width: '100%', padding: '10px', fontSize: '.9rem', borderRadius: 12, border: '2px solid var(--brown)', marginBottom: 12 }}
                >
                  <option value="pix">Pix com QR Code na loja</option>
                  <option value="infinitepay">InfinitePay (checkout externo)</option>
                </select>

                {(ajustes?.paymentMode || 'pix') === 'pix' && (
                  <>
                    <label>Chave Pix</label>
                    <input type="text" placeholder="31999999999"
                      value={ajustes?.pixKey || ''}
                      onChange={e => setAjustes({ ...ajustes, pixKey: e.target.value })} />
                    <label style={{ marginTop: 12 }}>Tipo da chave</label>
                    <select
                      value={ajustes?.pixKeyType || 'telefone'}
                      onChange={e => setAjustes({ ...ajustes, pixKeyType: e.target.value })}
                      style={{ width: '100%', padding: '10px', fontSize: '.9rem', borderRadius: 12, border: '2px solid var(--brown)' }}
                    >
                      <option value="telefone">Telefone</option>
                      <option value="cpf">CPF</option>
                      <option value="email">E-mail</option>
                      <option value="aleatoria">Chave aleatória</option>
                    </select>
                    <label style={{ marginTop: 12 }}>Nome do recebedor (sem acentos, máx. 25)</label>
                    <input type="text" placeholder="ESSENCIA NO POTE"
                      value={ajustes?.merchantName || ''}
                      onChange={e => setAjustes({ ...ajustes, merchantName: e.target.value })} />
                    <label style={{ marginTop: 12 }}>Cidade (sem acentos, máx. 15)</label>
                    <input type="text" placeholder="BELO HORIZONTE"
                      value={ajustes?.merchantCity || ''}
                      onChange={e => setAjustes({ ...ajustes, merchantCity: e.target.value })} />
                  </>
                )}

                {ajustes?.paymentMode === 'infinitepay' && (
                  <>
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
                  </>
                )}

                <label style={{ marginTop: 12 }}>WhatsApp (contato)</label>
                <input type="text" placeholder="5531999999999"
                  value={ajustes?.whatsapp || ''}
                  onChange={e => setAjustes({ ...ajustes, whatsapp: e.target.value })} />
                <button type="button" className="abtn" style={{ marginTop: 14 }} onClick={salvarAjustes} disabled={salvandoAjustes}>
                  {salvandoAjustes ? 'Salvando...' : 'Salvar ajustes'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {logado && <button type="button" className="refresh" title="Atualizar" onClick={() => recarregarDoBanco()}>↻</button>}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

export default function Loja() {
  const [flavors, setFlavors] = useState(null);
  const [cart, setCart] = useState({});
  const [etapa, setEtapa] = useState('menu'); // menu | checkout | pix | sucesso
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);
  const [nome, setNome] = useState('');
  const [fone, setFone] = useState('');
  const [pedido, setPedido] = useState(null);
  const [pixPayload, setPixPayload] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [paymentMode, setPaymentMode] = useState('pix');
  const [tapCount, setTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState(null);

  function handleLogoTap() {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (tapTimer) clearTimeout(tapTimer);

    if (newCount >= 3) {
      setTapCount(0);
      window.location.href = '/admin';
    } else {
      setTapTimer(setTimeout(() => setTapCount(0), 1000));
    }
  }

  useEffect(() => {
    fetch('/api/flavors').then(r => r.json()).then(setFlavors);
    fetch('/api/payment/config').then(r => r.json()).then(d => {
      if (d.paymentMode) setPaymentMode(d.paymentMode);
    });
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [etapa]);

  // Verifica se o admin confirmou o pagamento (atualiza sozinho na tela do cliente).
  useEffect(() => {
    if ((etapa !== 'pix' && etapa !== 'sucesso') || !pedido) return;
    const verificar = async () => {
      try {
        const r = await fetch(`/api/orders/${pedido.id}`);
        const data = await r.json();
        if (data.order?.status === 'pago') {
          setPagamentoConfirmado(true);
          setEtapa('sucesso');
        }
      } catch { /* ignora */ }
    };
    verificar();
    const t = setInterval(verificar, 4000);
    return () => clearInterval(t);
  }, [etapa, pedido]);

  const mudar = (id, d) => {
    const f = flavors.find(f => f.id === id);
    if (f.stock === 0) return;
    setCart(c => {
      const next = Math.min(Math.max((c[id] || 0) + d, 0), f.stock);
      const novo = { ...c };
      if (next === 0) delete novo[id]; else novo[id] = next;
      return novo;
    });
  };

  const itensCart = flavors
    ? Object.entries(cart)
        .map(([id, q]) => ({ f: flavors.find(f => f.id === id), q }))
        .filter(i => i.f)
    : [];
  const qtd = itensCart.reduce((s, i) => s + i.q, 0);
  const val = itensCart.reduce((s, i) => s + i.f.price * i.q, 0);

  function voltarAoMenu({ limparPedido = false, limparCarrinho = false } = {}) {
    setPagando(false);
    if (limparPedido) {
      setPedido(null);
      setPixPayload('');
      setQrUrl('');
      setPagamentoConfirmado(false);
    }
    if (limparCarrinho) {
      setCart({});
      setNome('');
      setFone('');
    }
    setEtapa('menu');
  }

  async function criarPedido() {
    if (!nome.trim()) { alert('Conta pra gente seu nome! 😊'); return; }
    setPagando(true);
    const items = Object.entries(cart).map(([flavorId, q]) => ({ flavorId, qty: q }));
    try {
      const r = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: nome.trim(), customerPhone: fone.trim(), items })
      });
      const data = await r.json();
      if (!r.ok) {
        alert(data.error || 'Erro ao criar pedido');
        setPagando(false);
        return;
      }

      if (data.paymentMode === 'infinitepay' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (!data.pixPayload) {
        alert('Erro ao gerar o Pix. Tente novamente.');
        setPagando(false);
        return;
      }

      setPedido(data.order);
      setPixPayload(data.pixPayload);
      setQrUrl(await QRCode.toDataURL(data.pixPayload, {
        width: 240, margin: 1, color: { dark: '#3D2010', light: '#ffffff' }
      }));
      setEtapa('pix');
      setPagando(false);
    } catch {
      alert('Erro ao iniciar o pagamento. Tente novamente.');
      setPagando(false);
    }
  }

  async function jaPaguei() {
    if (!pedido) return;
    try {
      await fetch(`/api/orders/${pedido.id}/informar-pagamento`, { method: 'POST' });
      setPagamentoConfirmado(false);
      setEtapa('sucesso');
    } catch {
      alert('Erro ao informar pagamento. Tente novamente.');
    }
  }

  function copiarPix() {
    navigator.clipboard.writeText(pixPayload).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const Resumo = () => (
    <div className="resumo">
      {itensCart.map(({ f, q }) => (
        <div className="row" key={f.id}><span>{q}× {f.name}</span><span>{fmt(f.price * q)}</span></div>
      ))}
      <div className="row total"><span>Total</span><span>{fmt(val)}</span></div>
    </div>
  );

  const stepAtual = etapa === 'menu' ? 0 : etapa === 'checkout' ? 1 : 2;

  const StepDots = () => (
    <div className="step-dots">
      <span className={'step-dot' + (stepAtual >= 0 ? ' done' : '')} />
      <span className={'step-dot' + (stepAtual === 1 ? ' on' : stepAtual > 1 ? ' done' : '')} />
      <span className={'step-dot' + (stepAtual === 2 ? ' on' : '')} />
    </div>
  );

  return (
    <div className="lojaBody">
      <header className="rotulo">
        <div className="hero-inner">
          <img src="/logo.png" alt="Essência no Pote" className="logo-img" onClick={handleLogoTap} style={{cursor: 'pointer'}} />
          <div className="tag">desde 2026</div>
          <div className="motto script">Feito a mão com amor!</div>
        </div>
      </header>

      <div className="wrap">
        {etapa !== 'menu' && <StepDots />}

        {etapa === 'menu' && (
          <section>
            <h2 className="sec">Nossos sabores</h2>
            <p className="sec-sub">Artesanais · Frescos · Feitos com carinho</p>
            {!flavors && <div className="spin" />}
            {flavors && flavors.length === 0 && (
              <div className="panel" style={{ textAlign: 'center' }}>
                Poxa, estamos sem estoque no momento. 😢<br />Volte em breve!
              </div>
            )}
            {flavors && flavors.map(f => (
              <div className={'card' + (f.stock === 0 ? ' sold-out' : '')} key={f.id}>
                <div className="card-img">
                  <img src="/foto-do-produto.png" alt={f.name} />
                  {f.emoji && <span className="card-emoji">{f.emoji}</span>}
                  {f.stock === 0 && <div className="sold-out-badge">Esgotado</div>}
                </div>
                <div className="info">
                  <h3>{f.name}</h3>
                  <p>{f.desc}</p>
                  <span className="price">{fmt(f.price)}</span>
                  {f.stock > 0 && f.stock <= 3 && <div className="low">Restam só {f.stock}!</div>}
                </div>
                <div className="qty">
                  <button className="add" onClick={() => mudar(f.id, 1)} disabled={f.stock === 0}>+</button>
                  <span className="n">{cart[f.id] || 0}</span>
                  <button onClick={() => mudar(f.id, -1)}>−</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {etapa === 'checkout' && (
          <section>
            <div className="panel">
              <div className="panel-head">
                <h3>Quase lá!</h3>
                <p>Confirme seu pedido e finalize o pagamento</p>
              </div>
              <Resumo />
              <label htmlFor="nome">Seu nome</label>
              <input type="text" id="nome" placeholder="Como podemos te chamar?" maxLength={60}
                value={nome} onChange={e => setNome(e.target.value)} />
              <label htmlFor="fone">WhatsApp (opcional)</label>
              <input type="tel" id="fone" placeholder="(31) 9 9999-9999" maxLength={20}
                value={fone} onChange={e => setFone(e.target.value)} />
              <button type="button" className="btn" onClick={criarPedido} disabled={pagando}>
                {pagando
                  ? (paymentMode === 'infinitepay' ? 'Indo para o pagamento...' : 'Gerando QR Code...')
                  : (paymentMode === 'infinitepay' ? 'Pagar com Pix ou cartão 💳' : 'Pagar com Pix 💚')}
              </button>
              <button type="button" className="btn ghost" onClick={() => voltarAoMenu()} disabled={pagando}>
                ← Voltar aos sabores
              </button>
            </div>
          </section>
        )}

        {etapa === 'pix' && pedido && (
          <section>
            <div className="panel">
              <div className="panel-head">
                <h3>Pague com Pix</h3>
                <p>Escaneie o QR Code ou copie o código abaixo</p>
              </div>
              <div style={{ textAlign: 'center' }}><span className="badge">Total: {fmt(pedido.total)}</span></div>
              <div className="qrbox">{qrUrl && <img src={qrUrl} alt="QR Code Pix" width={240} height={240} />}</div>
              <div className="copy">
                <input type="text" readOnly value={pixPayload} />
                <button onClick={copiarPix}>{copiado ? 'Copiado!' : 'Copiar'}</button>
              </div>
              <div className="steps">
                <b>1.</b> Abra o app do seu banco<br />
                <b>2.</b> Escaneie o QR Code ou use o <b>Pix copia e cola</b><br />
                <b>3.</b> Confirme o pagamento e toque no botão abaixo 👇
              </div>
              <div className="pix-aviso">
                <div className="pix-aviso-icon">⏳</div>
                <p><strong>Aguardando pagamento...</strong></p>
                <p>Esta página atualiza sozinha quando confirmarmos seu pagamento.</p>
              </div>
              <button type="button" className="btn" onClick={jaPaguei}>Já fiz o pagamento ✓</button>
              <div className="pedido-info">
                <span className="badge">Pedido #{pedido.id}</span>
              </div>
              <button type="button" className="btn ghost" onClick={() => voltarAoMenu({ limparPedido: true })}>
                ← Voltar aos sabores
              </button>
            </div>
          </section>
        )}

        {etapa === 'sucesso' && pedido && (
          <section>
            <div className="panel done">
              <div className="big">{pagamentoConfirmado ? '✅' : '⏳'}</div>
              <h3>{pagamentoConfirmado ? 'Pagamento confirmado!' : 'Recebemos seu aviso!'}</h3>
              <span className="badge">Pedido #{pedido.id}</span>
              <p style={{ fontSize: '.92rem', color: 'var(--brown-soft)', margin: '8px 0 4px' }}>
                {pagamentoConfirmado
                  ? 'Seu pagamento foi confirmado! Estamos preparando seu bolo no pote com muito carinho. 💕'
                  : 'Vamos conferir o pagamento. Esta página atualiza sozinha quando for confirmado. 💕'}
              </p>
              <Resumo />
              <button type="button" className="btn" onClick={() => window.open('/recibo/' + pedido.id, '_blank')}>Ver recibo 🧾</button>
              <button type="button" className="btn ghost" onClick={() => voltarAoMenu({ limparPedido: true, limparCarrinho: true })}>
                Fazer novo pedido
              </button>
            </div>
          </section>
        )}

        <footer className="loja">
          <span className="script">@essencianopotee</span><br />
          Essência no Pote · Feito a mão com amor
        </footer>
      </div>

      <div className={'cartbar' + (etapa === 'menu' && qtd > 0 ? ' show' : '')}>
        <div>
          <div className="tot">{qtd} {qtd === 1 ? 'item' : 'itens'}</div>
          <div className="val">{fmt(val)}</div>
        </div>
        <button type="button" onClick={() => setEtapa('checkout')}>Continuar →</button>
      </div>
    </div>
  );
}

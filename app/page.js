'use client';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const fmt = v => 'R$ ' + v.toFixed(2).replace('.', ',');

export default function Loja() {
  const [flavors, setFlavors] = useState(null);
  const [cart, setCart] = useState({});
  const [etapa, setEtapa] = useState('menu'); // menu | checkout | pix | sucesso
  const [nome, setNome] = useState('');
  const [fone, setFone] = useState('');
  const [pedido, setPedido] = useState(null);
  const [pixPayload, setPixPayload] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [copiado, setCopiado] = useState(false);
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
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [etapa]);

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

  const itensCart = Object.entries(cart).map(([id, q]) => ({ f: flavors.find(f => f.id === id), q }));
  const qtd = itensCart.reduce((s, i) => s + i.q, 0);
  const val = itensCart.reduce((s, i) => s + i.f.price * i.q, 0);

  async function criarPedido() {
    if (!nome.trim()) { alert('Conta pra gente seu nome! 😊'); return; }
    const items = Object.entries(cart).map(([flavorId, q]) => ({ flavorId, qty: q }));
    const r = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: nome.trim(), customerPhone: fone.trim(), items })
    });
    const data = await r.json();
    if (!r.ok) { alert(data.error || 'Erro ao criar pedido'); return; }
    setPedido(data.order);
    setPixPayload(data.pixPayload);
    setQrUrl(await QRCode.toDataURL(data.pixPayload, {
      width: 240, margin: 1, color: { dark: '#3D2010', light: '#ffffff' }
    }));
    setEtapa('pix');
  }

  function copiarPix() {
    navigator.clipboard.writeText(pixPayload).then(() => {
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    });
  }

  async function jaPaguei() {
    await fetch(`/api/orders/${pedido.id}/informar-pagamento`, { method: 'POST' });
    setEtapa('sucesso');
  }

  const Resumo = () => (
    <div className="resumo">
      {itensCart.map(({ f, q }) => (
        <div className="row" key={f.id}><span>{q}× {f.name}</span><span>{fmt(f.price * q)}</span></div>
      ))}
      <div className="row total"><span>Total</span><span>{fmt(val)}</span></div>
    </div>
  );

  return (
    <div className="lojaBody">
      <header className="rotulo">
        <img src="/logo.png" alt="Essência no Pote" className="logo-img" onClick={handleLogoTap} style={{cursor: 'pointer'}} />
        <div className="tag">desde 2026</div>
        <div className="motto script">Feito a mão com amor!</div>
      </header>

      <div className="wrap">
        {etapa === 'menu' && (
          <section>
            <h2 className="sec">Nossos sabores</h2>
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
              <h3>Quase lá! 🧁</h3>
              <Resumo />
              <label htmlFor="nome">Seu nome</label>
              <input type="text" id="nome" placeholder="Como podemos te chamar?" maxLength={60}
                value={nome} onChange={e => setNome(e.target.value)} />
              <label htmlFor="fone">WhatsApp (opcional)</label>
              <input type="tel" id="fone" placeholder="(31) 9 9999-9999" maxLength={20}
                value={fone} onChange={e => setFone(e.target.value)} />
              <button className="btn" onClick={criarPedido}>Pagar com Pix 💚</button>
              <button className="btn ghost" onClick={() => setEtapa('menu')}>← Voltar aos sabores</button>
            </div>
          </section>
        )}

        {etapa === 'pix' && pedido && (
          <section>
            <div className="panel">
              <h3>Pague com Pix</h3>
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
              <button className="btn" onClick={jaPaguei}>Já fiz o pagamento ✓</button>
            </div>
          </section>
        )}

        {etapa === 'sucesso' && pedido && (
          <section>
            <div className="panel done">
              <div className="big">🎉</div>
              <h3>Pagamento informado!</h3>
              <span className="badge">Pedido #{pedido.id}</span>
              <p style={{ fontSize: '.92rem', color: 'var(--brown-soft)', margin: '8px 0 4px' }}>
                Vamos conferir o pagamento e preparar seu bolo no pote com muito carinho. 💕
              </p>
              <Resumo />
              <button className="btn" onClick={() => window.open('/recibo/' + pedido.id, '_blank')}>Ver recibo 🧾</button>
              <button className="btn ghost" onClick={() => location.reload()}>Fazer novo pedido</button>
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
        <button onClick={() => setEtapa('checkout')}>Continuar →</button>
      </div>
    </div>
  );
}

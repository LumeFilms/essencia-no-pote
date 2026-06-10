'use client';
import { useState, useEffect } from 'react';

const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

export default function Loja() {
  const [flavors, setFlavors] = useState(null);
  const [cart, setCart] = useState({});
  const [etapa, setEtapa] = useState('menu'); // menu | checkout
  const [nome, setNome] = useState('');
  const [fone, setFone] = useState('');
  const [pagando, setPagando] = useState(false);
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
    setPagando(true);
    const items = Object.entries(cart).map(([flavorId, q]) => ({ flavorId, qty: q }));
    try {
      const r = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: nome.trim(), customerPhone: fone.trim(), items })
      });
      const data = await r.json();
      if (!r.ok || !data.checkoutUrl) {
        alert(data.error || 'Erro ao iniciar o pagamento');
        setPagando(false);
        return;
      }
      // Redireciona para o checkout da InfinitePay (Pix ou cartão).
      window.location.href = data.checkoutUrl;
    } catch {
      alert('Erro ao iniciar o pagamento. Tente novamente.');
      setPagando(false);
    }
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
              <button className="btn" onClick={criarPedido} disabled={pagando}>
                {pagando ? 'Indo para o pagamento...' : 'Pagar com Pix ou cartão 💳'}
              </button>
              <button className="btn ghost" onClick={() => setEtapa('menu')} disabled={pagando}>← Voltar aos sabores</button>
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

'use client';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

function PagamentoInner() {
  const sp = useSearchParams();
  const orderNsu = sp.get('order_nsu');
  const transactionNsu = sp.get('transaction_nsu');
  const slug = sp.get('slug');
  const receiptUrl = sp.get('receipt_url');

  const [estado, setEstado] = useState('verificando'); // verificando | pago | pendente | erro
  const [order, setOrder] = useState(null);

  const confirmar = useCallback(async () => {
    if (!orderNsu) { setEstado('erro'); return; }
    setEstado('verificando');
    try {
      const r = await fetch('/api/payment/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNsu, transactionNsu, slug })
      });
      const d = await r.json();
      if (!r.ok) { setEstado('erro'); return; }
      setOrder(d.order || null);
      setEstado(d.paid ? 'pago' : 'pendente');
    } catch {
      setEstado('erro');
    }
  }, [orderNsu, transactionNsu, slug]);

  useEffect(() => { confirmar(); }, [confirmar]);

  // Verifica automaticamente a cada 4s enquanto o pagamento estiver pendente.
  useEffect(() => {
    if (estado !== 'pendente' || !orderNsu) return;
    const t = setInterval(confirmar, 4000);
    return () => clearInterval(t);
  }, [estado, orderNsu, confirmar]);

  return (
    <div className="lojaBody">
      <header className="rotulo">
        <img src="/logo.png" alt="Essência no Pote" className="logo-img" />
        <div className="tag">desde 2026</div>
        <div className="motto script">Feito a mão com amor!</div>
      </header>

      <div className="wrap">
        <section>
          {estado === 'verificando' && (
            <div className="panel" style={{ textAlign: 'center' }}>
              <div className="spin" />
              <p style={{ marginTop: 12 }}>Confirmando seu pagamento...</p>
            </div>
          )}

          {estado === 'pago' && order && (
            <div className="panel done">
              <div className="big">✅</div>
              <h3>Pagamento confirmado!</h3>
              <span className="badge">Pedido #{order.id}</span>
              <p style={{ fontSize: '.92rem', color: 'var(--brown-soft)', margin: '8px 0 4px' }}>
                Recebemos seu pagamento! Estamos preparando seu bolo no pote com muito carinho. 💕
              </p>
              {order.items && (
                <div className="resumo">
                  {order.items.map((i, idx) => (
                    <div className="row" key={i.flavor_id || i.id || idx}>
                      <span>{i.qty}× {i.name}</span><span>{fmt(i.subtotal)}</span>
                    </div>
                  ))}
                  <div className="row total"><span>Total</span><span>{fmt(order.total)}</span></div>
                </div>
              )}
              <button className="btn" onClick={() => window.open('/recibo/' + order.id, '_blank')}>Ver recibo 🧾</button>
              <button className="btn ghost" onClick={() => window.location.href = '/'}>Voltar à loja</button>
            </div>
          )}

          {estado === 'pendente' && (
            <div className="panel" style={{ textAlign: 'center' }}>
              <div className="big">⏳</div>
              <h3>Aguardando confirmação</h3>
              <p style={{ fontSize: '.92rem', color: 'var(--brown-soft)', margin: '8px 0 12px' }}>
                Ainda não identificamos seu pagamento. Se você acabou de pagar, aguarde alguns
                instantes e verifique novamente.
              </p>
              <button className="btn" onClick={confirmar}>Verificar novamente</button>
              {receiptUrl && (
                <button className="btn ghost" onClick={() => window.open(receiptUrl, '_blank')}>Ver comprovante</button>
              )}
              <button className="btn ghost" onClick={() => window.location.href = '/'}>Voltar à loja</button>
            </div>
          )}

          {estado === 'erro' && (
            <div className="panel" style={{ textAlign: 'center' }}>
              <div className="big">😕</div>
              <h3>Não encontramos seu pedido</h3>
              <p style={{ fontSize: '.92rem', color: 'var(--brown-soft)', margin: '8px 0 12px' }}>
                Se você realizou o pagamento, ele será confirmado automaticamente. Qualquer dúvida,
                fale com a gente.
              </p>
              <button className="btn" onClick={() => window.location.href = '/'}>Voltar à loja</button>
            </div>
          )}
        </section>

        <footer className="loja">
          <span className="script">@essencianopotee</span><br />
          Essência no Pote · Feito a mão com amor
        </footer>
      </div>
    </div>
  );
}

export default function Pagamento() {
  return (
    <Suspense fallback={<div className="lojaBody"><div className="wrap"><div className="spin" /></div></div>}>
      <PagamentoInner />
    </Suspense>
  );
}

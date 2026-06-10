'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const fmt = v => 'R$ ' + v.toFixed(2).replace('.', ',');
const map = {
  pago: ['s-pago', '✓ Pagamento confirmado'],
  pagamento_informado: ['s-pend', '⏳ Aguardando confirmação do pagamento'],
  aguardando_pagamento: ['s-pend', '⏳ Aguardando pagamento'],
  cancelado: ['s-canc', '✕ Pedido cancelado']
};

export default function Recibo() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetch('/api/orders/' + id)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setOrder(d.order))
      .catch(() => setErro(true));
  }, [id]);

  if (erro) return <div className="reciboBody"><p>Pedido não encontrado.</p></div>;
  if (!order) return <div className="reciboBody"><div className="spin" /></div>;

  const [cls, txt] = map[order.status] || ['s-pend', order.status];

  return (
    <div className="reciboBody">
      <div className="recibo">
        <div className="top">
          <img src="/logo.png" alt="Essência no Pote" className="rlogo-img" />
          <div className="rtag">desde 2026</div>
        </div>
        <div className="rbody">
          <h2>Recibo de Pedido</h2>
          <div className="meta">
            <b>Pedido:</b> #{order.id}<br />
            <b>Cliente:</b> {order.customerName}<br />
            {order.customerPhone && <><b>Contato:</b> {order.customerPhone}<br /></>}
            <b>Data:</b> {new Date(order.createdAt).toLocaleString('pt-BR')}
          </div>
          <table>
            <tbody>
              {order.items.map(i => (
                <tr key={i.flavorId}><td>{i.qty}× {i.name}</td><td>{fmt(i.subtotal)}</td></tr>
              ))}
              <tr className="rtotal"><td>Total</td><td>{fmt(order.total)}</td></tr>
            </tbody>
          </table>
          <div className="status"><span className={cls}>{txt}</span></div>
          <div className="actions">
            <button className="abtn" onClick={() => window.print()}>Imprimir / Salvar PDF 🧾</button>
          </div>
        </div>
        <div className="foot">
          Feito a mão com amor! 💕<br /><span className="script">@essencianopotee</span>
        </div>
      </div>
    </div>
  );
}

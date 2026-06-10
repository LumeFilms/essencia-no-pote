import { getOrderById, updateOrderStatus } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    if (order.status !== 'aguardando_pagamento') {
      return Response.json({ ok: true, order });
    }
    await updateOrderStatus(id, 'pagamento_informado');
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error updating order:', error);
    return Response.json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
  }
}

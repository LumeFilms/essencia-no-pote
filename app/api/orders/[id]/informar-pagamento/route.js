import { updateOrderStatus } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    await updateOrderStatus(id, 'pagamento_informado');
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error updating order:', error);
    return Response.json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
  }
}

import { deleteOrder, isAdmin } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  try {
    const pin = req.headers.get('x-pin');
    if (!await isAdmin(pin)) {
      return Response.json({ error: 'PIN incorreto' }, { status: 401 });
    }

    const { id } = await params;
    await deleteOrder(id);
    return Response.json({ ok: true, deletedId: id }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    if (error.message === 'Pedido não encontrado') {
      return Response.json({ error: error.message }, { status: 404 });
    }
    return Response.json({ error: 'Erro ao excluir pedido' }, { status: 500 });
  }
}

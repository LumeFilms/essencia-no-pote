import { updateOrderStatus, isAdmin } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  try {
    const pin = req.headers.get('x-pin');
    if (!await isAdmin(pin)) {
      return Response.json({ error: 'PIN incorreto' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();

    const order = await updateOrderStatus(id, status);
    return Response.json({ order });
  } catch (error) {
    console.error('Error updating order status:', error);
    return Response.json({ error: 'Erro ao atualizar status' }, { status: 500 });
  }
}

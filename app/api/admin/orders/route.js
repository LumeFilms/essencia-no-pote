import { getOrders, isAdmin } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const pin = req.headers.get('x-pin');
    if (!await isAdmin(pin)) {
      return Response.json({ error: 'PIN incorreto' }, { status: 401 });
    }

    const orders = await getOrders();
    return Response.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return Response.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

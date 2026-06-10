import { getOrderById, getConfig } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);
    const config = await getConfig();
    return Response.json({ order, whatsapp: config.whatsapp });
  } catch (error) {
    console.error('Error fetching order:', error);
    return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }
}

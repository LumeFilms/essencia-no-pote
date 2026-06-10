import { getConfig, getFlavorById, createOrder, buildPixPayload } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { customerName, customerPhone, items } = await req.json();

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const config = await getConfig();
    const orderItems = [];

    for (const it of items) {
      const flavor = await getFlavorById(it.flavorId);
      const qty = parseInt(it.qty, 10);

      if (!flavor || !flavor.active || !qty || qty < 1) {
        return Response.json({ error: 'Item inválido' }, { status: 400 });
      }
      if (flavor.stock === 0) {
        return Response.json({ error: `${flavor.name} está esgotado!` }, { status: 400 });
      }
      if (qty > flavor.stock) {
        return Response.json({ error: `Estoque insuficiente de ${flavor.name} (restam ${flavor.stock})` }, { status: 400 });
      }

      orderItems.push({
        flavorId: flavor.id,
        name: flavor.name,
        price: flavor.price,
        qty,
        subtotal: +(flavor.price * qty).toFixed(2)
      });
    }

    const total = +orderItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2);

    const order = await createOrder({
      customerName: String(customerName).substring(0, 60),
      customerPhone: String(customerPhone || '').substring(0, 20),
      items: orderItems,
      total
    });

    const pixPayload = buildPixPayload({
      key: config.pixKey,
      name: config.merchantName,
      city: config.merchantCity,
      amount: total,
      txid: order.txid,
      keyType: config.pixKeyType
    });

    return Response.json({ order, pixPayload, pixKey: config.pixKey });
  } catch (error) {
    console.error('Error creating order:', error);
    return Response.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}

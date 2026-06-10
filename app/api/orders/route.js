import { getConfig, getFlavorById, createOrder, buildPixPayload } from '@/lib/db-supabase';
import { createCheckoutLink, getHandle } from '@/lib/infinitepay';

export const dynamic = 'force-dynamic';

function getOrigin(req) {
  const fromOrigin = req.headers.get('origin');
  if (fromOrigin) return fromOrigin;
  const host = req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

function getPaymentMode(config) {
  const mode = (config.paymentMode || 'pix').trim().toLowerCase();
  return mode === 'infinitepay' ? 'infinitepay' : 'pix';
}

export async function POST(req) {
  try {
    const { customerName, customerPhone, items } = await req.json();

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const config = await getConfig();
    const paymentMode = getPaymentMode(config);

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

    if (paymentMode === 'pix') {
      if (!config.pixKey || !config.merchantName || !config.merchantCity) {
        return Response.json(
          { error: 'Pagamento Pix ainda não está configurado. Tente novamente em breve.' },
          { status: 503 }
        );
      }

      const pixPayload = buildPixPayload({
        key: config.pixKey,
        name: config.merchantName,
        city: config.merchantCity,
        amount: total,
        txid: order.txid,
        keyType: config.pixKeyType
      });

      return Response.json({ order, paymentMode: 'pix', pixPayload });
    }

    const handle = getHandle(config);
    if (!handle) {
      return Response.json(
        { error: 'Pagamento online ainda não está configurado. Tente novamente em breve.' },
        { status: 503 }
      );
    }

    const ipItems = orderItems.map(i => ({
      description: i.name,
      price: Math.round(i.price * 100),
      quantity: i.qty
    }));

    const origin = getOrigin(req);

    let checkoutUrl;
    try {
      const link = await createCheckoutLink({
        handle,
        items: ipItems,
        orderNsu: order.id,
        redirectUrl: `${origin}/pagamento`,
        webhookUrl: `${origin}/api/webhooks/infinitepay`,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      });
      checkoutUrl = link.url;
    } catch (err) {
      console.error('Erro ao criar link InfinitePay:', err);
      return Response.json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' }, { status: 502 });
    }

    return Response.json({ order, paymentMode: 'infinitepay', checkoutUrl });
  } catch (error) {
    console.error('Error creating order:', error);
    return Response.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}

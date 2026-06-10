import { getConfig, confirmOrderPaid } from '@/lib/db-supabase';
import { checkPayment, getHandle } from '@/lib/infinitepay';

export const dynamic = 'force-dynamic';

// Webhook de backup da InfinitePay. É chamado quando um pagamento é aprovado,
// mesmo que o cliente feche o navegador antes do redirect de retorno.
// Por segurança, NÃO confiamos cegamente no corpo: revalidamos via payment_check
// antes de confirmar o pedido (a confirmação é idempotente).
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const orderNsu = body.order_nsu || body.orderNsu || body.order?.nsu;
    const transactionNsu = body.transaction_nsu || body.transactionNsu;
    const slug = body.slug || body.invoice_slug;

    if (orderNsu && transactionNsu && slug) {
      const config = await getConfig();
      const handle = getHandle(config);
      if (handle) {
        const result = await checkPayment({ handle, orderNsu, transactionNsu, slug });
        if (result.paid === true) {
          await confirmOrderPaid(orderNsu);
        }
      }
    }

    // Sempre 200 para a InfinitePay não reenviar indefinidamente; o redirect de
    // retorno funciona como caminho primário de confirmação.
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Webhook InfinitePay erro:', error);
    return Response.json({ ok: true });
  }
}

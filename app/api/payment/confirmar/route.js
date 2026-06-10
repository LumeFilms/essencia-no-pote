import { getConfig, confirmOrderPaid, getOrderById } from '@/lib/db-supabase';
import { checkPayment, getHandle } from '@/lib/infinitepay';

export const dynamic = 'force-dynamic';

// Chamado pela página /pagamento ao retornar da InfinitePay.
// Verifica a transação e, se paga, confirma o pedido (descontando o estoque).
export async function POST(req) {
  try {
    const { orderNsu, transactionNsu, slug } = await req.json();
    if (!orderNsu) {
      return Response.json({ error: 'Pedido não informado' }, { status: 400 });
    }

    const config = await getConfig();
    const handle = getHandle(config);

    if (handle && transactionNsu && slug) {
      const result = await checkPayment({ handle, orderNsu, transactionNsu, slug });
      if (result.paid === true) {
        await confirmOrderPaid(orderNsu);
        const order = await getOrderById(orderNsu);
        return Response.json({ paid: true, order });
      }
    }

    // Sem confirmação de pagamento: devolve o status atual do pedido sem alterá-lo.
    const order = await getOrderById(orderNsu);
    return Response.json({ paid: order?.status === 'pago', order });
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    return Response.json({ error: 'Erro ao confirmar pagamento' }, { status: 500 });
  }
}

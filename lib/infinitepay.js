// Cliente da API de Checkout da InfinitePay
// Docs: https://www.infinitepay.io/checkout-documentacao
const API_BASE = 'https://api.checkout.infinitepay.io';

// O handle (InfiniteTag) pode vir da variável de ambiente ou da config no banco.
// Sempre sem o "$" no início.
export function getHandle(config) {
  const raw = (process.env.INFINITEPAY_HANDLE || config?.infinitePayHandle || '').trim();
  return raw.replace(/^\$/, '');
}

// Normaliza telefone para o formato +55DDD........ (ou null se inválido)
function formatPhone(raw) {
  const d = (raw || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length >= 12 && d.startsWith('55')) return '+' + d;
  if (d.length >= 10 && d.length <= 11) return '+55' + d;
  return null;
}

// Cria um link de checkout e retorna a URL para onde redirecionar o cliente.
// items: [{ description, price (em centavos), quantity }]
export async function createCheckoutLink({ handle, items, orderNsu, redirectUrl, webhookUrl, customerName, customerPhone }) {
  const customer = {};
  if (customerName) customer.name = String(customerName).substring(0, 60);
  const phone = formatPhone(customerPhone);
  if (phone) customer.phone_number = phone;

  const body = {
    handle,
    items,
    order_nsu: orderNsu,
    redirect_url: redirectUrl,
    webhook_url: webhookUrl,
  };
  if (Object.keys(customer).length) body.customer = customer;

  const res = await fetch(`${API_BASE}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `InfinitePay retornou ${res.status}`);
  }

  const url = data.url || data.link || data.checkout_url || data.payment_url
    || data?.data?.url || data?.data?.link;
  if (!url) throw new Error('InfinitePay não retornou a URL do checkout. Resposta: ' + JSON.stringify(data));
  return { url, raw: data };
}

// Verifica se uma transação foi paga.
// Retorna { ok, success, paid, amount, paid_amount, capture_method, ... }
export async function checkPayment({ handle, orderNsu, transactionNsu, slug }) {
  const res = await fetch(`${API_BASE}/payment_check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handle,
      order_nsu: orderNsu,
      transaction_nsu: transactionNsu,
      slug,
    }),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, ...data };
}

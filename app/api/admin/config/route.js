import { getConfig, setConfig, isAdmin } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const pin = req.headers.get('x-pin');
    if (!await isAdmin(pin)) {
      return Response.json({ error: 'PIN incorreto' }, { status: 401 });
    }

    const config = await getConfig();
    return Response.json({
      pixKey: config.pixKey,
      merchantName: config.merchantName,
      merchantCity: config.merchantCity,
      whatsapp: config.whatsapp,
      infinitePayHandle: config.infinitePayHandle || '',
      infinitePayHandleFromEnv: !!process.env.INFINITEPAY_HANDLE
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return Response.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

// Campos de config que podem ser editados pelo painel admin.
const EDITABLE = ['infinitePayHandle', 'whatsapp', 'merchantName', 'merchantCity'];

export async function POST(req) {
  try {
    const pin = req.headers.get('x-pin');
    if (!await isAdmin(pin)) {
      return Response.json({ error: 'PIN incorreto' }, { status: 401 });
    }

    const body = await req.json();
    for (const key of EDITABLE) {
      if (body[key] !== undefined) {
        await setConfig(key, String(body[key]).trim());
      }
    }

    const config = await getConfig();
    return Response.json({
      pixKey: config.pixKey,
      merchantName: config.merchantName,
      merchantCity: config.merchantCity,
      whatsapp: config.whatsapp,
      infinitePayHandle: config.infinitePayHandle || '',
      infinitePayHandleFromEnv: !!process.env.INFINITEPAY_HANDLE
    });
  } catch (error) {
    console.error('Error saving config:', error);
    return Response.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}

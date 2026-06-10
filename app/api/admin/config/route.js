import { getConfig, isAdmin } from '@/lib/db-supabase';

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
      whatsapp: config.whatsapp
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return Response.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

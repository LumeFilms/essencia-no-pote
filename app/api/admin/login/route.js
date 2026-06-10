import { getConfig } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { pin } = await req.json();
    const config = await getConfig();

    if (pin === config.adminPin) {
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'PIN incorreto' }, { status: 401 });
  } catch (error) {
    console.error('Error in login:', error);
    return Response.json({ error: 'Erro ao fazer login' }, { status: 500 });
  }
}

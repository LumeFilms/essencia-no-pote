import { getConfig } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getConfig();
    const mode = (config.paymentMode || 'pix').trim().toLowerCase();
    return Response.json({
      paymentMode: mode === 'infinitepay' ? 'infinitepay' : 'pix'
    });
  } catch (error) {
    console.error('Error fetching payment config:', error);
    return Response.json({ paymentMode: 'pix' });
  }
}

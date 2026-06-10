import { getActiveFlavors } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const flavors = await getActiveFlavors();
    return Response.json(flavors);
  } catch (error) {
    console.error('Error fetching flavors:', error);
    return Response.json({ error: 'Erro ao buscar sabores' }, { status: 500 });
  }
}

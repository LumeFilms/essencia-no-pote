import { getFlavors, createFlavor, isAdmin } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const pin = req.headers.get('x-pin');
    if (!await isAdmin(pin)) {
      return Response.json({ error: 'PIN incorreto' }, { status: 401 });
    }

    const flavors = await getFlavors();
    return Response.json(flavors);
  } catch (error) {
    console.error('Error fetching flavors:', error);
    return Response.json({ error: 'Erro ao buscar sabores' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const pin = req.headers.get('x-pin');
    if (!await isAdmin(pin)) {
      return Response.json({ error: 'PIN incorreto' }, { status: 401 });
    }

    const { name, desc, price, stock, emoji } = await req.json();
    if (!name || !price) {
      return Response.json({ error: 'Nome e preço obrigatórios' }, { status: 400 });
    }

    const flavor = await createFlavor({
      id: 'f' + Date.now(),
      name,
      desc: desc || '',
      price: +price,
      stock: parseInt(stock || 0, 10),
      active: true,
      emoji: emoji || '🍰'
    });

    return Response.json(flavor);
  } catch (error) {
    console.error('Error creating flavor:', error);
    return Response.json({ error: 'Erro ao criar sabor' }, { status: 500 });
  }
}

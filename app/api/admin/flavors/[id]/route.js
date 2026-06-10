import { updateFlavor, deleteFlavor, isAdmin } from '@/lib/db-supabase';

export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const pin = req.headers.get('x-pin');
    if (!await isAdmin(pin)) {
      return Response.json({ error: 'PIN incorreto' }, { status: 401 });
    }

    const { id } = await params;
    const updates = await req.json();

    // Converter campos numéricos
    if (updates.price !== undefined) updates.price = +updates.price;
    if (updates.stock !== undefined) updates.stock = parseInt(updates.stock, 10);
    if (updates.active !== undefined) updates.active = !!updates.active;

    const flavor = await updateFlavor(id, updates);
    return Response.json(flavor);
  } catch (error) {
    console.error('Error updating flavor:', error);
    return Response.json({ error: 'Erro ao atualizar sabor' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const pin = req.headers.get('x-pin');
    if (!await isAdmin(pin)) {
      return Response.json({ error: 'PIN incorreto' }, { status: 401 });
    }

    const { id } = await params;
    await deleteFlavor(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error deleting flavor:', error);
    return Response.json({ error: 'Erro ao excluir sabor' }, { status: 500 });
  }
}

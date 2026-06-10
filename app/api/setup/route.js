import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Criar tabela config
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `
    });

    // Criar tabela flavors
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS flavors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          desc TEXT,
          price DECIMAL(10,2) NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          active BOOLEAN NOT NULL DEFAULT true,
          emoji TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Criar tabela orders
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          txid TEXT,
          customer_name TEXT NOT NULL,
          customer_phone TEXT,
          total DECIMAL(10,2) NOT NULL,
          status TEXT NOT NULL DEFAULT 'aguardando_pagamento',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          paid_at TIMESTAMP WITH TIME ZONE
        );
      `
    });

    // Criar tabela order_items
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
          flavor_id TEXT REFERENCES flavors(id),
          name TEXT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          qty INTEGER NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL
        );
      `
    });

    // Seed NÃO-destrutivo: só insere o que ainda não existe, para nunca
    // sobrescrever a chave Pix, o PIN ou o estoque real de uma loja em produção.
    const defaultConfig = [
      { key: 'pixKey', value: '31995076141' },
      { key: 'pixKeyType', value: 'telefone' },
      { key: 'merchantName', value: 'ESSENCIA NO POTE' },
      { key: 'merchantCity', value: 'BELO HORIZONTE' },
      { key: 'adminPin', value: '2108' },
      { key: 'whatsapp', value: '5531995076141' }
    ];
    const { data: existingConfig } = await supabase.from('config').select('key');
    const existingKeys = new Set((existingConfig || []).map(c => c.key));
    const missingConfig = defaultConfig.filter(c => !existingKeys.has(c.key));
    if (missingConfig.length) {
      await supabase.from('config').insert(missingConfig);
    }

    const defaultFlavors = [
      { id: 'f1', name: 'Coco', desc: 'Creme de coco fresco com massa macia', price: 12.00, stock: 20, active: true, emoji: '🥥' },
      { id: 'f2', name: 'Maracujá', desc: 'Creme de maracujá com cobertura especial', price: 12.00, stock: 15, active: true, emoji: '🟡' },
      { id: 'f3', name: 'Brigadeiro', desc: 'Brigadeiro cremoso com chocolate belga', price: 12.00, stock: 20, active: true, emoji: '🍫' },
      { id: 'f4', name: 'Ninho', desc: 'Creme de leite Ninho com massa fofinha', price: 12.00, stock: 18, active: true, emoji: '🍦' },
      { id: 'f5', name: 'Amendoim', desc: 'Creme de amendoim com cobertura crocante', price: 12.00, stock: 12, active: true, emoji: '🥜' }
    ];
    const { data: existingFlavors } = await supabase.from('flavors').select('id');
    const existingIds = new Set((existingFlavors || []).map(f => f.id));
    const missingFlavors = defaultFlavors.filter(f => !existingIds.has(f.id));
    if (missingFlavors.length) {
      await supabase.from('flavors').insert(missingFlavors);
    }

    return Response.json({ success: true, message: 'Banco de dados configurado com sucesso!' });
  } catch (error) {
    console.error('Setup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

-- Configuração do sistema
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Sabores (bolos)
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

-- Pedidos
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

-- Itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  flavor_id TEXT REFERENCES flavors(id),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  qty INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- Inserir configurações padrão
INSERT INTO config (key, value) VALUES
  ('pixKey', '31995076141'),
  ('pixKeyType', 'telefone'),
  ('merchantName', 'ESSENCIA NO POTE'),
  ('merchantCity', 'BELO HORIZONTE'),
  ('adminPin', '2108'),
  ('whatsapp', '5531995076141')
ON CONFLICT (key) DO NOTHING;

-- Inserir sabores padrão
INSERT INTO flavors (id, name, desc, price, stock, active, emoji) VALUES
  ('f1', 'Coco', 'Creme de coco fresco com massa macia', 12.00, 20, true, '🥥'),
  ('f2', 'Maracujá', 'Creme de maracujá com cobertura especial', 12.00, 15, true, '🟡'),
  ('f3', 'Brigadeiro', 'Brigadeiro cremoso com chocolate belga', 12.00, 20, true, '🍫'),
  ('f4', 'Ninho', 'Creme de leite Ninho com massa fofinha', 12.00, 18, true, '🍦'),
  ('f5', 'Amendoim', 'Creme de amendoim com cobertura crocante', 12.00, 12, true, '🥜')
ON CONFLICT (id) DO NOTHING;

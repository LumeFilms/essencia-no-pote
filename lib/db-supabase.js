import { supabase } from './supabase';
import crypto from 'crypto';

export function newId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Config
export async function getConfig() {
  const { data, error } = await supabase
    .from('config')
    .select('*');

  if (error) throw error;

  const config = {};
  data.forEach(row => {
    config[row.key] = row.value;
  });
  return config;
}

export async function setConfig(key, value) {
  const { error } = await supabase
    .from('config')
    .upsert({ key, value }, { onConflict: 'key' });

  if (error) throw error;
}

// Sabores
export async function getFlavors() {
  const { data, error } = await supabase
    .from('flavors')
    .select('id, name, "desc", price, stock, active, emoji, created_at')
    .order('name');

  if (error) throw error;
  return data;
}

export async function getActiveFlavors() {
  const { data, error } = await supabase
    .from('flavors')
    .select('id, name, "desc", price, stock, active, emoji, created_at')
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data;
}

export async function getFlavorById(id) {
  const { data, error } = await supabase
    .from('flavors')
    .select('id, name, "desc", price, stock, active, emoji, created_at')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createFlavor(flavor) {
  const { data, error } = await supabase
    .from('flavors')
    .insert(flavor)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFlavor(id, updates) {
  const { data, error } = await supabase
    .from('flavors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFlavor(id) {
  const { error } = await supabase
    .from('flavors')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Pedidos
export async function getOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Buscar itens de cada pedido
  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      return {
        ...order,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        createdAt: order.created_at,
        paidAt: order.paid_at,
        items: items || []
      };
    })
  );

  return ordersWithItems;
}

export async function getOrderById(id) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id);

  return {
    ...order,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    items: items || []
  };
}

export async function createOrder(orderData) {
  const { customerName, customerPhone, items, total, status } = orderData;
  const id = newId();
  const txid = 'EP' + id;

  // Criar pedido
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      id,
      txid,
      customer_name: customerName,
      customer_phone: customerPhone,
      total,
      status: status || 'aguardando_pagamento'
    })
    .select()
    .single();

  if (error) throw error;

  // Criar itens do pedido
  const orderItems = items.map(item => ({
    order_id: id,
    flavor_id: item.flavorId,
    name: item.name,
    price: item.price,
    qty: item.qty,
    subtotal: item.subtotal
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // Atualizar estoque
  for (const item of items) {
    const { data: flavor } = await supabase
      .from('flavors')
      .select('stock')
      .eq('id', item.flavorId)
      .single();

    if (flavor) {
      await supabase
        .from('flavors')
        .update({ stock: flavor.stock - item.qty })
        .eq('id', item.flavorId);
    }
  }

  return {
    ...order,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    items: orderItems
  };
}

export async function updateOrderStatus(id, status) {
  const updates = { status };
  if (status === 'pago') {
    updates.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Se cancelou, devolver estoque
  if (status === 'cancelado') {
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    for (const item of items) {
      const { data: flavor } = await supabase
        .from('flavors')
        .select('stock')
        .eq('id', item.flavor_id)
        .single();

      if (flavor) {
        await supabase
          .from('flavors')
          .update({ stock: flavor.stock + item.qty })
          .eq('id', item.flavor_id);
      }
    }
  }

  return data;
}

// Estatísticas
export async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: totalPedidos } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const { count: pendentes } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['aguardando_pagamento', 'pagamento_informado']);

  const { data: vendasHoje } = await supabase
    .from('orders')
    .select('total')
    .eq('status', 'pago')
    .gte('created_at', today.toISOString());

  const { data: vendasTotal } = await supabase
    .from('orders')
    .select('total')
    .eq('status', 'pago');

  return {
    totalPedidos: totalPedidos || 0,
    pendentes: pendentes || 0,
    vendasHoje: vendasHoje?.reduce((sum, o) => sum + Number(o.total), 0) || 0,
    vendasTotal: vendasTotal?.reduce((sum, o) => sum + Number(o.total), 0) || 0
  };
}

// Pix
export function buildPixPayload({ key, name, city, amount, txid }) {
  function emv(id, value) { return id + String(value.length).padStart(2, '0') + value; }
  function crc16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  const merchantAccount = emv('00', 'br.gov.bcb.pix') + emv('01', key);
  let p = emv('00', '01')
        + emv('26', merchantAccount)
        + emv('52', '0000')
        + emv('53', '986')
        + emv('54', amount.toFixed(2))
        + emv('58', 'BR')
        + emv('59', name.substring(0, 25))
        + emv('60', city.substring(0, 15))
        + emv('62', emv('05', txid.substring(0, 25)));
  p += '6304';
  return p + crc16(p);
}

// Admin
export async function isAdmin(pin) {
  const config = await getConfig();
  return pin === config.adminPin;
}

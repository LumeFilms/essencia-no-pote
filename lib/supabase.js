import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qexqpdzefyfkdbohwphe.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_gONC85uXaf62xdFwepfihQ_ERG9oDwd';

export const supabase = createClient(supabaseUrl, supabaseKey);

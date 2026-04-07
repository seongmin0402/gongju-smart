import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createSupabaseBrowserClient() {
  return createClient(url, anon);
}

export function createSupabaseServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? anon;
  return createClient(url, serviceKey);
}

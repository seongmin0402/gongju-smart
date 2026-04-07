import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const body = await req.json();
  const allowed = ['status', 'risk_score', 'urgency_score', 'ai_category'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const { data, error } = await sb
    .from('smart_complaints')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const { error } = await sb.from('smart_complaints').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

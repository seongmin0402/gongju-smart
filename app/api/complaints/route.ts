import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from('smart_complaints')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const sb = createSupabaseServerClient();

  const formData = await req.formData();
  const category    = formData.get('category') as string;
  const description = formData.get('description') as string;
  const latitude    = parseFloat(formData.get('latitude') as string);
  const longitude   = parseFloat(formData.get('longitude') as string);
  const imageFile   = formData.get('image') as File | null;

  if (!category || !description || isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  let image_url: string | null = null;

  // 이미지 업로드 (Supabase Storage)
  if (imageFile) {
    const ext = imageFile.name.split('.').pop() ?? 'jpg';
    const path = `complaints/${Date.now()}.${ext}`;
    const arrayBuffer = await imageFile.arrayBuffer();
    const { error: uploadError } = await sb.storage
      .from('smart-images')
      .upload(path, new Uint8Array(arrayBuffer), { contentType: imageFile.type });

    if (!uploadError) {
      const { data: urlData } = sb.storage.from('smart-images').getPublicUrl(path);
      image_url = urlData.publicUrl;
    }
  }

  const { data, error } = await sb
    .from('smart_complaints')
    .insert({ category, description, latitude, longitude, image_url, status: '접수' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

-- ============================================================
-- GongJu Smart — DB Schema
-- Supabase SQL Editor에 붙여넣고 실행하세요
-- ============================================================

-- 1. 민원 테이블
create table if not exists public.smart_complaints (
  id            uuid default gen_random_uuid() primary key,
  latitude      double precision not null,
  longitude     double precision not null,
  category      text not null,
  description   text not null,
  image_url     text,
  status        text default '접수' check (status in ('접수', '처리중', '완료')),
  ai_category   text,
  risk_score    integer,
  urgency_score integer,
  address       text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. RLS 활성화 (공개 읽기, 익명 쓰기 허용)
alter table public.smart_complaints enable row level security;

create policy "Anyone can read" on public.smart_complaints
  for select using (true);

create policy "Anyone can insert" on public.smart_complaints
  for insert with check (true);

create policy "Anyone can update" on public.smart_complaints
  for update using (true);

create policy "Anyone can delete" on public.smart_complaints
  for delete using (true);

-- 3. Storage 버킷 생성 (Supabase 대시보드 Storage에서 수동으로 생성하거나 아래 실행)
-- insert into storage.buckets (id, name, public) values ('smart-images', 'smart-images', true);

-- ============================================================
-- 003: 선거별 Open Graph 이미지 (URL 공유 미리보기)
-- 선거당 1장. 권장 1200x630 PNG/JPEG, 3MB 이하.
-- ============================================================

create table og_images (
  id          uuid primary key default gen_random_uuid(),
  election_id uuid not null unique references elections(id) on delete cascade,
  file_name   text not null,
  mime_type   text not null,
  size_bytes  integer not null check (size_bytes <= 3 * 1024 * 1024),
  data        bytea not null,
  created_at  timestamptz not null default now()
);

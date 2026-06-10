-- ============================================================
-- 침착투표소 (CalmVote) 초기 스키마
--
-- 비밀투표 핵심 원칙:
--   1. 유권자 코드 원문은 어디에도 저장하지 않는다 (HMAC 해시만 저장).
--   2. "투표권 사용 여부"(used_credentials)와 "투표 선택값"(ballots)을
--      서로 다른 테이블로 완전히 분리한다. 둘을 잇는 컬럼은 존재하지 않는다.
--   3. ballots에는 voter id / code hash / credential id를 절대 넣지 않는다.
--   4. ballots의 선택값은 AES-256-GCM으로 봉인되어 평문 candidate_id가 없다.
--   5. 유권자 명부의 개인정보는 저장하지 않는다. 배치명 + 인원수만 남긴다.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 관리자
-- ------------------------------------------------------------
create table admins (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 선거
-- ------------------------------------------------------------
create table elections (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  status            text not null default 'draft'
                    check (status in ('draft', 'scheduled', 'open', 'closed', 'archived')),
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  result_visible_at timestamptz not null,
  max_voters        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- ------------------------------------------------------------
-- 후보
-- ------------------------------------------------------------
create table candidates (
  id            uuid primary key default gen_random_uuid(),
  election_id   uuid not null references elections(id) on delete cascade,
  display_order integer not null default 0,
  name          text not null,
  short_intro   text,
  profile       text,
  slogan        text,
  color_hint    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_candidates_election on candidates(election_id, display_order);

-- ------------------------------------------------------------
-- 후보 포스터 (MVP: PostgreSQL bytea, 3MB 제한은 앱 레벨에서 강제)
-- ------------------------------------------------------------
create table candidate_posters (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   integer not null check (size_bytes <= 3 * 1024 * 1024),
  data         bytea not null,
  created_at   timestamptz not null default now()
);

create index idx_posters_candidate on candidate_posters(candidate_id);

-- ------------------------------------------------------------
-- 후보 정책 / 공약
-- ------------------------------------------------------------
create table candidate_policies (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references candidates(id) on delete cascade,
  title         text not null,
  body          text not null,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index idx_policies_candidate on candidate_policies(candidate_id, display_order);

-- ------------------------------------------------------------
-- 유권자 배치 (개인정보 없음: 배치명 + 인원수 + 생성 시각만)
-- ------------------------------------------------------------
create table voter_batches (
  id          uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id) on delete cascade,
  batch_name  text not null,
  voter_count integer not null,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 유권자 크레덴셜
-- 주의: 유권자 identity(이름/닉네임)와 절대 연결하지 않는다.
--       code_hash = HMAC_SHA256(normalized_code, VOTER_CODE_SECRET)
--       코드 원문은 생성 직후 CSV로 한 번만 내려가고 DB에는 남지 않는다.
-- ------------------------------------------------------------
create table voter_credentials (
  id          uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id) on delete cascade,
  batch_id    uuid references voter_batches(id) on delete set null,
  code_hash   text not null,
  is_revoked  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (election_id, code_hash)
);

-- ------------------------------------------------------------
-- 사용된 크레덴셜 (중복 투표 방지 전용)
-- 주의: 백오피스 UI에 개별 row를 절대 노출하지 않는다. count 집계만 허용.
--       이 테이블에는 어떤 선택값(candidate_id)도 저장되지 않는다.
--       PK(election_id, code_hash)가 DB 레벨에서 중복 투표를 차단한다.
-- ------------------------------------------------------------
create table used_credentials (
  election_id uuid not null references elections(id) on delete cascade,
  code_hash   text not null,
  used_at     timestamptz not null default now(),
  primary key (election_id, code_hash)
);

-- ------------------------------------------------------------
-- 투표함 (ballots)
-- 주의: 유권자 관련 값(voter id, code hash, credential id)을 절대 넣지 않는다.
--       encrypted_choice는 AES-256-GCM({ electionId, candidateId }) 결과다.
--       DB를 직접 열람해도 RESULT_SEALING_KEY 없이는 득표 현황을 알 수 없다.
-- ------------------------------------------------------------
create table ballots (
  id               uuid primary key default gen_random_uuid(),
  election_id      uuid not null references elections(id) on delete cascade,
  encrypted_choice text not null,
  iv               text not null,
  auth_tag         text not null,
  created_at       timestamptz not null default now()
);

create index idx_ballots_election on ballots(election_id);
create index idx_ballots_created_at on ballots(created_at);

-- ------------------------------------------------------------
-- 감사 로그 (투표 선택값/코드 원문은 절대 기록하지 않는다)
-- ------------------------------------------------------------
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references admins(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index idx_audit_logs_created_at on audit_logs(created_at);

-- ------------------------------------------------------------
-- 코드 입력 시도 로그 (가벼운 rate limit 용)
-- ip는 원문 대신 해시로만 저장한다. 성공/실패 여부만 기록.
-- ------------------------------------------------------------
create table code_entry_attempts (
  id           bigint generated always as identity primary key,
  ip_hash      text not null,
  succeeded    boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index idx_code_attempts_ip_time on code_entry_attempts(ip_hash, attempted_at);

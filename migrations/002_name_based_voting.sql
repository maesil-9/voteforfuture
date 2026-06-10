-- ============================================================
-- 002: 이름 기반 투표 + 검수(무효표) 구조로 전환
--
-- 변경 배경:
--   사전 명부 + 개별 코드 배부는 운영 부담이 크다. 투표 시 유권자가
--   이름(닉네임)을 직접 입력하고, 관리자가 사후 검수로 승인/무효
--   처리하는 구조로 바꾼다.
--
-- 비밀투표 원칙은 그대로 유지된다:
--   1. 제출 직후 선택값은 AES-256-GCM으로 봉인된 채 vote_submissions에
--      "임시로만" 보관된다. (이 단계에서도 앱은 복호화할 수 없다)
--   2. 관리자가 "승인"하면 봉인된 선택값은 익명 투표함(ballots)으로
--      이동하고 제출 레코드에서 삭제된다 → 이름과 표의 연결이 파기된다.
--   3. "무효" 처리하면 봉인된 선택값은 열어보지 않고 즉시 삭제된다.
--   4. 따라서 개표에 포함되는 모든 표는 이름과 연결할 수 없다.
--
-- 중복 투표 방지:
--   같은 이름(정규화 기준)의 활성 제출(pending/approved)은 부분 유니크
--   인덱스가 DB 레벨에서 차단한다. 무효 처리된 이름은 다시 제출할 수 있다
--   (오타/장난 제출을 무효 처리한 뒤 본인이 재투표하는 시나리오).
-- ============================================================

create table vote_submissions (
  id              uuid primary key default gen_random_uuid(),
  election_id     uuid not null references elections(id) on delete cascade,
  voter_name      text not null,        -- 입력 원문 (표시용)
  name_normalized text not null,        -- trim/공백정리/소문자 (중복 방지용)
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  -- 봉인된 선택값: 검수 전까지만 존재. 승인 시 ballots로 이동 후 null,
  -- 무효 시 즉시 null. (개표에 포함된 표는 이름과 연결 불가)
  sealed_choice   text,
  iv              text,
  auth_tag        text,
  reject_reason   text,
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references admins(id) on delete set null
);

-- 같은 이름의 활성 제출은 1건만 (무효 처리되면 같은 이름으로 재제출 가능)
create unique index uq_submissions_active_name
  on vote_submissions(election_id, name_normalized)
  where status <> 'rejected';

create index idx_submissions_election_status
  on vote_submissions(election_id, status);
create index idx_submissions_submitted_at
  on vote_submissions(submitted_at);

-- 코드/명부 시스템 제거
drop table if exists used_credentials;
drop table if exists voter_credentials;
drop table if exists voter_batches;

-- 코드 입력 시도 로그 → 범용 입장 시도 로그로 이름 변경 (rate limit 용도 동일)
alter table code_entry_attempts rename to entry_attempts;
alter index idx_code_attempts_ip_time rename to idx_entry_attempts_ip_time;

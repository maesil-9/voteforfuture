# 침착투표소 (CalmVote)

카카오톡 오픈채팅 **[침착한 일상 이야기방]** 방장 선거를 위한 작고 신뢰 가능한 **비밀 전자투표 서비스**.

핵심 원칙 세 가지:

1. **비밀투표** — 누가 무엇을 찍었는지 시스템 어디에도 남지 않는다.
2. **중복투표 방지** — 같은 코드로 두 번 투표할 수 없다 (DB constraint 레벨).
3. **결과 봉인** — 결과 발표일 전에는 관리자를 포함해 누구도 개표할 수 없다.

## 기술 스택

- Next.js 16 (App Router, Turbopack) + TypeScript
- PostgreSQL — **ORM 없음**, `pg` raw SQL + parameterized query만 사용
- Chakra UI 3
- Node `crypto` (HMAC-SHA256, AES-256-GCM), bcryptjs

## 환경변수

`.env.example`을 `.env.local`로 복사 후 채운다.

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `ADMIN_SESSION_SECRET` | 관리자/유권자 세션 쿠키 서명 키 |
| `VOTER_CODE_SECRET` | 투표 코드 HMAC 키. **변경 시 기존 코드 전부 무효화** |
| `RESULT_SEALING_KEY` | 투표지 AES-256-GCM 봉인 키. **분실 시 개표 영구 불가** |
| `USE_EXTERNAL_ASSET_URL` | `true`면 포스터를 외부 URL 방식으로 운용 (기본 `false`, DB bytea) |

키 생성: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 로컬 실행

```bash
# 1) PostgreSQL (Docker 예시)
docker run -d --name voteforfuture-db \
  -e POSTGRES_USER=vote -e POSTGRES_PASSWORD=votepw_local -e POSTGRES_DB=voteforfuture \
  -p 5436:5432 postgres:17-alpine

# 2) 의존성 + 마이그레이션 + 데모 시드
pnpm install
pnpm db:migrate     # migrations/*.sql 순차 적용 (schema_migrations로 이력 관리)
pnpm seed:demo      # 데모 선거 + 후보 3명 + 코드 30개 + 관리자 계정

# 3) 실행
pnpm dev            # http://localhost:3000
```

- 데모 관리자: `admin@calmvote.local` / `calm-vote-demo!1` (시드 출력 참조)
- 데모 투표 코드: 시드 실행 시 터미널에 출력 (재조회 불가)
- 관리자 계정 추가: `pnpm admin:create -- you@example.com yourpassword`
- 상태별 데모 선거 추가: `pnpm demo:election -- --upcoming|--open|--closed|--revealed`
- DB 초기화: `pnpm db:reset` 후 다시 `pnpm db:migrate`

## 비밀투표 설계

### 투표권과 선택값의 분리

투표 제출은 하나의 트랜잭션에서 두 테이블에 기록되지만, **두 테이블을 잇는 컬럼이 존재하지 않는다**:

```
used_credentials (election_id, code_hash, used_at)   ← "누가 투표권을 썼는가"
ballots (id, election_id, encrypted_choice, iv, auth_tag, created_at) ← "어떤 표가 들어왔는가"
```

- `ballots`에는 voter id / code hash / credential id 컬럼 자체가 없다.
- `used_credentials`에는 candidate 정보가 없다.
- 중복 투표는 `used_credentials`의 PK `(election_id, code_hash)`가 DB 레벨에서 차단한다.
- 투표율은 두 테이블의 **count 집계로만** 계산한다. 개별 row를 노출하는 UI/API는 없다.

### 유권자 코드

- 등록 시 각 유권자에게 `CALM-XXXX-XXXX` 형식의 랜덤 코드를 생성한다.
- DB에는 `HMAC_SHA256(정규화된 코드, VOTER_CODE_SECRET)` 해시만 저장한다.
- 코드 원문은 **생성 직후 CSV 다운로드 한 번**에만 존재하고 재조회할 수 없다.
- 명부의 닉네임(voter_label)과 코드의 매핑은 CSV 응답에만 존재하며 **DB에 저장되지 않는다**.
  DB에 남는 것은 배치명 + 인원수 + 생성 시각뿐이다.

trade-off: 코드 분실 시 재발급이 불가능하므로, 분실자는 관리자가 **긴급 추가 코드**를
발급해 대응한다(감사 로그 기록). 관리자가 최초 배포 CSV를 따로 보관하면 운영상 누가 어떤
코드를 받았는지 알 수 있지만, 시스템은 코드-투표 연결을 저장하지 않는 방식으로 보호한다.

### 결과 봉인

- 투표지는 `AES-256-GCM(RESULT_SEALING_KEY)`로 `{ electionId, candidateId }`를 암호화해 저장한다.
  DB를 직접 열람해도 키 없이는 득표 현황을 알 수 없다.
- 개표(복호화 + 집계)는 3중 가드를 통과해야 한다:
  1. 페이지/라우트 레벨 — `isResultVisible()` 확인 전에는 집계 함수를 호출하지 않음
  2. 서비스 레벨 — `aggregateResults()` 진입 즉시 `assertResultVisible()`이 throw
  3. **복호화 함수 내장 가드** — `unsealChoice()` 자체가 `result_visible_at` 이전이면 throw
- 후보별 count를 평문으로 내는 SQL 경로는 존재하지 않는다 (Harness 3가 정적 검사로 강제).

## 테스트 하네스

```bash
pnpm harness:all        # 전체 (DB 리셋 포함 — 개발 데이터가 초기화됨!)

pnpm harness:migration  # 1. 테이블/제약/cascade/3MB 제한
pnpm harness:seed       # 2. 데모 시드 무결성 (+ 코드 원문 미저장 확인)
pnpm harness:privacy    # 3. ballot에 코드/후보 평문 부재, 발표 전 집계 차단
pnpm harness:double-vote# 4. 같은 코드 2번째 투표 → unique constraint 차단
pnpm harness:turnout    # 5. 30명 중 7명 → 23.3%, 발표 전 득표 비공개
pnpm harness:seal       # 7. 봉인 3중 가드 + 발표 후 정상 개표
pnpm harness:responsive # 6. 뷰포트별 수동 체크리스트 출력 (360/430/768/1280/1440)
```

## 운영 시 주의사항

- `RESULT_SEALING_KEY`, `VOTER_CODE_SECRET`은 백업하되 외부 유출을 막을 것.
  전자를 잃으면 개표 불가, 후자를 바꾸면 기존 코드 전체가 무효가 된다.
- 코드 CSV는 발급 직후 한 번만 받을 수 있다. 안전한 채널(개인 DM)로 전달하고 파일은 폐기 권장.
- 투표 시작 후에는 후보/공약/유권자 구조가 잠긴다. 긴급 코드 발급만 감사 로그와 함께 허용된다.
- 결과 발표 시각(`result_visible_at`)은 투표 종료 이후로만 설정할 수 있다.
- 본 시스템은 HTTPS 뒤에서 운영하는 것을 전제로 한다 (쿠키 `secure`는 production에서 활성화).

## Known Limitations

- **공공 선거급 end-to-end verifiable voting system이 아니다.** 유권자가 자기 표가
  올바르게 집계됐는지 암호학적으로 검증할 수단(영수증, 공개 게시판 등)은 제공하지 않는다.
- **운영자가 최초 코드 배포 CSV를 따로 보관하면** 코드 수령자 목록(누가 어떤 코드를
  받았는지)을 알 수 있다. 다만 시스템 DB에는 투표 선택값과 코드/유권자의 연결이 저장되지
  않으므로, CSV를 보관하더라도 "누가 누구에게 투표했는지"는 알 수 없다.
- 결과 발표 전 후보별 득표는 **앱과 DB 평문 기준으로** 확인할 수 없도록 설계되어 있다.
  단, `RESULT_SEALING_KEY`를 가진 서버 운영자가 코드를 수정해 우회하는 것까지 막지는
  못한다 (위협 모델: 정직한 운영자 + 호기심 많은 관리자/DB 열람자).
- ballot의 `created_at`과 `used_credentials.used_at` 타임스탬프를 정밀 대조하면 투표
  시각 기반의 추정이 이론상 가능하다. 소규모 커뮤니티 선거에서는 수용 가능한 수준으로
  판단했고, 필요 시 타임스탬프 절삭(분 단위 반올림)으로 완화할 수 있다.
- 서버리스 다중 인스턴스 환경에서는 rate limit이 DB 기반이라 동작하지만, 코드 입력 실패
  지연(400~800ms)은 인스턴스별로 적용된다.

## 프로젝트 구조 (요약)

```
migrations/001_init.sql        # 전체 스키마 (비밀투표 원칙 주석 포함)
scripts/                       # migrate / seed / admin:create / 하네스 1~7
src/server/
  db.ts                        # pg Pool + query/transaction helper (ORM 아님)
  crypto/code-hash.ts          # 코드 정규화 + HMAC + 생성
  crypto/ballot-sealing.ts     # AES-256-GCM 봉인/해제 (해제 함수에 내장 가드)
  guards/                      # election-state / result-visibility
  auth/                        # admin-session / voter-session / password
  sql/                         # elections / candidates / voters / ballots / admin
  services/                    # vote(제출 트랜잭션) / results(개표 집계)
  actions/                     # Server Actions (vote / admin)
src/app/                       # 랜딩, 투표 흐름, 결과, /admin 백오피스, API 라우트
src/components/                # VotingBooth, CodeInvitationPanel, SealedStatus 등
```

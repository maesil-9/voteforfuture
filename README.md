# 침착투표소 (CalmVote)

카카오톡 오픈채팅 **[침착한 일상 이야기방]** 방장 선거를 위한 작고 신뢰 가능한 **비밀 전자투표 서비스**.

핵심 원칙:

1. **비밀투표** — 누가 무엇을 찍었는지 시스템 어디에도 남지 않는다.
2. **중복투표 방지** — 같은 이름으로 두 번 투표할 수 없다 (DB unique index 레벨).
3. **검수(무효표 처리)** — 명단에 없는 이름·장난 제출은 관리자가 표를 열어보지 않고 무효 처리한다.
4. **결과 봉인** — 결과 발표일 전에는 관리자를 포함해 누구도 개표할 수 없다.

## 기술 스택

- Next.js 16 (App Router, Turbopack) + TypeScript
- PostgreSQL — **ORM 없음**, `pg` raw SQL + parameterized query만 사용
- Chakra UI 3
- Node `crypto` (AES-256-GCM), bcryptjs

## 환경변수

`.env.example`을 `.env.local`로 복사 후 채운다.

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 (Netlify DB의 `NETLIFY_DATABASE_URL`도 폴백 지원) |
| `ADMIN_SESSION_SECRET` | 관리자/유권자 세션 쿠키 서명 키 |
| `VOTER_CODE_SECRET` | (레거시 호환용) 시크릿 — 현재 흐름에서는 미사용 |
| `RESULT_SEALING_KEY` | 투표지 AES-256-GCM 봉인 키. **분실 시 개표 영구 불가** |
| `NEXT_PUBLIC_SITE_URL` | (선택) OG 메타데이터용 사이트 URL. Netlify는 `URL` 자동 제공 |

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
pnpm seed:demo      # 데모 선거 + 후보 3명 + 데모 투표 7건(5건 승인) + 관리자

# 3) 실행
pnpm dev            # http://localhost:3000
```

- 데모 관리자: `admin@calmvote.local` / `calm-vote-demo!1`
- 관리자 계정 추가: `pnpm admin:create -- you@example.com yourpassword`
- 상태별 데모 선거 추가: `pnpm demo:election -- --upcoming|--open|--closed|--revealed`
- DB 초기화: `pnpm db:reset` 후 다시 `pnpm db:migrate`

## 투표 흐름 (이름 기반 + 검수)

1. 유권자는 **오픈채팅 닉네임**을 입력하고 기표소에 입장한다 (사전 명부/코드 불필요).
2. 후보를 살펴보고 한 명을 선택해 제출한다. 선택값은 제출 즉시 **AES-256-GCM으로
   봉인**되어 `vote_submissions`에 "검수 대기" 상태로 임시 보관된다.
3. 관리자는 백오피스 **검수 탭**에서 이름 목록을 보고 (표의 내용은 볼 수 없음):
   - **승인** → 봉인된 표가 익명 투표함(`ballots`)으로 이동하고, 제출 레코드에서
     봉인값이 삭제된다. **이 순간 이름-표의 연결이 영구히 파기된다.**
   - **무효** → 봉인된 표를 열어보지 않고 파기한다. 같은 이름으로 재투표가 가능해진다.
4. 승인/무효가 처리될 때마다 **실시간 현황**(접수/승인/대기/무효 집계)이 랜딩·완료·결과
   페이지에서 10초 간격 폴링으로 갱신되어 모두에게 보인다.
5. 결과 발표 시각이 되면 익명 투표함의 표만 복호화·집계해 결과를 공개한다.

### 중복 투표 방지

- 같은 이름(공백·대소문자 정규화 기준)의 활성 제출은 부분 유니크 인덱스
  `(election_id, name_normalized) where status <> 'rejected'`가 **DB 레벨에서 차단**한다.
- 누군가 내 이름으로 먼저 투표했다면? 관리자가 그 제출을 무효 처리하면 본인이
  다시 투표할 수 있다.

### 비밀투표가 유지되는 이유

- 검수 대기 중에도 선택값은 암호문이며, 복호화 함수에는 `result_visible_at` 이전
  호출을 거부하는 가드가 내장되어 있다 — 관리자 화면 어디에도 표의 내용이 뜰 수 없다.
- 승인 시 암호문이 **복호화 없이 그대로** 익명 투표함으로 이동하고 원본은 삭제되므로,
  개표 시점에는 어떤 표가 누구 것인지 알 수 없다.
- 무효 처리된 표는 열리지 않은 채 파기된다.
- 개표(복호화 + 집계)는 3중 가드: 페이지 레벨 → 서비스 `assertResultVisible()` →
  **복호화 함수 내장 가드**.

## Open Graph 이미지

선거 관리 → 개요 탭에서 URL 공유용 미리보기 이미지(권장 1200×630, 3MB 이하)를
업로드/교체/삭제할 수 있다. 업로드하면 랜딩·결과 페이지의 og:image로 자동 적용된다.

## 테스트 하네스

```bash
pnpm harness:all        # 전체 (DB 리셋 포함 — 개발 데이터가 초기화됨!)

pnpm harness:migration  # 1. 테이블/제약/cascade + 이름 중복 차단/재제출 허용
pnpm harness:seed       # 2. 데모 시드 무결성 (승인→익명함 이동 포함)
pnpm harness:privacy    # 3. 승인 후 이름-표 연결 파기, 발표 전 집계 차단
pnpm harness:double-vote# 4. 같은 이름 재투표 차단 / 무효 후 재투표 허용
pnpm harness:turnout    # 5. 검수 반영 현황 + 23.3% + 무효표 개표 제외
pnpm harness:seal       # 7. 봉인 3중 가드 + 발표 후 정상 개표
pnpm harness:responsive # 6. 뷰포트별 수동 체크리스트 출력 (360/430/768/1280/1440)
```

## 운영 시 주의사항

- `RESULT_SEALING_KEY`는 백업하되 외부 유출을 막을 것. 잃으면 개표가 불가능하다.
- **결과 발표 전에 검수를 끝내는 것을 권장**한다. 발표 시점에 검수 대기 표가 남아
  있으면 그 표는 집계에서 빠지고, 화면에 "검수 대기 N건 미포함" 안내가 뜬다.
- 승인/무효는 되돌릴 수 없다. 승인된 표는 익명이 되어 특정할 수 없고, 무효된 표는
  내용이 파기된다.
- 투표 시작 후에는 후보 구조(이름/공약/포스터)를 변경할 수 없다.
- HTTPS 뒤에서 운영하는 것을 전제로 한다 (쿠키 `secure`는 production에서 활성화).

## Known Limitations

- **공공 선거급 end-to-end verifiable voting system이 아니다.** 유권자가 자기 표가
  올바르게 집계됐는지 암호학적으로 검증할 수단은 제공하지 않는다.
- **이름 기반 인증은 신원 증명이 아니다.** 누구나 임의 이름으로 제출할 수 있으므로,
  관리자의 명단 검수가 유일한 방어선이다. 작은 커뮤니티(서로 닉네임을 아는 방)를
  전제로 한 설계다.
- 검수 대기 중에는 이름과 암호문이 한 레코드에 있다. 앱은 이를 복호화할 수 없지만,
  `RESULT_SEALING_KEY`와 DB를 모두 가진 운영자가 코드를 수정하면 대기 중인 표에
  한해 연결을 알아낼 수 있다 (위협 모델: 정직한 운영자 + 호기심 많은 관리자/DB 열람자).
  승인 즉시 연결이 파기되므로, 검수를 빠르게 처리할수록 노출 창이 짧아진다.
- ballot의 `created_at`과 제출/검수 시각을 정밀 대조하면 시각 기반 추정이 이론상
  가능하다. 필요 시 타임스탬프 절삭으로 완화할 수 있다.

## 프로젝트 구조 (요약)

```
migrations/                    # 001 초기 스키마, 002 이름 기반+검수 전환, 003 OG 이미지
scripts/                       # migrate / seed / admin:create / 하네스 1~7
src/server/
  db.ts                        # pg Pool + query/transaction helper (ORM 아님)
  crypto/ballot-sealing.ts     # AES-256-GCM 봉인/해제 (해제 함수에 내장 가드)
  guards/                      # election-state / result-visibility
  auth/                        # admin-session / voter-session / password
  sql/                         # elections / candidates / submissions / ballots / og / admin
  services/                    # vote(제출) / review(승인·무효) / results(개표 집계)
  actions/                     # Server Actions (vote / admin)
src/app/                       # 랜딩, 투표 흐름, 결과, /admin 백오피스, API 라우트
src/components/                # VotingBooth, NameEntryPanel, ParticipationLive 등
```

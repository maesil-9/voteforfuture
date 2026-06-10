/**
 * Harness 6: Responsive UI Harness
 * 자동화 브라우저 없이 점검할 수 있도록 뷰포트별 체크리스트를 출력한다.
 * (pnpm dev 실행 후 브라우저 devtools로 확인)
 */
const VIEWPORTS = ["360px", "430px", "768px", "1280px", "1440px"];

const CHECKS = [
  "/ (랜딩): 선거명·일정 타임라인·실시간 현황 패널이 줄바꿈 없이 읽힌다",
  "/vote/enter-name: 이름 입력 카드가 깨지지 않고, 모바일 키보드에서 입력이 편하다",
  "/vote/[id] (기표소): 모바일에서 포스터 벽이 가로 스냅 스크롤로 동작한다",
  "/vote/[id] (기표소): 데스크톱에서 좌측 포스터 레일 + 우측 상세 분할 뷰가 유지된다",
  "/vote/[id] (기표소): 공약이 길어도 manifesto strip이 읽기 편하다",
  "/vote/[id] (기표소): 하단 고정 '선택 확인으로' CTA가 항상 보인다",
  "/vote/[id]/confirm: 투표용지 카드와 봉인 제출 버튼이 명확하다",
  "/vote/[id]/complete: 접수 도장 카드와 실시간 현황이 잘리지 않는다",
  "/results/[id]: 봉인 패널/결과 막대가 폭에 맞게 변한다",
  "/admin: 메트릭 스트립이 모바일에서 세로로 쌓인다",
  "/admin/.../review: 검수 테이블이 모바일에서 무너지지 않는다 (가로 스크롤 허용)",
  "/admin/.../candidates: 후보 카드 그리드가 lg 미만에서 1열로 변한다",
];

console.log("[Harness 6] Responsive UI 체크리스트");
console.log("");
console.log("1) pnpm dev 로 서버 실행");
console.log("2) 브라우저 devtools 반응형 모드에서 아래 뷰포트를 순회:");
console.log(`   ${VIEWPORTS.join("  ·  ")}`);
console.log("");
for (const c of CHECKS) {
  console.log(`  [ ] ${c}`);
}
console.log("");
console.log("Harness 6: 수동 체크리스트 출력 완료 (자동 검증 아님)");

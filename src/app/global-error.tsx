"use client";

/**
 * 루트 레이아웃까지 깨졌을 때의 최후 방어선.
 * 이 시점에는 Chakra Provider가 없을 수 있으므로 인라인 스타일만 사용한다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBF8F1",
          color: "#2A2718",
          fontFamily:
            "'Pretendard Variable', Pretendard, 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            background: "#FFFEFA",
            border: "1px solid #DCD1B8",
            boxShadow:
              "0 1px 2px rgba(42,39,24,0.06), 0 8px 24px -12px rgba(42,39,24,0.18)",
            borderRadius: "2px",
            padding: "48px 40px",
            maxWidth: "420px",
            width: "100%",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.3em",
              color: "#6E6857",
              textTransform: "uppercase",
              margin: "0 0 16px",
            }}
          >
            침착투표소
          </p>
          <h1 style={{ fontSize: "26px", fontWeight: 900, margin: "0 0 16px" }}>
            잠시 문제가 생겼습니다
          </h1>
          <p style={{ color: "#6E6857", lineHeight: 1.7, margin: "0 0 24px" }}>
            일시적인 오류일 수 있어요. 다시 시도해도 반복되면 잠시 후에
            방문해주세요. 투표 데이터는 안전하게 보관 중입니다.
          </p>
          {error.digest && (
            <p style={{ fontSize: "10px", color: "#A8A293", margin: "0 0 24px" }}>
              오류 코드: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#34506B",
              color: "#FBF8F1",
              border: "none",
              borderRadius: "4px",
              padding: "12px 28px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}

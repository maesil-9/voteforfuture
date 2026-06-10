/**
 * 환경변수 검증.
 * 비밀키가 없으면 해당 기능 사용 시점에 즉시 에러를 던진다.
 * (빌드 타임에는 env가 없을 수 있으므로 import 시점이 아닌 접근 시점에 검증)
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "" || value.startsWith("change-me")) {
    throw new Error(
      `환경변수 ${name}이(가) 설정되지 않았습니다. .env.local을 확인하세요.`,
    );
  }
  return value;
}

export const env = {
  get databaseUrl(): string {
    // Netlify DB 확장은 NETLIFY_DATABASE_URL로 자동 주입한다 — 둘 다 지원
    const netlifyUrl = process.env.NETLIFY_DATABASE_URL;
    if (!process.env.DATABASE_URL && netlifyUrl) return netlifyUrl;
    return required("DATABASE_URL");
  },
  get adminSessionSecret(): string {
    return required("ADMIN_SESSION_SECRET");
  },
  get resultSealingKey(): string {
    return required("RESULT_SEALING_KEY");
  },
  get useExternalAssetUrl(): boolean {
    return process.env.USE_EXTERNAL_ASSET_URL === "true";
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};

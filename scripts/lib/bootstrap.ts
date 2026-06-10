/**
 * 스크립트 공용 부트스트랩: .env.local → .env 순서로 환경변수를 로드한다.
 * (Next.js 런타임 밖에서 실행되는 scripts/* 전용)
 */
import { config } from "dotenv";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
config({ path: path.join(root, ".env.local") });
config({ path: path.join(root, ".env") });

export const projectRoot = root;

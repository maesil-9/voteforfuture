import { cookies } from "next/headers";
import { env } from "../env";
import { signPayload, verifyPayload } from "./signing";

/**
 * 유권자 세션.
 *
 * - 유권자는 계정이 없다. 이름(닉네임)을 입력하면 짧은 TTL의 서명된
 *   httpOnly 쿠키를 발급한다.
 * - 투표 진행 중 선택한 후보(selectedCandidateId)도 이 쿠키에만 머문다.
 *   (URL 쿼리로 노출하지 않기 위함 — 서버 access log에 선택이 남지 않는다)
 * - 투표 제출 완료 시 쿠키를 즉시 삭제한다.
 */

const COOKIE_NAME = "cv_booth";
const SESSION_TTL_SECONDS = 60 * 30; // 30분

export type VoterSessionPayload = {
  electionId: string;
  voterName: string;
  selectedCandidateId?: string;
  exp: number; // epoch seconds
};

async function writeSession(payload: VoterSessionPayload) {
  const store = await cookies();
  store.set(COOKIE_NAME, signPayload(payload, env.adminSessionSecret), {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function createVoterSession(
  electionId: string,
  voterName: string,
) {
  await writeSession({
    electionId,
    voterName,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
}

export async function getVoterSession(
  electionId?: string,
): Promise<VoterSessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyPayload<VoterSessionPayload>(
    token,
    env.adminSessionSecret,
  );
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (electionId && payload.electionId !== electionId) return null;
  return payload;
}

/** 후보 선택을 세션에 기록 (확인 화면에서 사용) */
export async function setVoterSelection(
  electionId: string,
  candidateId: string,
): Promise<boolean> {
  const session = await getVoterSession(electionId);
  if (!session) return false;
  await writeSession({ ...session, selectedCandidateId: candidateId });
  return true;
}

export async function destroyVoterSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

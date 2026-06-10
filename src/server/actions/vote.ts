"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyVoterCode, submitVote } from "../services/vote";
import {
  createVoterSession,
  destroyVoterSession,
  getVoterSession,
  setVoterSelection,
} from "../auth/voter-session";
import { getCandidate } from "../sql/candidates";
import { getElection } from "../sql/elections";
import { assertVotingOpen } from "../guards/election-state";
import { signPayload } from "../auth/signing";
import { env } from "../env";

/**
 * 유권자 흐름 서버 액션.
 * 모든 액션은 UI 외부 호출 가능성을 전제로 내부에서 검증을 다시 수행한다.
 */

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}

export type EnterCodeState = { error?: string };

export async function enterCodeAction(
  _prev: EnterCodeState,
  formData: FormData,
): Promise<EnterCodeState> {
  const electionId = String(formData.get("electionId") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!electionId || !code.trim()) {
    return { error: "투표 코드를 입력해주세요." };
  }

  const result = await verifyVoterCode(electionId, code, await clientIp());
  if (!result.ok) {
    return { error: result.message };
  }

  await createVoterSession(electionId, result.codeHash);
  redirect(`/vote/${electionId}`);
}

export type SelectState = { error?: string };

export async function selectCandidateAction(
  _prev: SelectState,
  formData: FormData,
): Promise<SelectState> {
  const electionId = String(formData.get("electionId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");

  const session = await getVoterSession(electionId);
  if (!session) {
    redirect("/vote/enter-code?expired=1");
  }

  const election = await getElection(electionId);
  const candidate = await getCandidate(candidateId);
  if (!election || !candidate || candidate.electionId !== electionId) {
    return { error: "이 후보는 현재 투표할 수 없습니다." };
  }

  try {
    assertVotingOpen(election);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "투표할 수 없습니다." };
  }

  await setVoterSelection(electionId, candidateId);
  redirect(`/vote/${electionId}/confirm`);
}

export type SubmitState = { error?: string };

export async function submitVoteAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const electionId = String(formData.get("electionId") ?? "");

  const session = await getVoterSession(electionId);
  if (!session) {
    redirect("/vote/enter-code?expired=1");
  }
  if (!session.selectedCandidateId) {
    redirect(`/vote/${electionId}`);
  }

  const result = await submitVote({
    electionId,
    codeHash: session.codeHash,
    candidateId: session.selectedCandidateId,
  });

  if (!result.ok) {
    if (result.reason === "already_voted") {
      await destroyVoterSession();
      redirect(`/vote/enter-code?already=1`);
    }
    return { error: result.message };
  }

  // 세션(코드 해시 포함)을 즉시 폐기하고, 완료 화면 접근용 단기 쿠키만 남긴다.
  await destroyVoterSession();
  const store = await cookies();
  store.set(
    "cv_done",
    signPayload(
      { electionId, exp: Math.floor(Date.now() / 1000) + 3600 },
      env.adminSessionSecret,
    ),
    {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    },
  );
  redirect(`/vote/${electionId}/complete`);
}

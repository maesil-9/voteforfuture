"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { findAdminByEmail, insertAuditLog } from "../sql/admin";
import { verifyPassword } from "../auth/password";
import {
  createAdminSession,
  destroyAdminSession,
  requireAdmin,
} from "../auth/admin-session";
import {
  createElection,
  getElection,
  updateElection,
} from "../sql/elections";
import {
  createCandidate,
  createPolicy,
  deleteCandidate,
  deletePolicy,
  getCandidate,
  setPoster,
  updateCandidate,
  updatePolicy,
} from "../sql/candidates";
import { canEditBallotStructure } from "../guards/election-state";
import type { ElectionStatus } from "../types";

/**
 * 백오피스 서버 액션.
 * Server Action은 UI 밖에서도 호출될 수 있으므로 모든 액션이
 * 내부에서 requireAdmin()과 선거 상태 검증을 다시 수행한다.
 */

// ---------- 로그인 / 로그아웃 ----------

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const admin = email ? await findAdminByEmail(email) : null;
  const valid = admin && (await verifyPassword(password, admin.passwordHash));
  if (!admin || !valid) {
    // 이메일 존재 여부를 구분해서 노출하지 않는다
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  await createAdminSession(admin.id, admin.email);
  await insertAuditLog({ adminId: admin.id, action: "admin.login" });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

// ---------- 선거 생성 / 수정 ----------

export type ElectionFormState = { error?: string };

const VALID_STATUS: ElectionStatus[] = [
  "draft",
  "scheduled",
  "open",
  "closed",
  "archived",
];

export async function saveElectionAction(
  _prev: ElectionFormState,
  formData: FormData,
): Promise<ElectionFormState> {
  const session = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "draft") as ElectionStatus;
  const startsAt = new Date(String(formData.get("startsAt") ?? ""));
  const endsAt = new Date(String(formData.get("endsAt") ?? ""));
  const resultVisibleAt = new Date(String(formData.get("resultVisibleAt") ?? ""));
  const maxVoters = Number(formData.get("maxVoters") ?? 0) || 0;

  if (!title) return { error: "선거명을 입력해주세요." };
  if (!VALID_STATUS.includes(status)) return { error: "상태 값이 올바르지 않습니다." };
  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    Number.isNaN(resultVisibleAt.getTime())
  ) {
    return { error: "일정(시작/종료/발표)을 모두 입력해주세요." };
  }
  if (endsAt <= startsAt) {
    return { error: "투표 종료는 시작보다 뒤여야 합니다." };
  }
  if (resultVisibleAt < endsAt) {
    return { error: "결과 발표는 투표 종료 이후여야 합니다." };
  }

  const input = {
    title,
    description,
    status,
    startsAt,
    endsAt,
    resultVisibleAt,
    maxVoters,
  };

  if (id) {
    const existing = await getElection(id);
    if (!existing) return { error: "선거를 찾을 수 없습니다." };
    await updateElection(id, input);
    await insertAuditLog({
      adminId: session.adminId,
      action: "election.update",
      targetType: "election",
      targetId: id,
      metadata: { status },
    });
    revalidatePath(`/admin/elections/${id}`);
    redirect(`/admin/elections/${id}?saved=1`);
  }

  const created = await createElection(input);
  await insertAuditLog({
    adminId: session.adminId,
    action: "election.create",
    targetType: "election",
    targetId: created.id,
  });
  redirect(`/admin/elections/${created.id}?created=1`);
}

// ---------- 후보 CRUD ----------

async function assertStructureEditable(electionId: string): Promise<string | null> {
  const election = await getElection(electionId);
  if (!election) return "선거를 찾을 수 없습니다.";
  if (!canEditBallotStructure(election)) {
    return "투표 시작 후에는 후보/공약을 수정할 수 없습니다.";
  }
  return null;
}

export type CandidateFormState = { error?: string };

export async function saveCandidateAction(
  _prev: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> {
  const session = await requireAdmin();

  const electionId = String(formData.get("electionId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "후보명을 입력해주세요." };

  const blocked = await assertStructureEditable(electionId);
  if (blocked) return { error: blocked };

  const input = {
    name,
    shortIntro: String(formData.get("shortIntro") ?? "").trim() || null,
    profile: String(formData.get("profile") ?? "").trim() || null,
    slogan: String(formData.get("slogan") ?? "").trim() || null,
    colorHint: String(formData.get("colorHint") ?? "").trim() || null,
    displayOrder: Number(formData.get("displayOrder") ?? 0) || 0,
  };

  if (candidateId) {
    const candidate = await getCandidate(candidateId);
    if (!candidate || candidate.electionId !== electionId) {
      return { error: "후보를 찾을 수 없습니다." };
    }
    await updateCandidate(candidateId, input);
    await insertAuditLog({
      adminId: session.adminId,
      action: "candidate.update",
      targetType: "candidate",
      targetId: candidateId,
    });
  } else {
    const newId = await createCandidate(electionId, input);
    await insertAuditLog({
      adminId: session.adminId,
      action: "candidate.create",
      targetType: "candidate",
      targetId: newId,
    });
  }

  revalidatePath(`/admin/elections/${electionId}/candidates`);
  redirect(`/admin/elections/${electionId}/candidates?saved=1`);
}

export async function deleteCandidateAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const electionId = String(formData.get("electionId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");

  const blocked = await assertStructureEditable(electionId);
  if (blocked) {
    redirect(`/admin/elections/${electionId}/candidates?error=locked`);
  }

  const candidate = await getCandidate(candidateId);
  if (candidate && candidate.electionId === electionId) {
    await deleteCandidate(candidateId);
    await insertAuditLog({
      adminId: session.adminId,
      action: "candidate.delete",
      targetType: "candidate",
      targetId: candidateId,
    });
  }
  revalidatePath(`/admin/elections/${electionId}/candidates`);
  redirect(`/admin/elections/${electionId}/candidates`);
}

// ---------- 포스터 업로드 ----------

const MAX_POSTER_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadPosterAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const electionId = String(formData.get("electionId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  const file = formData.get("poster");

  const blocked = await assertStructureEditable(electionId);
  if (blocked) {
    redirect(`/admin/elections/${electionId}/candidates?error=locked`);
  }

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/elections/${electionId}/candidates?error=nofile`);
  }
  if (file.size > MAX_POSTER_BYTES) {
    redirect(`/admin/elections/${electionId}/candidates?error=toobig`);
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    redirect(`/admin/elections/${electionId}/candidates?error=badtype`);
  }

  const candidate = await getCandidate(candidateId);
  if (!candidate || candidate.electionId !== electionId) {
    redirect(`/admin/elections/${electionId}/candidates?error=notfound`);
  }

  const data = Buffer.from(await file.arrayBuffer());
  await setPoster(candidateId, {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    data,
  });
  await insertAuditLog({
    adminId: session.adminId,
    action: "candidate.poster_upload",
    targetType: "candidate",
    targetId: candidateId,
    metadata: { sizeBytes: file.size, mimeType: file.type },
  });

  revalidatePath(`/admin/elections/${electionId}/candidates`);
  redirect(`/admin/elections/${electionId}/candidates?saved=1`);
}

// ---------- 정책 / 공약 CRUD ----------

export type PolicyFormState = { error?: string };

export async function savePolicyAction(
  _prev: PolicyFormState,
  formData: FormData,
): Promise<PolicyFormState> {
  const session = await requireAdmin();
  const electionId = String(formData.get("electionId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  const policyId = String(formData.get("policyId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const displayOrder = Number(formData.get("displayOrder") ?? 0) || 0;

  if (!title || !body) return { error: "공약 제목과 내용을 입력해주세요." };

  const blocked = await assertStructureEditable(electionId);
  if (blocked) return { error: blocked };

  const candidate = await getCandidate(candidateId);
  if (!candidate || candidate.electionId !== electionId) {
    return { error: "후보를 찾을 수 없습니다." };
  }

  if (policyId) {
    await updatePolicy(policyId, { title, body, displayOrder });
  } else {
    await createPolicy(candidateId, { title, body, displayOrder });
  }
  await insertAuditLog({
    adminId: session.adminId,
    action: policyId ? "policy.update" : "policy.create",
    targetType: "candidate",
    targetId: candidateId,
  });

  revalidatePath(`/admin/elections/${electionId}/candidates`);
  redirect(`/admin/elections/${electionId}/candidates?saved=1`);
}

export async function deletePolicyAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const electionId = String(formData.get("electionId") ?? "");
  const policyId = String(formData.get("policyId") ?? "");

  const blocked = await assertStructureEditable(electionId);
  if (blocked) {
    redirect(`/admin/elections/${electionId}/candidates?error=locked`);
  }

  await deletePolicy(policyId);
  await insertAuditLog({
    adminId: session.adminId,
    action: "policy.delete",
    targetType: "policy",
  });
  revalidatePath(`/admin/elections/${electionId}/candidates`);
  redirect(`/admin/elections/${electionId}/candidates`);
}

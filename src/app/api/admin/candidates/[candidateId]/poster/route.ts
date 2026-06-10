import { getAdminSession } from "@/server/auth/admin-session";
import { getCandidate, setPoster } from "@/server/sql/candidates";
import { getElection } from "@/server/sql/elections";
import { insertAuditLog } from "@/server/sql/admin";
import { canEditBallotStructure } from "@/server/guards/election-state";
import { checkImageUpload } from "@/server/services/upload";

/**
 * 후보 포스터 업로드 (XHR 전용 — 클라이언트가 진행률을 표시한다).
 * 검증 규칙은 기존 서버 액션과 동일: 관리자 인증 + 투표 시작 전 + 3MB 이미지.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const { candidateId } = await params;
  const candidate = await getCandidate(candidateId).catch(() => null);
  if (!candidate) {
    return Response.json({ message: "후보를 찾을 수 없습니다." }, { status: 404 });
  }

  const election = await getElection(candidate.electionId);
  if (!election || !canEditBallotStructure(election)) {
    return Response.json(
      { message: "투표 시작 후에는 포스터를 수정할 수 없습니다." },
      { status: 403 },
    );
  }

  const form = await req.formData();
  const checked = checkImageUpload(form.get("file"));
  if (!checked.ok) {
    return Response.json({ message: checked.message }, { status: checked.status });
  }

  const data = Buffer.from(await checked.file.arrayBuffer());
  await setPoster(candidateId, {
    fileName: checked.file.name,
    mimeType: checked.file.type,
    sizeBytes: checked.file.size,
    data,
  });
  await insertAuditLog({
    adminId: session.adminId,
    action: "candidate.poster_upload",
    targetType: "candidate",
    targetId: candidateId,
    metadata: { sizeBytes: checked.file.size, mimeType: checked.file.type },
  });

  return Response.json({ ok: true });
}

import { getAdminSession } from "@/server/auth/admin-session";
import { getElection } from "@/server/sql/elections";
import { setOgImage } from "@/server/sql/og";
import { insertAuditLog } from "@/server/sql/admin";
import { checkImageUpload } from "@/server/services/upload";

/**
 * 선거 OG 이미지 업로드 (XHR 전용 — 클라이언트가 진행률을 표시한다).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const { electionId } = await params;
  const election = await getElection(electionId).catch(() => null);
  if (!election) {
    return Response.json({ message: "선거를 찾을 수 없습니다." }, { status: 404 });
  }

  const form = await req.formData();
  const checked = checkImageUpload(form.get("file"));
  if (!checked.ok) {
    return Response.json({ message: checked.message }, { status: checked.status });
  }

  const data = Buffer.from(await checked.file.arrayBuffer());
  await setOgImage(electionId, {
    fileName: checked.file.name,
    mimeType: checked.file.type,
    sizeBytes: checked.file.size,
    data,
  });
  await insertAuditLog({
    adminId: session.adminId,
    action: "election.og_image_upload",
    targetType: "election",
    targetId: electionId,
    metadata: { sizeBytes: checked.file.size, mimeType: checked.file.type },
  });

  return Response.json({ ok: true });
}

import { getElection } from "@/server/sql/elections";
import { getParticipation } from "@/server/sql/submissions";

/**
 * 공개 투표 현황 엔드포인트.
 * aggregate count만 반환한다 — 이름/선택값 등 개별 정보는 절대 포함하지 않는다.
 * 검수(승인/무효)가 일어날 때마다 이 수치가 갱신되어 사용자에게 보인다.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const { electionId } = await params;

  const election = await getElection(electionId).catch(() => null);
  if (!election || election.status === "draft") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const participation = await getParticipation(electionId);
  return Response.json(participation, {
    headers: { "Cache-Control": "no-store" },
  });
}

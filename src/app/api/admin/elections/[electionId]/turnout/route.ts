import { getAdminSession } from "@/server/auth/admin-session";
import { getTurnout } from "@/server/sql/voters";

/** 백오피스 투표율 폴링용. aggregate count만 반환한다. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { electionId } = await params;
  const turnout = await getTurnout(electionId);
  return Response.json(turnout, { headers: { "Cache-Control": "no-store" } });
}

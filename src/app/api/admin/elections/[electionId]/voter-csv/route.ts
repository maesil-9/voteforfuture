import { getAdminSession } from "@/server/auth/admin-session";
import { getElection } from "@/server/sql/elections";
import { canEditBallotStructure } from "@/server/guards/election-state";
import { generateVoterCode, hashCode } from "@/server/crypto/code-hash";
import { createBatchWithCredentials } from "@/server/sql/voters";
import { insertAuditLog } from "@/server/sql/admin";

/**
 * 유권자 배치 등록 + 코드 CSV 1회 다운로드.
 *
 * 핵심 보안 동작:
 * - 코드 원문은 이 응답(CSV) 안에서만 존재한다. DB에는 HMAC 해시만 저장된다.
 * - voter_label과 코드의 연결은 DB 어디에도 저장되지 않는다.
 * - 따라서 이 CSV는 다시 생성/조회할 수 없다. (분실 시 추가 코드 발급으로 대응)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return new Response("인증이 필요합니다.", { status: 401 });
  }

  const { electionId } = await params;
  const election = await getElection(electionId);
  if (!election) {
    return new Response("선거를 찾을 수 없습니다.", { status: 404 });
  }

  const form = await req.formData();
  const batchName = String(form.get("batchName") ?? "").trim();
  const roster = String(form.get("roster") ?? "");
  const emergency = form.get("emergency") === "on";

  if (!batchName) {
    return new Response("배치 이름을 입력해주세요.", { status: 400 });
  }

  // 투표 시작 후 유권자 추가는 기본 금지. 긴급 발급만 audit log와 함께 허용.
  if (!canEditBallotStructure(election) && !emergency) {
    return new Response(
      "투표 시작 후에는 유권자를 추가할 수 없습니다. 분실 등 긴급 상황이라면 긴급 발급 옵션을 사용하세요.",
      { status: 403 },
    );
  }

  const labels = roster
    .split(/\r?\n/)
    .map((line) => line.split(",")[0].trim())
    .filter((label) => label.length > 0);

  if (labels.length === 0) {
    return new Response("유권자 명부가 비어 있습니다.", { status: 400 });
  }
  if (labels.length > 5000) {
    return new Response("한 번에 5,000명까지 등록할 수 있습니다.", { status: 400 });
  }

  // 코드 생성 — 원문은 메모리에만 존재하며 DB에는 해시만 들어간다
  const codes = labels.map(() => generateVoterCode());
  const codeHashes = codes.map((c) => hashCode(c));

  try {
    const batch = await createBatchWithCredentials(
      electionId,
      batchName,
      codeHashes,
    );

    await insertAuditLog({
      adminId: session.adminId,
      action: emergency ? "voters.emergency_issue" : "voters.batch_create",
      targetType: "voter_batch",
      targetId: batch.id,
      metadata: { batchName, voterCount: labels.length, emergency },
    });
  } catch (err) {
    console.error("[voter-csv] batch creation failed:", err);
    return new Response(
      "코드 생성 중 충돌이 발생했습니다. 다시 시도해주세요.",
      { status: 500 },
    );
  }

  // CSV 작성 (voter_label ↔ code 매핑은 이 응답에만 존재)
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    "voter_label,code,election_title,note",
    ...labels.map((label, i) =>
      [
        esc(label),
        esc(codes[i]),
        esc(election.title),
        esc("이 코드는 다시 조회할 수 없습니다. 안전하게 전달하세요."),
      ].join(","),
    ),
  ];
  const csv = "﻿" + lines.join("\r\n"); // BOM: Excel 한글 호환

  const safeName = batchName.replace(/[^\w가-힣-]/g, "_");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`voter-codes-${safeName}.csv`)}`,
      "Cache-Control": "no-store",
    },
  });
}

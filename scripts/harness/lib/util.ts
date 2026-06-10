import "../../lib/bootstrap";
import { execSync } from "node:child_process";
import { query } from "../../../src/server/db";
import { createElection } from "../../../src/server/sql/elections";
import { createCandidate } from "../../../src/server/sql/candidates";
import { createBatchWithCredentials } from "../../../src/server/sql/voters";
import {
  generateVoterCode,
  hashCode,
} from "../../../src/server/crypto/code-hash";
import type { Election } from "../../../src/server/types";

let failures = 0;

export function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

export function finish(harnessName: string) {
  console.log("");
  if (failures > 0) {
    console.error(`${harnessName}: ${failures}개 검증 실패`);
    process.exitCode = 1;
  } else {
    console.log(`${harnessName}: 모든 검증 통과`);
  }
}

export function resetAndMigrate() {
  execSync("npx tsx scripts/reset-dev.ts", { stdio: "inherit" });
  execSync("npx tsx scripts/migrate.ts", { stdio: "inherit" });
}

/** 하네스 전용: 후보 2명 + 유권자 N명을 가진 선거를 만든다 */
export async function makeTestElection(opts: {
  title: string;
  voterCount: number;
  resultVisibleAt: Date;
  endsAt?: Date;
}): Promise<{
  election: Election;
  candidateIds: string[];
  codes: string[];
  codeHashes: string[];
}> {
  const now = Date.now();
  const election = await createElection({
    title: opts.title,
    description: null,
    status: "open",
    startsAt: new Date(now - 3600_000),
    endsAt: opts.endsAt ?? new Date(now + 3600_000),
    resultVisibleAt: opts.resultVisibleAt,
    maxVoters: opts.voterCount,
  });

  const candidateIds = [
    await createCandidate(election.id, {
      name: "후보A",
      shortIntro: null,
      profile: null,
      slogan: null,
      colorHint: null,
      displayOrder: 0,
    }),
    await createCandidate(election.id, {
      name: "후보B",
      shortIntro: null,
      profile: null,
      slogan: null,
      colorHint: null,
      displayOrder: 1,
    }),
  ];

  const codes = Array.from({ length: opts.voterCount }, () =>
    generateVoterCode(),
  );
  const codeHashes = codes.map((c) => hashCode(c));
  await createBatchWithCredentials(election.id, "하네스 명부", codeHashes);

  return { election, candidateIds, codes, codeHashes };
}

export async function columnNames(table: string): Promise<string[]> {
  const { rows } = await query<{ column_name: string }>(
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

export async function revealResults(electionId: string) {
  await query(
    "update elections set result_visible_at = now() - interval '1 minute', ends_at = now() - interval '1 minute', status = 'closed' where id = $1",
    [electionId],
  );
}

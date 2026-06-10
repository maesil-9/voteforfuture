import { query } from "../db";
import type { Election, ElectionStatus } from "../types";

type ElectionRow = {
  id: string;
  title: string;
  description: string | null;
  status: ElectionStatus;
  starts_at: Date;
  ends_at: Date;
  result_visible_at: Date;
  max_voters: number;
  created_at: Date;
  updated_at: Date;
};

function mapElection(row: ElectionRow): Election {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    resultVisibleAt: row.result_visible_at,
    maxVoters: row.max_voters,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS =
  "id, title, description, status, starts_at, ends_at, result_visible_at, max_voters, created_at, updated_at";

export async function listElections(): Promise<Election[]> {
  const { rows } = await query<ElectionRow>(
    `select ${COLUMNS} from elections order by created_at desc`,
  );
  return rows.map(mapElection);
}

export async function getElection(id: string): Promise<Election | null> {
  const { rows } = await query<ElectionRow>(
    `select ${COLUMNS} from elections where id = $1`,
    [id],
  );
  return rows[0] ? mapElection(rows[0]) : null;
}

/** 랜딩에 노출할 선거: draft/archived 제외, 가장 최근 시작 기준 */
export async function getLatestPublicElection(): Promise<Election | null> {
  const { rows } = await query<ElectionRow>(
    `select ${COLUMNS} from elections
      where status in ('scheduled', 'open', 'closed')
      order by starts_at desc
      limit 1`,
  );
  return rows[0] ? mapElection(rows[0]) : null;
}

export type ElectionInput = {
  title: string;
  description: string | null;
  status: ElectionStatus;
  startsAt: Date;
  endsAt: Date;
  resultVisibleAt: Date;
  maxVoters: number;
};

export async function createElection(input: ElectionInput): Promise<Election> {
  const { rows } = await query<ElectionRow>(
    `insert into elections
       (title, description, status, starts_at, ends_at, result_visible_at, max_voters)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning ${COLUMNS}`,
    [
      input.title,
      input.description,
      input.status,
      input.startsAt,
      input.endsAt,
      input.resultVisibleAt,
      input.maxVoters,
    ],
  );
  return mapElection(rows[0]);
}

export async function updateElection(
  id: string,
  input: ElectionInput,
): Promise<Election | null> {
  const { rows } = await query<ElectionRow>(
    `update elections
        set title = $2, description = $3, status = $4, starts_at = $5,
            ends_at = $6, result_visible_at = $7, max_voters = $8,
            updated_at = now()
      where id = $1
      returning ${COLUMNS}`,
    [
      id,
      input.title,
      input.description,
      input.status,
      input.startsAt,
      input.endsAt,
      input.resultVisibleAt,
      input.maxVoters,
    ],
  );
  return rows[0] ? mapElection(rows[0]) : null;
}

export async function updateElectionStatus(
  id: string,
  status: ElectionStatus,
): Promise<void> {
  await query(
    "update elections set status = $2, updated_at = now() where id = $1",
    [id, status],
  );
}

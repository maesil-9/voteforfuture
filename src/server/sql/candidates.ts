import { query } from "../db";
import type { Candidate, CandidatePolicy } from "../types";

type CandidateRow = {
  id: string;
  election_id: string;
  display_order: number;
  name: string;
  short_intro: string | null;
  profile: string | null;
  slogan: string | null;
  color_hint: string | null;
  poster_id: string | null;
};

function mapCandidate(row: CandidateRow): Candidate {
  return {
    id: row.id,
    electionId: row.election_id,
    displayOrder: row.display_order,
    name: row.name,
    shortIntro: row.short_intro,
    profile: row.profile,
    slogan: row.slogan,
    colorHint: row.color_hint,
    posterId: row.poster_id,
  };
}

const SELECT_CANDIDATE = `
  select c.id, c.election_id, c.display_order, c.name, c.short_intro,
         c.profile, c.slogan, c.color_hint,
         (select p.id from candidate_posters p
           where p.candidate_id = c.id
           order by p.created_at desc limit 1) as poster_id
    from candidates c`;

export async function listCandidates(electionId: string): Promise<Candidate[]> {
  const { rows } = await query<CandidateRow>(
    `${SELECT_CANDIDATE} where c.election_id = $1
      order by c.display_order, c.created_at`,
    [electionId],
  );
  return rows.map(mapCandidate);
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const { rows } = await query<CandidateRow>(
    `${SELECT_CANDIDATE} where c.id = $1`,
    [id],
  );
  return rows[0] ? mapCandidate(rows[0]) : null;
}

export type CandidateInput = {
  name: string;
  shortIntro: string | null;
  profile: string | null;
  slogan: string | null;
  colorHint: string | null;
  displayOrder: number;
};

export async function createCandidate(
  electionId: string,
  input: CandidateInput,
): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `insert into candidates
       (election_id, name, short_intro, profile, slogan, color_hint, display_order)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id`,
    [
      electionId,
      input.name,
      input.shortIntro,
      input.profile,
      input.slogan,
      input.colorHint,
      input.displayOrder,
    ],
  );
  return rows[0].id;
}

export async function updateCandidate(
  id: string,
  input: CandidateInput,
): Promise<void> {
  await query(
    `update candidates
        set name = $2, short_intro = $3, profile = $4, slogan = $5,
            color_hint = $6, display_order = $7, updated_at = now()
      where id = $1`,
    [
      id,
      input.name,
      input.shortIntro,
      input.profile,
      input.slogan,
      input.colorHint,
      input.displayOrder,
    ],
  );
}

export async function deleteCandidate(id: string): Promise<void> {
  await query("delete from candidates where id = $1", [id]);
}

// ---------- 포스터 ----------

export async function setPoster(
  candidateId: string,
  file: { fileName: string; mimeType: string; sizeBytes: number; data: Buffer },
): Promise<string> {
  // 후보당 포스터 1장 정책: 기존 것을 지우고 새로 넣는다
  await query("delete from candidate_posters where candidate_id = $1", [
    candidateId,
  ]);
  const { rows } = await query<{ id: string }>(
    `insert into candidate_posters (candidate_id, file_name, mime_type, size_bytes, data)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [candidateId, file.fileName, file.mimeType, file.sizeBytes, file.data],
  );
  return rows[0].id;
}

export async function getPoster(posterId: string): Promise<{
  mimeType: string;
  fileName: string;
  data: Buffer;
} | null> {
  const { rows } = await query<{
    mime_type: string;
    file_name: string;
    data: Buffer;
  }>(
    "select mime_type, file_name, data from candidate_posters where id = $1",
    [posterId],
  );
  if (!rows[0]) return null;
  return {
    mimeType: rows[0].mime_type,
    fileName: rows[0].file_name,
    data: rows[0].data,
  };
}

// ---------- 정책 / 공약 ----------

type PolicyRow = {
  id: string;
  candidate_id: string;
  title: string;
  body: string;
  display_order: number;
};

function mapPolicy(row: PolicyRow): CandidatePolicy {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    title: row.title,
    body: row.body,
    displayOrder: row.display_order,
  };
}

export async function listPolicies(
  candidateId: string,
): Promise<CandidatePolicy[]> {
  const { rows } = await query<PolicyRow>(
    `select id, candidate_id, title, body, display_order
       from candidate_policies
      where candidate_id = $1
      order by display_order, created_at`,
    [candidateId],
  );
  return rows.map(mapPolicy);
}

/** 선거의 모든 후보 정책을 한 번에 (투표 페이지용) */
export async function listPoliciesByElection(
  electionId: string,
): Promise<Map<string, CandidatePolicy[]>> {
  const { rows } = await query<PolicyRow>(
    `select p.id, p.candidate_id, p.title, p.body, p.display_order
       from candidate_policies p
       join candidates c on c.id = p.candidate_id
      where c.election_id = $1
      order by p.display_order, p.created_at`,
    [electionId],
  );
  const byCandidate = new Map<string, CandidatePolicy[]>();
  for (const row of rows) {
    const list = byCandidate.get(row.candidate_id) ?? [];
    list.push(mapPolicy(row));
    byCandidate.set(row.candidate_id, list);
  }
  return byCandidate;
}

export async function createPolicy(
  candidateId: string,
  input: { title: string; body: string; displayOrder: number },
): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `insert into candidate_policies (candidate_id, title, body, display_order)
     values ($1, $2, $3, $4) returning id`,
    [candidateId, input.title, input.body, input.displayOrder],
  );
  return rows[0].id;
}

export async function updatePolicy(
  id: string,
  input: { title: string; body: string; displayOrder: number },
): Promise<void> {
  await query(
    `update candidate_policies
        set title = $2, body = $3, display_order = $4
      where id = $1`,
    [id, input.title, input.body, input.displayOrder],
  );
}

export async function deletePolicy(id: string): Promise<void> {
  await query("delete from candidate_policies where id = $1", [id]);
}

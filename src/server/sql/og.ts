import { query } from "../db";

/** 선거별 Open Graph 이미지 SQL. 선거당 1장 정책 */

export async function setOgImage(
  electionId: string,
  file: { fileName: string; mimeType: string; sizeBytes: number; data: Buffer },
): Promise<void> {
  await query(
    `insert into og_images (election_id, file_name, mime_type, size_bytes, data)
     values ($1, $2, $3, $4, $5)
     on conflict (election_id) do update
       set file_name = excluded.file_name,
           mime_type = excluded.mime_type,
           size_bytes = excluded.size_bytes,
           data = excluded.data,
           created_at = now()`,
    [electionId, file.fileName, file.mimeType, file.sizeBytes, file.data],
  );
}

export async function getOgImage(electionId: string): Promise<{
  mimeType: string;
  data: Buffer;
  createdAt: Date;
} | null> {
  const { rows } = await query<{
    mime_type: string;
    data: Buffer;
    created_at: Date;
  }>(
    "select mime_type, data, created_at from og_images where election_id = $1",
    [electionId],
  );
  return rows[0]
    ? { mimeType: rows[0].mime_type, data: rows[0].data, createdAt: rows[0].created_at }
    : null;
}

export async function hasOgImage(electionId: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    "select exists (select 1 from og_images where election_id = $1) as exists",
    [electionId],
  );
  return rows[0].exists;
}

export async function deleteOgImage(electionId: string): Promise<void> {
  await query("delete from og_images where election_id = $1", [electionId]);
}

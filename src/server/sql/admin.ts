import { query } from "../db";

export type AdminRecord = {
  id: string;
  email: string;
  passwordHash: string;
};

export async function findAdminByEmail(
  email: string,
): Promise<AdminRecord | null> {
  const { rows } = await query<{
    id: string;
    email: string;
    password_hash: string;
  }>("select id, email, password_hash from admins where email = $1", [
    email.trim().toLowerCase(),
  ]);
  return rows[0]
    ? { id: rows[0].id, email: rows[0].email, passwordHash: rows[0].password_hash }
    : null;
}

export async function createAdmin(
  email: string,
  passwordHash: string,
): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `insert into admins (email, password_hash) values ($1, $2)
     on conflict (email) do update set password_hash = excluded.password_hash
     returning id`,
    [email.trim().toLowerCase(), passwordHash],
  );
  return rows[0].id;
}

/**
 * 감사 로그. 투표 선택값/코드 원문은 절대 기록하지 않는다.
 * metadata에는 count, 배치명 같은 aggregate 정보만 넣을 것.
 */
export async function insertAuditLog(entry: {
  adminId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `insert into audit_logs (admin_id, action, target_type, target_id, metadata)
     values ($1, $2, $3, $4, $5)`,
    [
      entry.adminId,
      entry.action,
      entry.targetType ?? null,
      entry.targetId ?? null,
      JSON.stringify(entry.metadata ?? {}),
    ],
  );
}

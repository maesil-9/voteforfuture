import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "./env";

/**
 * pg Pool 기반 raw SQL 접근 계층.
 * - ORM이 아니다. parameterized query helper와 transaction helper만 제공한다.
 * - production에서는 쿼리 파라미터(코드 해시 등 민감값)를 로그에 남기지 않는다.
 */

declare global {
  // Next.js dev 모드의 HMR로 Pool이 중복 생성되는 것을 막는다.
  var __calmvotePool: Pool | undefined;
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: env.databaseUrl,
    max: 10,
  });
  pool.on("error", (err) => {
    console.error("[db] idle client error", err.message);
  });
  return pool;
}

export function getPool(): Pool {
  if (!globalThis.__calmvotePool) {
    globalThis.__calmvotePool = createPool();
  }
  return globalThis.__calmvotePool;
}

const shouldLogQueries =
  process.env.NODE_ENV !== "production" && process.env.DB_QUERY_LOG === "true";

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  if (shouldLogQueries) {
    // 개발용 로그에도 파라미터 값은 남기지 않는다 (코드 해시 등 민감값 보호)
    console.log("[db]", text.replace(/\s+/g, " ").trim().slice(0, 200));
  }
  return getPool().query<T>(text, params as never[]);
}

export type Tx = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
};

/**
 * 트랜잭션 helper. 콜백이 throw하면 rollback, 정상 종료 시 commit.
 */
export async function withTransaction<T>(
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query("begin");
    const tx: Tx = {
      query: (text, params = []) => client.query(text, params as never[]),
    };
    const result = await fn(tx);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** PostgreSQL unique violation 에러 여부 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

/** 스크립트/테스트 종료 시 풀 정리를 위해 노출 */
export async function closePool(): Promise<void> {
  if (globalThis.__calmvotePool) {
    await globalThis.__calmvotePool.end();
    globalThis.__calmvotePool = undefined;
  }
}

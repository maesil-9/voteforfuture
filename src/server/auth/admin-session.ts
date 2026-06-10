import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "../env";
import { signPayload, verifyPayload } from "./signing";

/**
 * 관리자 세션: httpOnly + SameSite=Lax 서명 쿠키 (stateless).
 */

const COOKIE_NAME = "cv_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8시간

type AdminSessionPayload = {
  adminId: string;
  email: string;
  exp: number; // epoch seconds
};

export async function createAdminSession(adminId: string, email: string) {
  const payload: AdminSessionPayload = {
    adminId,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const store = await cookies();
  store.set(COOKIE_NAME, signPayload(payload, env.adminSessionSecret), {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyPayload<AdminSessionPayload>(
    token,
    env.adminSessionSecret,
  );
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** admin 페이지/액션 가드. 미인증이면 로그인 페이지로 redirect. */
export async function requireAdmin(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

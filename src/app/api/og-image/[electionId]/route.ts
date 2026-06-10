import { getOgImage } from "@/server/sql/og";

/** 선거별 OG 이미지 서빙 (공개 — 크롤러가 접근해야 한다) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const { electionId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(electionId)) {
    return new Response("Not found", { status: 404 });
  }

  const image = await getOgImage(electionId).catch(() => null);
  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=600",
    },
  });
}

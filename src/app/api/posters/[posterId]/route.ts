import { getPoster } from "@/server/sql/candidates";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ posterId: string }> },
) {
  const { posterId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(posterId)) {
    return new Response("Not found", { status: 404 });
  }

  const poster = await getPoster(posterId).catch(() => null);
  if (!poster) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(poster.data), {
    headers: {
      "Content-Type": poster.mimeType,
      "Cache-Control": "public, max-age=300",
      "Content-Disposition": "inline",
    },
  });
}

/**
 * 업로드 파일 공통 검증 (포스터 / OG 이미지).
 * 라우트 핸들러에서 사용 — 3MB 제한과 이미지 타입만 허용.
 */

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export type UploadCheck =
  | { ok: true; file: File }
  | { ok: false; status: number; message: string };

export function checkImageUpload(value: FormDataEntryValue | null): UploadCheck {
  if (!(value instanceof File) || value.size === 0) {
    return { ok: false, status: 400, message: "업로드할 파일을 선택해주세요." };
  }
  if (value.size > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, message: "이미지는 3MB 이하만 업로드할 수 있습니다." };
  }
  if (!ALLOWED_IMAGE_MIME.includes(value.type)) {
    return {
      ok: false,
      status: 415,
      message: "JPEG/PNG/WebP/GIF 이미지만 업로드할 수 있습니다.",
    };
  }
  return { ok: true, file: value };
}

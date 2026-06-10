/**
 * 공유 카드 캔버스 렌더링 (참여 인증 / 결과 공고 공용).
 * 1080x1080 — 카카오톡 공유에 적합한 정사각형.
 */

export type ShareCardSpec = {
  kicker: string; // 상단 작은 레터스페이싱 텍스트
  titleLines: string[]; // 큰 세리프 제목 (줄 단위)
  subtitle?: string;
  stampText: string; // 원형 도장 안 텍스트
  footerLines: string[];
};

const W = 1080;
const H = 1080;

export async function renderShareCard(spec: ShareCardSpec): Promise<Blob> {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const serif = (size: number, weight = 900) =>
    `${weight} ${size}px 'Noto Serif KR', 'Batang', serif`;
  const sans = (size: number, weight = 500) =>
    `${weight} ${size}px 'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif`;

  // 종이 배경
  ctx.fillStyle = "#FBF8F1";
  ctx.fillRect(0, 0, W, H);

  // 이중 테두리 (editorial)
  ctx.strokeStyle = "#2A2718";
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, W - 104, H - 104);

  // 상단 kicker (letterSpacing은 일부 브라우저 타입 미지원이라 수동 자간)
  ctx.fillStyle = "#6E6857";
  ctx.font = sans(26, 700);
  ctx.textAlign = "center";
  ctx.fillText(spec.kicker.split("").join(" "), W / 2, 150);

  // 구분선 포인트
  ctx.fillStyle = "#D9A441";
  ctx.fillRect(W / 2 - 48, 180, 96, 5);

  // 제목 (세리프)
  ctx.fillStyle = "#2A2718";
  const titleSize = spec.titleLines.length > 2 ? 88 : 104;
  ctx.font = serif(titleSize);
  const titleStartY = 360;
  spec.titleLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, titleStartY + i * (titleSize + 26));
  });

  // 서브타이틀
  if (spec.subtitle) {
    ctx.fillStyle = "#46412F";
    ctx.font = sans(36, 600);
    ctx.fillText(
      spec.subtitle,
      W / 2,
      titleStartY + spec.titleLines.length * (titleSize + 26) + 30,
    );
  }

  // 도장 (회전된 원형)
  ctx.save();
  ctx.translate(W / 2, 760);
  ctx.rotate((-9 * Math.PI) / 180);
  ctx.strokeStyle = "#9C4A36";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, 96, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#9C4A36";
  ctx.font = serif(44);
  ctx.fillText(spec.stampText, 0, 16);
  ctx.restore();

  // 하단 footer
  ctx.fillStyle = "#6E6857";
  ctx.font = sans(28);
  spec.footerLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, 930 + i * 44);
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    ),
  );
}

export async function saveOrShareCard(
  spec: ShareCardSpec,
  fileName: string,
  mode: "save" | "share",
): Promise<"saved" | "shared" | "share_unsupported"> {
  const blob = await renderShareCard(spec);

  if (mode === "share") {
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return "shared";
      } catch {
        // 사용자가 공유 시트를 닫은 경우 등 — 저장으로 폴백하지 않고 조용히 종료
        return "shared";
      }
    }
    return "share_unsupported";
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "saved";
}

"use client";

import { useState } from "react";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { saveOrShareCard, type ShareCardSpec } from "@/lib/share-card";

/**
 * 결과 공유 카드 — "우리 방장 OOO 당선 🎉"
 * 결과 발표 후에만 렌더링되며, 집계 공개 정보(당선자/총 투표수)만 담는다.
 */
export function ShareResultCard({
  electionTitle,
  winnerNames,
  isTie,
  totalBallots,
}: {
  electionTitle: string;
  winnerNames: string[];
  isTie: boolean;
  totalBallots: number;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const dateText = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const headline = isTie
    ? [`${winnerNames.join(" · ")}`, "동률! 🤝"]
    : [`우리 방장`, `${winnerNames[0]} 당선 🎉`];

  const spec: ShareCardSpec = {
    kicker: "개표 결과 공고",
    titleLines: headline,
    subtitle: electionTitle,
    stampText: isTie ? "동률" : "당선",
    footerLines: [
      `총 ${totalBallots}표 · ${dateText}`,
      "가장 신뢰할 수 있는 전자투표 — 침착투표소",
    ],
  };

  async function handle(mode: "save" | "share") {
    setBusy(true);
    setNote(null);
    try {
      const result = await saveOrShareCard(spec, "개표결과.png", mode);
      if (result === "saved") setNote("이미지가 저장되었습니다. 방에 공유해주세요!");
      if (result === "share_unsupported") {
        setNote("이 브라우저는 바로 공유를 지원하지 않아요. 저장 후 공유해주세요.");
      }
    } catch {
      setNote("카드 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      bg="bg.sunken"
      border="1px dashed"
      borderColor="ink.300"
      borderRadius="sm"
      p={{ base: 4, md: 5 }}
    >
      <Stack gap={3} align="center" textAlign="center">
        <Text fontSize="sm" fontWeight={700} color="ink.700">
          결과를 방에 알려주세요
        </Text>
        {note && (
          <Text fontSize="xs" fontWeight={700} color="booth.600" role="status">
            {note}
          </Text>
        )}
        <Flex gap={3} wrap="wrap" justify="center">
          <Button
            onClick={() => handle("share")}
            loading={busy}
            size="sm"
            bg="booth.600"
            color="paper.50"
            _hover={{ bg: "booth.700" }}
            fontWeight={700}
          >
            결과 카드 공유
          </Button>
          <Button
            onClick={() => handle("save")}
            loading={busy}
            size="sm"
            variant="outline"
            borderColor="ink.700"
            color="ink.900"
            fontWeight={700}
          >
            이미지로 저장
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
}

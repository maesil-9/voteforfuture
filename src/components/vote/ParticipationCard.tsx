"use client";

import { useState } from "react";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { saveOrShareCard, type ShareCardSpec } from "@/lib/share-card";

/**
 * 참여 인증 카드 — "나 투표했음 🗳️ N번째 유권자"
 * 이미지를 저장하거나 카카오톡 등으로 바로 공유해 투표를 독려한다.
 * 카드에는 누구를 찍었는지에 대한 정보가 전혀 없다.
 */
export function ParticipationCard({
  electionTitle,
  voterOrder,
}: {
  electionTitle: string;
  voterOrder: number;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const dateText = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const spec: ShareCardSpec = {
    kicker: "참여 인증",
    titleLines: ["나 투표했음 🗳️", `${voterOrder}번째 유권자`],
    subtitle: electionTitle,
    stampText: "투표",
    footerLines: [dateText, "당신의 한 표도 기다리고 있어요 — 침착투표소"],
  };

  async function handle(mode: "save" | "share") {
    setBusy(true);
    setNote(null);
    try {
      const result = await saveOrShareCard(
        spec,
        `투표인증-${voterOrder}번째.png`,
        mode,
      );
      if (result === "saved") setNote("이미지가 저장되었습니다. 방에 자랑해보세요!");
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
      w="100%"
      maxW="md"
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      boxShadow="paper"
      borderRadius="2px"
      p={{ base: 5, md: 6 }}
    >
      <Stack gap={4} align="center" textAlign="center">
        {/* 카드 미리보기 (DOM 버전 — 실제 이미지는 캔버스로 생성) */}
        <Box
          w="100%"
          maxW="280px"
          aspectRatio="1"
          bg="paper.50"
          border="3px double"
          borderColor="ink.900"
          borderRadius="2px"
          position="relative"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Stack gap={1} align="center">
            <Text fontSize="2xs" letterSpacing="0.3em" color="fg.muted">
              참여 인증
            </Text>
            <Text fontFamily="heading" fontWeight={900} fontSize="xl">
              나 투표했음 🗳️
            </Text>
            <Text fontFamily="heading" fontWeight={900} fontSize="2xl" color="accent">
              {voterOrder}번째 유권자
            </Text>
            <Text fontSize="2xs" color="fg.subtle" px={4} truncate maxW="240px">
              {electionTitle}
            </Text>
          </Stack>
          <Flex
            aria-hidden
            position="absolute"
            bottom="10px"
            right="10px"
            boxSize="44px"
            borderRadius="full"
            border="3px solid"
            borderColor="sealwax.500"
            color="sealwax.500"
            align="center"
            justify="center"
            transform="rotate(-9deg)"
            fontFamily="heading"
            fontWeight={900}
            fontSize="xs"
          >
            투표
          </Flex>
        </Box>

        <Text fontSize="sm" color="fg.muted">
          인증 카드를 오픈채팅방에 올려 다음 유권자를 데려와주세요.
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
            size="md"
            bg="booth.600"
            color="paper.50"
            _hover={{ bg: "booth.700" }}
            fontWeight={700}
          >
            바로 공유하기
          </Button>
          <Button
            onClick={() => handle("save")}
            loading={busy}
            size="md"
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

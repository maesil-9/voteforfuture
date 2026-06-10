"use client";

import { useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import { ParticipationStats } from "./ParticipationStats";
import type { Participation } from "@/server/types";

/**
 * 실시간 투표 현황 — 10초마다 공개 aggregate 엔드포인트를 폴링한다.
 * 검수(승인/무효)가 처리되는 즉시 사용자 화면에도 반영된다.
 */
export function ParticipationLive({
  electionId,
  initial,
  caption,
}: {
  electionId: string;
  initial: Participation;
  caption?: string;
}) {
  const [participation, setParticipation] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/elections/${electionId}/participation`);
        if (res.ok) {
          setParticipation(await res.json());
          setUpdatedAt(new Date());
        }
      } catch {
        // 폴링 실패는 조용히 무시 (다음 주기에 재시도)
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [electionId]);

  return (
    <Box>
      <ParticipationStats participation={participation} caption={caption} />
      <Text mt={2} fontSize="xs" color="fg.subtle" textAlign="right">
        {updatedAt
          ? `마지막 갱신 ${updatedAt.toLocaleTimeString("ko-KR")}`
          : "10초마다 자동 갱신"}
      </Text>
    </Box>
  );
}

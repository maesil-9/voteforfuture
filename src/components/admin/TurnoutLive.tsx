"use client";

import { useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import { TurnoutGauge } from "@/components/election/TurnoutGauge";
import type { Turnout } from "@/server/types";

/**
 * 실시간 투표율 게이지 — 15초마다 aggregate count만 폴링한다.
 */
export function TurnoutLive({
  electionId,
  initial,
}: {
  electionId: string;
  initial: Turnout;
}) {
  const [turnout, setTurnout] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/elections/${electionId}/turnout`);
        if (res.ok) {
          setTurnout(await res.json());
          setUpdatedAt(new Date());
        }
      } catch {
        // 폴링 실패는 조용히 무시 (다음 주기에 재시도)
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [electionId]);

  return (
    <Box>
      <TurnoutGauge turnout={turnout} caption="실시간 투표율" />
      <Text mt={2} fontSize="xs" color="fg.subtle" textAlign="right">
        {updatedAt
          ? `마지막 갱신 ${updatedAt.toLocaleTimeString("ko-KR")}`
          : "15초마다 자동 갱신"}
      </Text>
    </Box>
  );
}

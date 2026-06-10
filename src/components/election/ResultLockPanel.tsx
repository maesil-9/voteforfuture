import { Box, Stack, Text } from "@chakra-ui/react";
import { SealedStatus } from "./SealedStatus";
import { TurnoutGauge } from "./TurnoutGauge";
import { formatDateTime } from "@/lib/format";
import type { Election, Turnout } from "@/server/types";

/**
 * 결과 발표 전 잠금 패널.
 * 후보별 득표는 어떤 형태로도 렌더링하지 않는다 — 데이터 자체가 서버에서
 * 집계되지 않으므로 이 컴포넌트는 받을 수도 없다.
 */
export function ResultLockPanel({
  election,
  turnout,
}: {
  election: Election;
  turnout: Turnout;
}) {
  return (
    <Stack gap={8} maxW="lg" mx="auto" w="100%">
      <Box
        bg="bg.surface"
        border="1px solid"
        borderColor="border.default"
        boxShadow="paper"
        borderRadius="2px"
        p={{ base: 6, md: 8 }}
      >
        <SealedStatus
          size="lg"
          label="아직 봉인된 투표함입니다"
          sublabel={`개표는 ${formatDateTime(election.resultVisibleAt)}에 시작됩니다.`}
        />
        <Text mt={5} fontSize="sm" color="fg.muted">
          결과 발표 전에는 관리자를 포함해 누구도 후보별 득표 현황을 볼 수
          없습니다. 투표지는 암호화 봉인된 상태로 보관 중입니다.
        </Text>
      </Box>
      <Box
        bg="bg.surface"
        border="1px solid"
        borderColor="border.default"
        boxShadow="paper"
        borderRadius="2px"
        p={{ base: 6, md: 8 }}
      >
        <TurnoutGauge turnout={turnout} caption="투표율 (공개 가능 정보)" />
      </Box>
    </Stack>
  );
}

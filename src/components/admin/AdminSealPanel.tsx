import { Box, Stack, Text } from "@chakra-ui/react";
import { SealedStatus } from "@/components/election/SealedStatus";
import { formatDateTime } from "@/lib/format";
import type { Election } from "@/server/types";

/**
 * 백오피스 결과 잠금 패널.
 * 결과 발표 전에는 관리자에게도 후보별 득표를 보여주지 않는다 —
 * 서버가 집계 자체를 거부하므로 이 패널은 어떤 득표 데이터도 받지 않는다.
 */
export function AdminSealPanel({ election }: { election: Election }) {
  return (
    <Box
      bg="bg.surface"
      border="2px dashed"
      borderColor="sealwax.500"
      borderRadius="2px"
      p={{ base: 6, md: 10 }}
    >
      <Stack gap={5} align="center" textAlign="center">
        <SealedStatus
          size="lg"
          label="결과 봉인 중"
          sublabel={`개표 가능 시각: ${formatDateTime(election.resultVisibleAt)}`}
        />
        <Text fontSize="sm" color="fg.muted" maxW="md">
          후보별 득표 현황은 결과 발표 시각 이전에는 시스템적으로 집계되지
          않습니다. 관리자 권한으로도 열람할 수 없으며, 투표지는 암호화 봉인
          상태로 보관됩니다. 발표 시각이 지나면 이 화면에서 자동으로 개표
          결과가 표시됩니다.
        </Text>
      </Stack>
    </Box>
  );
}

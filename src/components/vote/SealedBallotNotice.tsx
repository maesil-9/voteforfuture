import { Box, Flex, Stack, Text } from "@chakra-ui/react";

/**
 * 비밀투표 안내문 — 접힌 안내문 종이 느낌의 패널.
 */
export function SealedBallotNotice() {
  return (
    <Box
      bg="bg.sunken"
      border="1px dashed"
      borderColor="ink.300"
      borderRadius="sm"
      p={{ base: 4, md: 5 }}
    >
      <Text fontSize="xs" fontWeight={800} letterSpacing="0.14em" color="fg.muted" mb={2}>
        비밀투표 안내
      </Text>
      <Stack gap={1.5}>
        {[
          "선택값은 투표권 정보와 분리되어 암호화 봉인된 채 저장됩니다.",
          "관리자도 누가 어떤 후보를 선택했는지 확인할 수 없습니다.",
          "제출 후에는 선택을 변경하거나 취소할 수 없습니다.",
        ].map((line) => (
          <Flex key={line} gap={2} align="flex-start">
            <Text aria-hidden color="stamp.500" fontWeight={900} lineHeight={1.6}>
              ·
            </Text>
            <Text fontSize="sm" color="ink.700">
              {line}
            </Text>
          </Flex>
        ))}
      </Stack>
    </Box>
  );
}

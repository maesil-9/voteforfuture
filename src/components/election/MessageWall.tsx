import { Box, Flex, Text } from "@chakra-ui/react";

/**
 * 투표자들이 남긴 익명 한 마디 모음.
 * 결과 공개 후에만 렌더링된다 — 이름·선택과 연결할 수 없는 상태로 도착한다.
 */
export function MessageWall({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;

  return (
    <Box>
      <Text
        fontSize="xs"
        fontWeight={800}
        color="fg.muted"
        letterSpacing="0.14em"
        textTransform="uppercase"
        mb={4}
      >
        투표함에서 나온 한 마디 ({messages.length})
      </Text>
      <Flex gap={3} wrap="wrap">
        {messages.map((m, i) => (
          <Box
            key={i}
            bg="bg.surface"
            border="1px solid"
            borderColor="paper.300"
            boxShadow="paper"
            borderRadius="lg"
            borderTopLeftRadius="2px"
            px={4}
            py={2.5}
            maxW="320px"
            transform={`rotate(${(i % 3) - 1}deg)`}
          >
            <Text fontSize="sm" color="ink.700">
              “{m}”
            </Text>
          </Box>
        ))}
      </Flex>
      <Text mt={3} fontSize="xs" color="fg.subtle">
        메시지는 익명입니다 — 누가 남겼는지, 어떤 후보를 골랐는지와 연결되지
        않습니다.
      </Text>
    </Box>
  );
}

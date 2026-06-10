import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { formatDateTime } from "@/lib/format";
import type { Election } from "@/server/types";
import type { ElectionPhase } from "@/server/guards/election-state";

/**
 * 선거 일정 타임라인: 투표 시작 → 투표 종료 → 결과 발표.
 * 모바일은 세로, 데스크톱은 가로 진행선.
 */
export function ElectionTimeline({
  election,
  phase,
}: {
  election: Election;
  phase: ElectionPhase;
}) {
  const milestones = [
    {
      label: "투표 시작",
      at: election.startsAt,
      reached: phase === "open" || phase === "closed" || phase === "archived",
    },
    {
      label: "투표 종료",
      at: election.endsAt,
      reached: phase === "closed" || phase === "archived",
    },
    {
      label: "결과 발표",
      at: election.resultVisibleAt,
      reached: new Date() >= election.resultVisibleAt,
    },
  ];

  return (
    <Stack
      as="ol"
      aria-label="선거 일정"
      direction={{ base: "column", md: "row" }}
      gap={{ base: 4, md: 0 }}
      listStyleType="none"
    >
      {milestones.map((m, i) => (
        <Flex
          as="li"
          key={m.label}
          flex="1"
          direction={{ base: "row", md: "column" }}
          align={{ base: "flex-start", md: "center" }}
          gap={{ base: 3, md: 2 }}
          position="relative"
        >
          {/* 진행선 */}
          {i < milestones.length - 1 && (
            <Box
              aria-hidden
              position="absolute"
              bg={milestones[i + 1].reached ? "booth.600" : "paper.300"}
              left={{ base: "7px", md: "50%" }}
              top={{ base: "20px", md: "7px" }}
              w={{ base: "2px", md: "100%" }}
              h={{ base: "calc(100% + 4px)", md: "2px" }}
            />
          )}
          <Box
            aria-hidden
            position="relative"
            zIndex={1}
            boxSize="16px"
            borderRadius="full"
            bg={m.reached ? "booth.600" : "bg.surface"}
            border="2px solid"
            borderColor={m.reached ? "booth.600" : "ink.300"}
            mt={{ base: "2px", md: 0 }}
          />
          <Box textAlign={{ base: "left", md: "center" }}>
            <Text
              fontSize="xs"
              fontWeight={700}
              color={m.reached ? "accent" : "fg.muted"}
              textTransform="uppercase"
              letterSpacing="0.08em"
            >
              {m.label}
            </Text>
            <Text fontSize="sm" color="fg.default">
              {formatDateTime(m.at)}
            </Text>
          </Box>
        </Flex>
      ))}
    </Stack>
  );
}

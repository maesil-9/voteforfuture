import NextLink from "next/link";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { ElectionShell } from "@/components/layout/ElectionShell";
import { ElectionTimeline } from "@/components/election/ElectionTimeline";
import { TurnoutGauge } from "@/components/election/TurnoutGauge";
import { SealedStatus } from "@/components/election/SealedStatus";
import { getLatestPublicElection } from "@/server/sql/elections";
import { getTurnout } from "@/server/sql/voters";
import { getElectionPhase } from "@/server/guards/election-state";
import { isResultVisible } from "@/server/guards/result-visibility";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const election = await getLatestPublicElection();

  if (!election) {
    return (
      <ElectionShell>
        <Stack align="center" py={20} gap={3}>
          <Text fontFamily="heading" fontSize="2xl" fontWeight={700}>
            지금은 진행 중인 선거가 없습니다
          </Text>
          <Text color="fg.muted">선거가 공고되면 이 자리에 안내됩니다.</Text>
        </Stack>
      </ElectionShell>
    );
  }

  const phase = getElectionPhase(election);
  const turnout = await getTurnout(election.id);
  const resultOpen = isResultVisible(election);

  return (
    <ElectionShell>
      <Stack gap={{ base: 10, md: 14 }}>
        {/* 공고문 헤더 */}
        <Box textAlign="center">
          <Text
            fontSize="xs"
            letterSpacing="0.3em"
            color="fg.muted"
            textTransform="uppercase"
            mb={4}
          >
            제1회 공식 선거 공고
          </Text>
          <Text
            as="h1"
            fontFamily="heading"
            fontWeight={900}
            fontSize={{ base: "3xl", md: "5xl" }}
            lineHeight={1.25}
            letterSpacing="-0.02em"
          >
            {election.title}
          </Text>
          {election.description && (
            <Text mt={5} color="fg.muted" fontSize={{ base: "md", md: "lg" }} maxW="2xl" mx="auto">
              {election.description}
            </Text>
          )}
          <Flex justify="center" mt={6} aria-hidden>
            <Box w="64px" h="3px" bg="stamp.500" />
          </Flex>
        </Box>

        {/* 일정 */}
        <Box
          bg="bg.surface"
          border="1px solid"
          borderColor="border.default"
          boxShadow="paper"
          borderRadius="2px"
          p={{ base: 5, md: 8 }}
        >
          <ElectionTimeline election={election} phase={phase} />
        </Box>

        {/* 상태별 본문 */}
        {phase === "upcoming" && (
          <Stack align="center" gap={3} py={4}>
            <Text fontFamily="heading" fontSize="xl" fontWeight={700}>
              아직 투표가 시작되지 않았습니다
            </Text>
            <Text color="fg.muted">
              {formatDateTime(election.startsAt)}에 투표소가 열립니다.
            </Text>
          </Stack>
        )}

        {phase === "open" && (
          <Stack align="center" gap={6}>
            <Box w="100%" maxW="md">
              <TurnoutGauge turnout={turnout} />
            </Box>
            <Button
              asChild
              size="2xl"
              bg="booth.600"
              color="paper.50"
              _hover={{ bg: "booth.700" }}
              fontWeight={700}
              px={10}
            >
              <NextLink href="/vote/enter-code">내 투표 코드로 입장하기</NextLink>
            </Button>
            <Text fontSize="sm" color="fg.subtle">
              투표는 1인 1회, 익명으로 진행됩니다.
            </Text>
          </Stack>
        )}

        {(phase === "closed" || phase === "archived") && (
          <Stack align="center" gap={6}>
            <Box w="100%" maxW="md">
              <TurnoutGauge turnout={turnout} caption="최종 투표율" />
            </Box>
            {resultOpen ? (
              <Button
                asChild
                size="xl"
                bg="ink.900"
                color="paper.50"
                _hover={{ bg: "ink.700" }}
                fontWeight={700}
              >
                <NextLink href={`/results/${election.id}`}>개표 결과 보기</NextLink>
              </Button>
            ) : (
              <Box
                bg="bg.surface"
                border="1px solid"
                borderColor="border.default"
                boxShadow="paper"
                borderRadius="2px"
                p={6}
              >
                <SealedStatus
                  sublabel={`결과는 ${formatDateTime(election.resultVisibleAt)}에 공개됩니다.`}
                />
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    </ElectionShell>
  );
}

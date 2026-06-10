import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import type { ElectionResults } from "@/server/types";

/**
 * 개표 결과 발표 — 당선자 공고 + 후보별 득표 막대.
 */
export function WinnerAnnouncement({ results }: { results: ElectionResults }) {
  const winners = results.perCandidate.filter((c) =>
    results.winnerIds.includes(c.candidateId),
  );

  return (
    <Stack gap={10}>
      {/* 당선 공고 */}
      <Box
        bg="bg.surface"
        border="2px solid"
        borderColor="ink.900"
        boxShadow="paperLift"
        borderRadius="2px"
        p={{ base: 6, md: 10 }}
        textAlign="center"
        position="relative"
      >
        <Text fontSize="xs" letterSpacing="0.3em" color="fg.muted" textTransform="uppercase" mb={3}>
          {results.isTie ? "개표 결과 공고 — 동률" : "당선 공고"}
        </Text>
        {results.totalBallots === 0 ? (
          <Text fontFamily="heading" fontWeight={900} fontSize="2xl">
            투표된 표가 없습니다
          </Text>
        ) : (
          <>
            <Stack gap={1}>
              {winners.map((w) => (
                <Text
                  key={w.candidateId}
                  fontFamily="heading"
                  fontWeight={900}
                  fontSize={{ base: "3xl", md: "5xl" }}
                  lineHeight={1.2}
                >
                  {w.name}
                </Text>
              ))}
            </Stack>
            {results.isTie ? (
              <Text mt={4} color="fg.muted" fontSize="sm">
                최다 득표가 동률입니다. 동률 시 처리는 방 운영 규칙에 따라
                결선투표 또는 협의로 결정합니다.
              </Text>
            ) : (
              winners[0]?.slogan && (
                <Text mt={4} fontFamily="heading" color="ink.700" fontSize="lg">
                  “{winners[0].slogan}”
                </Text>
              )
            )}
            <Flex justify="center" mt={5} aria-hidden>
              <Flex
                boxSize="72px"
                borderRadius="full"
                border="4px solid"
                borderColor="stamp.500"
                color="stamp.700"
                align="center"
                justify="center"
                transform="rotate(-8deg)"
                fontFamily="heading"
                fontWeight={900}
                fontSize="sm"
              >
                {results.isTie ? "동률" : "당선"}
              </Flex>
            </Flex>
          </>
        )}
      </Box>

      {/* 후보별 득표 */}
      <Box>
        <Text
          fontSize="xs"
          fontWeight={800}
          color="fg.muted"
          letterSpacing="0.14em"
          textTransform="uppercase"
          mb={4}
        >
          후보별 득표
        </Text>
        <Stack gap={4}>
          {results.perCandidate.map((c) => {
            const isWinner = results.winnerIds.includes(c.candidateId);
            return (
              <Box key={c.candidateId}>
                <Flex justify="space-between" align="baseline" mb={1.5}>
                  <Text fontWeight={isWinner ? 800 : 600}>
                    {c.name}
                    {isWinner && (
                      <Text as="span" ml={2} fontSize="xs" color="stamp.700" fontWeight={800}>
                        {results.isTie ? "동률" : "당선"}
                      </Text>
                    )}
                  </Text>
                  <Text fontFamily="heading" fontWeight={700}>
                    {c.votes}표{" "}
                    <Text as="span" fontSize="sm" color="fg.muted" fontWeight={500}>
                      ({c.percent}%)
                    </Text>
                  </Text>
                </Flex>
                <Box h="12px" bg="paper.200" borderRadius="2px" border="1px solid" borderColor="paper.300" overflow="hidden">
                  <Box
                    h="100%"
                    w={`${c.percent}%`}
                    style={{ backgroundColor: c.colorHint?.trim() || undefined }}
                    bg={c.colorHint?.trim() ? undefined : isWinner ? "booth.600" : "ink.300"}
                  />
                </Box>
              </Box>
            );
          })}
        </Stack>
        {results.unmatchedBallots > 0 && (
          <Text mt={4} fontSize="xs" color="fg.subtle">
            후보 매칭이 불가능한 표 {results.unmatchedBallots}건은 무효표로
            처리되었습니다.
          </Text>
        )}
      </Box>

      {/* 집계 요약 */}
      <Flex
        bg="bg.sunken"
        border="1px dashed"
        borderColor="ink.300"
        borderRadius="sm"
        px={5}
        py={4}
        gap={{ base: 4, md: 10 }}
        wrap="wrap"
        justify="center"
      >
        <SummaryItem label="총 투표수" value={`${results.totalBallots}표`} />
        <SummaryItem label="총 유권자" value={`${results.totalVoters}명`} />
        <SummaryItem label="투표율" value={`${results.turnoutPercent}%`} />
      </Flex>
    </Stack>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <Box textAlign="center">
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontFamily="heading" fontWeight={800} fontSize="xl">
        {value}
      </Text>
    </Box>
  );
}

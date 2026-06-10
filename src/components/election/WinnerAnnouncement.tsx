import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { ResultCountUpBoard } from "./ResultCountUpBoard";
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

      {/* 후보별 득표 — 개표 카운트업 */}
      <Box>
        <ResultCountUpBoard
          isTie={results.isTie}
          items={results.perCandidate.map((c) => ({
            candidateId: c.candidateId,
            name: c.name,
            votes: c.votes,
            percent: c.percent,
            colorHint: c.colorHint,
            isWinner: results.winnerIds.includes(c.candidateId),
          }))}
        />
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
        <SummaryItem label="개표된 표" value={`${results.totalBallots}표`} />
        <SummaryItem label="투표 접수" value={`${results.totalSubmitted}명`} />
        <SummaryItem label="무효 처리" value={`${results.rejectedCount}건`} />
      </Flex>

      {results.pendingCount > 0 && (
        <Text fontSize="sm" color="sealwax.700" fontWeight={600} textAlign="center">
          검수가 끝나지 않은 표 {results.pendingCount}건은 이 집계에 포함되지
          않았습니다. 검수 완료 후 결과가 갱신될 수 있습니다.
        </Text>
      )}

      {/* 낙선자 예우 — 아름다운 경쟁 */}
      {results.totalBallots > 0 &&
        results.perCandidate.some((c) => !results.winnerIds.includes(c.candidateId)) && (
          <Box
            bg="bg.surface"
            border="1px solid"
            borderColor="border.default"
            boxShadow="paper"
            borderRadius="2px"
            p={{ base: 5, md: 6 }}
          >
            <Text
              fontSize="xs"
              fontWeight={800}
              color="fg.muted"
              letterSpacing="0.14em"
              textTransform="uppercase"
              mb={4}
              textAlign="center"
            >
              아름다운 경쟁
            </Text>
            <Stack gap={3}>
              {results.perCandidate
                .filter((c) => !results.winnerIds.includes(c.candidateId))
                .map((c) => (
                  <Flex key={c.candidateId} align="center" gap={3} justify="center" wrap="wrap">
                    {/* 리본 배지 */}
                    <Box
                      aria-hidden
                      px={2.5}
                      py={0.5}
                      bg="booth.100"
                      color="booth.700"
                      fontSize="2xs"
                      fontWeight={800}
                      borderRadius="sm"
                      position="relative"
                      _after={{
                        content: '""',
                        position: "absolute",
                        right: "-6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        borderTop: "9px solid transparent",
                        borderBottom: "9px solid transparent",
                        borderLeft: "6px solid var(--chakra-colors-booth-100)",
                      }}
                    >
                      수고하셨습니다
                    </Box>
                    <Text fontFamily="heading" fontWeight={700}>
                      {c.name}
                    </Text>
                    {c.slogan && (
                      <Text fontSize="sm" color="fg.muted">
                        “{c.slogan}”
                      </Text>
                    )}
                  </Flex>
                ))}
            </Stack>
            <Text mt={4} fontSize="xs" color="fg.subtle" textAlign="center">
              용기 있는 출마와 멋진 공약, 우리 방의 역사에 남습니다.
            </Text>
          </Box>
        )}
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

import NextLink from "next/link";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminMetricStrip } from "@/components/admin/AdminMetricStrip";
import { PhaseBadge } from "@/components/admin/PhaseBadge";
import { SealedStatus } from "@/components/election/SealedStatus";
import { requireAdmin } from "@/server/auth/admin-session";
import { listElections } from "@/server/sql/elections";
import { getTurnout } from "@/server/sql/voters";
import { getElectionPhase } from "@/server/guards/election-state";
import { isResultVisible } from "@/server/guards/result-visibility";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "대시보드" };

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const elections = await listElections();
  const current = elections.find((e) => getElectionPhase(e) === "open") ?? elections[0];
  const turnout = current ? await getTurnout(current.id) : null;

  return (
    <AdminShell adminEmail={session.email}>
      <Stack gap={8}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Text as="h1" fontFamily="heading" fontWeight={900} fontSize="2xl">
            대시보드
          </Text>
          <Button asChild size="sm" bg="booth.600" color="paper.50" _hover={{ bg: "booth.700" }} fontWeight={700}>
            <NextLink href="/admin/elections/new">새 선거 만들기</NextLink>
          </Button>
        </Flex>

        {current && turnout ? (
          <Stack gap={4}>
            <Flex align="center" gap={3} wrap="wrap">
              <Text fontFamily="heading" fontWeight={700} fontSize="lg">
                {current.title}
              </Text>
              <PhaseBadge phase={getElectionPhase(current)} />
              {!isResultVisible(current) && (
                <Text fontSize="xs" color="sealwax.700" fontWeight={700}>
                  결과 봉인 중 — {formatDateTime(current.resultVisibleAt)} 공개
                </Text>
              )}
            </Flex>
            <AdminMetricStrip
              metrics={[
                { label: "총 유권자", value: `${turnout.totalVoters}명` },
                { label: "투표 완료", value: `${turnout.votesCast}명` },
                { label: "남은 투표", value: `${turnout.remaining}명` },
                { label: "투표율", value: `${turnout.percent}%` },
              ]}
            />
            <Flex gap={2}>
              <Button asChild size="xs" variant="outline" borderColor="ink.700" color="ink.900">
                <NextLink href={`/admin/elections/${current.id}`}>선거 관리로 이동</NextLink>
              </Button>
              <Button asChild size="xs" variant="outline" borderColor="ink.700" color="ink.900">
                <NextLink href={`/admin/elections/${current.id}/turnout`}>실시간 투표율</NextLink>
              </Button>
            </Flex>
          </Stack>
        ) : (
          <Box
            bg="bg.surface"
            border="1px dashed"
            borderColor="ink.300"
            borderRadius="2px"
            p={10}
            textAlign="center"
          >
            <Text color="fg.muted">아직 선거가 없습니다. 새 선거를 만들어주세요.</Text>
          </Box>
        )}

        {/* 선거 목록 */}
        {elections.length > 0 && (
          <Box>
            <Text fontSize="xs" fontWeight={800} color="fg.muted" letterSpacing="0.12em" textTransform="uppercase" mb={3}>
              모든 선거
            </Text>
            <Stack gap={2}>
              {elections.map((e) => {
                const phase = getElectionPhase(e);
                return (
                  <Flex
                    key={e.id}
                    bg="bg.surface"
                    border="1px solid"
                    borderColor="border.default"
                    borderRadius="2px"
                    px={4}
                    py={3}
                    align="center"
                    justify="space-between"
                    gap={3}
                    wrap="wrap"
                  >
                    <Box minW={0}>
                      <Text fontWeight={700} truncate>
                        {e.title}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {formatDateTime(e.startsAt)} ~ {formatDateTime(e.endsAt)}
                      </Text>
                    </Box>
                    <Flex align="center" gap={3}>
                      <PhaseBadge phase={phase} />
                      <Button asChild size="xs" variant="outline" borderColor="ink.700" color="ink.900">
                        <NextLink href={`/admin/elections/${e.id}`}>관리</NextLink>
                      </Button>
                    </Flex>
                  </Flex>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* 시스템이 보장하는 것 안내 */}
        <Box bg="bg.sunken" border="1px dashed" borderColor="ink.300" borderRadius="sm" p={5}>
          <Flex gap={5} align="center" direction={{ base: "column", md: "row" }}>
            <SealedStatus label="이 백오피스가 볼 수 없는 것" sublabel="개별 유권자의 투표 여부 · 투표 선택 · 코드 원문" />
          </Flex>
        </Box>
      </Stack>
    </AdminShell>
  );
}

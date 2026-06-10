import { notFound } from "next/navigation";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ElectionForm } from "@/components/admin/ElectionForm";
import { ElectionTabs } from "@/components/admin/ElectionTabs";
import { PhaseBadge } from "@/components/admin/PhaseBadge";
import { requireAdmin } from "@/server/auth/admin-session";
import { getElection } from "@/server/sql/elections";
import { getElectionPhase } from "@/server/guards/election-state";
import { isResultVisible } from "@/server/guards/result-visibility";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "선거 관리" };

export default async function ElectionAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ electionId: string }>;
  searchParams: Promise<{ saved?: string; created?: string }>;
}) {
  const session = await requireAdmin();
  const { electionId } = await params;
  const flags = await searchParams;

  const election = await getElection(electionId);
  if (!election) notFound();

  const phase = getElectionPhase(election);

  return (
    <AdminShell adminEmail={session.email}>
      <Stack gap={4}>
        <Flex align="center" gap={3} wrap="wrap">
          <Text as="h1" fontFamily="heading" fontWeight={900} fontSize="2xl">
            {election.title}
          </Text>
          <PhaseBadge phase={phase} />
          {!isResultVisible(election) && (
            <Text fontSize="xs" color="sealwax.700" fontWeight={700}>
              결과 봉인 중 — {formatDateTime(election.resultVisibleAt)} 공개
            </Text>
          )}
        </Flex>

        <ElectionTabs electionId={electionId} active="" />

        {(flags.saved || flags.created) && (
          <Box bg="booth.100" border="1px solid" borderColor="booth.200" borderRadius="sm" px={4} py={2.5}>
            <Text fontSize="sm" color="booth.700" fontWeight={700}>
              {flags.created ? "선거가 생성되었습니다." : "변경사항이 저장되었습니다."}
            </Text>
          </Box>
        )}

        <Box
          bg="bg.surface"
          border="1px solid"
          borderColor="border.default"
          boxShadow="paper"
          borderRadius="2px"
          p={{ base: 5, md: 7 }}
          maxW="3xl"
        >
          <ElectionForm election={election} />
        </Box>

        {phase !== "draft" && phase !== "upcoming" && (
          <Text fontSize="xs" color="fg.muted">
            투표가 시작된 선거는 후보·유권자 구조를 변경할 수 없습니다. 일정과
            상태 변경은 신중하게 진행하세요.
          </Text>
        )}
      </Stack>
    </AdminShell>
  );
}

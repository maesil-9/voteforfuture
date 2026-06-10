import { notFound } from "next/navigation";
import { Box, Stack, Text } from "@chakra-ui/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ElectionTabs } from "@/components/admin/ElectionTabs";
import { AdminMetricStrip } from "@/components/admin/AdminMetricStrip";
import { ParticipationLive } from "@/components/election/ParticipationLive";
import { requireAdmin } from "@/server/auth/admin-session";
import { getElection } from "@/server/sql/elections";
import { getParticipation } from "@/server/sql/submissions";
import { isResultVisible } from "@/server/guards/result-visibility";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "투표 현황" };

export default async function TurnoutAdminPage({
  params,
}: {
  params: Promise<{ electionId: string }>;
}) {
  const session = await requireAdmin();
  const { electionId } = await params;

  const election = await getElection(electionId);
  if (!election) notFound();

  const participation = await getParticipation(electionId);

  return (
    <AdminShell adminEmail={session.email}>
      <Stack gap={4}>
        <Text as="h1" fontFamily="heading" fontWeight={900} fontSize="2xl">
          {election.title} — 현황
        </Text>
        <ElectionTabs electionId={electionId} active="/turnout" />

        <AdminMetricStrip
          metrics={[
            { label: "투표 접수", value: `${participation.submitted}명` },
            { label: "승인된 표", value: `${participation.approved}명` },
            { label: "검수 대기", value: `${participation.pending}명` },
            { label: "무효 처리", value: `${participation.rejected}명` },
          ]}
        />

        <Box
          bg="bg.surface"
          border="1px solid"
          borderColor="border.default"
          boxShadow="paper"
          borderRadius="2px"
          p={{ base: 5, md: 8 }}
        >
          <ParticipationLive
            electionId={electionId}
            initial={participation}
            caption="실시간 투표 현황"
          />
        </Box>

        {!isResultVisible(election) && (
          <Text fontSize="xs" color="fg.subtle">
            여기 표시되는 것은 집계 수치뿐입니다. 후보별 득표는{" "}
            {formatDateTime(election.resultVisibleAt)} 이후 결과 탭에서
            확인할 수 있습니다.
          </Text>
        )}
      </Stack>
    </AdminShell>
  );
}

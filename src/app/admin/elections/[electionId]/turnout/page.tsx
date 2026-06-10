import { notFound } from "next/navigation";
import { Box, Stack, Text } from "@chakra-ui/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ElectionTabs } from "@/components/admin/ElectionTabs";
import { AdminMetricStrip } from "@/components/admin/AdminMetricStrip";
import { TurnoutLive } from "@/components/admin/TurnoutLive";
import { requireAdmin } from "@/server/auth/admin-session";
import { getElection } from "@/server/sql/elections";
import { getTurnout } from "@/server/sql/voters";
import { isResultVisible } from "@/server/guards/result-visibility";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "투표율" };

export default async function TurnoutAdminPage({
  params,
}: {
  params: Promise<{ electionId: string }>;
}) {
  const session = await requireAdmin();
  const { electionId } = await params;

  const election = await getElection(electionId);
  if (!election) notFound();

  const turnout = await getTurnout(electionId);

  return (
    <AdminShell adminEmail={session.email}>
      <Stack gap={4}>
        <Text as="h1" fontFamily="heading" fontWeight={900} fontSize="2xl">
          {election.title} — 투표율
        </Text>
        <ElectionTabs electionId={electionId} active="/turnout" />

        <AdminMetricStrip
          metrics={[
            { label: "총 유권자", value: `${turnout.totalVoters}명` },
            { label: "투표 완료", value: `${turnout.votesCast}명` },
            { label: "남은 투표", value: `${turnout.remaining}명` },
            { label: "투표율", value: `${turnout.percent}%` },
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
          <TurnoutLive electionId={electionId} initial={turnout} />
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

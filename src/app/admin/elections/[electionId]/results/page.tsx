import { notFound } from "next/navigation";
import { Stack, Text } from "@chakra-ui/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ElectionTabs } from "@/components/admin/ElectionTabs";
import { AdminSealPanel } from "@/components/admin/AdminSealPanel";
import { WinnerAnnouncement } from "@/components/election/WinnerAnnouncement";
import { requireAdmin } from "@/server/auth/admin-session";
import { getElection } from "@/server/sql/elections";
import { isResultVisible } from "@/server/guards/result-visibility";
import { aggregateResults } from "@/server/services/results";

export const dynamic = "force-dynamic";

export const metadata = { title: "개표 결과" };

export default async function ResultsAdminPage({
  params,
}: {
  params: Promise<{ electionId: string }>;
}) {
  const session = await requireAdmin();
  const { electionId } = await params;

  const election = await getElection(electionId);
  if (!election) notFound();

  // 결과 발표 전: 집계 함수를 아예 호출하지 않는다.
  // (호출하더라도 aggregateResults → assertResultVisible과
  //  unsealChoice 내장 가드가 이중으로 차단한다)
  const visible = isResultVisible(election);

  return (
    <AdminShell adminEmail={session.email}>
      <Stack gap={4}>
        <Text as="h1" fontFamily="heading" fontWeight={900} fontSize="2xl">
          {election.title} — 결과
        </Text>
        <ElectionTabs electionId={electionId} active="/results" />

        {visible ? (
          <WinnerAnnouncement results={await aggregateResults(election)} />
        ) : (
          <AdminSealPanel election={election} />
        )}
      </Stack>
    </AdminShell>
  );
}

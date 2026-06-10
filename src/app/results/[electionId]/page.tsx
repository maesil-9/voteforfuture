import { notFound } from "next/navigation";
import { Box, Stack, Text } from "@chakra-ui/react";
import { ElectionShell } from "@/components/layout/ElectionShell";
import { ResultLockPanel } from "@/components/election/ResultLockPanel";
import { WinnerAnnouncement } from "@/components/election/WinnerAnnouncement";
import { getElection } from "@/server/sql/elections";
import { getTurnout } from "@/server/sql/voters";
import { isResultVisible } from "@/server/guards/result-visibility";
import { aggregateResults } from "@/server/services/results";

export const dynamic = "force-dynamic";

export const metadata = { title: "개표 결과" };

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ electionId: string }>;
}) {
  const { electionId } = await params;
  const election = await getElection(electionId);

  // draft 선거는 외부에 존재 자체를 노출하지 않는다
  if (!election || election.status === "draft") {
    notFound();
  }

  const visible = isResultVisible(election);

  return (
    <ElectionShell>
      <Stack gap={8}>
        <Box textAlign="center">
          <Text fontSize="xs" letterSpacing="0.24em" color="fg.muted" textTransform="uppercase" mb={2}>
            {election.title}
          </Text>
          <Text as="h1" fontFamily="heading" fontWeight={900} fontSize={{ base: "2xl", md: "3xl" }}>
            개표 결과
          </Text>
        </Box>

        {visible ? (
          <WinnerAnnouncement results={await aggregateResults(election)} />
        ) : (
          <ResultLockPanel election={election} turnout={await getTurnout(election.id)} />
        )}
      </Stack>
    </ElectionShell>
  );
}

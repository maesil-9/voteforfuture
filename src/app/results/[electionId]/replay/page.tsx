import { notFound, redirect } from "next/navigation";
import NextLink from "next/link";
import { Button, Stack, Text } from "@chakra-ui/react";
import { ElectionShell } from "@/components/layout/ElectionShell";
import { MessageReplayTheater } from "@/components/election/MessageReplayTheater";
import { getElection } from "@/server/sql/elections";
import { isResultVisible } from "@/server/guards/result-visibility";
import { aggregateResults } from "@/server/services/results";

export const dynamic = "force-dynamic";

export const metadata = { title: "한 마디 상영관" };

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ electionId: string }>;
}) {
  const { electionId } = await params;
  const election = await getElection(electionId);

  if (!election || election.status === "draft") {
    notFound();
  }

  // 결과 확정(공개) 전에는 상영관도 열리지 않는다
  if (!isResultVisible(election)) {
    redirect(`/results/${electionId}`);
  }

  const results = await aggregateResults(election);

  if (results.messagesByCandidate.length === 0) {
    return (
      <ElectionShell>
        <Stack align="center" py={20} gap={5} textAlign="center">
          <Text fontFamily="heading" fontSize="2xl" fontWeight={700}>
            상영할 한 마디가 없습니다
          </Text>
          <Text color="fg.muted">이번 선거에는 메시지를 남긴 투표가 없었어요.</Text>
          <Button asChild variant="outline" borderColor="ink.700" color="ink.900" fontWeight={700}>
            <NextLink href={`/results/${electionId}`}>결과 페이지로 돌아가기</NextLink>
          </Button>
        </Stack>
      </ElectionShell>
    );
  }

  return (
    <MessageReplayTheater
      electionId={electionId}
      electionTitle={election.title}
      acts={results.messagesByCandidate}
    />
  );
}

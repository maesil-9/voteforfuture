import { redirect } from "next/navigation";
import { Box, Stack, Text } from "@chakra-ui/react";
import { ElectionShell } from "@/components/layout/ElectionShell";
import { ConfirmBallot } from "@/components/vote/ConfirmBallot";
import { SealedBallotNotice } from "@/components/vote/SealedBallotNotice";
import { getVoterSession } from "@/server/auth/voter-session";
import { getElection } from "@/server/sql/elections";
import { getCandidate, listCandidates } from "@/server/sql/candidates";
import { getElectionPhase } from "@/server/guards/election-state";

export const dynamic = "force-dynamic";

export const metadata = { title: "투표 확인" };

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ electionId: string }>;
}) {
  const { electionId } = await params;

  const session = await getVoterSession(electionId);
  if (!session) {
    redirect("/vote/enter-name?expired=1");
  }
  if (!session.selectedCandidateId) {
    redirect(`/vote/${electionId}`);
  }

  const election = await getElection(electionId);
  if (!election || getElectionPhase(election) !== "open") {
    redirect("/");
  }

  const [candidate, allCandidates] = await Promise.all([
    getCandidate(session.selectedCandidateId),
    listCandidates(electionId),
  ]);
  if (!candidate || candidate.electionId !== electionId) {
    redirect(`/vote/${electionId}`);
  }
  const number = allCandidates.findIndex((c) => c.id === candidate.id) + 1;

  return (
    <ElectionShell>
      <Stack gap={8}>
        <Box textAlign="center">
          <Text fontSize="xs" letterSpacing="0.24em" color="fg.muted" textTransform="uppercase" mb={2}>
            {election.title}
          </Text>
          <Text as="h1" fontFamily="heading" fontWeight={900} fontSize={{ base: "2xl", md: "3xl" }}>
            선택을 확인해주세요
          </Text>
        </Box>
        <ConfirmBallot
          electionId={electionId}
          candidateNumber={number}
          candidateName={candidate.name}
          slogan={candidate.slogan}
        />
        <Box maxW="md" mx="auto" w="100%">
          <SealedBallotNotice />
        </Box>
      </Stack>
    </ElectionShell>
  );
}

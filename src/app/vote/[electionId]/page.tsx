import { redirect } from "next/navigation";
import { Box, Text } from "@chakra-ui/react";
import { ElectionShell } from "@/components/layout/ElectionShell";
import { VotingBooth, type CandidateView } from "@/components/vote/VotingBooth";
import { getVoterSession } from "@/server/auth/voter-session";
import { getElection } from "@/server/sql/elections";
import {
  listCandidates,
  listPoliciesByElection,
} from "@/server/sql/candidates";
import { getElectionPhase } from "@/server/guards/election-state";

export const dynamic = "force-dynamic";

export const metadata = { title: "기표소" };

export default async function BoothPage({
  params,
}: {
  params: Promise<{ electionId: string }>;
}) {
  const { electionId } = await params;

  const session = await getVoterSession(electionId);
  if (!session) {
    redirect("/vote/enter-name?expired=1");
  }

  const election = await getElection(electionId);
  if (!election) {
    redirect("/vote/enter-name");
  }
  if (getElectionPhase(election) !== "open") {
    redirect("/");
  }

  const [candidates, policiesByCandidate] = await Promise.all([
    listCandidates(electionId),
    listPoliciesByElection(electionId),
  ]);

  const views: CandidateView[] = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    slogan: c.slogan,
    shortIntro: c.shortIntro,
    profile: c.profile,
    colorHint: c.colorHint,
    posterId: c.posterId,
    policies: (policiesByCandidate.get(c.id) ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
    })),
  }));

  return (
    <ElectionShell maxW="5xl">
      <Box mb={8} textAlign="center">
        <Text fontSize="xs" letterSpacing="0.24em" color="fg.muted" textTransform="uppercase" mb={2}>
          {election.title}
        </Text>
        <Text as="h1" fontFamily="heading" fontWeight={900} fontSize={{ base: "2xl", md: "3xl" }}>
          후보를 살펴보세요
        </Text>
        <Text mt={2} color="fg.muted" fontSize="sm">
          포스터를 눌러 프로필과 공약을 확인한 뒤, 한 명을 선택해주세요.
        </Text>
      </Box>
      <VotingBooth electionId={electionId} candidates={views} />
    </ElectionShell>
  );
}

import { Box, Stack, Text } from "@chakra-ui/react";
import { ElectionShell } from "@/components/layout/ElectionShell";
import { NameEntryPanel } from "@/components/vote/NameEntryPanel";
import { getLatestPublicElection } from "@/server/sql/elections";
import { getElectionPhase } from "@/server/guards/election-state";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "투표소 입장" };

export default async function EnterNamePage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; already?: string }>;
}) {
  const params = await searchParams;
  const election = await getLatestPublicElection();

  if (!election) {
    return (
      <ElectionShell>
        <Notice title="지금은 진행 중인 선거가 없습니다" body="선거가 공고되면 투표가 가능해집니다." />
      </ElectionShell>
    );
  }

  const phase = getElectionPhase(election);

  if (phase === "upcoming") {
    return (
      <ElectionShell>
        <Notice
          title="아직 투표가 시작되지 않았습니다"
          body={`${formatDateTime(election.startsAt)}에 다시 방문해주세요.`}
        />
      </ElectionShell>
    );
  }

  if (phase !== "open") {
    return (
      <ElectionShell>
        <Notice
          title="투표가 종료되었습니다"
          body={`결과는 ${formatDateTime(election.resultVisibleAt)}에 공개됩니다.`}
        />
      </ElectionShell>
    );
  }

  const initialError = params.already
    ? "이미 같은 이름으로 투표가 접수되었습니다."
    : params.expired
      ? "세션이 만료되었습니다. 이름을 다시 입력해주세요."
      : undefined;

  return (
    <ElectionShell>
      <Stack gap={8} align="center">
        <Box textAlign="center">
          <Text fontSize="xs" letterSpacing="0.24em" color="fg.muted" textTransform="uppercase" mb={2}>
            {election.title}
          </Text>
          <Text as="h1" fontFamily="heading" fontWeight={900} fontSize={{ base: "2xl", md: "3xl" }}>
            투표소 입장
          </Text>
          <Text mt={2} color="fg.muted" fontSize="sm">
            방에서 쓰는 닉네임을 적으면 기표소로 이동합니다.
          </Text>
        </Box>
        <NameEntryPanel electionId={election.id} initialError={initialError} />
      </Stack>
    </ElectionShell>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Stack align="center" py={20} gap={3} textAlign="center">
      <Text fontFamily="heading" fontSize="2xl" fontWeight={700}>
        {title}
      </Text>
      <Text color="fg.muted">{body}</Text>
    </Stack>
  );
}

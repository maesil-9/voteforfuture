import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NextLink from "next/link";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { ElectionShell } from "@/components/layout/ElectionShell";
import { ParticipationLive } from "@/components/election/ParticipationLive";
import { ParticipationCard } from "@/components/vote/ParticipationCard";
import { getElection } from "@/server/sql/elections";
import { getParticipation } from "@/server/sql/submissions";
import { verifyPayload } from "@/server/auth/signing";
import { env } from "@/server/env";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "투표 완료" };

export default async function CompletePage({
  params,
}: {
  params: Promise<{ electionId: string }>;
}) {
  const { electionId } = await params;

  // 방금 투표를 마친 사람만 볼 수 있는 화면 (단기 서명 쿠키 확인)
  const store = await cookies();
  const doneToken = store.get("cv_done")?.value;
  const done = doneToken
    ? verifyPayload<{
        electionId: string;
        voterName?: string;
        voterOrder?: number;
        exp: number;
      }>(doneToken, env.adminSessionSecret)
    : null;
  if (
    !done ||
    done.electionId !== electionId ||
    done.exp < Math.floor(Date.now() / 1000)
  ) {
    redirect("/");
  }

  const election = await getElection(electionId);
  if (!election) {
    redirect("/");
  }
  const participation = await getParticipation(electionId);

  return (
    <ElectionShell>
      <Stack align="center" gap={8} py={{ base: 6, md: 10 }}>
        {/* 도장 찍힌 투표지 */}
        <Box
          position="relative"
          bg="bg.surface"
          border="1px solid"
          borderColor="ink.700"
          boxShadow="paperLift"
          borderRadius="2px"
          px={{ base: 8, md: 14 }}
          py={{ base: 10, md: 14 }}
          textAlign="center"
          maxW="md"
          w="100%"
        >
          <Text fontSize="xs" letterSpacing="0.3em" color="fg.muted" textTransform="uppercase" mb={4}>
            {election.title}
          </Text>
          <Text fontFamily="heading" fontWeight={900} fontSize={{ base: "3xl", md: "4xl" }}>
            투표가 접수되었습니다
          </Text>
          <Text mt={4} color="fg.muted">
            {done.voterName ? (
              <>
                <Text as="span" fontWeight={700} color="fg.default">
                  {done.voterName}
                </Text>
                님의 한 표가 봉인된 채 접수됐어요.
              </>
            ) : (
              "한 표가 봉인된 채 접수됐어요."
            )}
            <br />
            방장의 명단 검수(승인)를 거쳐 투표함에 들어갑니다.
            <br />
            선택 내용은 누구도 열람할 수 없습니다.
          </Text>

          {/* 접수 도장 */}
          <Flex
            aria-hidden
            position="absolute"
            top={{ base: "-18px", md: "-22px" }}
            right={{ base: "-10px", md: "-18px" }}
            boxSize={{ base: "84px", md: "104px" }}
            borderRadius="full"
            border="4px solid"
            borderColor="sealwax.500"
            color="sealwax.500"
            align="center"
            justify="center"
            transform="rotate(12deg)"
            bg="rgba(251,248,241,0.92)"
            fontFamily="heading"
            fontWeight={900}
            fontSize={{ base: "md", md: "lg" }}
            boxShadow="paper"
          >
            접수완료
          </Flex>
        </Box>

        {/* 참여 인증 카드 — 방에 자랑하고 다음 유권자 데려오기 */}
        {done.voterOrder && done.voterOrder > 0 && (
          <ParticipationCard
            electionTitle={election.title}
            voterOrder={done.voterOrder}
          />
        )}

        {/* 실시간 현황 — 검수가 처리되면 여기 숫자가 움직인다 */}
        <Box
          w="100%"
          maxW="lg"
          bg="bg.surface"
          border="1px solid"
          borderColor="border.default"
          boxShadow="paper"
          borderRadius="2px"
          p={{ base: 5, md: 6 }}
        >
          <ParticipationLive electionId={electionId} initial={participation} />
        </Box>

        <Box textAlign="center">
          <Text fontSize="sm" color="fg.muted">
            개표 결과 발표
          </Text>
          <Text fontFamily="heading" fontWeight={700} fontSize="lg">
            {formatDateTime(election.resultVisibleAt)}
          </Text>
        </Box>

        <Button asChild variant="outline" borderColor="ink.700" color="ink.900" fontWeight={700}>
          <NextLink href="/">처음으로 돌아가기</NextLink>
        </Button>
      </Stack>
    </ElectionShell>
  );
}

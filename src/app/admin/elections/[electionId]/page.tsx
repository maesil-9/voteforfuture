import { notFound } from "next/navigation";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ElectionForm } from "@/components/admin/ElectionForm";
import { ElectionTabs } from "@/components/admin/ElectionTabs";
import { PhaseBadge } from "@/components/admin/PhaseBadge";
import { Button } from "@chakra-ui/react";
import { requireAdmin } from "@/server/auth/admin-session";
import { getElection } from "@/server/sql/elections";
import { hasOgImage } from "@/server/sql/og";
import { getElectionPhase } from "@/server/guards/election-state";
import { isResultVisible } from "@/server/guards/result-visibility";
import { deleteOgImageAction } from "@/server/actions/admin";
import { UploadField } from "@/components/admin/UploadField";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "선거 관리" };

export default async function ElectionAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ electionId: string }>;
  searchParams: Promise<{ saved?: string; created?: string; og?: string }>;
}) {
  const session = await requireAdmin();
  const { electionId } = await params;
  const flags = await searchParams;

  const election = await getElection(electionId);
  if (!election) notFound();

  const phase = getElectionPhase(election);
  const ogExists = await hasOgImage(electionId);

  const ogMessages: Record<string, { text: string; isError: boolean }> = {
    saved: { text: "OG 이미지가 저장되었습니다.", isError: false },
    deleted: { text: "OG 이미지가 삭제되었습니다.", isError: false },
    nofile: { text: "업로드할 이미지를 선택해주세요.", isError: true },
    toobig: { text: "OG 이미지는 3MB 이하만 가능합니다.", isError: true },
    badtype: { text: "JPEG/PNG/WebP/GIF 이미지만 가능합니다.", isError: true },
  };
  const ogMessage = flags.og ? ogMessages[flags.og] : undefined;

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
            투표가 시작된 선거는 후보 구조를 변경할 수 없습니다. 일정과 상태
            변경은 신중하게 진행하세요.
          </Text>
        )}

        {/* Open Graph 이미지 관리 */}
        <Box
          bg="bg.surface"
          border="1px solid"
          borderColor="border.default"
          boxShadow="paper"
          borderRadius="2px"
          p={{ base: 5, md: 7 }}
          maxW="3xl"
        >
          <Text fontFamily="heading" fontWeight={800} fontSize="lg" mb={1}>
            URL 공유 이미지 (Open Graph)
          </Text>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            카카오톡 등에 링크를 공유할 때 보이는 미리보기 이미지입니다. 권장
            1200×630px, JPEG/PNG, 3MB 이하.
          </Text>

          {ogMessage && (
            <Box
              bg={ogMessage.isError ? "paper.100" : "booth.100"}
              border="1px solid"
              borderColor={ogMessage.isError ? "sealwax.500" : "booth.200"}
              borderRadius="sm"
              px={4}
              py={2.5}
              mb={4}
            >
              <Text fontSize="sm" fontWeight={700} color={ogMessage.isError ? "sealwax.700" : "booth.700"}>
                {ogMessage.text}
              </Text>
            </Box>
          )}

          {ogExists && (
            <Box mb={4} maxW="420px">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/og-image/${electionId}?v=${election.updatedAt.getTime()}`}
                alt="현재 OG 이미지 미리보기"
                style={{
                  width: "100%",
                  aspectRatio: "1200 / 630",
                  objectFit: "cover",
                  border: "1px solid #DCD1B8",
                  borderRadius: "2px",
                }}
              />
            </Box>
          )}

          <Flex gap={6} wrap="wrap" align="flex-start">
            <UploadField
              endpoint={`/api/admin/elections/${electionId}/og-image`}
              buttonLabel={ogExists ? "교체 업로드" : "업로드"}
              hint="권장 1200×630 · JPEG/PNG/WebP/GIF · 3MB 이하"
            />
            {ogExists && (
              <form action={deleteOgImageAction}>
                <input type="hidden" name="electionId" value={electionId} />
                <Button type="submit" size="xs" variant="outline" borderColor="sealwax.500" color="sealwax.700">
                  이미지 삭제
                </Button>
              </form>
            )}
          </Flex>
        </Box>
      </Stack>
    </AdminShell>
  );
}

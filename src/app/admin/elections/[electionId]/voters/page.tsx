import { notFound } from "next/navigation";
import { Box, Stack, Table, Text } from "@chakra-ui/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ElectionTabs } from "@/components/admin/ElectionTabs";
import { VoterBatchUploader } from "@/components/admin/VoterBatchUploader";
import { AdminMetricStrip } from "@/components/admin/AdminMetricStrip";
import { requireAdmin } from "@/server/auth/admin-session";
import { getElection } from "@/server/sql/elections";
import { getTurnout, listBatches } from "@/server/sql/voters";
import { canEditBallotStructure } from "@/server/guards/election-state";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "유권자 관리" };

export default async function VotersAdminPage({
  params,
}: {
  params: Promise<{ electionId: string }>;
}) {
  const session = await requireAdmin();
  const { electionId } = await params;

  const election = await getElection(electionId);
  if (!election) notFound();

  const [batches, turnout] = await Promise.all([
    listBatches(electionId),
    getTurnout(electionId),
  ]);

  return (
    <AdminShell adminEmail={session.email}>
      <Stack gap={4}>
        <Text as="h1" fontFamily="heading" fontWeight={900} fontSize="2xl">
          {election.title} — 유권자
        </Text>
        <ElectionTabs electionId={electionId} active="/voters" />

        <AdminMetricStrip
          metrics={[
            { label: "발급된 코드", value: `${turnout.totalVoters}개`, hint: "유효 크레덴셜 기준" },
            { label: "등록 배치", value: `${batches.length}건` },
          ]}
        />

        <Box
          bg="bg.surface"
          border="1px solid"
          borderColor="border.default"
          boxShadow="paper"
          borderRadius="2px"
          p={{ base: 5, md: 7 }}
        >
          <Text fontFamily="heading" fontWeight={800} fontSize="lg" mb={4}>
            유권자 명부 등록 · 코드 발급
          </Text>
          <VoterBatchUploader
            electionId={electionId}
            structureLocked={!canEditBallotStructure(election)}
          />
        </Box>

        <Box>
          <Text fontSize="xs" fontWeight={800} color="fg.muted" letterSpacing="0.12em" textTransform="uppercase" mb={3}>
            등록된 배치 (개인정보 없음 — 배치명·인원수·시각만 보관)
          </Text>
          {batches.length === 0 ? (
            <Box border="1px dashed" borderColor="ink.300" borderRadius="2px" p={8} textAlign="center">
              <Text color="fg.muted">아직 등록된 유권자 배치가 없습니다.</Text>
            </Box>
          ) : (
            <Table.Root size="sm" bg="bg.surface" borderRadius="2px" border="1px solid" borderColor="border.default">
              <Table.Header>
                <Table.Row bg="bg.sunken">
                  <Table.ColumnHeader>배치명</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">발급 인원</Table.ColumnHeader>
                  <Table.ColumnHeader>생성 시각</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {batches.map((b) => (
                  <Table.Row key={b.id}>
                    <Table.Cell fontWeight={600}>{b.batchName}</Table.Cell>
                    <Table.Cell textAlign="end">{b.voterCount}명</Table.Cell>
                    <Table.Cell>{formatDateTime(b.createdAt)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
          <Text mt={3} fontSize="xs" color="fg.subtle">
            이 화면에는 개별 코드의 사용 여부가 표시되지 않습니다 — 비밀투표
            보호를 위해 시스템이 의도적으로 제공하지 않는 정보입니다.
          </Text>
        </Box>
      </Stack>
    </AdminShell>
  );
}

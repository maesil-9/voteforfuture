import { notFound } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ElectionTabs } from "@/components/admin/ElectionTabs";
import { AdminMetricStrip } from "@/components/admin/AdminMetricStrip";
import { requireAdmin } from "@/server/auth/admin-session";
import { getElection } from "@/server/sql/elections";
import { getParticipation, listSubmissions } from "@/server/sql/submissions";
import {
  approveAllPendingAction,
  approveSubmissionAction,
  rejectSubmissionAction,
} from "@/server/actions/admin";
import { formatDateTime } from "@/lib/format";
import type { SubmissionStatus } from "@/server/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "투표 검수" };

const STATUS_BADGE: Record<
  SubmissionStatus,
  { label: string; bg: string; color: string }
> = {
  pending: { label: "검수 대기", bg: "stamp.100", color: "stamp.700" },
  approved: { label: "승인", bg: "booth.100", color: "booth.700" },
  rejected: { label: "무효", bg: "paper.200", color: "sealwax.700" },
};

export default async function ReviewAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ electionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAdmin();
  const { electionId } = await params;
  const flags = await searchParams;

  const election = await getElection(electionId);
  if (!election) notFound();

  const [submissions, participation] = await Promise.all([
    listSubmissions(electionId),
    getParticipation(electionId),
  ]);

  return (
    <AdminShell adminEmail={session.email}>
      <Stack gap={4}>
        <Text as="h1" fontFamily="heading" fontWeight={900} fontSize="2xl">
          {election.title} — 검수
        </Text>
        <ElectionTabs electionId={electionId} active="/review" />

        {flags.error && (
          <Box bg="paper.100" border="1px solid" borderColor="sealwax.500" borderRadius="sm" px={4} py={2.5}>
            <Text fontSize="sm" color="sealwax.700" fontWeight={700}>
              {flags.error}
            </Text>
          </Box>
        )}

        <AdminMetricStrip
          metrics={[
            { label: "투표 접수", value: `${participation.submitted}명` },
            { label: "승인된 표", value: `${participation.approved}명` },
            { label: "검수 대기", value: `${participation.pending}명` },
            { label: "무효 처리", value: `${participation.rejected}명` },
          ]}
        />

        {/* 검수 원칙 안내 */}
        <Box bg="bg.sunken" border="1px dashed" borderColor="ink.300" borderRadius="sm" px={4} py={3}>
          <Text fontSize="sm" color="ink.700">
            <strong>승인</strong>하면 봉인된 표가 익명 투표함으로 이동하며 이름과의
            연결이 영구히 사라집니다. <strong>무효</strong> 처리하면 표는 열리지 않은 채
            파기되고, 같은 이름으로 다시 투표할 수 있게 됩니다. 두 동작 모두
            되돌릴 수 없으며, 어느 쪽이든 누가 어떤 후보를 골랐는지는 볼 수
            없습니다.
          </Text>
        </Box>

        {participation.pending > 0 && (
          <form action={approveAllPendingAction}>
            <input type="hidden" name="electionId" value={electionId} />
            <Button
              type="submit"
              size="sm"
              bg="booth.600"
              color="paper.50"
              _hover={{ bg: "booth.700" }}
              fontWeight={700}
            >
              대기 중인 {participation.pending}건 전체 승인
            </Button>
          </form>
        )}

        {submissions.length === 0 ? (
          <Box border="1px dashed" borderColor="ink.300" borderRadius="2px" p={8} textAlign="center">
            <Text color="fg.muted">아직 접수된 투표가 없습니다.</Text>
          </Box>
        ) : (
          <Box overflowX="auto">
            {/* 모바일: 칼럼이 뭉개지지 않도록 최소 폭을 주고 가로 스크롤 */}
            <Table.Root size="sm" minW="640px" bg="bg.surface" borderRadius="2px" border="1px solid" borderColor="border.default">
              <Table.Header>
                <Table.Row bg="bg.sunken">
                  <Table.ColumnHeader>이름</Table.ColumnHeader>
                  <Table.ColumnHeader>상태</Table.ColumnHeader>
                  <Table.ColumnHeader>접수 시각</Table.ColumnHeader>
                  <Table.ColumnHeader>검수</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {submissions.map((s) => {
                  const badge = STATUS_BADGE[s.status];
                  return (
                    <Table.Row key={s.id}>
                      <Table.Cell fontWeight={700}>
                        {s.voterName}
                        {s.hasMessage && (
                          <Badge
                            ml={2}
                            bg="paper.100"
                            color="ink.500"
                            px={1.5}
                            py={0.5}
                            borderRadius="sm"
                            fontSize="2xs"
                            title="결과 공개 후 익명으로만 열람됩니다"
                          >
                            메시지 있음
                          </Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge bg={badge.bg} color={badge.color} px={2} py={0.5} borderRadius="sm" fontWeight={700}>
                          {badge.label}
                        </Badge>
                        {s.status === "rejected" && s.rejectReason && (
                          <Text fontSize="xs" color="fg.muted" mt={1}>
                            사유: {s.rejectReason}
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell fontSize="xs" color="fg.muted" whiteSpace="nowrap">
                        {formatDateTime(s.submittedAt)}
                      </Table.Cell>
                      <Table.Cell>
                        {s.status === "pending" ? (
                          <Flex gap={2} align="center" wrap="wrap">
                            <form action={approveSubmissionAction}>
                              <input type="hidden" name="electionId" value={electionId} />
                              <input type="hidden" name="submissionId" value={s.id} />
                              <Button
                                type="submit"
                                size="xs"
                                bg="booth.600"
                                color="paper.50"
                                _hover={{ bg: "booth.700" }}
                                fontWeight={700}
                              >
                                승인
                              </Button>
                            </form>
                            <form action={rejectSubmissionAction}>
                              <input type="hidden" name="electionId" value={electionId} />
                              <input type="hidden" name="submissionId" value={s.id} />
                              <Flex gap={1.5}>
                                <Input
                                  name="reason"
                                  placeholder="무효 사유 (선택)"
                                  size="xs"
                                  w="140px"
                                  bg="paper.50"
                                  aria-label={`${s.voterName} 무효 사유`}
                                />
                                <Button
                                  type="submit"
                                  size="xs"
                                  variant="outline"
                                  borderColor="sealwax.500"
                                  color="sealwax.700"
                                  fontWeight={700}
                                >
                                  무효
                                </Button>
                              </Flex>
                            </form>
                          </Flex>
                        ) : (
                          <Text fontSize="xs" color="fg.subtle" whiteSpace="nowrap">
                            {s.reviewedAt ? formatDateTime(s.reviewedAt) : "—"}
                          </Text>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        )}

        <Text fontSize="xs" color="fg.subtle">
          이 화면은 누가 투표에 참여했는지만 보여줍니다. 선택 내용은 봉인되어
          있어 관리자도 볼 수 없습니다.
        </Text>
      </Stack>
    </AdminShell>
  );
}

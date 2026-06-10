import { notFound } from "next/navigation";
import { Box, Grid, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ElectionTabs } from "@/components/admin/ElectionTabs";
import { ActionForm } from "@/components/admin/ActionForm";
import { CandidateAdminCard } from "@/components/admin/CandidateAdminCard";
import { requireAdmin } from "@/server/auth/admin-session";
import { getElection } from "@/server/sql/elections";
import { listCandidates, listPoliciesByElection } from "@/server/sql/candidates";
import { canEditBallotStructure } from "@/server/guards/election-state";
import { saveCandidateAction } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "후보 관리" };

const ERROR_MESSAGES: Record<string, string> = {
  locked: "투표 시작 후에는 후보/공약을 수정할 수 없습니다.",
  toobig: "포스터는 3MB 이하만 업로드할 수 있습니다.",
  badtype: "JPEG/PNG/WebP/GIF 이미지만 업로드할 수 있습니다.",
  nofile: "업로드할 파일을 선택해주세요.",
  notfound: "후보를 찾을 수 없습니다.",
};

export default async function CandidatesAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ electionId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const { electionId } = await params;
  const flags = await searchParams;

  const election = await getElection(electionId);
  if (!election) notFound();

  const [candidates, policiesByCandidate] = await Promise.all([
    listCandidates(electionId),
    listPoliciesByElection(electionId),
  ]);
  const structureLocked = !canEditBallotStructure(election);

  return (
    <AdminShell adminEmail={session.email}>
      <Stack gap={4}>
        <Text as="h1" fontFamily="heading" fontWeight={900} fontSize="2xl">
          {election.title} — 후보
        </Text>
        <ElectionTabs electionId={electionId} active="/candidates" />

        {flags.saved && (
          <Box bg="booth.100" border="1px solid" borderColor="booth.200" borderRadius="sm" px={4} py={2.5}>
            <Text fontSize="sm" color="booth.700" fontWeight={700}>저장되었습니다.</Text>
          </Box>
        )}
        {flags.error && (
          <Box bg="paper.100" border="1px solid" borderColor="sealwax.500" borderRadius="sm" px={4} py={2.5}>
            <Text fontSize="sm" color="sealwax.700" fontWeight={700}>
              {ERROR_MESSAGES[flags.error] ?? "요청을 처리할 수 없습니다."}
            </Text>
          </Box>
        )}

        {structureLocked && (
          <Box bg="paper.100" border="1px dashed" borderColor="sealwax.500" borderRadius="sm" px={4} py={3}>
            <Text fontSize="sm" color="sealwax.700" fontWeight={700}>
              투표가 시작되어 후보 구조가 잠겼습니다. 아래 정보는 읽기
              전용입니다.
            </Text>
          </Box>
        )}

        <Stack gap={6}>
          {candidates.map((c, i) => (
            <CandidateAdminCard
              key={c.id}
              candidate={c}
              policies={policiesByCandidate.get(c.id) ?? []}
              structureLocked={structureLocked}
              index={i}
            />
          ))}

          {candidates.length === 0 && (
            <Box border="1px dashed" borderColor="ink.300" borderRadius="2px" p={8} textAlign="center">
              <Text color="fg.muted">등록된 후보가 없습니다.</Text>
            </Box>
          )}

          {!structureLocked && (
            <Box
              bg="bg.surface"
              border="2px dashed"
              borderColor="booth.400"
              borderRadius="2px"
              p={{ base: 5, md: 6 }}
            >
              <Text fontFamily="heading" fontWeight={800} fontSize="lg" mb={4}>
                새 후보 등록
              </Text>
              <ActionForm action={saveCandidateAction} submitLabel="후보 등록">
                <input type="hidden" name="electionId" value={electionId} />
                <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr" }} gap={3}>
                  <Field label="이름">
                    <Input name="name" required size="sm" bg="bg.surface" />
                  </Field>
                  <Field label="표시 순서">
                    <Input name="displayOrder" type="number" defaultValue={candidates.length} size="sm" bg="bg.surface" />
                  </Field>
                  <Field label="상징색 (hex)">
                    <Input name="colorHint" placeholder="#34506B" size="sm" bg="bg.surface" />
                  </Field>
                </Grid>
                <Field label="슬로건">
                  <Input name="slogan" size="sm" bg="bg.surface" />
                </Field>
                <Field label="짧은 소개">
                  <Input name="shortIntro" size="sm" bg="bg.surface" />
                </Field>
                <Field label="상세 프로필">
                  <Textarea name="profile" rows={3} size="sm" bg="bg.surface" />
                </Field>
              </ActionForm>
            </Box>
          )}
        </Stack>
      </Stack>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text as="label" fontSize="xs" fontWeight={700} color="fg.muted" display="block" mb={1}>
        {label}
      </Text>
      {children}
    </Box>
  );
}

import { Box, Button, Flex, Grid, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { ActionForm } from "./ActionForm";
import {
  deleteCandidateAction,
  deletePolicyAction,
  saveCandidateAction,
  savePolicyAction,
  uploadPosterAction,
} from "@/server/actions/admin";
import type { Candidate, CandidatePolicy } from "@/server/types";

/**
 * 후보 관리 카드 — 기본 정보 / 포스터 / 공약을 한 카드에서 관리.
 * structureLocked(투표 시작 후)면 모든 수정 UI를 숨기고 읽기 전용으로 보여준다.
 */
export function CandidateAdminCard({
  candidate,
  policies,
  structureLocked,
  index,
}: {
  candidate: Candidate;
  policies: CandidatePolicy[];
  structureLocked: boolean;
  index: number;
}) {
  return (
    <Box
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      boxShadow="paper"
      borderRadius="2px"
      overflow="hidden"
    >
      <Flex
        px={5}
        py={3}
        bg="bg.sunken"
        borderBottom="1px solid"
        borderColor="border.default"
        align="center"
        justify="space-between"
        gap={3}
      >
        <Text fontFamily="heading" fontWeight={800} fontSize="lg">
          기호 {index + 1}번 · {candidate.name}
        </Text>
        {!structureLocked && (
          <form action={deleteCandidateAction}>
            <input type="hidden" name="electionId" value={candidate.electionId} />
            <input type="hidden" name="candidateId" value={candidate.id} />
            <Button type="submit" size="xs" variant="outline" borderColor="sealwax.500" color="sealwax.700">
              후보 삭제
            </Button>
          </form>
        )}
      </Flex>

      <Grid templateColumns={{ base: "1fr", lg: "200px 1fr" }} gap={6} p={5}>
        {/* 포스터 */}
        <Stack gap={3}>
          <Box
            aspectRatio="3/4"
            borderRadius="2px"
            overflow="hidden"
            border="1px solid"
            borderColor="border.default"
            bg="paper.100"
          >
            {candidate.posterId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/posters/${candidate.posterId}`}
                alt={`${candidate.name} 포스터`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Flex h="100%" align="center" justify="center">
                <Text fontSize="xs" color="fg.subtle">
                  포스터 없음
                </Text>
              </Flex>
            )}
          </Box>
          {!structureLocked && (
            <form action={uploadPosterAction}>
              <input type="hidden" name="electionId" value={candidate.electionId} />
              <input type="hidden" name="candidateId" value={candidate.id} />
              <Stack gap={2}>
                <input
                  type="file"
                  name="poster"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  required
                  style={{ fontSize: "12px", maxWidth: "200px" }}
                  aria-label={`${candidate.name} 포스터 파일 선택`}
                />
                <Button type="submit" size="xs" variant="outline" borderColor="ink.700" color="ink.900">
                  포스터 업로드 (3MB 이하)
                </Button>
              </Stack>
            </form>
          )}
        </Stack>

        {/* 기본 정보 + 공약 */}
        <Stack gap={6}>
          {structureLocked ? (
            <Stack gap={2}>
              {candidate.slogan && (
                <Text fontFamily="heading" color="ink.700">“{candidate.slogan}”</Text>
              )}
              {candidate.shortIntro && <Text fontSize="sm">{candidate.shortIntro}</Text>}
              {candidate.profile && (
                <Text fontSize="sm" color="fg.muted" whiteSpace="pre-wrap">
                  {candidate.profile}
                </Text>
              )}
            </Stack>
          ) : (
            <ActionForm action={saveCandidateAction} submitLabel="후보 정보 저장">
              <input type="hidden" name="electionId" value={candidate.electionId} />
              <input type="hidden" name="candidateId" value={candidate.id} />
              <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr" }} gap={3}>
                <MiniField label="이름">
                  <Input name="name" defaultValue={candidate.name} required size="sm" bg="bg.surface" />
                </MiniField>
                <MiniField label="표시 순서">
                  <Input name="displayOrder" type="number" defaultValue={candidate.displayOrder} size="sm" bg="bg.surface" />
                </MiniField>
                <MiniField label="상징색 (hex)">
                  <Input name="colorHint" defaultValue={candidate.colorHint ?? ""} placeholder="#34506B" size="sm" bg="bg.surface" />
                </MiniField>
              </Grid>
              <MiniField label="슬로건">
                <Input name="slogan" defaultValue={candidate.slogan ?? ""} size="sm" bg="bg.surface" />
              </MiniField>
              <MiniField label="짧은 소개">
                <Input name="shortIntro" defaultValue={candidate.shortIntro ?? ""} size="sm" bg="bg.surface" />
              </MiniField>
              <MiniField label="상세 프로필">
                <Textarea name="profile" defaultValue={candidate.profile ?? ""} rows={4} size="sm" bg="bg.surface" />
              </MiniField>
            </ActionForm>
          )}

          {/* 공약 */}
          <Box>
            <Text fontSize="xs" fontWeight={800} color="fg.muted" letterSpacing="0.12em" textTransform="uppercase" mb={3}>
              정책 · 공약 ({policies.length})
            </Text>
            <Stack gap={4}>
              {policies.map((p) =>
                structureLocked ? (
                  <Box key={p.id} bg="paper.50" border="1px solid" borderColor="paper.300" borderRadius="sm" px={4} py={3}>
                    <Text fontWeight={700} fontSize="sm">{p.title}</Text>
                    <Text fontSize="sm" color="fg.muted" whiteSpace="pre-wrap">{p.body}</Text>
                  </Box>
                ) : (
                  <Box key={p.id} bg="paper.50" border="1px solid" borderColor="paper.300" borderRadius="sm" p={4}>
                    <ActionForm action={savePolicyAction} submitLabel="공약 저장" submitProps={{ size: "xs" }}>
                      <input type="hidden" name="electionId" value={candidate.electionId} />
                      <input type="hidden" name="candidateId" value={candidate.id} />
                      <input type="hidden" name="policyId" value={p.id} />
                      <Grid templateColumns={{ base: "1fr", md: "3fr 1fr" }} gap={3}>
                        <MiniField label="공약 제목">
                          <Input name="title" defaultValue={p.title} required size="sm" bg="bg.surface" />
                        </MiniField>
                        <MiniField label="순서">
                          <Input name="displayOrder" type="number" defaultValue={p.displayOrder} size="sm" bg="bg.surface" />
                        </MiniField>
                      </Grid>
                      <MiniField label="내용">
                        <Textarea name="body" defaultValue={p.body} required rows={2} size="sm" bg="bg.surface" />
                      </MiniField>
                    </ActionForm>
                    <form action={deletePolicyAction} style={{ marginTop: "8px" }}>
                      <input type="hidden" name="electionId" value={candidate.electionId} />
                      <input type="hidden" name="policyId" value={p.id} />
                      <Button type="submit" size="xs" variant="ghost" color="sealwax.700">
                        이 공약 삭제
                      </Button>
                    </form>
                  </Box>
                ),
              )}

              {!structureLocked && (
                <Box border="1px dashed" borderColor="ink.300" borderRadius="sm" p={4}>
                  <Text fontSize="sm" fontWeight={700} mb={3}>
                    새 공약 추가
                  </Text>
                  <ActionForm action={savePolicyAction} submitLabel="공약 추가" submitProps={{ size: "xs" }}>
                    <input type="hidden" name="electionId" value={candidate.electionId} />
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <Grid templateColumns={{ base: "1fr", md: "3fr 1fr" }} gap={3}>
                      <MiniField label="공약 제목">
                        <Input name="title" required size="sm" bg="bg.surface" />
                      </MiniField>
                      <MiniField label="순서">
                        <Input name="displayOrder" type="number" defaultValue={policies.length} size="sm" bg="bg.surface" />
                      </MiniField>
                    </Grid>
                    <MiniField label="내용">
                      <Textarea name="body" required rows={2} size="sm" bg="bg.surface" />
                    </MiniField>
                  </ActionForm>
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>
      </Grid>
    </Box>
  );
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text as="label" fontSize="xs" fontWeight={700} color="fg.muted" display="block" mb={1}>
        {label}
      </Text>
      {children}
    </Box>
  );
}

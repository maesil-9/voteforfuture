"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Box,
  Button,
  chakra,
  Flex,
  Grid,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  selectCandidateAction,
  type SelectState,
} from "@/server/actions/vote";

export type CandidateView = {
  id: string;
  name: string;
  slogan: string | null;
  shortIntro: string | null;
  profile: string | null;
  colorHint: string | null;
  posterId: string | null;
  policies: { id: string; title: string; body: string }[];
};

const FALLBACK_HINTS = ["#34506B", "#5A7D5A", "#A87A24", "#7C5869"];

function hintOf(c: CandidateView, index: number): string {
  return c.colorHint?.trim() || FALLBACK_HINTS[index % FALLBACK_HINTS.length];
}

/**
 * VotingBooth — 후보 포스터 벽 + 후보 서류철(dossier) + 선택 진행 바.
 * 모바일: 가로 스냅 포스터 스트립 / 데스크톱: 좌측 포스터 레일 + 우측 상세.
 */
export function VotingBooth({
  electionId,
  candidates,
}: {
  electionId: string;
  candidates: CandidateView[];
}) {
  const [activeId, setActiveId] = useState(candidates[0]?.id ?? "");
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<SelectState, FormData>(
    selectCandidateAction,
    {},
  );

  const active = useMemo(
    () => candidates.find((c) => c.id === activeId) ?? candidates[0],
    [candidates, activeId],
  );
  const chosen = candidates.find((c) => c.id === chosenId) ?? null;

  if (!active) {
    return (
      <Text color="fg.muted" textAlign="center" py={12}>
        등록된 후보가 아직 없습니다.
      </Text>
    );
  }

  return (
    <Box pb="120px">
      <Grid templateColumns={{ base: "1fr", md: "240px 1fr" }} gap={{ base: 6, md: 10 }}>
        {/* 포스터 벽 */}
        <Box
          as="nav"
          aria-label="후보 포스터 벽"
          position={{ md: "sticky" }}
          top={{ md: 6 }}
          alignSelf="start"
        >
          <Flex
            direction={{ base: "row", md: "column" }}
            gap={4}
            overflowX={{ base: "auto", md: "visible" }}
            scrollSnapType={{ base: "x mandatory", md: "none" }}
            pb={{ base: 2, md: 0 }}
            mx={{ base: -1, md: 0 }}
            px={{ base: 1, md: 0 }}
          >
            {candidates.map((c, i) => (
              <PosterCard
                key={c.id}
                candidate={c}
                index={i}
                isActive={c.id === active.id}
                isChosen={c.id === chosenId}
                onView={() => setActiveId(c.id)}
              />
            ))}
          </Flex>
        </Box>

        {/* 후보 서류철 */}
        <CandidateDossier
          key={active.id}
          candidate={active}
          index={candidates.indexOf(active)}
          isChosen={active.id === chosenId}
          onChoose={() => setChosenId(active.id)}
          onUnchoose={() => setChosenId(null)}
        />
      </Grid>

      {/* 하단 고정 진행 바 */}
      <Box
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        bg="bg.surface"
        borderTop="3px double"
        borderColor="ink.700"
        boxShadow="0 -8px 24px -12px rgba(42,39,24,0.25)"
        zIndex={10}
      >
        <Flex
          maxW="4xl"
          mx="auto"
          px={{ base: 4, md: 6 }}
          py={3}
          align="center"
          gap={4}
          justify="space-between"
        >
          <Box minW={0}>
            {chosen ? (
              <>
                <Text fontSize="2xs" color="fg.muted" letterSpacing="0.12em" textTransform="uppercase">
                  나의 선택
                </Text>
                <Text fontFamily="heading" fontWeight={700} truncate>
                  기호 {candidates.indexOf(chosen) + 1}번 · {chosen.name}
                </Text>
              </>
            ) : (
              <Text fontSize="sm" color="fg.muted">
                후보를 살펴보고 한 명을 선택해주세요.
              </Text>
            )}
            {state.error && (
              <Text role="alert" fontSize="xs" color="sealwax.700" fontWeight={600}>
                {state.error}
              </Text>
            )}
          </Box>
          <form action={formAction}>
            <input type="hidden" name="electionId" value={electionId} />
            <input type="hidden" name="candidateId" value={chosenId ?? ""} />
            <Button
              type="submit"
              size="lg"
              disabled={!chosenId}
              bg="booth.600"
              color="paper.50"
              _hover={{ bg: "booth.700" }}
              fontWeight={700}
              loading={pending}
              loadingText="이동 중…"
              flexShrink={0}
            >
              선택 확인으로
            </Button>
          </form>
        </Flex>
      </Box>
    </Box>
  );
}

function PosterCard({
  candidate,
  index,
  isActive,
  isChosen,
  onView,
}: {
  candidate: CandidateView;
  index: number;
  isActive: boolean;
  isChosen: boolean;
  onView: () => void;
}) {
  const hint = hintOf(candidate, index);
  return (
    <chakra.button
      type="button"
      onClick={onView}
      aria-pressed={isActive}
      aria-label={`기호 ${index + 1}번 ${candidate.name} 포스터 보기`}
      scrollSnapAlign="start"
      flexShrink={0}
      w={{ base: "150px", md: "100%" }}
      textAlign="left"
      cursor="pointer"
      transition="transform 0.15s ease, box-shadow 0.15s ease"
      transform={isActive ? "translateY(-2px)" : undefined}
      _focusVisible={{ outline: "3px solid", outlineColor: "stamp.500", outlineOffset: "3px" }}
    >
      <Box
        position="relative"
        aspectRatio="3/4"
        borderRadius="2px"
        overflow="hidden"
        boxShadow={isActive ? "paperLift" : "paper"}
        border="1px solid"
        borderColor={isActive ? "ink.700" : "border.default"}
      >
        {candidate.posterId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/posters/${candidate.posterId}`}
            alt={`${candidate.name} 선거 포스터`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Flex
            direction="column"
            h="100%"
            p={3}
            justify="space-between"
            style={{ backgroundColor: hint }}
            color="paper.50"
          >
            <Text fontSize="2xs" letterSpacing="0.2em" opacity={0.8}>
              POSTER
            </Text>
            <Text fontFamily="heading" fontWeight={900} fontSize="2xl" lineHeight={1.2}>
              {candidate.name}
            </Text>
          </Flex>
        )}
        {/* 기호 번호표 */}
        <Flex
          position="absolute"
          top={2}
          left={2}
          bg="paper.50"
          color="ink.900"
          boxSize="28px"
          borderRadius="full"
          align="center"
          justify="center"
          fontFamily="heading"
          fontWeight={900}
          fontSize="sm"
          boxShadow="0 1px 3px rgba(42,39,24,0.3)"
        >
          {index + 1}
        </Flex>
        {isChosen && (
          <Flex
            position="absolute"
            inset={0}
            bg="rgba(42,39,24,0.45)"
            align="center"
            justify="center"
          >
            <Box
              border="3px solid"
              borderColor="stamp.300"
              color="stamp.300"
              borderRadius="full"
              px={3}
              py={1}
              transform="rotate(-12deg)"
              fontFamily="heading"
              fontWeight={900}
            >
              선택함
            </Box>
          </Flex>
        )}
      </Box>
      <Text
        mt={2}
        fontSize="sm"
        fontWeight={isActive ? 800 : 600}
        color={isActive ? "fg.default" : "fg.muted"}
        truncate
      >
        기호 {index + 1}번 · {candidate.name}
      </Text>
    </chakra.button>
  );
}

function CandidateDossier({
  candidate,
  index,
  isChosen,
  onChoose,
  onUnchoose,
}: {
  candidate: CandidateView;
  index: number;
  isChosen: boolean;
  onChoose: () => void;
  onUnchoose: () => void;
}) {
  const hint = hintOf(candidate, index);
  return (
    <Box as="article" aria-label={`${candidate.name} 후보 정보`}>
      <Box
        bg="bg.surface"
        boxShadow="paper"
        borderRadius="2px"
        border="1px solid"
        borderColor="border.default"
        overflow="hidden"
      >
        {/* 후보 헤더 */}
        <Box px={{ base: 5, md: 8 }} pt={{ base: 5, md: 7 }} pb={5} position="relative">
          <Box
            aria-hidden
            position="absolute"
            top={0}
            left={0}
            right={0}
            h="6px"
            style={{ backgroundColor: hint }}
          />
          <Text fontSize="xs" color="fg.muted" letterSpacing="0.14em" mb={1}>
            기호 {index + 1}번
          </Text>
          <Text as="h2" fontFamily="heading" fontWeight={900} fontSize={{ base: "2xl", md: "3xl" }}>
            {candidate.name}
          </Text>
          {candidate.slogan && (
            <Text
              mt={3}
              fontFamily="heading"
              fontSize={{ base: "lg", md: "xl" }}
              color="ink.700"
              borderLeft="3px solid"
              borderColor="stamp.500"
              pl={4}
            >
              “{candidate.slogan}”
            </Text>
          )}
          {candidate.shortIntro && (
            <Text mt={3} color="fg.muted" fontSize="md">
              {candidate.shortIntro}
            </Text>
          )}
        </Box>

        {candidate.profile && (
          <Box px={{ base: 5, md: 8 }} py={5} borderTop="1px dashed" borderColor="paper.300">
            <SectionLabel>후보 프로필</SectionLabel>
            <Text whiteSpace="pre-wrap" color="ink.700">
              {candidate.profile}
            </Text>
          </Box>
        )}

        {candidate.policies.length > 0 && (
          <Box px={{ base: 5, md: 8 }} py={5} borderTop="1px dashed" borderColor="paper.300">
            <SectionLabel>정책 · 공약</SectionLabel>
            <PolicyManifesto policies={candidate.policies} hint={hint} />
          </Box>
        )}

        {/* 선택 영역 */}
        <Flex
          px={{ base: 5, md: 8 }}
          py={5}
          borderTop="1px solid"
          borderColor="border.default"
          bg="bg.sunken"
          justify="center"
        >
          {isChosen ? (
            <Button
              type="button"
              onClick={onUnchoose}
              variant="outline"
              size="lg"
              borderColor="ink.700"
              color="ink.900"
              fontWeight={700}
            >
              선택 취소
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onChoose}
              size="lg"
              bg="ink.900"
              color="paper.50"
              _hover={{ bg: "ink.700" }}
              fontWeight={700}
            >
              이 후보를 선택
            </Button>
          )}
        </Flex>
      </Box>
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="xs"
      fontWeight={800}
      color="fg.muted"
      letterSpacing="0.14em"
      textTransform="uppercase"
      mb={3}
    >
      {children}
    </Text>
  );
}

/** 정책 공약 — 채팅 버블 리듬을 은유한 manifesto strip */
function PolicyManifesto({
  policies,
  hint,
}: {
  policies: { id: string; title: string; body: string }[];
  hint: string;
}) {
  return (
    <Stack gap={3}>
      {policies.map((p, i) => (
        <Box
          key={p.id}
          maxW={{ base: "100%", md: "85%" }}
          ml={{ md: i % 2 === 1 ? "auto" : 0 }}
          bg="paper.50"
          border="1px solid"
          borderColor="paper.300"
          borderRadius="lg"
          borderTopLeftRadius={i % 2 === 0 ? "2px" : "lg"}
          borderTopRightRadius={i % 2 === 1 ? "2px" : "lg"}
          px={4}
          py={3}
        >
          <Flex gap={2} align="baseline" mb={1}>
            <Text
              fontFamily="heading"
              fontWeight={900}
              fontSize="sm"
              style={{ color: hint }}
            >
              {String(i + 1).padStart(2, "0")}
            </Text>
            <Text fontWeight={800} fontSize="md">
              {p.title}
            </Text>
          </Flex>
          <Text fontSize="sm" color="ink.700" whiteSpace="pre-wrap">
            {p.body}
          </Text>
        </Box>
      ))}
    </Stack>
  );
}

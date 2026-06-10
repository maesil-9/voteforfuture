"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";

export type ReplayAct = {
  candidateId: string;
  name: string;
  slogan: string | null;
  colorHint: string | null;
  isWinner: boolean;
  messages: string[];
};

type Slide =
  | { kind: "opening" }
  | { kind: "intro"; act: ReplayAct; actIndex: number }
  | { kind: "message"; act: ReplayAct; text: string; nth: number }
  | { kind: "end" };

const OPENING_MS = 3000;
const INTRO_MS = 2800;
const MESSAGE_MS = 4200;
const FALLBACK_HINTS = ["#34506B", "#5A7D5A", "#A87A24", "#7C5869"];

function hintOf(act: ReplayAct, i: number): string {
  return act.colorHint?.trim() || FALLBACK_HINTS[i % FALLBACK_HINTS.length];
}

function slideDuration(slide: Slide): number {
  if (slide.kind === "opening") return OPENING_MS;
  if (slide.kind === "intro") return INTRO_MS;
  if (slide.kind === "message") return MESSAGE_MS;
  return Infinity; // end 슬라이드는 자동 진행 없음
}

/**
 * 한 마디 상영관 — 결과 확정 후, 후보별로 도착한 익명 메시지를
 * 스토리 UI(상단 진행 바 + 탭 이동 + 자동 재생)로 한 장씩 보여준다.
 * 모바일 풀스크린 우선. prefers-reduced-motion은 전역 CSS가 처리한다.
 */
export function MessageReplayTheater({
  electionId,
  electionTitle,
  acts,
}: {
  electionId: string;
  electionTitle: string;
  acts: ReplayAct[];
}) {
  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = [{ kind: "opening" }];
    acts.forEach((act, actIndex) => {
      list.push({ kind: "intro", act, actIndex });
      act.messages.forEach((text, nth) =>
        list.push({ kind: "message", act, text, nth }),
      );
    });
    list.push({ kind: "end" });
    return list;
  }, [acts]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [entered, setEntered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slide = slides[index];
  const duration = slideDuration(slide);

  // 슬라이드 등장 트랜지션 트리거
  useEffect(() => {
    setEntered(false);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, [index]);

  // 자동 진행
  useEffect(() => {
    if (paused || !Number.isFinite(duration)) return;
    timerRef.current = setTimeout(
      () => setIndex((i) => Math.min(i + 1, slides.length - 1)),
      duration,
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused, duration, slides.length]);

  const go = (delta: number) =>
    setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + delta)));

  // 배경색: 현재 막(act)의 후보 색을 어둡게 깐다
  const actIndex =
    slide.kind === "intro"
      ? slide.actIndex
      : slide.kind === "message"
        ? acts.indexOf(slide.act)
        : -1;
  const bgHint = actIndex >= 0 ? hintOf(acts[actIndex], actIndex) : "#26241F";

  return (
    <Flex
      direction="column"
      h="100dvh"
      style={{ backgroundColor: bgHint }}
      transition="background-color 0.8s ease"
      backgroundImage="radial-gradient(ellipse at 50% 120%, rgba(251,248,241,0.16), transparent 60%)"
      color="paper.50"
      position="relative"
      overflow="hidden"
      userSelect="none"
    >
      {/* 상단 진행 바 (스토리 스타일) */}
      <Flex gap="3px" px={3} pt={3} aria-hidden>
        {slides.map((s, i) => (
          <Box key={i} flex="1" h="3px" bg="rgba(251,248,241,0.28)" borderRadius="full" overflow="hidden">
            <Box
              h="100%"
              bg="paper.50"
              borderRadius="full"
              w={i < index ? "100%" : i > index ? "0%" : entered && !paused && Number.isFinite(duration) ? "100%" : "0%"}
              transition={
                i === index && entered && !paused && Number.isFinite(duration)
                  ? `width ${duration}ms linear`
                  : "none"
              }
            />
          </Box>
        ))}
      </Flex>

      {/* 헤더 */}
      <Flex px={4} py={3} align="center" justify="space-between">
        <Text fontSize="2xs" letterSpacing="0.22em" textTransform="uppercase" opacity={0.7}>
          {electionTitle} — 한 마디 상영관
        </Text>
        <Button
          size="2xs"
          variant="outline"
          borderColor="rgba(251,248,241,0.5)"
          color="paper.50"
          _hover={{ bg: "rgba(251,248,241,0.12)" }}
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "재생" : "일시정지"}
        >
          {paused ? "▶ 재생" : "❚❚ 멈춤"}
        </Button>
      </Flex>

      {/* 본문 슬라이드 */}
      <Flex
        flex="1"
        align="center"
        justify="center"
        px={{ base: 7, md: 12 }}
        textAlign="center"
        key={index}
        opacity={entered ? 1 : 0}
        transform={entered ? "translateY(0)" : "translateY(18px)"}
        transition="opacity 0.7s ease, transform 0.7s ease"
      >
        {slide.kind === "opening" && (
          <Stack gap={4} align="center">
            <Text fontSize="xs" letterSpacing="0.3em" opacity={0.7} textTransform="uppercase">
              개표 완료 기념
            </Text>
            <Text fontFamily="heading" fontWeight={900} fontSize={{ base: "3xl", md: "5xl" }} lineHeight={1.3}>
              투표함에서 나온
              <br />
              한 마디들
            </Text>
            <Text fontSize="sm" opacity={0.75}>
              모든 메시지는 익명입니다
            </Text>
          </Stack>
        )}

        {slide.kind === "intro" && (
          <Stack gap={3} align="center">
            <Text fontSize="xs" letterSpacing="0.26em" opacity={0.75} textTransform="uppercase">
              {slide.act.isWinner ? "당선자에게 도착한 한 마디" : "후보에게 도착한 한 마디"}
            </Text>
            <Text fontFamily="heading" fontWeight={900} fontSize={{ base: "4xl", md: "6xl" }}>
              {slide.act.name}
            </Text>
            {slide.act.slogan && (
              <Text fontFamily="heading" fontSize={{ base: "md", md: "xl" }} opacity={0.85}>
                “{slide.act.slogan}”
              </Text>
            )}
            <Text fontSize="sm" opacity={0.7}>
              {slide.act.messages.length}통
            </Text>
          </Stack>
        )}

        {slide.kind === "message" && (
          <Stack gap={6} align="center" maxW="2xl">
            <Text aria-hidden fontFamily="heading" fontSize="5xl" lineHeight={0.5} opacity={0.4}>
              “
            </Text>
            <Text
              fontFamily="heading"
              fontWeight={700}
              fontSize={{ base: "2xl", md: "4xl" }}
              lineHeight={1.5}
              wordBreak="keep-all"
            >
              {slide.text}
            </Text>
            <Text fontSize="xs" letterSpacing="0.18em" opacity={0.65} textTransform="uppercase">
              to. {slide.act.name} · {slide.nth + 1}/{slide.act.messages.length}
            </Text>
          </Stack>
        )}

        {slide.kind === "end" && (
          <Stack gap={6} align="center">
            <Text fontFamily="heading" fontWeight={900} fontSize={{ base: "3xl", md: "5xl" }}>
              막이 내렸습니다
            </Text>
            <Text fontSize="sm" opacity={0.75}>
              소중한 한 표와 한 마디, 모두 고마웠어요.
            </Text>
            <Flex gap={3} wrap="wrap" justify="center">
              <Button
                onClick={() => setIndex(0)}
                bg="paper.50"
                color="ink.900"
                _hover={{ bg: "paper.200" }}
                fontWeight={700}
              >
                다시 보기
              </Button>
              <Button
                asChild
                variant="outline"
                borderColor="rgba(251,248,241,0.6)"
                color="paper.50"
                _hover={{ bg: "rgba(251,248,241,0.12)" }}
                fontWeight={700}
              >
                <NextLink href={`/results/${electionId}`}>결과 페이지로</NextLink>
              </Button>
            </Flex>
          </Stack>
        )}
      </Flex>

      {/* 좌/우 탭 내비게이션 (모바일 스토리 제스처) */}
      <Box
        as="button"
        aria-label="이전 메시지"
        position="absolute"
        left={0}
        top="60px"
        bottom={0}
        w="34%"
        cursor="pointer"
        onClick={() => go(-1)}
      />
      <Box
        as="button"
        aria-label="다음 메시지"
        position="absolute"
        right={0}
        top="60px"
        bottom={0}
        w="34%"
        cursor="pointer"
        onClick={() => go(1)}
      />

      <Text pb={4} textAlign="center" fontSize="2xs" opacity={0.55}>
        화면 좌/우를 누르면 넘길 수 있어요
      </Text>
    </Flex>
  );
}

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
  | { kind: "credits" }
  | { kind: "end" };

const OPENING_MS = 3000;
const INTRO_MS = 2800;
const MESSAGE_MS = 4200;
const FALLBACK_HINTS = ["#34506B", "#5A7D5A", "#A87A24", "#7C5869"];

function hintOf(act: ReplayAct, i: number): string {
  return act.colorHint?.trim() || FALLBACK_HINTS[i % FALLBACK_HINTS.length];
}

/**
 * 한 마디 상영관 — 결과 확정 후, 후보별로 도착한 익명 메시지를
 * 스토리 UI(상단 진행 바 + 탭 이동 + 자동 재생)로 한 장씩 보여준다.
 * 엔딩 크레딧과 박수, BGM(파일이 있을 때)을 곁들인 모바일 풀스크린 극장.
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
  const totalMessages = useMemo(
    () => acts.reduce((sum, a) => sum + a.messages.length, 0),
    [acts],
  );
  // 크레딧 롤 길이는 분량에 비례 (8~16초)
  const creditsMs = Math.min(16000, 8000 + totalMessages * 400 + acts.length * 600);

  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = [{ kind: "opening" }];
    acts.forEach((act, actIndex) => {
      list.push({ kind: "intro", act, actIndex });
      act.messages.forEach((text, nth) =>
        list.push({ kind: "message", act, text, nth }),
      );
    });
    list.push({ kind: "credits" });
    list.push({ kind: "end" });
    return list;
  }, [acts]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [entered, setEntered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slide = slides[index];
  const duration =
    slide.kind === "opening"
      ? OPENING_MS
      : slide.kind === "intro"
        ? INTRO_MS
        : slide.kind === "message"
          ? MESSAGE_MS
          : slide.kind === "credits"
            ? creditsMs
            : Infinity; // end 슬라이드는 자동 진행 없음

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

  // ---------- 박수 (렉 방지: 상태 없이 DOM 직접 조작 + transform/opacity만 애니메이션) ----------
  const clapHostRef = useRef<HTMLDivElement>(null);
  function spawnClap() {
    const host = clapHostRef.current;
    if (!host || host.childElementCount > 36) return; // 동시 파티클 상한
    const el = document.createElement("span");
    el.textContent = ["👏", "🎉", "💛", "🗳️"][Math.floor(Math.random() * 4)];
    el.className = "cv-clap";
    el.style.left = `${42 + Math.random() * 16}%`;
    el.style.fontSize = `${22 + Math.random() * 16}px`;
    el.style.setProperty("--drift", `${(Math.random() - 0.5) * 120}px`);
    el.style.animationDuration = `${1.4 + Math.random() * 0.8}s`;
    el.addEventListener("animationend", () => el.remove(), { once: true });
    host.appendChild(el);
  }

  // ---------- BGM: 음중달 - 빈 방 (YouTube 임베드) ----------
  // 주의: YouTube 약관상 플레이어를 완전히 숨길 수 없어 좌하단 미니 플레이어로 표시한다.
  const BGM_YOUTUBE_ID = "2xSqTnSmpKM"; // [가사] 빈 방 - 음중달
  const [bgmOn, setBgmOn] = useState(false);

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
      {/* 박수/크레딧 keyframes */}
      <style>{`
        .cv-clap {
          position: absolute;
          bottom: 96px;
          will-change: transform, opacity;
          pointer-events: none;
          animation-name: cv-clap-float;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
        @keyframes cv-clap-float {
          from { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          to { transform: translate(var(--drift, 0px), -42vh) rotate(18deg); opacity: 0; }
        }
        @keyframes cv-credits-roll {
          from { transform: translateY(45%); }
          to { transform: translateY(-100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cv-clap { animation-duration: 0.01ms !important; }
        }
      `}</style>

      {/* BGM 미니 플레이어 — 토글 시에만 마운트 (클릭 제스처로 자동재생 허용) */}
      {bgmOn && (
        <Box
          position="absolute"
          bottom="64px"
          left="12px"
          zIndex={6}
          borderRadius="md"
          overflow="hidden"
          border="1px solid rgba(251,248,241,0.35)"
          boxShadow="0 4px 14px rgba(0,0,0,0.45)"
          opacity={0.85}
          _hover={{ opacity: 1 }}
          transition="opacity 0.2s ease"
        >
          <iframe
            width="168"
            height="95"
            src={`https://www.youtube.com/embed/${BGM_YOUTUBE_ID}?autoplay=1&playsinline=1&loop=1&playlist=${BGM_YOUTUBE_ID}`}
            title="배경음악 — 음중달, 빈 방"
            allow="autoplay; encrypted-media"
            style={{ border: 0, display: "block" }}
          />
        </Box>
      )}

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
      <Flex px={4} py={3} align="center" justify="space-between" gap={2}>
        <Text fontSize="2xs" letterSpacing="0.22em" textTransform="uppercase" opacity={0.7} truncate>
          {electionTitle} — 한 마디 상영관
        </Text>
        <Flex gap={2} flexShrink={0}>
          <Button
            size="2xs"
            variant="outline"
            borderColor="rgba(251,248,241,0.5)"
            color="paper.50"
            _hover={{ bg: "rgba(251,248,241,0.12)" }}
            onClick={() => setBgmOn((on) => !on)}
            aria-label={bgmOn ? "배경음악 끄기 (빈 방)" : "배경음악 켜기 (빈 방)"}
          >
            {bgmOn ? "🔊 빈 방" : "🔇 빈 방"}
          </Button>
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
        overflow="hidden"
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

        {slide.kind === "credits" && (
          <Box h="100%" w="100%" maxW="md" position="relative" overflow="hidden">
            <Stack
              gap={7}
              align="center"
              position="absolute"
              left={0}
              right={0}
              style={{
                animation: `cv-credits-roll ${creditsMs + 1200}ms linear forwards`,
              }}
            >
              <Text fontSize="xs" letterSpacing="0.3em" opacity={0.7} textTransform="uppercase" pt="16vh">
                ending credits
              </Text>
              <CreditSection title="출연">
                <Text fontSize="md">익명의 유권자 여러분</Text>
                <Text fontSize="sm" opacity={0.7}>
                  한 마디 {totalMessages}통
                </Text>
              </CreditSection>
              <CreditSection title="후보">
                {acts.map((a) => (
                  <Text key={a.candidateId} fontSize="md">
                    {a.name}
                    {a.isWinner ? " ★" : ""}{" "}
                    <Text as="span" fontSize="sm" opacity={0.7}>
                      — {a.messages.length}통
                    </Text>
                  </Text>
                ))}
              </CreditSection>
              <CreditSection title="제작진">
                <Text fontSize="md">연출 · 검수 — 방장</Text>
                <Text fontSize="md">집계 — 침착투표소</Text>
                <Text fontSize="md">보안 — 봉인된 투표함</Text>
              </CreditSection>
              <CreditSection title="special thanks">
                <Text fontSize="md">투표해주신 모든 분들</Text>
                <Text fontSize="md">그리고 [침착한 일상 이야기방]</Text>
              </CreditSection>
              <Text fontFamily="heading" fontWeight={900} fontSize="2xl" pt={6} pb="50vh">
                Fin.
              </Text>
            </Stack>
          </Box>
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

      {/* 박수 파티클 레이어 */}
      <Box ref={clapHostRef} aria-hidden position="absolute" inset={0} pointerEvents="none" overflow="hidden" />

      {/* 좌/우 탭 내비게이션 (모바일 스토리 제스처) */}
      <Box
        as="button"
        aria-label="이전 메시지"
        position="absolute"
        left={0}
        top="60px"
        bottom="120px"
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
        bottom="120px"
        w="34%"
        cursor="pointer"
        onClick={() => go(1)}
      />

      {/* 박수 버튼 */}
      <Flex justify="center" pb={3} position="relative" zIndex={5}>
        <Button
          onPointerDown={spawnClap}
          size="lg"
          borderRadius="full"
          bg="rgba(251,248,241,0.14)"
          color="paper.50"
          border="1px solid"
          borderColor="rgba(251,248,241,0.4)"
          _hover={{ bg: "rgba(251,248,241,0.22)" }}
          _active={{ transform: "scale(0.94)" }}
          aria-label="박수 보내기"
        >
          👏 박수
        </Button>
      </Flex>

      <Text pb={3} textAlign="center" fontSize="2xs" opacity={0.55}>
        화면 좌/우를 누르면 넘길 수 있어요
      </Text>
    </Flex>
  );
}

function CreditSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={1.5} align="center">
      <Text fontSize="2xs" letterSpacing="0.28em" opacity={0.6} textTransform="uppercase">
        — {title} —
      </Text>
      {children}
    </Stack>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

type Phase = "sealed" | "cracking" | "done";

/**
 * 봉인 해제 인트로 — 결과 발표 후 첫 방문 시 한 번만,
 * 왁스 봉인이 갈라지며 결과가 드러나는 연출. 클릭하면 건너뛴다.
 */
export function SealRevealIntro({
  electionId,
  children,
}: {
  electionId: string;
  children: React.ReactNode;
}) {
  const storageKey = `cv-seal-intro-${electionId}`;
  const [phase, setPhase] = useState<Phase>("sealed");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (
      sessionStorage.getItem(storageKey) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPhase("done");
      return;
    }
    sessionStorage.setItem(storageKey, "1");
    const crack = setTimeout(() => setPhase("cracking"), 900);
    const finish = setTimeout(() => setPhase("done"), 2100);
    return () => {
      clearTimeout(crack);
      clearTimeout(finish);
    };
  }, [storageKey]);

  // SSR/첫 페인트에는 항상 컨텐츠를 보여준다 (JS 없거나 재방문이면 인트로 없음)
  const showOverlay = mounted && phase !== "done";

  return (
    <Box position="relative">
      {children}

      {showOverlay && (
        <Flex
          position="fixed"
          inset={0}
          zIndex={50}
          bg="paper.50"
          align="center"
          justify="center"
          direction="column"
          gap={6}
          cursor="pointer"
          onClick={() => setPhase("done")}
          opacity={phase === "cracking" ? 0 : 1}
          transition="opacity 0.9s ease 0.3s"
          aria-hidden
        >
          {/* 갈라지는 봉인: 좌/우 반쪽이 벌어진다 */}
          <Flex position="relative" boxSize="140px" align="center" justify="center">
            {(["left", "right"] as const).map((side) => (
              <Box
                key={side}
                position="absolute"
                top={0}
                left={side === "left" ? 0 : "50%"}
                w="50%"
                h="100%"
                overflow="hidden"
                transform={
                  phase === "cracking"
                    ? side === "left"
                      ? "translateX(-26px) rotate(-9deg)"
                      : "translateX(26px) rotate(9deg)"
                    : "none"
                }
                transition="transform 0.8s cubic-bezier(0.6, 0, 0.4, 1)"
              >
                <Flex
                  position="absolute"
                  top={0}
                  left={side === "left" ? 0 : "-100%"}
                  boxSize="140px"
                  borderRadius="full"
                  bg="sealwax.500"
                  color="paper.50"
                  align="center"
                  justify="center"
                  boxShadow="inset 0 0 0 5px rgba(251,248,241,0.35), 0 4px 10px rgba(42,39,24,0.35)"
                >
                  <Text fontFamily="heading" fontWeight={900} fontSize="4xl">
                    封
                  </Text>
                </Flex>
              </Box>
            ))}
          </Flex>
          <Box textAlign="center">
            <Text fontFamily="heading" fontWeight={700} fontSize="lg" color="ink.900">
              {phase === "cracking" ? "봉인이 해제되었습니다" : "투표함 봉인을 해제하는 중…"}
            </Text>
            <Text fontSize="xs" color="fg.subtle" mt={1}>
              화면을 누르면 바로 결과로 이동합니다
            </Text>
          </Box>
        </Flex>
      )}
    </Box>
  );
}

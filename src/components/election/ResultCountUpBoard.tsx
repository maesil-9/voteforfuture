"use client";

import { useEffect, useState } from "react";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";

type Item = {
  candidateId: string;
  name: string;
  votes: number;
  percent: number;
  colorHint: string | null;
  isWinner: boolean;
};

const COUNT_MS = 2400;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 개표 카운트업 보드 — 막대와 숫자가 0부터 차오르고,
 * 끝나면 당선 도장이 나타난다. reduced-motion이면 즉시 최종값.
 */
export function ResultCountUpBoard({
  items,
  isTie,
}: {
  items: Item[];
  isTie: boolean;
}) {
  const [t, setT] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_MS);
      setT(easeOutCubic(progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const done = t >= 1;

  return (
    <Box>
      <Text
        fontSize="xs"
        fontWeight={800}
        color="fg.muted"
        letterSpacing="0.14em"
        textTransform="uppercase"
        mb={4}
      >
        후보별 득표 {!done && "— 개표 중…"}
      </Text>
      <Stack gap={4}>
        {items.map((c) => {
          const votesNow = Math.round(c.votes * t);
          const percentNow = Math.round(c.percent * t * 10) / 10;
          return (
            <Box key={c.candidateId}>
              <Flex justify="space-between" align="baseline" mb={1.5}>
                <Text fontWeight={c.isWinner ? 800 : 600}>
                  {c.name}
                  <Text
                    as="span"
                    ml={2}
                    fontSize="xs"
                    color="stamp.700"
                    fontWeight={800}
                    opacity={done && c.isWinner ? 1 : 0}
                    transition="opacity 0.5s ease 0.2s"
                  >
                    {isTie ? "동률" : "당선"}
                  </Text>
                </Text>
                <Text fontFamily="heading" fontWeight={700} fontVariantNumeric="tabular-nums">
                  {votesNow}표{" "}
                  <Text as="span" fontSize="sm" color="fg.muted" fontWeight={500}>
                    ({percentNow}%)
                  </Text>
                </Text>
              </Flex>
              <Box
                h="12px"
                bg="paper.200"
                borderRadius="2px"
                border="1px solid"
                borderColor="paper.300"
                overflow="hidden"
              >
                <Box
                  h="100%"
                  w={`${c.percent * t}%`}
                  style={{ backgroundColor: c.colorHint?.trim() || undefined }}
                  bg={c.colorHint?.trim() ? undefined : c.isWinner ? "booth.600" : "ink.300"}
                />
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

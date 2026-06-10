"use client";

import { useActionState, useId, useRef } from "react";
import { Box, Button, chakra, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { enterCodeAction, type EnterCodeState } from "@/server/actions/vote";

/**
 * 초대장 코드 입력 패널.
 * 단순 input이 아니라 "선거 초대장"을 여는 경험:
 * 절취선 카드 + 자동 하이픈 포맷 + 붙여넣기 친화.
 */
export function CodeInvitationPanel({
  electionId,
  initialError,
}: {
  electionId: string;
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState<EnterCodeState, FormData>(
    enterCodeAction,
    { error: initialError },
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const errorId = useId();

  function formatAsTyping(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    e.target.value = raw.replace(/(.{4})(?=.)/g, "$1-");
  }

  return (
    <Box
      bg="bg.surface"
      boxShadow="paper"
      borderRadius="sm"
      border="1px solid"
      borderColor="border.default"
      overflow="hidden"
      maxW="md"
      mx="auto"
      w="100%"
    >
      <Box bg="booth.700" color="paper.50" px={6} py={4}>
        <Text fontSize="2xs" letterSpacing="0.24em" textTransform="uppercase" opacity={0.75}>
          Invitation
        </Text>
        <Text fontFamily="heading" fontWeight={700} fontSize="lg">
          내 투표 코드로 입장하기
        </Text>
      </Box>

      {/* 절취선 */}
      <Box aria-hidden borderTop="2px dashed" borderColor="paper.300" position="relative">
        <Box position="absolute" left="-8px" top="-8px" boxSize="16px" borderRadius="full" bg="bg.canvas" />
        <Box position="absolute" right="-8px" top="-8px" boxSize="16px" borderRadius="full" bg="bg.canvas" />
      </Box>

      <form action={formAction}>
        <Stack gap={4} p={{ base: 5, md: 6 }}>
          <input type="hidden" name="electionId" value={electionId} />
          <Box>
            <chakra.label htmlFor="voter-code" fontSize="sm" fontWeight={700} display="block" mb={2}>
              투표 코드
            </chakra.label>
            <Input
              ref={inputRef}
              id="voter-code"
              name="code"
              placeholder="CALM-0000-0000"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              onChange={formatAsTyping}
              aria-describedby={state.error ? errorId : hintId}
              aria-invalid={state.error ? true : undefined}
              size="xl"
              fontFamily="mono"
              fontSize="xl"
              letterSpacing="0.12em"
              textAlign="center"
              bg="paper.50"
              borderColor={state.error ? "sealwax.500" : "border.default"}
              _focusVisible={{ borderColor: "accent", boxShadow: "0 0 0 1px var(--chakra-colors-booth-600)" }}
            />
            {state.error ? (
              <Text id={errorId} role="alert" mt={2} fontSize="sm" color="sealwax.700" fontWeight={600}>
                {state.error}
              </Text>
            ) : (
              <Text id={hintId} mt={2} fontSize="xs" color="fg.subtle">
                대소문자와 하이픈(-)은 자동으로 정리됩니다. 그대로 붙여넣어도 좋아요.
              </Text>
            )}
          </Box>

          <Button
            type="submit"
            size="xl"
            bg="booth.600"
            color="paper.50"
            _hover={{ bg: "booth.700" }}
            _active={{ bg: "booth.800" }}
            fontWeight={700}
            loading={pending}
            loadingText="확인 중…"
          >
            투표소 입장
          </Button>

          <Flex justify="center">
            <Text fontSize="xs" color="fg.subtle" textAlign="center">
              코드는 1인 1회만 사용할 수 있으며, 입장 기록은 투표 내용과 연결되지 않습니다.
            </Text>
          </Flex>
        </Stack>
      </form>
    </Box>
  );
}

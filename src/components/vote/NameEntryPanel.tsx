"use client";

import { useActionState, useId } from "react";
import { Box, Button, chakra, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { enterNameAction, type EnterNameState } from "@/server/actions/vote";

/**
 * 방명록 패널 — 유권자가 오픈채팅 닉네임을 적고 기표소에 입장한다.
 * 잘못 적거나 남의 이름을 적으면 검수에서 무효 처리됨을 명확히 알린다.
 */
export function NameEntryPanel({
  electionId,
  initialError,
}: {
  electionId: string;
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState<EnterNameState, FormData>(
    enterNameAction,
    { error: initialError },
  );
  const hintId = useId();
  const errorId = useId();

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
          Visitor Book
        </Text>
        <Text fontFamily="heading" fontWeight={700} fontSize="lg">
          이름 적고 입장하기
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
            <chakra.label htmlFor="voter-name" fontSize="sm" fontWeight={700} display="block" mb={2}>
              오픈채팅 닉네임
            </chakra.label>
            <Input
              id="voter-name"
              name="voterName"
              placeholder="방에서 쓰는 닉네임 그대로"
              autoComplete="off"
              maxLength={30}
              spellCheck={false}
              aria-describedby={state.error ? errorId : hintId}
              aria-invalid={state.error ? true : undefined}
              size="xl"
              fontSize="lg"
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
                방장이 명단과 대조해 검수합니다. 닉네임이 다르거나 장난 제출은
                무효 처리돼요.
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
            기표소 입장
          </Button>

          <Flex justify="center">
            <Text fontSize="xs" color="fg.subtle" textAlign="center">
              이름은 1인 1회 투표 확인에만 쓰이며, 어떤 후보를 선택했는지와는
              연결되지 않습니다.
            </Text>
          </Flex>
        </Stack>
      </form>
    </Box>
  );
}

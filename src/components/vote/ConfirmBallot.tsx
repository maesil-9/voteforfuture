"use client";

import { useActionState, useState } from "react";
import NextLink from "next/link";
import { Box, Button, chakra, Flex, Stack, Text, Textarea } from "@chakra-ui/react";
import { submitVoteAction, type SubmitState } from "@/server/actions/vote";

/**
 * 최종 기표 확인 — 투표용지 모양의 확인 카드 + 봉인 제출 버튼.
 */
export function ConfirmBallot({
  electionId,
  candidateNumber,
  candidateName,
  slogan,
}: {
  electionId: string;
  candidateNumber: number;
  candidateName: string;
  slogan: string | null;
}) {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitVoteAction,
    {},
  );
  const [message, setMessage] = useState("");

  return (
    <Stack gap={6} maxW="md" mx="auto" w="100%">
      {/* 투표용지 */}
      <Box
        bg="bg.surface"
        border="1px solid"
        borderColor="ink.700"
        boxShadow="paperLift"
        borderRadius="2px"
        overflow="hidden"
      >
        <Box bg="ink.900" color="paper.50" textAlign="center" py={2.5}>
          <Text fontSize="xs" letterSpacing="0.3em" textTransform="uppercase">
            투표용지
          </Text>
        </Box>
        <Stack p={{ base: 6, md: 8 }} gap={4} textAlign="center">
          <Text fontSize="sm" color="fg.muted">
            아래 후보에게 기표합니다
          </Text>
          <Box>
            <Text fontSize="xs" color="fg.muted" letterSpacing="0.14em" mb={1}>
              기호 {candidateNumber}번
            </Text>
            <Text fontFamily="heading" fontWeight={900} fontSize="3xl">
              {candidateName}
            </Text>
            {slogan && (
              <Text mt={2} fontFamily="heading" color="ink.700">
                “{slogan}”
              </Text>
            )}
          </Box>
          {/* 기표 도장 미리보기 */}
          <Flex justify="center" aria-hidden>
            <Flex
              boxSize="56px"
              borderRadius="full"
              border="3px solid"
              borderColor="sealwax.500"
              color="sealwax.500"
              align="center"
              justify="center"
              fontFamily="heading"
              fontWeight={900}
              transform="rotate(-10deg)"
            >
              卜
            </Flex>
          </Flex>
        </Stack>
      </Box>

      <Box
        bg="stamp.100"
        border="1px solid"
        borderColor="stamp.300"
        borderRadius="sm"
        px={4}
        py={3}
      >
        <Text fontSize="sm" fontWeight={700} color="ink.900">
          이 선택은 제출 후 변경할 수 없습니다.
        </Text>
      </Box>

      {state.error && (
        <Text role="alert" fontSize="sm" color="sealwax.700" fontWeight={600} textAlign="center">
          {state.error}
        </Text>
      )}

      <form action={formAction}>
        <input type="hidden" name="electionId" value={electionId} />
        <Stack gap={3}>
          {/* 한 마디 (선택) — 선택값과 함께 봉인되어 결과 공개 후 익명으로만 열람 */}
          <Box
            bg="bg.surface"
            border="1px dashed"
            borderColor="ink.300"
            borderRadius="sm"
            p={4}
          >
            <Flex justify="space-between" align="baseline" mb={2}>
              <chakra.label htmlFor="vote-message" fontSize="sm" fontWeight={700}>
                한 마디 남기기 (선택)
              </chakra.label>
              <Text fontSize="xs" color={message.length >= 50 ? "sealwax.700" : "fg.subtle"}>
                {message.length}/50
              </Text>
            </Flex>
            <Textarea
              id="vote-message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 50))}
              maxLength={50}
              rows={2}
              placeholder="다음 방장에게, 혹은 우리 방에게 하고 싶은 말"
              bg="paper.50"
              fontSize="sm"
              resize="none"
            />
            <Text mt={1.5} fontSize="xs" color="fg.subtle">
              메시지는 투표지와 함께 봉인되며, 결과 발표 후 이름 없이 모아서
              공개될 수 있어요.
            </Text>
          </Box>
          <Button
            type="submit"
            size="2xl"
            w="100%"
            bg="sealwax.500"
            color="paper.50"
            _hover={{ bg: "sealwax.700" }}
            fontWeight={800}
            loading={pending}
            loadingText="봉인 중…"
          >
            투표 제출하고 봉인하기
          </Button>
          <Button asChild variant="ghost" color="fg.muted" disabled={pending}>
            <NextLink href={`/vote/${electionId}`}>후보 다시 보기</NextLink>
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}

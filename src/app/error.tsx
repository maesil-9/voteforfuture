"use client";

import { useEffect } from "react";
import NextLink from "next/link";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";

/**
 * 라우트 에러 화면.
 * 내부 정보(스택, SQL 에러 등)는 절대 노출하지 않고 digest만 참조용으로 보여준다.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <Flex minH="100dvh" bg="paper.50" align="center" justify="center" px={4}>
      <Stack align="center" gap={8} py={10} maxW="md" w="100%">
        <Box
          bg="#FFFEFA"
          border="1px solid"
          borderColor="paper.300"
          boxShadow="paper"
          borderRadius="2px"
          px={{ base: 8, md: 12 }}
          py={{ base: 10, md: 12 }}
          textAlign="center"
          w="100%"
        >
          <Text fontSize="xs" letterSpacing="0.3em" color="ink.500" textTransform="uppercase" mb={4}>
            침착투표소
          </Text>
          <Text fontFamily="heading" fontWeight={900} fontSize={{ base: "2xl", md: "3xl" }} color="ink.900">
            잠시 문제가 생겼습니다
          </Text>
          <Text mt={4} color="ink.500">
            일시적인 오류일 수 있어요. 다시 시도해도 반복되면
            <br />
            잠시 후에 방문해주세요. 투표 데이터는 안전하게 보관 중입니다.
          </Text>

          <Flex justify="center" mt={6} aria-hidden>
            <Flex
              boxSize="64px"
              borderRadius="full"
              border="3px solid"
              borderColor="sealwax.500"
              color="sealwax.500"
              align="center"
              justify="center"
              transform="rotate(-10deg)"
              fontFamily="heading"
              fontWeight={900}
              fontSize="sm"
            >
              점검중
            </Flex>
          </Flex>

          {error.digest && (
            <Text mt={6} fontSize="2xs" color="ink.300" fontFamily="mono">
              오류 코드: {error.digest}
            </Text>
          )}
        </Box>

        <Flex gap={3} wrap="wrap" justify="center">
          <Button
            onClick={reset}
            size="lg"
            bg="booth.600"
            color="paper.50"
            _hover={{ bg: "booth.700" }}
            fontWeight={700}
          >
            다시 시도
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            borderColor="ink.700"
            color="ink.900"
            fontWeight={700}
          >
            <NextLink href="/">처음으로</NextLink>
          </Button>
        </Flex>
      </Stack>
    </Flex>
  );
}

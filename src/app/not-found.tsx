import NextLink from "next/link";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { ElectionShell } from "@/components/layout/ElectionShell";

export const metadata = { title: "페이지를 찾을 수 없습니다" };

export default function NotFoundPage() {
  return (
    <ElectionShell>
      <Stack align="center" gap={8} py={{ base: 10, md: 16 }}>
        <Box
          bg="bg.surface"
          border="1px solid"
          borderColor="border.default"
          boxShadow="paper"
          borderRadius="2px"
          px={{ base: 8, md: 14 }}
          py={{ base: 10, md: 12 }}
          textAlign="center"
          maxW="md"
          w="100%"
          position="relative"
        >
          <Text fontSize="xs" letterSpacing="0.3em" color="fg.muted" textTransform="uppercase" mb={4}>
            안내
          </Text>
          <Text fontFamily="heading" fontWeight={900} fontSize={{ base: "2xl", md: "3xl" }}>
            여기엔 투표소가 없습니다
          </Text>
          <Text mt={4} color="fg.muted">
            주소가 잘못되었거나, 이미 정리된 페이지입니다.
            <br />
            입구로 돌아가 다시 찾아주세요.
          </Text>

          {/* 비어있는 기표소 도장 */}
          <Flex justify="center" mt={6} aria-hidden>
            <Flex
              boxSize="64px"
              borderRadius="full"
              border="3px dashed"
              borderColor="ink.300"
              color="ink.300"
              align="center"
              justify="center"
              transform="rotate(-10deg)"
              fontFamily="heading"
              fontWeight={900}
              fontSize="2xl"
            >
              404
            </Flex>
          </Flex>
        </Box>

        <Button
          asChild
          size="lg"
          bg="booth.600"
          color="paper.50"
          _hover={{ bg: "booth.700" }}
          fontWeight={700}
        >
          <NextLink href="/">투표소 입구로 돌아가기</NextLink>
        </Button>
      </Stack>
    </ElectionShell>
  );
}

import { Box, Container, Flex, Link, Text } from "@chakra-ui/react";

/**
 * 투표소 공통 셸.
 * 신문 1면 같은 editorial masthead + 본문 + 조용한 푸터.
 */
export function ElectionShell({
  children,
  maxW = "4xl",
}: {
  children: React.ReactNode;
  maxW?: string;
}) {
  return (
    <Flex direction="column" minH="100dvh" bg="bg.canvas">
      <Box as="header" borderBottom="3px double" borderColor="ink.700">
        <Container maxW={maxW} py={{ base: 4, md: 5 }}>
          <Flex align="baseline" justify="space-between" gap={4}>
            <Link
              href="/"
              _hover={{ textDecoration: "none", color: "accent" }}
              color="fg.default"
            >
              <Text
                as="span"
                fontFamily="heading"
                fontWeight={900}
                fontSize={{ base: "xl", md: "2xl" }}
                letterSpacing="-0.02em"
              >
                침착투표소
              </Text>
            </Link>
            <Text
              fontSize="2xs"
              color="fg.subtle"
              textTransform="uppercase"
              letterSpacing="0.22em"
              display={{ base: "none", sm: "block" }}
            >
              Open Chat Election Booth
            </Text>
          </Flex>
        </Container>
      </Box>

      <Box as="main" flex="1">
        <Container maxW={maxW} py={{ base: 8, md: 12 }}>
          {children}
        </Container>
      </Box>

      <Box as="footer" borderTop="1px solid" borderColor="border.default">
        <Container maxW={maxW} py={5}>
          <Text fontSize="xs" color="fg.subtle" textAlign="center">
            이 투표소는 비밀투표 원칙을 따릅니다 — 선택값은 투표권 정보와
            분리되어 봉인 저장되며, 관리자도 개별 투표 내역을 볼 수 없습니다.
          </Text>
        </Container>
      </Box>
    </Flex>
  );
}

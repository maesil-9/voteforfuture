import NextLink from "next/link";
import { Box, Button, Container, Flex, Link, Text } from "@chakra-ui/react";
import { logoutAction } from "@/server/actions/admin";

/**
 * 백오피스 셸. 사용자 투표소보다 밀도 높고, 항상 "비밀투표 시스템을 다루고
 * 있다"는 사실을 상기시키는 잉크색 상단 바를 가진다.
 */
export function AdminShell({
  children,
  adminEmail,
}: {
  children: React.ReactNode;
  adminEmail: string;
}) {
  return (
    <Flex direction="column" minH="100dvh" bg="bg.canvas">
      <Box as="header" bg="ink.900" color="paper.50">
        <Container maxW="6xl" py={3}>
          <Flex align="center" justify="space-between" gap={4}>
            <Flex align="baseline" gap={3}>
              <Link asChild _hover={{ textDecoration: "none", opacity: 0.85 }} color="paper.50">
                <NextLink href="/admin">
                  <Text as="span" fontFamily="heading" fontWeight={900} fontSize="lg">
                    침착투표소
                  </Text>
                </NextLink>
              </Link>
              <Text
                fontSize="2xs"
                letterSpacing="0.2em"
                textTransform="uppercase"
                color="stamp.300"
                fontWeight={700}
              >
                선거관리 백오피스
              </Text>
            </Flex>
            <Flex align="center" gap={3}>
              <Text fontSize="xs" color="paper.300" display={{ base: "none", sm: "block" }}>
                {adminEmail}
              </Text>
              <form action={logoutAction}>
                <Button
                  type="submit"
                  size="xs"
                  variant="outline"
                  borderColor="paper.300"
                  color="paper.50"
                  _hover={{ bg: "ink.700" }}
                >
                  로그아웃
                </Button>
              </form>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Box bg="stamp.100" borderBottom="1px solid" borderColor="stamp.300">
        <Container maxW="6xl" py={1.5}>
          <Text fontSize="xs" color="ink.700" textAlign="center">
            이 시스템은 개별 유권자의 투표 여부·선택을 저장하지 않습니다. 관리
            화면에는 집계 수치만 표시됩니다.
          </Text>
        </Container>
      </Box>

      <Box as="main" flex="1">
        <Container maxW="6xl" py={{ base: 6, md: 8 }}>
          {children}
        </Container>
      </Box>
    </Flex>
  );
}

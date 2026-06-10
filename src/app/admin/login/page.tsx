import { redirect } from "next/navigation";
import { Box, Container, Stack, Text } from "@chakra-ui/react";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession } from "@/server/auth/admin-session";

export const dynamic = "force-dynamic";

export const metadata = { title: "관리자 로그인" };

export default async function AdminLoginPage() {
  if (await getAdminSession()) {
    redirect("/admin");
  }

  return (
    <Box minH="100dvh" bg="bg.canvas" display="flex" alignItems="center">
      <Container maxW="sm" py={10}>
        <Stack gap={6}>
          <Box textAlign="center">
            <Text fontFamily="heading" fontWeight={900} fontSize="2xl">
              침착투표소
            </Text>
            <Text fontSize="xs" letterSpacing="0.2em" color="fg.muted" textTransform="uppercase" mt={1}>
              선거관리 백오피스
            </Text>
          </Box>
          <Box
            bg="bg.surface"
            border="1px solid"
            borderColor="border.default"
            boxShadow="paper"
            borderRadius="2px"
            p={{ base: 6, md: 8 }}
          >
            <LoginForm />
          </Box>
          <Text fontSize="xs" color="fg.subtle" textAlign="center">
            관리자 계정은 서버에서 `pnpm admin:create`로만 생성할 수 있습니다.
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}

"use client";

import { useActionState } from "react";
import { Box, Button, chakra, Input, Stack, Text } from "@chakra-ui/react";
import { loginAction, type LoginState } from "@/server/actions/admin";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction}>
      <Stack gap={4}>
        <Box>
          <chakra.label htmlFor="admin-email" fontSize="sm" fontWeight={700} display="block" mb={1.5}>
            이메일
          </chakra.label>
          <Input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            bg="bg.surface"
          />
        </Box>
        <Box>
          <chakra.label htmlFor="admin-password" fontSize="sm" fontWeight={700} display="block" mb={1.5}>
            비밀번호
          </chakra.label>
          <Input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            bg="bg.surface"
          />
        </Box>
        {state.error && (
          <Text role="alert" fontSize="sm" color="sealwax.700" fontWeight={600}>
            {state.error}
          </Text>
        )}
        <Button
          type="submit"
          size="lg"
          bg="ink.900"
          color="paper.50"
          _hover={{ bg: "ink.700" }}
          fontWeight={700}
          loading={pending}
          loadingText="확인 중…"
        >
          관리자 로그인
        </Button>
      </Stack>
    </form>
  );
}

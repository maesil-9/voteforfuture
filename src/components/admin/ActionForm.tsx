"use client";

import { useActionState } from "react";
import { Button, Stack, Text } from "@chakra-ui/react";

type FormState = { error?: string };
type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * useActionState 기반 공용 폼 래퍼.
 * 서버 액션의 검증 에러를 인라인으로 보여준다.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  submitProps,
}: {
  action: FormAction;
  submitLabel: string;
  children: React.ReactNode;
  submitProps?: Record<string, unknown>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction}>
      <Stack gap={4}>
        {children}
        {state.error && (
          <Text role="alert" fontSize="sm" color="sealwax.700" fontWeight={600}>
            {state.error}
          </Text>
        )}
        <Button
          type="submit"
          alignSelf="flex-start"
          bg="booth.600"
          color="paper.50"
          _hover={{ bg: "booth.700" }}
          fontWeight={700}
          loading={pending}
          {...submitProps}
        >
          {submitLabel}
        </Button>
      </Stack>
    </form>
  );
}

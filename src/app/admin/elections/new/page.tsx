import { Box, Stack, Text } from "@chakra-ui/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ElectionForm } from "@/components/admin/ElectionForm";
import { requireAdmin } from "@/server/auth/admin-session";

export const dynamic = "force-dynamic";

export const metadata = { title: "새 선거" };

export default async function NewElectionPage() {
  const session = await requireAdmin();

  return (
    <AdminShell adminEmail={session.email}>
      <Stack gap={6} maxW="3xl">
        <Text as="h1" fontFamily="heading" fontWeight={900} fontSize="2xl">
          새 선거 만들기
        </Text>
        <Box
          bg="bg.surface"
          border="1px solid"
          borderColor="border.default"
          boxShadow="paper"
          borderRadius="2px"
          p={{ base: 5, md: 7 }}
        >
          <ElectionForm />
        </Box>
      </Stack>
    </AdminShell>
  );
}

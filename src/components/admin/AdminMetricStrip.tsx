import { Box, Flex, Text } from "@chakra-ui/react";

/**
 * 백오피스 핵심 수치 스트립 — aggregate count만 다룬다.
 */
export function AdminMetricStrip({
  metrics,
}: {
  metrics: { label: string; value: string; hint?: string }[];
}) {
  return (
    <Flex
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      boxShadow="paper"
      borderRadius="2px"
      direction={{ base: "column", sm: "row" }}
    >
      {metrics.map((m, i) => (
        <Box
          key={m.label}
          flex="1"
          px={5}
          py={4}
          borderLeft={{ sm: i > 0 ? "1px solid" : undefined }}
          borderTop={{ base: i > 0 ? "1px solid" : undefined, sm: "none" }}
          borderColor={{ base: "border.default", sm: "border.default" }}
        >
          <Text fontSize="xs" color="fg.muted" fontWeight={700} letterSpacing="0.08em">
            {m.label}
          </Text>
          <Text fontFamily="heading" fontWeight={900} fontSize="2xl" mt={1}>
            {m.value}
          </Text>
          {m.hint && (
            <Text fontSize="xs" color="fg.subtle">
              {m.hint}
            </Text>
          )}
        </Box>
      ))}
    </Flex>
  );
}

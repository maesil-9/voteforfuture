import { Box, Flex, Text } from "@chakra-ui/react";

/**
 * 봉인 왁스 메타포의 상태 배지.
 * 결과 발표 전 "투표함 봉인 중"을 시각적으로 전달한다.
 */
export function SealedStatus({
  label = "투표함 봉인 중",
  sublabel,
  size = "md",
}: {
  label?: string;
  sublabel?: string;
  size?: "md" | "lg";
}) {
  const seal = size === "lg" ? "88px" : "64px";
  return (
    <Flex align="center" gap={4}>
      <Flex
        aria-hidden
        boxSize={seal}
        borderRadius="full"
        bg="sealwax.500"
        color="paper.50"
        align="center"
        justify="center"
        transform="rotate(-8deg)"
        boxShadow="inset 0 0 0 3px rgba(251,248,241,0.35), 0 2px 6px rgba(42,39,24,0.3)"
        flexShrink={0}
      >
        <Text
          fontFamily="heading"
          fontWeight={900}
          fontSize={size === "lg" ? "2xl" : "lg"}
        >
          封
        </Text>
      </Flex>
      <Box>
        <Text fontFamily="heading" fontWeight={700} fontSize={size === "lg" ? "xl" : "md"}>
          {label}
        </Text>
        {sublabel && (
          <Text fontSize="sm" color="fg.muted">
            {sublabel}
          </Text>
        )}
      </Box>
    </Flex>
  );
}

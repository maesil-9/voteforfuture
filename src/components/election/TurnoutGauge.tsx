import { Box, Flex, Text } from "@chakra-ui/react";
import type { Turnout } from "@/server/types";

/**
 * 투표율 게이지.
 * 잉크가 차오르는 듯한 수평 바 + 큰 세리프 숫자. (aggregate count만 표시)
 */
export function TurnoutGauge({
  turnout,
  caption = "현재 투표율",
}: {
  turnout: Turnout;
  caption?: string;
}) {
  return (
    <Box>
      <Flex align="baseline" justify="space-between" mb={2}>
        <Text
          fontSize="xs"
          fontWeight={700}
          color="fg.muted"
          textTransform="uppercase"
          letterSpacing="0.12em"
        >
          {caption}
        </Text>
        <Text fontFamily="heading" fontWeight={900} fontSize="3xl" lineHeight={1}>
          {turnout.percent}
          <Text as="span" fontSize="lg" fontWeight={600} color="fg.muted">
            %
          </Text>
        </Text>
      </Flex>
      <Box
        role="progressbar"
        aria-valuenow={turnout.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`투표율 ${turnout.percent}%`}
        h="14px"
        borderRadius="2px"
        bg="paper.200"
        border="1px solid"
        borderColor="paper.300"
        overflow="hidden"
      >
        <Box
          h="100%"
          w={`${Math.min(100, turnout.percent)}%`}
          bg="booth.600"
          backgroundImage="repeating-linear-gradient(-45deg, transparent 0 6px, rgba(251,248,241,0.14) 6px 12px)"
          transition="width 0.6s ease"
        />
      </Box>
      <Flex justify="space-between" mt={2} fontSize="sm" color="fg.muted">
        <Text>
          투표 완료{" "}
          <Text as="span" fontWeight={700} color="fg.default">
            {turnout.votesCast}
          </Text>
          명
        </Text>
        <Text>
          전체 유권자{" "}
          <Text as="span" fontWeight={700} color="fg.default">
            {turnout.totalVoters}
          </Text>
          명
        </Text>
      </Flex>
    </Box>
  );
}

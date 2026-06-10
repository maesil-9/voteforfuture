import { Box, Flex, Text } from "@chakra-ui/react";
import type { Participation } from "@/server/types";

/**
 * 투표 현황 표시 (aggregate count만).
 * 검수 결과(승인/무효)가 반영된 수치를 보여준다.
 */
export function ParticipationStats({
  participation,
  caption = "투표 현황",
}: {
  participation: Participation;
  caption?: string;
}) {
  const p = participation;
  return (
    <Box>
      <Flex align="baseline" justify="space-between" mb={3}>
        <Text
          fontSize="xs"
          fontWeight={700}
          color="fg.muted"
          textTransform="uppercase"
          letterSpacing="0.12em"
        >
          {caption}
        </Text>
        {p.percent !== null && (
          <Text fontFamily="heading" fontWeight={900} fontSize="3xl" lineHeight={1}>
            {p.percent}
            <Text as="span" fontSize="lg" fontWeight={600} color="fg.muted">
              %
            </Text>
          </Text>
        )}
      </Flex>

      {p.percent !== null && (
        <Box
          role="progressbar"
          aria-valuenow={p.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`투표율 ${p.percent}%`}
          h="14px"
          borderRadius="2px"
          bg="paper.200"
          border="1px solid"
          borderColor="paper.300"
          overflow="hidden"
          mb={3}
        >
          <Box
            h="100%"
            w={`${Math.min(100, p.percent)}%`}
            bg="booth.600"
            backgroundImage="repeating-linear-gradient(-45deg, transparent 0 6px, rgba(251,248,241,0.14) 6px 12px)"
            transition="width 0.6s ease"
          />
        </Box>
      )}

      <Flex gap={{ base: 3, md: 6 }} wrap="wrap">
        <StatItem label="투표 접수" value={p.submitted} />
        <StatItem label="승인된 표" value={p.approved} emphasis />
        <StatItem label="검수 대기" value={p.pending} />
        <StatItem label="무효 처리" value={p.rejected} muted />
        {p.expectedVoters > 0 && (
          <StatItem label="예상 유권자" value={p.expectedVoters} muted />
        )}
      </Flex>
    </Box>
  );
}

function StatItem({
  label,
  value,
  emphasis,
  muted,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
  muted?: boolean;
}) {
  return (
    <Box>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text
        fontFamily="heading"
        fontWeight={emphasis ? 900 : 700}
        fontSize="xl"
        color={emphasis ? "accent" : muted ? "fg.muted" : "fg.default"}
      >
        {value}
        <Text as="span" fontSize="sm" fontWeight={500} color="fg.muted">
          {" "}
          명
        </Text>
      </Text>
    </Box>
  );
}

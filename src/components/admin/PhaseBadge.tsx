import { Badge } from "@chakra-ui/react";
import type { ElectionPhase } from "@/server/guards/election-state";

const PHASE_STYLE: Record<ElectionPhase, { label: string; bg: string; color: string }> = {
  draft: { label: "작성 중", bg: "paper.200", color: "ink.700" },
  upcoming: { label: "투표 예정", bg: "booth.100", color: "booth.700" },
  open: { label: "투표 진행 중", bg: "booth.600", color: "paper.50" },
  closed: { label: "투표 종료", bg: "ink.700", color: "paper.50" },
  archived: { label: "보관됨", bg: "paper.300", color: "ink.700" },
};

export function PhaseBadge({ phase }: { phase: ElectionPhase }) {
  const s = PHASE_STYLE[phase];
  return (
    <Badge bg={s.bg} color={s.color} px={2.5} py={1} borderRadius="sm" fontWeight={700}>
      {s.label}
    </Badge>
  );
}

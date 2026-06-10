import type { Election } from "../types";

/**
 * 선거 상태 가드.
 * status 컬럼과 시간(starts_at / ends_at)을 함께 고려해 "실효 단계"를 계산한다.
 *
 * - draft: 관리자만 접근/편집 가능
 * - upcoming: 랜딩 노출 가능, 투표 불가 (scheduled 또는 아직 시작 전)
 * - open: 투표 가능
 * - closed: 투표 불가 (종료 시각 경과 또는 관리자가 강제 종료)
 * - archived: 읽기 전용
 */
export type ElectionPhase = "draft" | "upcoming" | "open" | "closed" | "archived";

export function getElectionPhase(election: Election, now = new Date()): ElectionPhase {
  if (election.status === "draft") return "draft";
  if (election.status === "archived") return "archived";
  if (election.status === "closed") return "closed";
  if (now < election.startsAt) return "upcoming";
  if (now > election.endsAt) return "closed";
  return "open";
}

export class VotingNotOpenError extends Error {
  constructor(public phase: ElectionPhase) {
    super(
      phase === "upcoming"
        ? "아직 투표가 시작되지 않았습니다."
        : "투표가 종료되었습니다.",
    );
    this.name = "VotingNotOpenError";
  }
}

/** 투표 제출 전 반드시 호출. 투표 가능 상태가 아니면 throw. */
export function assertVotingOpen(election: Election, now = new Date()): void {
  const phase = getElectionPhase(election, now);
  if (phase !== "open") {
    throw new VotingNotOpenError(phase);
  }
}

/**
 * 투표 시작 후에는 후보 삭제/이름 변경, 유권자 추가를 막는다.
 * (긴급 추가 코드 발급은 audit log와 함께 별도 허용)
 */
export function canEditBallotStructure(election: Election, now = new Date()): boolean {
  if (election.status === "draft") return true;
  if (election.status === "archived") return false;
  return now < election.startsAt;
}

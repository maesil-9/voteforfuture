export type ElectionStatus =
  | "draft"
  | "scheduled"
  | "open"
  | "closed"
  | "archived";

export type Election = {
  id: string;
  title: string;
  description: string | null;
  status: ElectionStatus;
  startsAt: Date;
  endsAt: Date;
  resultVisibleAt: Date;
  maxVoters: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Candidate = {
  id: string;
  electionId: string;
  displayOrder: number;
  name: string;
  shortIntro: string | null;
  profile: string | null;
  slogan: string | null;
  colorHint: string | null;
  posterId: string | null;
};

export type CandidatePolicy = {
  id: string;
  candidateId: string;
  title: string;
  body: string;
  displayOrder: number;
};

export type SubmissionStatus = "pending" | "approved" | "rejected";

/** 투표 제출 (검수 대상). 선택값은 봉인 상태로 임시 보관 후 승인 시 파기·이동 */
export type VoteSubmission = {
  id: string;
  electionId: string;
  voterName: string;
  status: SubmissionStatus;
  /** 메시지를 남겼는지 여부만 노출 — 내용은 결과 공개 후 익명으로만 열람 */
  hasMessage: boolean;
  rejectReason: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
};

/** 실시간 투표 현황 (aggregate count만) */
export type Participation = {
  submitted: number;
  approved: number;
  pending: number;
  rejected: number;
  /** 선거에 설정된 예상 유권자 수 (0이면 미설정) */
  expectedVoters: number;
  /** approved / expectedVoters (%); expectedVoters가 0이면 null */
  percent: number | null;
};

export type ElectionResults = {
  /** 개표된 표 = 승인되어 익명 투표함에 들어간 표 */
  totalBallots: number;
  totalSubmitted: number;
  pendingCount: number;
  rejectedCount: number;
  isTie: boolean;
  winnerIds: string[];
  perCandidate: {
    candidateId: string;
    name: string;
    slogan: string | null;
    colorHint: string | null;
    votes: number;
    percent: number;
  }[];
  /** 삭제된 후보 등으로 매칭되지 않은 표 */
  unmatchedBallots: number;
  /**
   * 투표자들이 남긴 익명 한 마디 모음.
   * 제출 순서와의 상관관계를 끊기 위해 텍스트 기준으로 정렬되어 있다.
   */
  messages: string[];
};

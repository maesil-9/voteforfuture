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

export type VoterBatch = {
  id: string;
  electionId: string;
  batchName: string;
  voterCount: number;
  createdAt: Date;
};

export type Turnout = {
  totalVoters: number;
  votesCast: number;
  remaining: number;
  /** 0~100, 소수점 1자리 */
  percent: number;
};

export type ElectionResults = {
  totalBallots: number;
  totalVoters: number;
  turnoutPercent: number;
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
};

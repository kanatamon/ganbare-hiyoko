export type PrivateKey = string;

export type Callbacks = {
  onFail?: (error: Error) => void;
  onSuccess?: () => void;
  onProgress?: (progress: number) => void;
  onInit?: (total: number) => void;
};

export type TaskReport = {
  name?: string;
  address: string;
  success: boolean;
  error?: Error;
  progress: number;
  total: number | 'uninitialized';
};

export type Wallet = {
  name?: string;
  address: string;
  privateKey: string;
};

export type TrailblazersUserRank = {
  rank: number;
  address: string;
  score: number;
  multiplier: number;
  totalScore: number;
  total: number;
  blacklisted: boolean;
};

export type PaginationResponse<Item extends Record<string, unknown>> = {
  items: Item[];
};

export type TrailblazersUserHistoryItem = {
  points: number;
  date: number;
};

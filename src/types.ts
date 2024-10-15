export type PrivateKey = string;

export type Callbacks = {
  onFail?: (error: Error) => void;
  onSuccess?: () => void;
  onProgress?: (progress: number) => void;
  onInit?: (total: number) => void;
};

export type TaskReport = {
  address: string;
  success: boolean;
  error?: Error;
  progress: number;
  total: number | 'uninitialized';
};

export type Wallet = {
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

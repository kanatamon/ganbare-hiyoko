export type PrivateKey = string;

export type GoalFunctionArgs<Options extends string[]> = {
  privateKey: PrivateKey;
  options: Options;
  callbacks?: {
    onFail?: (error: Error) => void;
    onSuccess?: () => void;
    onProgress?: (progress: number) => void;
    onInit?: (total: number) => void;
  };
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

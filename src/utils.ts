import path from 'path';
import { ethers } from 'ethers';
import type { GoalFunctionArgs, TaskReport, Wallet } from './types';

export function wait(
  time: number,
  unit: 'ms' | 'second' | 'minute' | 'hour' | 'day'
) {
  const timeInMs =
    time *
    {
      ms: 1,
      second: 1000,
      minute: 1000 * 60,
      hour: 1000 * 60 * 60,
      day: 1000 * 60 * 60 * 24,
    }[unit];
  return new Promise((resolve) => setTimeout(resolve, timeInMs));
}

/**
 * @deprecated Use `executeGoal` in `goals/_index.ts` instead
 */
export async function executeGoal(
  pathToFile: string,
  goalArgs: GoalFunctionArgs<string[]>
) {
  const absoluteGoalPath = path.resolve(process.cwd(), pathToFile);

  // Import the TypeScript file using tsx
  try {
    // Use dynamic import to load the goal module
    const goalModule = await import(absoluteGoalPath);

    // Check if the module has a default export
    if (typeof goalModule.default === 'function') {
      await goalModule.default(goalArgs);
    } else {
      console.error('Error: No default export found in the goal module');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Failed to import or execute the goal module: ${error.message}`
      );
    } else {
      console.error('Failed to import or execute the goal module');
    }
  }
}

export function shortenAddress(address: string) {
  return address.slice(0, 6) + '...' + address.slice(-4);
}

export function summarizeTaskReport(taskReport: TaskReport) {
  const { address, success, progress, total, error } = taskReport;
  const taskLeftToComplete =
    total === 'uninitialized'
      ? 'uninitialized'
      : `${total - progress} trx to go`;
  return {
    address: shortenAddress(address),
    goalStatus: success ? '✅' : taskLeftToComplete,
    failedReason: error ? truncateString(error.message) : 'N/A',
  };
}

export function isWallets(wallets: unknown): wallets is Wallet[] {
  if (!Array.isArray(wallets)) return false;

  return wallets.every(
    (wallet) =>
      typeof wallet === 'object' &&
      wallet !== null &&
      'address' in wallet &&
      'privateKey' in wallet
  );
}

export function isStringArray(arr: unknown): arr is string[] {
  return Array.isArray(arr) && arr.every((item) => typeof item === 'string');
}

export function truncateString(str: string, maxLength = 50) {
  return str.length > maxLength ? str.slice(0, maxLength).trim() + '...' : str;
}

export class RpcProviderRateLimiter {
  private nextRpcAvailableTime = 0;

  constructor(
    private rpcUrl: string,
    private rpcUsageInterval: number = 3000
  ) {}

  async getRpcProvider() {
    if (this.nextRpcAvailableTime === 0) {
      this.nextRpcAvailableTime = Date.now() + this.rpcUsageInterval;
    } else {
      const timeToWait = this.nextRpcAvailableTime - Date.now();
      this.nextRpcAvailableTime += this.rpcUsageInterval;
      await wait(timeToWait, 'ms');
    }

    try {
      const provider = new ethers.JsonRpcProvider(this.rpcUrl);
      await provider.getBlockNumber(); // Check if provider is working
      return provider;
    } catch (error) {
      return null;
    }
  }
}

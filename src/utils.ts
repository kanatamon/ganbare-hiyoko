import path from 'path';
import { ethers } from 'ethers';
import type { TaskReport, TrailblazersUserRank, Wallet } from './types';
import invariant from 'tiny-invariant';

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
function isTrailblazersUserRank(data: unknown): data is TrailblazersUserRank {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.rank !== 'number') {
    return false;
  }
  if (typeof obj.address !== 'string') {
    return false;
  }
  if (typeof obj.score !== 'number') {
    return false;
  }
  if (typeof obj.multiplier !== 'number') {
    return false;
  }
  if (typeof obj.totalScore !== 'number') {
    return false;
  }
  if (typeof obj.total !== 'number') {
    return false;
  }
  if (typeof obj.blacklisted !== 'boolean') {
    return false;
  }
  return true;
}

export async function getTrailblazersUserRank(address: string) {
  const response = await fetch(
    `https://trailblazer.mainnet.taiko.xyz/s2/user/rank?address=${address}`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36',
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  const data = await response.json();
  invariant(
    isTrailblazersUserRank(data),
    'Invalid Trailblazers user rank response'
  );
  return data;
}

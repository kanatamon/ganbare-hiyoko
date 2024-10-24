import path from 'path';
import { ethers } from 'ethers';
import type {
  PaginationResponse,
  TaskReport,
  TrailblazersUserHistoryItem,
  TrailblazersUserRank,
  Wallet,
} from './types';
import invariant from 'tiny-invariant';
import type { DerivedTrailblazersUserRank } from './types';

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
  const { name, address, success, progress, total, error } = taskReport;
  const taskLeftToComplete =
    total === 'uninitialized'
      ? 'uninitialized'
      : `${total - progress} trx to go`;
  return {
    name: name ?? 'N/A',
    address: shortenAddress(address),
    status: success ? '✅' : taskLeftToComplete,
    note: error ? truncateString(error.message) : 'N/A',
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

export async function getTrailblazersUserHistory(address: string) {
  const response = await fetch(
    `https://trailblazer.mainnet.taiko.xyz/s2/user/history?address=${address}&size=100`,
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
    isPaginationResponse(data, isTrailblazersUserHistoryItem),
    'Invalid Trailblazers user history'
  );
  return data.items;
}

export function isTrailblazersUserHistoryItem(
  data: unknown
): data is TrailblazersUserHistoryItem {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.points !== 'number') {
    return false;
  }
  if (typeof obj.date !== 'number') {
    return false;
  }
  return true;
}

export function isPaginationResponse<Item extends Record<string, unknown>>(
  data: unknown,
  isItem: (data: unknown) => data is Item
): data is PaginationResponse<Item> {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.items)) {
    return false;
  }
  return true;
}

export function isSameUTCDay(date1: Date, date2: Date) {
  return date1.toUTCString().slice(0, 16) === date2.toUTCString().slice(0, 16);
}

export function toDate(unixTimestamp: number) {
  return new Date(unixTimestamp * 1000);
}

export function today() {
  return new Date();
}

export function formatDisplayNumber(number: number) {
  return Math.floor(number).toLocaleString();
}

export async function getDerivedTrailblazersUserRank(
  address: string
): Promise<DerivedTrailblazersUserRank> {
  const [userRank, userHistoryItems] = await Promise.all([
    getTrailblazersUserRank(address),
    getTrailblazersUserHistory(address),
  ]);
  const dailyPointsEarned = userHistoryItems
    .filter((item) => isSameUTCDay(toDate(item.date), today()))
    .reduce((acc, item) => acc + item.points, 0);
  const isMaxDailyPointsEarned = userHistoryItems
    .filter((item) => isSameUTCDay(toDate(item.date), today()))
    .some((item) => item.points === 0);

  return {
    ...userRank,
    dailyPointsEarned,
    isMaxDailyPointsEarned,
  };
}

export function isMatchingAddress(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

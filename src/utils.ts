import path from 'path';
import type { GoalFunctionArgs, TaskReport, Wallet } from './types';

export function wait(time: number, unit: 'second' | 'minute' | 'hour' | 'day') {
  const timeInMs =
    time *
    1000 *
    {
      second: 1,
      minute: 60,
      hour: 60 * 60,
      day: 60 * 60 * 24,
    }[unit];
  return new Promise((resolve) => setTimeout(resolve, timeInMs));
}

// Function to dynamically import the goal module and execute the exported function
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
    failedReason: error ? error.message : 'N/A',
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

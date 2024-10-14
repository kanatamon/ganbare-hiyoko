import { readFile } from 'fs/promises';
import path from 'path';
import invariant from 'tiny-invariant';
import { Command } from 'commander';
import cliProgress from 'cli-progress';
import type { TaskReport } from './src/types';
import {
  isStringArray,
  isWallets,
  shortenAddress,
  summarizeTaskReport,
  truncateString,
  wait,
} from './src/utils';
import { executeGoal } from './goals/_index';

const DEFAULT_WALLETS_FILE = 'wallets.json';

// create new container
const multibar = new cliProgress.MultiBar(
  {
    clearOnComplete: false,
    hideCursor: true,
    format: ' {bar} | {address} | {value}/{total} | {status}',
  },
  cliProgress.Presets.rect
);

// Initialize the CLI program
const program = new Command();

program
  .requiredOption(
    '--goal <goal>',
    'Path to the TypeScript goal file and its arguments'
  )
  .option(
    '--wallets <wallets>',
    'Path to the wallets JSON file',
    DEFAULT_WALLETS_FILE
  )
  .parse(process.argv);

// Extract CLI options
const options = program.opts();

(async () => {
  invariant(options.goal, 'Goal is required to execute the script');
  const [goalName, ...goalArgs] = options.goal.split(' ');
  invariant(typeof goalName === 'string', 'Invalid goal path');
  invariant(isStringArray(goalArgs), 'Invalid goal arguments');

  invariant(options.wallets, 'Wallets file is required to execute the script');
  const pathToWalletsFile = path.resolve(process.cwd(), options.wallets);

  const wallets = JSON.parse(await readFile(pathToWalletsFile, 'utf-8'));
  invariant(isWallets(wallets), 'Invalid wallets format');

  const taskReports: TaskReport[] = [];
  const asyncTasks: Promise<void>[] = [];
  for (const { address, privateKey } of wallets) {
    let bar: cliProgress.SingleBar | undefined;

    const taskReport: TaskReport = {
      address,
      success: false,
      progress: 0,
      total: 'uninitialized',
    };

    const task = executeGoal(goalName, {
      privateKey,
      options: goalArgs,
      callbacks: {
        onInit: (total) => {
          taskReport.total = total;
          bar = multibar.create(total, 0, { address: shortenAddress(address) });
        },
        onFail: (error) => {
          taskReport.success = false;
          taskReport.error = error;
          bar?.update({
            status: `❌ ${truncateString(error.message, 20)}`,
          });
        },
        onSuccess: () => {
          taskReport.success = true;
          bar?.update({
            status: '✅',
          });
        },
        onProgress: (progress) => {
          taskReport.progress = progress;
          bar?.update(progress, { status: '⏳' });
        },
      },
    });
    asyncTasks.push(task);
    taskReports.push(taskReport);
    await wait(1, 'second');
  }

  await Promise.allSettled(asyncTasks);

  multibar.stop();

  console.log('\n====================');
  console.log('Task reports:');
  console.log(`Date: ${new Date().toLocaleString()}`);
  console.table(taskReports.map(summarizeTaskReport));
})();

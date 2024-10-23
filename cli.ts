import { readFile } from 'fs/promises';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import invariant from 'tiny-invariant';
import cliProgress from 'cli-progress';
import { Table } from 'console-table-printer';
import {
  formatDisplayNumber,
  getDerivedTrailblazersUserRank,
  isWallets,
  shortenAddress,
  summarizeTaskReport,
  truncateString,
  wait,
} from './src/utils';
import type { TaskReport, TrailblazersUserRank, Wallet } from './src/types';
import { startJobForVoteOnRuby } from './src/jobs/vote-on-ruby';
import {
  MAX_DAILY_POINTS,
  promptGasPrice,
  promptNumberOfVotes,
  promptWalletSelection,
} from './src/prompts';

async function startVoteOnRubyApplication(wallets: Wallet[]) {
  const selectedWallets = await promptWalletSelection(wallets);
  const numberOfVotesConfig = await promptNumberOfVotes(selectedWallets);
  const gasInGwei = await promptGasPrice();

  const multibar = new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: '{name} | {address} | {bar} | {value}/{total} | {status}',
    },
    cliProgress.Presets.rect
  );

  const taskReports: TaskReport[] = [];
  const asyncTasks: Promise<void>[] = [];
  for (const { name, address, privateKey } of selectedWallets) {
    let bar: cliProgress.SingleBar | undefined;

    const taskReport: TaskReport = {
      name,
      address,
      success: false,
      progress: 0,
      total: 'uninitialized',
    };

    const numberOfVotes =
      numberOfVotesConfig.find((n) => n.privateKey === privateKey)
        ?.numberOfVotes ?? 0;
    const task = startJobForVoteOnRuby({
      privateKey,
      options: {
        numberOfVotes,
        gasInGwei,
      },
      callbacks: {
        onInit: (total) => {
          taskReport.total = total;
          bar = multibar.create(total, 0, {
            name: truncateString(name ?? '', 20).padEnd(23, ' '),
            address: shortenAddress(address),
          });
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
  console.log(`Locale Date: ${new Date().toLocaleString()}`);
  console.log(`UTC Date: ${new Date().toUTCString()}`);
  const table = new Table({
    columns: [
      { name: 'No', alignment: 'right' },
      { name: 'Name', alignment: 'left' },
      { name: 'Address', alignment: 'center' },
      { name: 'Status', alignment: 'center' },
      { name: 'Note', alignment: 'left' },
    ],
  });
  taskReports.forEach((taskReport, index) => {
    const { name, address, success, progress, total, error } = taskReport;
    const taskLeftToComplete =
      total === 'uninitialized'
        ? 'uninitialized'
        : `${total - progress} trx to go`;
    table.addRow({
      No: index + 1,
      Name: name ?? 'N/A',
      Address: address,
      Status: success ? '✅' : taskLeftToComplete,
      Note: error ? truncateString(error.message) : 'N/A',
    });
  });
  table.printTable();
}

async function startViewTrailblazersDashboardApplication(wallets: Wallet[]) {
  const selectedWallets = await promptWalletSelection(wallets);

  const trailblazersUsers: (TrailblazersUserRank & {
    name: Wallet['name'];
    dailyPointsEarned: number;
    isMaxDailyPointsEarned: boolean;
  })[] = [];
  for (const { name, address } of selectedWallets) {
    trailblazersUsers.push({
      name,
      ...(await getDerivedTrailblazersUserRank(address)),
    });
    await wait(250, 'ms');
  }

  const table = new Table({
    columns: [
      { name: 'No', alignment: 'right' },
      { name: 'Name', alignment: 'left' },
      { name: 'Address', alignment: 'center' },
      { name: 'Rank', alignment: 'right' },
      { name: 'Score', alignment: 'right' },
      { name: 'Multiplier', alignment: 'right' },
      { name: 'Daily Score', alignment: 'right' },
      { name: 'Daily Limit?', alignment: 'left' },
    ],
  });
  trailblazersUsers.forEach((user, index) => {
    const remainingDailyPoints = Math.max(
      0,
      MAX_DAILY_POINTS - user.dailyPointsEarned
    );
    table.addRow({
      No: index + 1,
      Name: user.name ?? 'N/A',
      Address: shortenAddress(user.address),
      Rank: formatDisplayNumber(user.rank),
      Score: formatDisplayNumber(user.totalScore),
      Multiplier: `x${user.multiplier.toFixed(2)}`,
      'Daily Score': formatDisplayNumber(user.dailyPointsEarned),
      'Daily Limit?': `${
        user.isMaxDailyPointsEarned
          ? '🚨 Max Daily'
          : `${formatDisplayNumber(remainingDailyPoints)} Points to be earned`
      }`,
    });
  });
  table.printTable();
}

function startApplication(name: string, payload: { wallets: Wallet[] }) {
  switch (name) {
    case '[Taiko] Vote on Ruby': {
      return startVoteOnRubyApplication(payload.wallets);
    }
    case '[Taiko] View Trailblazers Dashboard': {
      return startViewTrailblazersDashboardApplication(payload.wallets);
    }
    default: {
      throw new Error(`Application not found: ${name}`);
    }
  }
}

(async () => {
  const { walletsFilename } = await inquirer.prompt([
    {
      type: 'input',
      name: 'walletsFilename',
      message: 'Enter the filename of the wallets configuration file:',
      default: () => 'wallets.json', // Default filename
      validate: async (input) => {
        if (!input) {
          return 'Filename is required';
        }

        // Check if file exists
        if (!fs.existsSync(path.resolve(process.cwd(), input))) {
          return `File "${input}" does not exist.`;
        }

        return true;
      },
    },
  ]);

  const pathToWalletsFile = path.resolve(process.cwd(), walletsFilename);
  const wallets = JSON.parse(await readFile(pathToWalletsFile, 'utf-8'));
  invariant(isWallets(wallets), 'Invalid wallets format, expected JSON array');

  const { applicationName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'applicationName',
      message: 'Select the program you want to run:',
      choices: ['[Taiko] Vote on Ruby', '[Taiko] View Trailblazers Dashboard'],
    },
  ]);
  startApplication(applicationName, {
    wallets,
  });
})();

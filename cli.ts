import { readFile } from 'fs/promises';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import invariant from 'tiny-invariant';
import cliProgress from 'cli-progress';
import { printTable } from 'console-table-printer';
import {
  getTrailblazersUserRank,
  isWallets,
  shortenAddress,
  summarizeTaskReport,
  truncateString,
  wait,
} from './src/utils';
import type { TaskReport, TrailblazersUserRank, Wallet } from './src/types';
import { startJobForVoteOnRuby } from './src/jobs/vote-on-ruby';

async function selectWallets(wallets: Wallet[]) {
  const { isSelectedAllWallet } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'isSelectedAllWallet',
      message: 'Do you want to use all wallets?',
      default: true,
    },
  ]);
  if (isSelectedAllWallet) {
    return wallets;
  }
  const { wallets: selectedWallets } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'wallets',
      message: 'Select the wallets you want to use:',
      choices: wallets.map((wallet) => ({
        name: shortenAddress(wallet.address),
        value: wallet,
      })),
      validate: (answer) => {
        if (answer.length < 1) {
          return 'You must choose at least one wallet.';
        }
        return true;
      },
    },
  ]);
  invariant(isWallets(selectedWallets), 'Invalid wallets format');
  return selectedWallets;
}

async function startVoteOnRubyApplication(wallets: Wallet[]) {
  const selectedWallets = await selectWallets(wallets);

  const { numberOfVotes, gasInGwei } = await inquirer.prompt([
    {
      type: 'number',
      name: 'numberOfVotes',
      message: 'Enter the number of transaction to cast:',
      default: 57,
      validate: (input) => {
        if (typeof input !== 'number') {
          return 'Invalid number of votes';
        }
        if (Number.isNaN(input)) {
          return 'Invalid number of votes';
        }
        if (input < 1) {
          return 'Number of votes must be at least 1';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'gasInGwei',
      message: 'Enter the gas price in gwei:',
      default: '0.23',
      validate: (input) => {
        if (Number.isNaN(Number.parseFloat(input))) {
          return 'Invalid gas price';
        }
        return true;
      },
    },
  ]);

  const multibar = new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: ' {bar} | {address} | {value}/{total} | {status}',
    },
    cliProgress.Presets.rect
  );

  const taskReports: TaskReport[] = [];
  const asyncTasks: Promise<void>[] = [];
  for (const { address, privateKey } of selectedWallets) {
    let bar: cliProgress.SingleBar | undefined;

    const taskReport: TaskReport = {
      address,
      success: false,
      progress: 0,
      total: 'uninitialized',
    };

    const task = startJobForVoteOnRuby({
      privateKey,
      options: {
        numberOfVotes,
        gasInGwei,
      },
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
  printTable(taskReports.map(summarizeTaskReport));
}

async function startViewTrailblazersDashboardApplication(wallets: Wallet[]) {
  const selectedWallets = await selectWallets(wallets);

  const trailblazersUserRanks: TrailblazersUserRank[] = [];
  for (const { address } of selectedWallets) {
    const userRank = await getTrailblazersUserRank(address);
    trailblazersUserRanks.push(userRank);
    await wait(250, 'ms');
  }

  printTable(
    trailblazersUserRanks.map((userRank) => ({
      address: shortenAddress(userRank.address),
      rank: userRank.rank.toLocaleString(),
      score: Math.floor(userRank.totalScore).toLocaleString(),
      multiplier: `x${userRank.multiplier.toFixed(2)}`,
    }))
  );
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

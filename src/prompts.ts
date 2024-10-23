import inquirer from 'inquirer';
import invariant from 'tiny-invariant';
import {
  getDerivedTrailblazersUserRank,
  isWallets,
  shortenAddress,
} from './utils';
import type { Wallet } from './types';

export const MAX_DAILY_POINTS = 74_000;

export async function promptWalletSelection(wallets: Wallet[]) {
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

export async function promptNumberOfVotes(
  wallets: Wallet[]
): Promise<{ privateKey: string; numberOfVotes: number }[]> {
  const { numberOfVotesMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'numberOfVotesMode',
      message: 'Select the mode to find the number of votes to cast:',
      default: 'Maximize the number of votes to cast',
      choices: [
        'Maximize the number of votes to cast',
        'Enter the number of votes to cast',
      ],
    },
  ]);
  if (numberOfVotesMode === 'Enter the number of votes to cast') {
    const { numberOfVotes } = await inquirer.prompt([
      {
        type: 'number',
        name: 'numberOfVotes',
        message: 'Enter the number of transaction to cast:',
        default: 74,
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
    ]);
    return wallets.map((wallet) => ({
      privateKey: wallet.privateKey,
      numberOfVotes,
    }));
  }

  if (numberOfVotesMode === 'Maximize the number of votes to cast') {
    const { dailyPointsLimit } = await inquirer.prompt([
      {
        type: 'number',
        name: 'dailyPointsLimit',
        message: 'Enter the daily points limit:',
        default: MAX_DAILY_POINTS,
        validate: (input) => {
          if (typeof input !== 'number') {
            return 'Invalid daily points limit';
          }
          if (Number.isNaN(input)) {
            return 'Invalid daily points limit';
          }
          if (input < 1) {
            return 'Daily points limit must be at least 1';
          }
          return true;
        },
      },
    ]);

    const userRanks = await Promise.all(
      wallets.map((w) => getDerivedTrailblazersUserRank(w.address))
    );

    return wallets.map((wallet) => {
      const userRank = userRanks.find((u) => u.address === wallet.address);
      if (!userRank) {
        return {
          privateKey: wallet.privateKey,
          numberOfVotes: 0,
        };
      }

      const remainingDailyPoints = Math.max(
        0,
        dailyPointsLimit - userRank.dailyPointsEarned
      );
      const numberOfVotes = Math.ceil(remainingDailyPoints / 1_000);
      return {
        privateKey: wallet.privateKey,
        numberOfVotes,
      };
    });
  }

  throw new Error('Invalid number of votes mode');
}

export async function promptGasPrice() {
  const { gasInGwei } = await inquirer.prompt([
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
  return gasInGwei;
}
